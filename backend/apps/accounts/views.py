"""
API views for the accounts app.

Views handle HTTP only — they delegate to serializers for validation
and to services.py for business logic.

Architecture ref: CLAUDE.md ("Thin views"), 01-authentication.md §4.
"""

import logging
import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.utils import datetime_from_epoch

from apps.notifications.models import PushSubscription

from .cookies import clear_refresh_cookie, set_refresh_cookie
from .exceptions import (
    AccountConflict,
    ConflictError,
    EmailNotVerified,
    GoogleEmailUnverified,
    GoogleTokenInvalid,
    GoogleUnavailable,
    InvalidCredentials,
    InvalidToken,
    ServiceUnavailable,
    VerifyEmailError,
)
from .serializers import (
    ChangePasswordSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetSerializer,
    RegisterSerializer,
    UserSerializer,
    UserUpdateSerializer,
    VerifyEmailResendSerializer,
    VerifyEmailSerializer,
)
from .services import (
    authenticate_user,
    change_password,
    confirm_password_reset,
    issue_login_tokens,
    login_with_google,
    register_user,
    resend_verification_email,
    send_password_reset_email,
    verify_email,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class RegisterAPIView(APIView):
    """
    POST /api/v1/auth/register/
    Registers a new user and schedules a verification email.
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_register"

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = register_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
                first_name=serializer.validated_data["first_name"],
                last_name=serializer.validated_data["last_name"],
            )
        except IntegrityError:
            raise serializers.ValidationError({"email": ["This email is already registered."]})

        response_data = UserSerializer(user).data
        return Response(response_data, status=status.HTTP_201_CREATED)


class VerifyEmailAPIView(APIView):
    """
    POST /api/v1/auth/verify-email/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_verify"

    def post(self, request, *args, **kwargs):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verify_email(serializer.validated_data["token"])
        except ValueError as e:
            raise VerifyEmailError(code=str(e))

        return Response({"detail": "Email verified."}, status=status.HTTP_200_OK)


class VerifyEmailResendAPIView(APIView):
    """
    POST /api/v1/auth/verify-email/resend/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_email"

    def post(self, request, *args, **kwargs):
        serializer = VerifyEmailResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resend_verification_email(serializer.validated_data["email"])

        return Response(
            {"detail": "If the account exists and is unverified, an email has been sent."},
            status=status.HTTP_200_OK,
        )


class LoginAPIView(APIView):
    """
    POST /api/v1/auth/login/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = authenticate_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except InvalidCredentials:
            raise AuthenticationFailed(detail="Invalid credentials.", code="invalid_credentials")
        except EmailNotVerified:
            raise PermissionDenied(detail="Email not verified.", code="email_not_verified")

        refresh = issue_login_tokens(user)

        response_data = {
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, str(refresh))

        return response


class RequireXMLHttpRequest(permissions.BasePermission):
    """
    CSRF defence: requires X-Requested-With: XMLHttpRequest.
    """

    message = "Missing CSRF header."
    code = "csrf_header_missing"

    def has_permission(self, request, view):
        if request.META.get("HTTP_X_REQUESTED_WITH") != "XMLHttpRequest":
            raise PermissionDenied(detail=self.message, code=self.code)
        return True


class TokenRefreshAPIView(APIView):
    """
    POST /api/v1/auth/token/refresh/
    """

    permission_classes = [AllowAny, RequireXMLHttpRequest]
    throttle_scope = "auth_refresh"

    def post(self, request, *args, **kwargs):
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        refresh_token_str = request.COOKIES.get(cookie_name)

        if not refresh_token_str:
            response = Response(
                {"detail": "Refresh token missing.", "code": "refresh_missing"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response

        try:
            refresh = RefreshToken(refresh_token_str)
        except TokenError:
            response = Response(
                {"detail": "Refresh token invalid or expired.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response

        # Check if user is still active
        try:
            user = User.objects.get(id=refresh.payload.get("user_id"))
            if not user.is_active:
                raise TokenError("User inactive")
        except (User.DoesNotExist, TokenError):
            response = Response(
                {"detail": "User inactive or deleted.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response

        auth_time = refresh.get("auth_time", refresh["iat"])
        max_age = getattr(settings, "AUTH_MAX_SESSION_AGE", 30 * 86400)
        if time.time() - auth_time > max_age:
            response = Response(
                {"detail": "Session expired.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response

        # Rotate token atomically
        jti = refresh.payload.get("jti")
        exp = refresh.payload.get("exp")

        with transaction.atomic():
            outstanding, _ = OutstandingToken.objects.get_or_create(
                jti=jti,
                defaults={
                    "user": user,
                    "created_at": refresh.current_time,
                    "token": str(refresh),
                    "expires_at": datetime_from_epoch(exp),
                },
            )
            _, created = BlacklistedToken.objects.get_or_create(token=outstanding)
            if not created:
                response = Response(
                    {"detail": "Refresh token invalid or expired.", "code": "refresh_invalid"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
                clear_refresh_cookie(response)
                return response

            new_refresh = RefreshToken.for_user(user)
            new_refresh["auth_time"] = auth_time

        response = Response({"access": str(new_refresh.access_token)}, status=status.HTTP_200_OK)
        set_refresh_cookie(response, str(new_refresh))
        return response


class LogoutAPIView(APIView):
    """
    POST /api/v1/auth/logout/
    """

    permission_classes = [AllowAny, RequireXMLHttpRequest]

    def post(self, request, *args, **kwargs):
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        refresh_token_str = request.COOKIES.get(cookie_name)
        user = None

        if refresh_token_str:
            try:
                refresh = RefreshToken(refresh_token_str)
                user_id = refresh.payload.get("user_id")
                if user_id:
                    user = User.objects.filter(id=user_id, is_active=True).first()
                refresh.blacklist()
            except TokenError:
                # Token already invalid or blacklisted, ignore
                pass

        push_endpoint = request.data.get("push_endpoint")
        if push_endpoint and user:
            PushSubscription.objects.filter(user=user, endpoint=push_endpoint).update(
                revoked_at=timezone.now()
            )

        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeAPIView(APIView):
    """
    GET / PATCH /api/v1/auth/me/
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        user = request.user
        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)


class ChangePasswordAPIView(APIView):
    """
    POST /api/v1/auth/password/change/
    """

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_password"

    def post(self, request, *args, **kwargs):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        change_password(
            user=request.user,
            new_password=serializer.validated_data["password"],
        )

        new_refresh = RefreshToken.for_user(request.user)
        new_refresh["auth_time"] = int(time.time())

        response = Response(
            {"detail": "Password changed successfully.", "access": str(new_refresh.access_token)},
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, str(new_refresh))
        return response


class GoogleLoginAPIView(APIView):
    """
    POST /api/v1/auth/google/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = login_with_google(serializer.validated_data["token"])
        except GoogleTokenInvalid:
            raise AuthenticationFailed(detail="Invalid Google token.", code="invalid_google_token")
        except InvalidCredentials:
            raise AuthenticationFailed(detail="Invalid credentials.", code="invalid_credentials")
        except GoogleEmailUnverified:
            raise AuthenticationFailed(
                detail="Google email not verified.", code="google_email_unverified"
            )
        except AccountConflict:
            raise ConflictError(
                detail="Account already linked to another user.", code="account_conflict"
            )
        except GoogleUnavailable:
            raise ServiceUnavailable(
                detail="Google service unavailable.", code="google_unavailable"
            )

        refresh = issue_login_tokens(user)

        response_data = {
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, str(refresh))

        return response


class PasswordResetAPIView(APIView):
    """
    POST /api/v1/auth/password-reset/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_email"

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        send_password_reset_email(serializer.validated_data["email"])

        return Response(
            {"detail": "If the account exists, a reset email has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmAPIView(APIView):
    """
    POST /api/v1/auth/password-reset/confirm/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_password"

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            confirm_password_reset(
                uid_b64=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValueError as e:
            raise InvalidToken(code=str(e))

        return Response(
            {"detail": "Password has been reset."},
            status=status.HTTP_200_OK,
        )
