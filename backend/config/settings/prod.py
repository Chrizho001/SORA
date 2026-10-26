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

# Render injects the service's own hostname; the Vercel rewrite proxies with that Host header.
RENDER_EXTERNAL_HOSTNAME = env("RENDER_EXTERNAL_HOSTNAME", default="")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS = [*ALLOWED_HOSTS, RENDER_EXTERNAL_HOSTNAME]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

FRONTEND_URL = env("FRONTEND_URL")
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
AUTH_COOKIE_SECURE = True

# Number of reverse proxies in front of Django for correct client IP resolution in rate limiting.
# On Railway: platform edge + Next.js rewrite = 2 (docs/deployment.md, SEC-03).
REST_FRAMEWORK["NUM_PROXIES"] = env.int("NUM_PROXIES", default=1)

# Static files (Django admin) served by the app itself (DEP-01); collectstatic runs at image build.
MIDDLEWARE.insert(
    MIDDLEWARE.index("django.middleware.security.SecurityMiddleware") + 1,
    "whitenoise.middleware.WhiteNoiseMiddleware",
)
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Email: Brevo's HTTPS API when BREVO_API_KEY is set (Render's free tier blocks outbound SMTP),
# otherwise plain SMTP. One of the two is required.
BREVO_API_KEY = env("BREVO_API_KEY", default="")
EMAIL_HOST = env("EMAIL_HOST", default="")
if BREVO_API_KEY:
    INSTALLED_APPS.append("anymail")
    EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
    ANYMAIL = {"BREVO_API_KEY": BREVO_API_KEY}
elif EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    raise ImproperlyConfigured("Set BREVO_API_KEY or EMAIL_HOST for production email.")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="")
