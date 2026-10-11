from rest_framework.exceptions import APIException
from django.utils.translation import gettext_lazy as _

class AuthError(Exception):
    """Base class for authentication errors"""
    code = "auth_error"

class InvalidCredentials(AuthError):
    code = "invalid_credentials"

class EmailNotVerified(AuthError):
    code = "email_not_verified"

class GoogleTokenInvalid(AuthError):
    code = "google_token_invalid"

class GoogleEmailUnverified(AuthError):
    code = "google_email_unverified"

class GoogleUnavailable(AuthError):
    code = "google_unavailable"

class AccountConflict(AuthError):
    code = "account_conflict"

# API Exceptions
class ConflictError(APIException):
    status_code = 409
    default_detail = _('Conflict.')
    default_code = 'conflict'

class ServiceUnavailable(APIException):
    status_code = 503
    default_detail = _('Service unavailable.')
    default_code = 'service_unavailable'
