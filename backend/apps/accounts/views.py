"""
API views for the accounts app.

Views handle HTTP only — they delegate to serializers for validation
and to services.py for business logic.

Architecture ref: CLAUDE.md ("Thin views"), 01-authentication.md §4.
"""

import logging

from rest_framework import permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer
from .services import register_user

logger = logging.getLogger(__name__)


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

        from django.db import IntegrityError
        from rest_framework import serializers

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
        from .serializers import VerifyEmailSerializer
        from .services import verify_email

        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verify_email(serializer.validated_data["token"])
        except ValueError as e:
            from rest_framework.exceptions import APIException

            class VerifyEmailError(APIException):
                status_code = 400
                default_detail = "Validation error."

            raise VerifyEmailError(code=str(e))

        return Response({"detail": "Email verified."}, status=status.HTTP_200_OK)


class VerifyEmailResendAPIView(APIView):
    """
    POST /api/v1/auth/verify-email/resend/
    """

    permission_classes = [AllowAny]
    throttle_scope = "auth_email"

    def post(self, request, *args, **kwargs):
        from .serializers import VerifyEmailResendSerializer
        from .services import resend_verification_email

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
        from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

        from .cookies import set_refresh_cookie
        from .serializers import LoginSerializer, UserSerializer
        from .services import authenticate_user, issue_login_tokens

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from .exceptions import EmailNotVerified, InvalidCredentials

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
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(detail=self.message, code=self.code)
        return True


class TokenRefreshAPIView(APIView):
    """
    POST /api/v1/auth/token/refresh/
    """

    permission_classes = [AllowAny, RequireXMLHttpRequest]
    throttle_scope = "auth_refresh"

    def post(self, request, *args, **kwargs):
        from django.conf import settings
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        from .cookies import clear_refresh_cookie, set_refresh_cookie

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
        from django.contrib.auth import get_user_model

        user_model = get_user_model()
        try:
            user = user_model.objects.get(id=refresh.payload.get("user_id"))
            if not user.is_active:
                raise TokenError("User inactive")
        except (user_model.DoesNotExist, TokenError):
            response = Response(
                {"detail": "User inactive or deleted.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_refresh_cookie(response)
            return response

        import time

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
        from django.db import transaction
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )
        from rest_framework_simplejwt.utils import datetime_from_epoch

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
        from django.conf import settings
        from rest_framework_simplejwt.exceptions import TokenError
        from rest_framework_simplejwt.tokens import RefreshToken

        from .cookies import clear_refresh_cookie

        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        refresh_token_str = request.COOKIES.get(cookie_name)
        user = None

        if refresh_token_str:
            try:
                refresh = RefreshToken(refresh_token_str)
                user_id = refresh.payload.get("user_id")
                if user_id:
                    from django.contrib.auth import get_user_model

                    user_model = get_user_model()
                    user = user_model.objects.filter(id=user_id, is_active=True).first()
                refresh.blacklist()
            except TokenError:
                # Token already invalid or blacklisted, ignore
                pass

        push_endpoint = request.data.get("push_endpoint")
        if push_endpoint and user:
            from django.utils import timezone

            from apps.notifications.models import PushSubscription

            PushSubscription.objects.filter(user=user, endpoint=push_endpoint).update(
                revoked_at=timezone.now()
            )

        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_refresh_cookie(response)
        return response


class MeAPIView(APIView):
    """
    GET /api/v1/auth/me/
    """

    # Requires authentication (which is set globally, but we can be explicit)
    from rest_framework.permissions import IsAuthenticated

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from .serializers import UserSerializer

        # User is already attached to request by DRF Simple JWT
        user = request.user

        # If we got here, the token is valid, but we need to check if the user
        # is still active (JWT tokens don't check the DB automatically unless configured to)
        if not user.is_active:
            from rest_framework.exceptions import AuthenticationFailed

            raise AuthenticationFailed("User is inactive", code="user_inactive")

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        from .serializers import UserSerializer, UserUpdateSerializer

        user = request.user
        if not user.is_active:
            from rest_framework.exceptions import AuthenticationFailed

            raise AuthenticationFailed("User is inactive", code="user_inactive")

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        return Response(UserSerializer(updated_user).data, status=status.HTTP_200_OK)


class ChangePasswordAPIView(APIView):
    """
    POST /api/v1/auth/password/change/
    """

    from rest_framework.permissions import IsAuthenticated

    permission_classes = [IsAuthenticated]
    throttle_scope = "auth_password"

    def post(self, request, *args, **kwargs):
        from .serializers import ChangePasswordSerializer
        from .services import change_password

        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        change_password(
            user=request.user,
            new_password=serializer.validated_data["password"],
        )

        import time

        from rest_framework_simplejwt.tokens import RefreshToken

        from .cookies import set_refresh_cookie

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
        from rest_framework.exceptions import AuthenticationFailed

        from .cookies import set_refresh_cookie
        from .serializers import GoogleLoginSerializer, UserSerializer
        from .services import issue_login_tokens, login_with_google

        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from .exceptions import (
            AccountConflict,
            ConflictError,
            GoogleEmailUnverified,
            GoogleTokenInvalid,
            GoogleUnavailable,
            InvalidCredentials,
            ServiceUnavailable,
        )

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
        from .serializers import PasswordResetSerializer
        from .services import send_password_reset_email

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
        from rest_framework.exceptions import APIException

        from .serializers import PasswordResetConfirmSerializer
        from .services import confirm_password_reset

        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        class InvalidToken(APIException):
            status_code = 400
            default_detail = "Validation error."
            default_code = "invalid_token"

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
