"""
Business-logic services for the accounts app.

Views handle HTTP; services handle domain logic. This keeps views thin
and services independently testable.

Architecture ref: CLAUDE.md ("Thin views"), 01-authentication.md §5.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.signing import dumps
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

User = get_user_model()


def register_user(email: str, password: str, first_name: str, last_name: str) -> User:
    """
    Register a new user with email and password.

    Creates the user (unverified) and schedules the verification email
    to be sent after the database transaction commits.
    """
    user = User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    logger.info("User registered via email: user_id=%s", user.id)

    transaction.on_commit(lambda: send_verification_email(user))

    return user


def send_verification_email(user: User) -> None:
    """
    Send the email verification link to the user.

    Architecture ref: 01-authentication.md §5 (Business rules #5).
    """
    from .emails import send_templated_email

    token = dumps({"uid": str(user.id)}, salt="accounts.verify-email")
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your email — SORA"

    try:
        send_templated_email(
            subject=subject,
            template_prefix="accounts/email/verify_email",
            context={
                "first_name": user.first_name,
                "verification_url": verification_url,
            },
            recipient_email=user.email,
            mascot_filename="sora_mascot_welcome.png",
        )
        logger.info("Verification email sent to user_id=%s", user.id)
    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", user.email, e)


def verify_email(token: str) -> None:
    """
    Verify a user's email address using a stateless signed token.

    Raises:
        ValueError: If the token is invalid, expired, or the user doesn't exist.
    """
    from django.core.signing import BadSignature, SignatureExpired, loads

    try:
        data = loads(
            token,
            salt="accounts.verify-email",
            max_age=settings.ACCOUNTS_EMAIL_VERIFICATION_MAX_AGE,
        )
    except SignatureExpired as e:
        logger.warning("Email verification failed: token expired.")
        raise ValueError("token_expired") from e
    except BadSignature as e:
        logger.warning("Email verification failed: bad signature.")
        raise ValueError("invalid_token") from e

    user_id = data.get("uid")
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist as e:
        logger.warning("Email verification failed: user %s not found.", user_id)
        raise ValueError("invalid_token") from e

    if not user.is_email_verified:
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified", "updated_at"])
        logger.info("User verified: user_id=%s", user.id)


def resend_verification_email(email: str) -> None:
    """
    Resend the verification email if the user exists, is active, and is unverified.
    Otherwise, do nothing (to avoid leaking account existence).
    """
    email = email.strip().lower()
    try:
        user = User.objects.get(email=email)
        if user.is_active and not user.is_email_verified:
            transaction.on_commit(lambda: send_verification_email(user))
    except User.DoesNotExist:
        pass


def authenticate_user(email: str, password: str) -> User:
    """
    Authenticate a user by email and password.

    Raises:
        ValueError("invalid_credentials"): If email/password is wrong or user is inactive.
        ValueError("email_not_verified"): If credentials are correct but email is not verified.
    """
    from django.contrib.auth import authenticate

    from .exceptions import EmailNotVerified, InvalidCredentials

    email = email.strip().lower()
    user = authenticate(email=email, password=password)

    if user is None:
        logger.warning("Failed login attempt (invalid credentials)")
        raise InvalidCredentials("invalid_credentials")

    if not user.is_active:
        logger.warning("Login attempt for inactive user_id=%s", user.id)
        raise InvalidCredentials("invalid_credentials")

    if not user.is_email_verified:
        logger.warning("Login attempt for unverified user_id=%s", user.id)
        raise EmailNotVerified("email_not_verified")

    return user


def issue_login_tokens(user: User):
    """
    Issue JWT tokens for a logged in user, update last_login,
    and emit a single SECURITY_NEW_LOGIN notification.
    """
    import time

    from django.contrib.auth.models import update_last_login
    from rest_framework_simplejwt.tokens import RefreshToken

    from apps.notifications.models import NotificationType
    from apps.notifications.notification_service import NotificationService

    update_last_login(None, user)
    refresh = RefreshToken.for_user(user)
    refresh["auth_time"] = int(time.time())

    try:
        NotificationService.notify(
            recipient=user,
            notification_type=NotificationType.SECURITY_NEW_LOGIN,
            title="New Login Detected",
            body="A new login was detected for your account.",
            data={},
        )
    except Exception as e:
        logger.error("Failed to notify login: %s", e)

    return refresh


def revoke_all_refresh_tokens(user) -> None:
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    tokens = OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=t) for t in tokens], ignore_conflicts=True
    )


def change_password(user: User, new_password: str) -> None:
    """
    Update a user's password and update last_login to invalidate old sessions.
    """
    from django.contrib.auth.models import update_last_login

    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        update_last_login(None, user)
        revoke_all_refresh_tokens(user)
    logger.info("Password changed for user_id=%s", user.id)
    from apps.notifications.models import NotificationType
    from apps.notifications.notification_service import NotificationService

    NotificationService.notify(
        recipient=user,
        notification_type=NotificationType.SECURITY_PASSWORD_CHANGED,
        title="Password Changed",
        body=(
            "Your password has been changed. "
            "If this was not you, please contact support immediately."
        ),
        data={},
    )


def login_with_google(token: str) -> User:
    """
    Authenticate a user via Google ID token.
    Auto-registers or links existing accounts.
    """
    from django.db import IntegrityError, transaction

    from .exceptions import (
        AccountConflict,
        GoogleEmailUnverified,
        GoogleTokenInvalid,
        GoogleUnavailable,
        InvalidCredentials,
    )
    from .google import verify_google_id_token
    from .models import SocialAccount

    try:
        google_data = verify_google_id_token(token)
    except GoogleTokenInvalid as e:
        logger.warning("Google login invalid token: %s", str(e))
        raise
    except GoogleUnavailable as e:
        logger.warning("Google login unavailable: %s", str(e))
        raise

    email = google_data.get("email", "").strip().lower()
    uid = google_data.get("sub")

    if google_data.get("email_verified") is not True:
        raise GoogleEmailUnverified("google_email_unverified")

    if not email or not uid:
        raise GoogleTokenInvalid("invalid_google_token")

    extra_data = {
        k: google_data[k]
        for k in ("name", "given_name", "family_name", "picture", "locale")
        if k in google_data
    }

    # Try to find by social account first
    try:
        social_acc = SocialAccount.objects.get(provider="google", provider_uid=uid)
        user = social_acc.user

        if not user.is_active:
            raise InvalidCredentials("invalid_credentials")

        social_acc.email = email
        social_acc.extra_data = extra_data
        social_acc.last_login_at = timezone.now()
        social_acc.save(update_fields=["email", "extra_data", "last_login_at"])

        return user
    except SocialAccount.DoesNotExist:
        pass

    with transaction.atomic():
        user = User.objects.filter(email=email).first()
        if user:
            if not user.is_active:
                raise InvalidCredentials("invalid_credentials")

            # Link account if not linked
            try:
                SocialAccount.objects.create(
                    user=user,
                    provider="google",
                    provider_uid=uid,
                    email=email,
                    extra_data=extra_data,
                    last_login_at=timezone.now(),
                )
                logger.info("Linked Google account to user_id=%s", user.id)
            except IntegrityError:
                # It means a SocialAccount with this provider_uid already exists.
                # If we get here, it means it's linked to a DIFFERENT user!
                raise AccountConflict("account_conflict")

            if not user.is_email_verified and google_data.get("email_verified"):
                user.set_unusable_password()
                revoke_all_refresh_tokens(user)
                user.is_email_verified = True
                user.save()
                logger.info(
                    "Unverified account claimed via Google; password cleared: user_id=%s",
                    user.id,
                )
            return user

        created = False
        try:
            with transaction.atomic():
                user = User(
                    email=email,
                    first_name=google_data.get("given_name", ""),
                    last_name=google_data.get("family_name", ""),
                    is_email_verified=google_data.get("email_verified", False),
                )
                user.set_unusable_password()
                user.save()
                SocialAccount.objects.create(
                    user=user,
                    provider="google",
                    provider_uid=uid,
                    email=email,
                    extra_data=extra_data,
                    last_login_at=timezone.now(),
                )
                created = True
        except IntegrityError:
            # Race condition, another thread created the user concurrently
            pass

        if not created:
            user = User.objects.get(email=email)
            if not user.is_active:
                raise InvalidCredentials("invalid_credentials")

            try:
                with transaction.atomic():
                    social_acc, _ = SocialAccount.objects.get_or_create(
                        user=user,
                        provider="google",
                        provider_uid=uid,
                        defaults={
                            "email": email,
                            "extra_data": extra_data,
                            "last_login_at": timezone.now(),
                        },
                    )
                    social_acc.email = email
                    social_acc.extra_data = extra_data
                    social_acc.last_login_at = timezone.now()
                    social_acc.save(update_fields=["email", "extra_data", "last_login_at"])
            except IntegrityError:
                raise AccountConflict("account_conflict")

            if not user.is_email_verified and google_data.get("email_verified"):
                user.set_unusable_password()
                revoke_all_refresh_tokens(user)
                user.is_email_verified = True
                user.save()
                logger.info(
                    "Unverified account claimed via Google; password cleared: user_id=%s",
                    user.id,
                )

        return user


def send_password_reset_email(email: str) -> None:
    """
    Send the password reset email if the user exists and is active.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    from .emails import send_templated_email

    email = email.strip().lower()
    try:
        user = User.objects.get(email=email)
        if user.is_active:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            def _send_email():
                reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
                subject = "Reset your password — SORA"
                try:
                    send_templated_email(
                        subject=subject,
                        template_prefix="accounts/email/password_reset",
                        context={
                            "first_name": user.first_name,
                            "reset_url": reset_url,
                        },
                        recipient_email=user.email,
                        mascot_filename="sora_mascot_security.png",
                    )
                    logger.info("Password reset email sent to user_id=%s", user.id)
                except Exception as e:
                    logger.error("Failed to send password reset email to %s: %s", user.email, e)

            transaction.on_commit(_send_email)
    except User.DoesNotExist:
        pass


def confirm_password_reset(uid_b64: str, token: str, new_password: str) -> None:
    """
    Confirm password reset. Validates token, sets new password, marks email as verified,
    and invalidates all existing refresh tokens.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    try:
        uid = force_str(urlsafe_base64_decode(uid_b64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValueError("invalid_token")

    if not default_token_generator.check_token(user, token):
        raise ValueError("invalid_token")

    # Set password
    user.set_password(new_password)

    # Resetting password also verifies email
    if not user.is_email_verified:
        user.is_email_verified = True

    user.save(update_fields=["password", "is_email_verified", "updated_at"])

    # Invalidate all outstanding tokens for this user
    revoke_all_refresh_tokens(user)

    logger.info("Password reset successfully for user_id=%s", user.id)
    from apps.notifications.models import NotificationType
    from apps.notifications.notification_service import NotificationService

    NotificationService.notify(
        recipient=user,
        notification_type=NotificationType.SECURITY_PASSWORD_CHANGED,
        title="Password Reset",
        body=(
            "Your password has been reset successfully. "
            "If this was not you, please contact support immediately."
        ),
        data={},
    )
