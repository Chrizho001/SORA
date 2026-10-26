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

    def test_patch_names_persisted(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            self.url,
            {"first_name": "NewFirst", "last_name": "NewLast"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["first_name"] == "NewFirst"
        assert data["last_name"] == "NewLast"
        assert data["email"] == user.email
        assert "auth_providers" in data

        user.refresh_from_db()
        assert user.first_name == "NewFirst"
        assert user.last_name == "NewLast"

    def test_patch_trims_whitespace(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            self.url,
            {"first_name": "   TrimmedFirst   ", "last_name": "   TrimmedLast   "},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "TrimmedFirst"
        assert user.last_name == "TrimmedLast"

    def test_patch_email_and_is_email_verified_ignored(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        original_email = user.email
        original_verified = user.is_email_verified

        response = api_client.patch(
            self.url,
            {
                "first_name": "UpdatedName",
                "email": "hacker@evil.com",
                "is_email_verified": not original_verified,
                "is_staff": True,
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "UpdatedName"
        assert user.email == original_email
        assert user.is_email_verified == original_verified
        assert user.is_staff is False

    def test_patch_unauthenticated_returns_401(self, api_client):
        response = api_client.patch(
            self.url,
            {"first_name": "Anon"},
            format="json",
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "not_authenticated"

    def test_patch_blank_first_name_returns_400(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            self.url,
            {"first_name": "    "},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        user.refresh_from_db()
        assert user.first_name != ""

    def test_patch_blank_last_name_allowed(self, api_client, user):
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            self.url,
            {"last_name": "   "},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.last_name == ""
