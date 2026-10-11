"""
Group 9 — Google OAuth Login endpoint tests.

Architecture ref: 01-authentication.md §4 (POST google/), §7 (Group 9).
"""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from google.auth.exceptions import TransportError
from rest_framework import status

from apps.accounts.models import SocialAccount
from apps.notifications.models import Notification, NotificationType

User = get_user_model()


@pytest.mark.django_db
class TestGoogleLoginAPI:
    """Tests for POST /api/v1/auth/google/"""

    url = reverse("accounts:google")

    @pytest.fixture
    def mock_verify_google_token(self):
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock:
            mock.return_value = {
                "iss": "https://accounts.google.com",
                "sub": "google123",
                "email": "newgoogle@example.com",
                "given_name": "New",
                "family_name": "Google",
                "email_verified": True,
                "picture": "https://example.com/avatar.jpg",
                "locale": "en",
            }
            yield mock

    def test_valid_token_auto_registers_new_user(self, api_client, mock_verify_google_token):
        response = api_client.post(self.url, {"token": "valid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert response.data["user"]["email"] == "newgoogle@example.com"
        assert response.data["user"]["is_email_verified"] is True
        assert "google" in response.data["user"]["auth_providers"]

        # Verify user created
        user = User.objects.get(email="newgoogle@example.com")
        assert user.has_password is False
        social_acc = user.social_accounts.get(provider="google", provider_uid="google123")
        assert social_acc.email == "newgoogle@example.com"
        assert social_acc.last_login_at is not None
        assert social_acc.extra_data.get("given_name") == "New"
        assert social_acc.extra_data.get("picture") == "https://example.com/avatar.jpg"
        assert "token" not in social_acc.extra_data

        # Verify cookie
        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        assert cookie_name in response.cookies

    def test_invalid_token_returns_401(self, api_client, mock_verify_google_token):
        mock_verify_google_token.side_effect = ValueError("Invalid token")

        response = api_client.post(self.url, {"token": "invalid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "invalid_google_token"

    def test_google_service_unavailable_returns_503(self, api_client, mock_verify_google_token):
        mock_verify_google_token.side_effect = TransportError("Network error fetching certs")

        response = api_client.post(self.url, {"token": "mock_token"}, format="json")

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert response.data["code"] == "google_unavailable"

    def test_existing_user_matching_email_links_and_logs_in(
        self, api_client, user, mock_verify_google_token
    ):
        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
            "sub": "google456",
            "email": user.email,
            "given_name": "Existing",
            "family_name": "User",
            "email_verified": True,
            "locale": "en",
        }

        response = api_client.post(self.url, {"token": "valid_mock_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["email"] == user.email
        assert "google" in response.data["user"]["auth_providers"]

        # User is linked and social account fields are set
        social_acc = user.social_accounts.get(provider="google", provider_uid="google456")
        assert social_acc.email == user.email
        assert social_acc.last_login_at is not None
        assert user.has_password is True  # Didn't lose their password

    def test_subsequent_login_updates_last_login_at(
        self, api_client, user, mock_verify_google_token
    ):
        past = timezone.now() - timedelta(days=2)
        social_acc = SocialAccount.objects.create(
            user=user,
            provider="google",
            provider_uid="google_existing_sub",
            email=user.email,
            last_login_at=past,
        )

        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
            "sub": "google_existing_sub",
            "email": user.email,
            "given_name": "Existing",
            "family_name": "User",
            "email_verified": True,
        }

        response = api_client.post(self.url, {"token": "valid_token"}, format="json")
        assert response.status_code == status.HTTP_200_OK

        social_acc.refresh_from_db()
        assert social_acc.last_login_at > past

    def test_unverified_user_matching_email_verifies_and_links(
        self, api_client, unverified_user, mock_verify_google_token
    ):
        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
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
        assert unverified_user.social_accounts.filter(
            provider="google", provider_uid="google789"
        ).exists()

    def test_unverified_google_email_is_rejected(self, api_client, mock_verify_google_token):
        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
            "sub": "google_hacker",
            "email": "victim@uni.edu",
            "given_name": "Hacker",
            "family_name": "Dude",
            "email_verified": False,
        }

        response = api_client.post(self.url, {"token": "mock_token"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "google_email_unverified"

        assert not User.objects.filter(email="victim@uni.edu").exists()

    def test_google_login_race_condition_does_not_500(self, api_client, mock_verify_google_token):
        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
            "sub": "google_race_123",
            "email": "race@example.com",
            "given_name": "Race",
            "family_name": "Condition",
            "email_verified": True,
        }

        existing_user = User.objects.create(
            email="race@example.com", first_name="Other", last_name="Thread"
        )
        orig_filter = User.objects.filter
        first_call = True

        def mock_filter(*args, **kwargs):
            nonlocal first_call
            if first_call and kwargs.get("email") == "race@example.com":
                first_call = False
                return orig_filter(id=None)
            return orig_filter(*args, **kwargs)

        with patch.object(User.objects, "filter", side_effect=mock_filter):
            response = api_client.post(self.url, {"token": "valid_token"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user"]["email"] == "race@example.com"
        assert existing_user.social_accounts.filter(
            provider="google", provider_uid="google_race_123"
        ).exists()

    def test_google_login_emits_exactly_one_security_notification(
        self, api_client, user, mock_verify_google_token
    ):
        mock_verify_google_token.return_value = {
            "iss": "https://accounts.google.com",
            "sub": "google123_notif",
            "email": user.email,
            "given_name": "Google",
            "family_name": "User",
            "email_verified": True,
        }

        response = api_client.post(self.url, {"token": "valid_token"}, format="json")
        assert response.status_code == status.HTTP_200_OK

        notifs = Notification.objects.filter(
            recipient=user, type=NotificationType.SECURITY_NEW_LOGIN
        )
        assert notifs.count() == 1
