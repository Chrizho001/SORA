"""
API views for the accounts app.

Views handle HTTP only — they delegate to serializers for validation
and to services.py for business logic.

Architecture ref: CLAUDE.md ("Thin views"), 01-authentication.md §4.
"""

import logging

from rest_framework import status
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

        user = register_user(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
        )

        response_data = UserSerializer(user).data
        return Response(response_data, status=status.HTTP_201_CREATED)


class VerifyEmailAPIView(APIView):
    """
    POST /api/v1/auth/verify-email/
    """

    permission_classes = [AllowAny]

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
        from django.contrib.auth.models import update_last_login
        from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
        from rest_framework_simplejwt.tokens import RefreshToken

        from .cookies import set_refresh_cookie
        from .serializers import LoginSerializer, UserSerializer
        from .services import authenticate_user

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = authenticate_user(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except ValueError as e:
            if str(e) == "invalid_credentials":
                raise AuthenticationFailed(detail="Invalid credentials.", code="invalid_credentials")
            elif str(e) == "email_not_verified":
                raise PermissionDenied(detail="Email not verified.", code="email_not_verified")
            raise

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)

        response_data = {
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        set_refresh_cookie(response, str(refresh))

        return response


import rest_framework


class RequireXMLHttpRequest(rest_framework.permissions.BasePermission):
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
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_refresh_cookie(response)
            return response

        try:
            refresh = RefreshToken(refresh_token_str)
        except TokenError:
            response = Response(
                {"detail": "Refresh token invalid or expired.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_refresh_cookie(response)
            return response

        # Check if user is still active
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(id=refresh.payload.get("user_id"))
            if not user.is_active:
                raise TokenError("User inactive")
        except (User.DoesNotExist, TokenError):
            response = Response(
                {"detail": "User inactive or deleted.", "code": "refresh_invalid"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_refresh_cookie(response)
            return response

        # Rotate token
        refresh.blacklist()
        new_refresh = RefreshToken.for_user(user)

        response = Response(
            {"access": str(new_refresh.access_token)},
            status=status.HTTP_200_OK
        )
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

        if refresh_token_str:
            try:
                refresh = RefreshToken(refresh_token_str)
                refresh.blacklist()
            except TokenError:
                # Token already invalid or blacklisted, ignore
                pass

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

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK
        )


class GoogleLoginAPIView(APIView):
    """
    POST /api/v1/auth/google/
    """
    permission_classes = [AllowAny]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        from django.contrib.auth.models import update_last_login
        from rest_framework.exceptions import AuthenticationFailed
        from rest_framework_simplejwt.tokens import RefreshToken

        from .cookies import set_refresh_cookie
        from .serializers import GoogleLoginSerializer, UserSerializer
        from .services import login_with_google

        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = login_with_google(serializer.validated_data["token"])
        except ValueError as e:
            if str(e) == "invalid_google_token":
                from rest_framework.exceptions import AuthenticationFailed
                raise AuthenticationFailed(detail="Invalid Google token.", code="invalid_google_token")
            elif str(e) == "invalid_credentials":
                raise AuthenticationFailed(detail="Invalid credentials.", code="invalid_credentials")
            raise

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)

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
