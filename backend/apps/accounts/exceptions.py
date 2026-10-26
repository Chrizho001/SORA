from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import APIException


class AuthError(Exception):
    """Base class for authentication errors"""

    code = "auth_error"


class InvalidCredentialsError(AuthError):
    code = "invalid_credentials"


InvalidCredentials = InvalidCredentialsError


class EmailNotVerifiedError(AuthError):
    code = "email_not_verified"


EmailNotVerified = EmailNotVerifiedError


class GoogleTokenInvalidError(AuthError):
    code = "google_token_invalid"


GoogleTokenInvalid = GoogleTokenInvalidError


class GoogleEmailUnverifiedError(AuthError):
    code = "google_email_unverified"


GoogleEmailUnverified = GoogleEmailUnverifiedError


class GoogleUnavailableError(AuthError):
    code = "google_unavailable"


GoogleUnavailable = GoogleUnavailableError


class AccountConflictError(AuthError):
    code = "account_conflict"


AccountConflict = AccountConflictError


# API Exceptions
class ConflictError(APIException):
    status_code = 409
    default_detail = _("Conflict.")
    default_code = "conflict"


class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = _("Service unavailable.")
    default_code = "service_unavailable"


class VerifyEmailError(APIException):
    status_code = 400
    default_detail = _("Validation error.")
    default_code = "validation_error"


class InvalidToken(APIException):
    status_code = 400
    default_detail = _("Validation error.")
    default_code = "invalid_token"
