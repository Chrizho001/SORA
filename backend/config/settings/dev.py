"""
Development settings.

Extends base with DEBUG, console email, and permissive CORS.
"""

from .base import *  # noqa: F401, F403

DEBUG = True

# Console email backend — emails are printed to stdout (CLAUDE.md)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "Study Assistant <noreply@localhost>"

# Dev does not require secure cookies
AUTH_COOKIE_SECURE = False
