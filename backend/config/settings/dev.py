"""
Development settings.

Extends base with DEBUG, console email, and permissive CORS.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Email configuration: supports Resend SMTP when RESEND_API_KEY is set in .env
RESEND_API_KEY = env("RESEND_API_KEY", default="")
if RESEND_API_KEY:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "smtp.resend.com"
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = "resend"
    EMAIL_HOST_PASSWORD = RESEND_API_KEY
    DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="SORA <onboarding@resend.dev>")
else:
    # Console email backend — emails are printed to stdout (CLAUDE.md)
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="SORA <noreply@localhost>")

# Dev does not require secure cookies
AUTH_COOKIE_SECURE = False
