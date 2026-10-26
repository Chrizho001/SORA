"""
Base settings shared across all environments.

Architecture refs:
    - architecture/00-overview.md (cross-cutting conventions)
    - architecture/01-authentication.md §6 (JWT, cookie, throttle, password settings)
    - CLAUDE.md (stack, conventions)
"""

import os
from datetime import timedelta
from pathlib import Path

import environ

# ──────────────────────────────────────────────
# Paths & env
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # …/backend/

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)
# Read .env only if it exists (CI and prod inject env vars directly)
_env_file = BASE_DIR / ".env"
if _env_file.is_file():
    env.read_env(str(_env_file))

# ──────────────────────────────────────────────
# Core
# ──────────────────────────────────────────────
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
ADMIN_URL = env("ADMIN_URL", default="admin/")
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ──────────────────────────────────────────────
# Applications
# ──────────────────────────────────────────────
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    # Local
    "apps.accounts",
    "apps.tasks",
    "apps.documents",
    "apps.flashcards",
    "apps.quizzes",
    "apps.notifications",
]

# ──────────────────────────────────────────────
# Middleware
# ──────────────────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "config.middleware.RequestSizeLimitMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ──────────────────────────────────────────────
# Database — PostgreSQL via psycopg 3
# ──────────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL"),
}

# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

# Password hashing — Argon2 first (NFR-1.1)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# Password validators (01-authentication.md §6)
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Password reset token timeout (01-authentication.md §3)
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour

# ──────────────────────────────────────────────
# Django REST Framework
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "5/min",
        "auth_register": "10/hour",
        "auth_email": "5/hour",
        "auth_password": "10/min",
        "auth_verify": "10/min",
        "auth_refresh": "30/min",
        "ai_jobs": "20/day",
        "quiz_create": "30/hour",
        "quiz_submit": "30/min",
    },
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
    }
}

# ──────────────────────────────────────────────
# Simple JWT (01-authentication.md §6)
# ──────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ──────────────────────────────────────────────
# CORS (01-authentication.md §6)
# ──────────────────────────────────────────────
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CORS_ALLOW_CREDENTIALS = True

# ──────────────────────────────────────────────
# Auth cookies (01-authentication.md §6)
# ──────────────────────────────────────────────
AUTH_REFRESH_COOKIE_NAME = env("AUTH_REFRESH_COOKIE_NAME", default="refresh_token")
AUTH_COOKIE_SECURE = env.bool("AUTH_COOKIE_SECURE", default=False)
AUTH_COOKIE_SAMESITE = "Lax"
AUTH_COOKIE_PATH = "/api/v1/auth/"

# ──────────────────────────────────────────────
# Email verification (01-authentication.md §3)
# ──────────────────────────────────────────────
ACCOUNTS_EMAIL_VERIFICATION_MAX_AGE = 24 * 60 * 60  # 24 hours
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

# ──────────────────────────────────────────────
# Google sign-in (ADR-0002, 01-authentication.md §6)
# ──────────────────────────────────────────────
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")

# ──────────────────────────────────────────────
# Internationalisation
# ──────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# Static files
# ──────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ──────────────────────────────────────────────
# Templates (admin)
# ──────────────────────────────────────────────
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ──────────────────────────────────────────────
# Logging
#
# Every module uses: logger = logging.getLogger(__name__)
# NEVER log passwords, tokens, credentials, or PII beyond user IDs.
# ──────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name} | {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "[{levelname}] {name} | {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        # Application loggers — DEBUG in dev, filtered by env-specific overrides
        "apps": {
            "handlers": ["console"],
            "level": os.environ.get("APPS_LOG_LEVEL", "DEBUG"),
            "propagate": False,
        },
        "config": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        # Quieten noisy third-party loggers
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# ──────────────────────────────────────────────
# Celery
# ──────────────────────────────────────────────
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = None
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_SOFT_TIME_LIMIT = 240
CELERY_BEAT_SCHEDULE = {
    "task-due-reminders": {
        "task": "apps.notifications.tasks.send_due_task_reminders",
        "schedule": 900,
    },
    "flush-expired-tokens": {
        "task": "apps.accounts.tasks.flush_expired_tokens",
        "schedule": 86400,
    },
}

# ──────────────────────────────────────────────
# Push Notifications (VAPID)
# ──────────────────────────────────────────────
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", default="")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", default="")
VAPID_CLAIM_EMAIL = env("VAPID_CLAIM_EMAIL", default="")

# ──────────────────────────────────────────────
# AI API
# ──────────────────────────────────────────────
AI_PROVIDER = env("AI_PROVIDER", default="gemini")
AI_API_KEY = env("AI_API_KEY", default="")
AI_BASE_URL = env("AI_BASE_URL", default="https://generativelanguage.googleapis.com/v1beta/models")
AI_MODEL_NAME = env("AI_MODEL_NAME", default="gemini-3.5-flash")
AI_MAX_PROMPT_CHARS = env.int("AI_MAX_PROMPT_CHARS", default=500000)

# ──────────────────────────────────────────────
# Media (Uploads)
# ──────────────────────────────────────────────
MEDIA_ROOT = env("MEDIA_ROOT", default=str(BASE_DIR / "media"))

# ──────────────────────────────────────────────
# Upload limits (SEC-04)
# ──────────────────────────────────────────────
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_REQUEST_BODY_SIZE = 12 * 1024 * 1024  # 12 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024  # 12 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

# ──────────────────────────────────────────────
# Documents
# ──────────────────────────────────────────────
DOCUMENT_MAX_PAGES = env.int("DOCUMENT_MAX_PAGES", default=50)
DOCUMENT_MAX_CHARS = env.int("DOCUMENT_MAX_CHARS", default=100000)
