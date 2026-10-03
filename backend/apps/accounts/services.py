"""
Business-logic services for the accounts app.

Views handle HTTP; services handle domain logic. This keeps views thin
and services independently testable.

Architecture ref: CLAUDE.md ("Thin views"), 01-authentication.md §5.
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.core.signing import dumps
from django.db import transaction

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
    token = dumps({"uid": str(user.id)}, salt="accounts.verify-email")
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    subject = "Verify your email - Study Assistant"
    message = (
        f"Hi {user.first_name},\n\n"
        "Welcome to Study Assistant! Please verify your email address by clicking the link below:\n\n"
        f"{verification_url}\n\n"
        "If you did not sign up for this account, you can safely ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
    logger.info("Verification email sent to user_id=%s", user.id)


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

    email = email.strip().lower()
    user = authenticate(email=email, password=password)

    if user is None:
        logger.warning("Failed login attempt for email: %s", email)
        raise ValueError("invalid_credentials")

    if not user.is_active:
        logger.warning("Login attempt for inactive user: %s", email)
        raise ValueError("invalid_credentials")

    if not user.is_email_verified:
        logger.warning("Login attempt for unverified user: %s", email)
        raise ValueError("email_not_verified")

    return user


def change_password(user: User, new_password: str) -> None:
    """
    Update a user's password and update last_login to invalidate old sessions.
    """
    from django.contrib.auth.models import update_last_login

    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    update_last_login(None, user)
    logger.info("Password changed for user_id=%s", user.id)


def login_with_google(token: str) -> User:
    """
    Authenticate a user via Google ID token.
    Auto-registers or links existing accounts.
    """
    from .google import verify_google_id_token
    from .models import SocialAccount

    try:
        google_data = verify_google_id_token(token)
    except ValueError as e:
        logger.warning("Google login failed: %s", str(e))
        raise ValueError("invalid_google_token") from e

    email = google_data.get("email", "").strip().lower()
    uid = google_data.get("sub")

    if not email or not uid:
        raise ValueError("invalid_google_token")

    # Try to find by social account first
    try:
        social_acc = SocialAccount.objects.get(provider="google", provider_uid=uid)
        user = social_acc.user

        if not user.is_active:
            raise ValueError("invalid_credentials")

        return user
    except SocialAccount.DoesNotExist:
        pass

    # Try to find by email
    try:
        user = User.objects.get(email=email)

        if not user.is_active:
            raise ValueError("invalid_credentials")

        # Link account
        SocialAccount.objects.create(user=user, provider="google", provider_uid=uid)
        logger.info("Linked Google account to user_id=%s", user.id)

        # If the email wasn't verified before, it is now
        if not user.is_email_verified and google_data.get("email_verified"):
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified", "updated_at"])

        return user
    except User.DoesNotExist:
        pass

    # Create new user
    user = User(
        email=email,
        first_name=google_data.get("given_name", ""),
        last_name=google_data.get("family_name", ""),
        is_email_verified=google_data.get("email_verified", False),
    )
    user.set_unusable_password()
    user.save()

    SocialAccount.objects.create(user=user, provider="google", provider_uid=uid)
    logger.info("Created new user via Google login: user_id=%s", user.id)

    return user


def send_password_reset_email(email: str) -> None:
    """
    Send the password reset email if the user exists and is active.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    email = email.strip().lower()
    try:
        user = User.objects.get(email=email)
        if user.is_active:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            def _send_email():
                reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
                subject = "Reset your password - Study Assistant"
                message = (
                    f"Hi {user.first_name},\n\n"
                    "You requested to reset your password. Please click the link below to set a new password:\n\n"
                    f"{reset_url}\n\n"
                    "If you didn't request this, you can safely ignore this email."
                )
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info("Password reset email sent to user_id=%s", user.id)

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
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

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
    tokens = OutstandingToken.objects.filter(user=user)
    for t in tokens:
        BlacklistedToken.objects.get_or_create(token=t)

    logger.info("Password reset successfully for user_id=%s", user.id)
