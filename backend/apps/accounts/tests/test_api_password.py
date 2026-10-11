"""
Group 8 — Password management endpoint tests.

Architecture ref: 01-authentication.md §4 (POST password/change/), §7 (Group 8).
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
class TestChangePasswordAPI:
    """Tests for POST /api/v1/auth/password/change/"""

    url = reverse("accounts:password-change")

    def test_valid_data_returns_200_and_updates_password(self, api_client, user, password):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "old_password": password,
            "password": "New!Password123",
            "password_confirm": "New!Password123",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Password changed successfully."

        user.refresh_from_db()
        assert user.check_password("New!Password123") is True
        assert user.check_password(password) is False

    def test_missing_or_wrong_old_password_returns_400(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "old_password": "wrongpassword",
            "password": "New!Password123",
            "password_confirm": "New!Password123",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "old_password" in response.data["errors"]
        assert response.data["code"] == "validation_error"

    def test_weak_new_password_returns_400(self, api_client, user, password):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "old_password": password,
            "password": "123",
            "password_confirm": "123",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data["errors"]

    def test_password_confirm_mismatch_returns_400(self, api_client, user, password):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "old_password": password,
            "password": "New!Password123",
            "password_confirm": "Different!123",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data["errors"]

    def test_unauthenticated_request_returns_401(self, api_client):
        payload = {
            "old_password": "some_password",
            "password": "New!Password123",
            "password_confirm": "New!Password123",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_password_change_invalidates_all_refresh_tokens(self, api_client, user, password):
        from django.conf import settings
        refresh = RefreshToken.for_user(user)
        
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        payload = {
            "old_password": password,
            "password": "New!Password123",
            "password_confirm": "New!Password123",
        }
        api_client.post(self.url, payload, format="json")
        
        # Try to use old refresh token
        refresh_url = reverse("accounts:token-refresh")
        api_client.credentials() # clear access token
        api_client.cookies[settings.AUTH_REFRESH_COOKIE_NAME] = str(refresh)
        
        response = api_client.post(refresh_url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

