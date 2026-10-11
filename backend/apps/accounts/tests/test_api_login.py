"""
Group 4 — Login endpoint tests.

Architecture ref: 01-authentication.md §4 (POST login/), §7 (Group 4).
"""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestLoginAPI:
    """Tests for POST /api/v1/auth/login/"""

    url = reverse("accounts:login")

    def test_valid_credentials_returns_200_with_tokens_and_user(self, api_client, user, password):
        payload = {"email": user.email, "password": password}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "access" in data
        assert "refresh" not in data  # Refresh token goes in cookie, not body
        assert "user" in data
        assert data["user"]["email"] == user.email
        assert data["user"]["is_email_verified"] is True

    def test_login_emits_exactly_one_security_notification(self, api_client, user, password):
        from apps.notifications.models import Notification, NotificationType

        payload = {"email": user.email, "password": password}
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        notifs = Notification.objects.filter(
            recipient=user, type=NotificationType.SECURITY_NEW_LOGIN
        )
        assert notifs.count() == 1

    def test_response_sets_refresh_cookie(self, api_client, user, password):
        payload = {"email": user.email, "password": password}
        response = api_client.post(self.url, payload, format="json")

        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        assert cookie_name in response.cookies
        cookie = response.cookies[cookie_name]

        assert cookie["httponly"] is True
        assert cookie["samesite"] == settings.AUTH_COOKIE_SAMESITE
        assert cookie["path"] == settings.AUTH_COOKIE_PATH
        assert cookie["max-age"] == int(
            settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()
        )

    def test_email_matched_case_insensitively_and_trimmed(self, api_client, user, password):
        payload = {"email": f"  {user.email.upper()}  ", "password": password}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_wrong_password_returns_401(self, api_client, user):
        payload = {"email": user.email, "password": "wrongpassword"}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "invalid_credentials"

    def test_unknown_email_returns_401(self, api_client):
        payload = {"email": "unknown@example.com", "password": "password"}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "invalid_credentials"

    def test_inactive_user_returns_401(self, api_client, user, password):
        user.is_active = False
        user.save()

        payload = {"email": user.email, "password": password}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["code"] == "invalid_credentials"

    def test_unverified_user_with_correct_password_returns_403(
        self, api_client, unverified_user, password
    ):
        payload = {"email": unverified_user.email, "password": password}
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["code"] == "email_not_verified"

    def test_last_login_is_updated(self, api_client, user, password):
        with freeze_time("2026-01-01 12:00:00"):
            user.last_login = None
            user.save()

            payload = {"email": user.email, "password": password}
            api_client.post(self.url, payload, format="json")

            user.refresh_from_db()
            assert user.last_login is not None

    def test_rate_limiting_auth_login(self, api_client):
        # 5 requests per min allowed
        for _ in range(5):
            response = api_client.post(
                self.url, {"email": "bad", "password": "bad"}, format="json"
            )
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # 6th request should hit the throttle
        response = api_client.post(self.url, {"email": "bad", "password": "bad"}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data["code"] == "throttled"

    def test_rate_limiting_ignores_x_forwarded_for(self, api_client, user):
        from rest_framework import status

        api_client.post(
            self.url, {"email": user.email, "password": "wrongpassword"}, format="json"
        )  # to clear any setup, wait, let's just do 5 requests
        for i in range(5):
            response = api_client.post(
                self.url,
                {"email": user.email, "password": "wrongpassword"},
                format="json",
                HTTP_X_FORWARDED_FOR=f"192.168.1.{i}",
            )
            # The throttle might be shared with the previous test if time is not frozen,
            # wait, it might fail if we don't clear the cache or freeze time.
            pass

        # We can just check that a single IP gets rate limited even with different X-Forwarded-For
        # Actually, let's just do 6 requests
        for i in range(6):
            response = api_client.post(
                self.url,
                {"email": "bad2", "password": "bad"},
                format="json",
                HTTP_X_FORWARDED_FOR=f"192.168.1.{i}",
            )
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
