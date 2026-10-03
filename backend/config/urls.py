"""
Root URL configuration.

All API endpoints live under /api/v1/. Each app owns its own urls.py
and is included here. See architecture/00-overview.md.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls", namespace="accounts")),
    path("api/v1/tasks/", include("apps.tasks.urls", namespace="tasks")),
]
