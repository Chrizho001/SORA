"""
Group 6 — Logout endpoint tests.

Architecture ref: 01-authentication.md §4 (POST logout/), §6 (CSRF), §7 (Group 6).
"""

import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
class TestLogoutAPI:
    """Tests for POST /api/v1/auth/logout/"""

    url = reverse("accounts:logout")

    def get_headers(self):
        return {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}

    def test_with_valid_cookie_returns_205_blacklists_and_clears_cookie(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        api_client.cookies[cookie_name] = str(refresh)

        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_205_RESET_CONTENT
        assert not response.data  # Empty body

        cookie = response.cookies.get(cookie_name)
        assert cookie is not None
        assert cookie["max-age"] == 0 or cookie.value == ""

        # Verify token is blacklisted
        refresh_url = reverse("accounts:token-refresh")
        api_client.cookies[cookie_name] = str(refresh)
        refresh_response = api_client.post(refresh_url, **self.get_headers())
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_without_cookie_returns_205_idempotent(self, api_client):
        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_205_RESET_CONTENT

        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        cookie = response.cookies.get(cookie_name)
        assert cookie is not None
        assert cookie["max-age"] == 0 or cookie.value == ""

    def test_missing_x_requested_with_header_returns_403(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        api_client.cookies[cookie_name] = str(refresh)

        # No headers
        response = api_client.post(self.url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["code"] == "csrf_header_missing"
