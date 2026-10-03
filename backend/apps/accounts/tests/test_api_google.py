"""
Group 9 — Google OAuth Login endpoint tests.

Architecture ref: 01-authentication.md §4 (POST google/), §7 (Group 9).
"""

from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestGoogleLoginAPI:
    """Tests for POST /api/v1/auth/google/"""

    url = reverse("accounts:google")

    @pytest.fixture
    def mock_verify_google_token(self):
        with patch("apps.accounts.google.verify_google_id_token") as mock:
            yield mock

    def test_valid_token_auto_registers_new_user(self, api_client, mock_verify_google_token):
        mock_verify_google_token.return_value = {
            "sub": "google123",
            "email": "newgoogle@example.com",
            "given_name": "New",
            "family_name": "Google",
            "email_verified": True,
        }

        response = api_client.post(self.url, {"token": "valid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert response.data["user"]["email"] == "newgoogle@example.com"
        assert response.data["user"]["is_email_verified"] is True
        assert "google" in response.data["user"]["auth_providers"]

        # Verify user created
        user = User.objects.get(email="newgoogle@example.com")
        assert user.has_password is False
        assert user.social_accounts.filter(provider="google", provider_uid="google123").exists()

        # Verify cookie
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        assert cookie_name in response.cookies

    def test_invalid_token_returns_401(self, api_client, mock_verify_google_token):
        mock_verify_google_token.side_effect = ValueError("Invalid token")

        response = api_client.post(self.url, {"token": "invalid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "invalid_google_token"

    def test_existing_user_matching_email_links_and_logs_in(self, api_client, user, mock_verify_google_token):
        mock_verify_google_token.return_value = {
            "sub": "google456",
            "email": user.email,
            "given_name": "Existing",
            "family_name": "User",
            "email_verified": True,
        }

        response = api_client.post(self.url, {"token": "valid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["email"] == user.email
        assert "google" in response.data["user"]["auth_providers"]

        # User is linked
        assert user.social_accounts.filter(provider="google", provider_uid="google456").exists()
        assert user.has_password is True  # Didn't lose their password

    def test_unverified_user_matching_email_verifies_and_links(self, api_client, unverified_user, mock_verify_google_token):
        mock_verify_google_token.return_value = {
            "sub": "google789",
            "email": unverified_user.email,
            "given_name": "Unverified",
            "family_name": "User",
            "email_verified": True,
        }

        response = api_client.post(self.url, {"token": "valid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK

        unverified_user.refresh_from_db()
        assert unverified_user.is_email_verified is True
        assert unverified_user.social_accounts.filter(provider="google", provider_uid="google789").exists()
