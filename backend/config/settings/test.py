"""
Test settings.

Uses locmem email backend so tests can assert through django.core.mail.outbox.
Logging is quietened to reduce noise during test runs.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

# In-memory email backend — assert via django.core.mail.outbox (CLAUDE.md)
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_FROM_EMAIL = "Study Assistant <noreply@test.localhost>"

# Secure cookies off in test (no HTTPS)
AUTH_COOKIE_SECURE = False

# Quieten logs during tests to keep output clean
LOGGING["loggers"]["apps"]["level"] = "WARNING"  # noqa: F405
LOGGING["loggers"]["django"]["level"] = "WARNING"  # noqa: F405
LOGGING["root"]["level"] = "WARNING"  # noqa: F405

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Celery eager execution in tests (NEW-9)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
