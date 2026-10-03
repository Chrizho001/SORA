"""
Group 7 — Current User endpoint tests.

Architecture ref: 01-authentication.md §4 (GET me/), §7 (Group 7).
"""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.mark.django_db
class TestMeAPI:
    """Tests for GET /api/v1/auth/me/"""

    url = reverse("accounts:me")

    def test_authenticated_request_returns_200_and_user_shape(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["email"] == user.email
        assert data["first_name"] == user.first_name
        assert data["last_name"] == user.last_name
        assert data["is_email_verified"] is True
        assert "id" in data
        assert "auth_providers" in data

    def test_unauthenticated_request_returns_401(self, api_client):
        response = api_client.get(self.url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "not_authenticated"

    def test_deactivated_user_returns_401(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        user.is_active = False
        user.save()

        response = api_client.get(self.url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "user_inactive"
