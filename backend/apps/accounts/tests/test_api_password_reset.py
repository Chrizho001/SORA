"""
Group 7 — Password reset endpoint tests.

Architecture ref: 01-authentication.md §4 (POST password-reset/, POST password-reset/confirm/), §7 (Group 7).
"""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from freezegun import freeze_time
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db(transaction=True)
class TestPasswordResetAPI:
    """Tests for POST /api/v1/auth/password-reset/"""

    # We use a dummy url since we need to add the view and url to urls.py later
    # but let's assume the name will be "accounts:password-reset"
    # Wait, we need to make sure reverse doesn't fail. If the url isn't defined yet, reverse will fail.
    # So we'll define it dynamically or just rely on the TDD cycle: test fails because of NoReverseMatch, then we add the URL.

    @property
    def url(self):
        return reverse("accounts:password-reset")

    def test_known_active_email_sends_email(self, api_client, user):
        mail.outbox.clear()
        response = api_client.post(self.url, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "If the account exists, a reset email has been sent."

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [user.email]
        assert "reset-password?uid=" in mail.outbox[0].body
        assert "&token=" in mail.outbox[0].body

    def test_unknown_email_sends_no_email(self, api_client):
        mail.outbox.clear()
        response = api_client.post(self.url, {"email": "nobody@example.com"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "If the account exists, a reset email has been sent."
        assert len(mail.outbox) == 0

    def test_inactive_email_sends_no_email(self, api_client, user):
        user.is_active = False
        user.save()
        mail.outbox.clear()

        response = api_client.post(self.url, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 0


@pytest.mark.django_db(transaction=True)
class TestPasswordResetConfirmAPI:
    """Tests for POST /api/v1/auth/password-reset/confirm/"""

    @property
    def url(self):
        return reverse("accounts:password-reset-confirm")

    def get_valid_payload(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return {
            "uid": uid,
            "token": token,
            "new_password": "New!Password123",
            "new_password_confirm": "New!Password123"
        }

    def test_valid_token_resets_password_and_blacklists_refresh_tokens(self, api_client, user, password):
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

        payload = self.get_valid_payload(user)
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Password has been reset."

        user.refresh_from_db()
        assert user.check_password("New!Password123") is True
        assert user.check_password(password) is False

        cookie_name = settings.AUTH_REFRESH_COOKIE_NAME
        api_client.cookies[cookie_name] = str(refresh)
        refresh_url = reverse("accounts:token-refresh")
        refresh_response = api_client.post(refresh_url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_confirm_marks_email_as_verified(self, api_client, unverified_user):
        payload = self.get_valid_payload(unverified_user)

        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        unverified_user.refresh_from_db()
        assert unverified_user.is_email_verified is True

    def test_reusing_token_returns_400(self, api_client, user):
        payload = self.get_valid_payload(user)
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        response2 = api_client.post(self.url, payload, format="json")
        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert response2.data["code"] == "invalid_token"

    def test_expired_token_returns_400(self, api_client, user):
        # The password reset token generator uses settings.PASSWORD_RESET_TIMEOUT which defaults to 3600s
        # BUT it measures days since Jan 1 2001, so freezegun must freeze to a specific date to be safe.
        with freeze_time("2026-01-01 12:00:00"):
            payload = self.get_valid_payload(user)

        with freeze_time("2026-01-02 12:00:01"): # Next day (well over 1 hr)
            response = api_client.post(self.url, payload, format="json")
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert response.data["code"] == "invalid_token"

    def test_bad_uid_returns_400(self, api_client, user):
        payload = self.get_valid_payload(user)
        payload["uid"] = "baduid"
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "invalid_token"

    def test_weak_password_returns_400(self, api_client, user):
        payload = self.get_valid_payload(user)
        payload["new_password"] = "123"
        payload["new_password_confirm"] = "123"

        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
