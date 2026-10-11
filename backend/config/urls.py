"""
Root URL configuration.

All API endpoints live under /api/v1/. Each app owns its own urls.py
and is included here. See architecture/00-overview.md.
"""

from django.contrib import admin
from django.urls import include, path

from django.conf import settings
import environ

env = environ.Env()

urlpatterns = [
    path(env("ADMIN_URL", default="admin/"), admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls", namespace="accounts")),
    path("api/v1/tasks/", include("apps.tasks.urls", namespace="tasks")),
    path("api/v1/documents/", include("apps.documents.urls", namespace="documents")),
    path("api/v1/flashcards/", include("apps.flashcards.urls", namespace="flashcards")),
    path("api/v1/quiz-sessions/", include("apps.quizzes.urls", namespace="quizzes")),
    path("api/v1/", include("apps.notifications.urls", namespace="notifications")),
]
