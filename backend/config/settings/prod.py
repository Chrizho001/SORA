"""
Production settings for SORA study assistant backend.

Enforces strict security settings, required production environment variables,
HTTPS/HSTS headers, and proxy configuration.
"""

# ruff: noqa: F405

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401, F403

if AI_PROVIDER == "mock":
    raise ImproperlyConfigured("AI_PROVIDER cannot be 'mock' in production.")

GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
if not GOOGLE_CLIENT_ID:
    raise ImproperlyConfigured("GOOGLE_CLIENT_ID must be set in production.")


DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

FRONTEND_URL = env("FRONTEND_URL")
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
AUTH_COOKIE_SECURE = True

# Number of reverse proxies in front of Django for correct client IP resolution in rate limiting
REST_FRAMEWORK["NUM_PROXIES"] = env.int("NUM_PROXIES", default=1)

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="")
