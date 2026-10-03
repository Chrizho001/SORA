"""
Production settings — stub.

To be completed when deploying. This file should never be used
for local development or testing.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

# Enforce HTTPS cookies in production
AUTH_COOKIE_SECURE = True

# TODO: Configure production email backend (SMTP or transactional service)
# TODO: Set SECURE_SSL_REDIRECT, SECURE_HSTS_SECONDS, etc.
# TODO: Configure STATIC_ROOT / whitenoise for static file serving
