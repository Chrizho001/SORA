"""
Group 5 — Token refresh endpoint tests.

Architecture ref: 01-authentication.md §4 (POST token/refresh/), §6 (CSRF), §7 (Group 5).
"""

import pytest
from django.conf import settings
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
class TestTokenRefreshAPI:
    """Tests for POST /api/v1/auth/token/refresh/"""

    url = reverse("accounts:token-refresh")

    def get_headers(self):
        return {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}

    def test_valid_cookie_and_header_returns_200_and_rotates_cookie(self, api_client, user):
        old_refresh = RefreshToken.for_user(user)
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)

        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

        # Check new cookie
        cookie = response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]
        new_refresh = cookie.value
        assert new_refresh != str(old_refresh)
        assert cookie["httponly"] is True

    def test_old_refresh_token_is_blacklisted_after_rotation(self, api_client, user):
        old_refresh = RefreshToken.for_user(user)
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)

        # First rotation
        api_client.post(self.url, **self.get_headers())

        # Reuse old token
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)
        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "refresh_invalid"

    def test_no_cookie_returns_401_refresh_missing(self, api_client):
        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "refresh_missing"
        # Cookie is cleared
        cookie = response.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
        assert cookie is not None
        assert cookie["max-age"] == 0 or cookie.value == ""

    def test_malformed_cookie_returns_401_and_clears_cookie(self, api_client):
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = "bad-token"

        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "refresh_invalid"

        cookie = response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]
        assert cookie["max-age"] == 0 or cookie.value == ""

    def test_expired_refresh_token_returns_401(self, api_client, user):
        with freeze_time("2026-01-01 12:00:00"):
            old_refresh = RefreshToken.for_user(user)

        with freeze_time("2026-01-09 12:00:00"): # > 7 days
            api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)
            response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "refresh_invalid"

    def test_user_deactivated_since_login_returns_401(self, api_client, user):
        old_refresh = RefreshToken.for_user(user)
        user.is_active = False
        user.save()

        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)
        response = api_client.post(self.url, **self.get_headers())

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "refresh_invalid"

    def test_missing_x_requested_with_header_returns_403(self, api_client, user):
        old_refresh = RefreshToken.for_user(user)
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(old_refresh)

        # No headers
        response = api_client.post(self.url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["code"] == "csrf_header_missing"

    def test_refresh_rejected_after_max_session_age(self, api_client, user):
        import time
        with freeze_time("2026-01-01 12:00:00"):
            refresh = RefreshToken.for_user(user)
            refresh["auth_time"] = int(time.time())
            
        with freeze_time("2026-01-04 12:00:00"):
            # Rotate at day 3 (within 7 days)
            api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(refresh)
            res1 = api_client.post(self.url, **self.get_headers())
            assert res1.status_code == 200
            refresh2_str = res1.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
            
        with freeze_time("2026-01-06 12:00:00"):
            # Mock settings.AUTH_MAX_SESSION_AGE to 4 days (4 * 86400)
            settings.AUTH_MAX_SESSION_AGE = 4 * 86400
            # Try to rotate at day 5. 5 days > 4 days auth max age
            api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = refresh2_str
            res2 = api_client.post(self.url, **self.get_headers())
            assert res2.status_code == status.HTTP_401_UNAUTHORIZED
            assert res2.data["code"] == "refresh_invalid"
