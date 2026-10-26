"""
Group 3 — Email verification endpoint tests.

Architecture ref: 01-authentication.md §4 (POST verify-email/,
POST verify-email/resend/), §7 (Group 3).
"""

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.signing import dumps
from django.urls import reverse
from freezegun import freeze_time
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestVerifyEmailAPI:
    """Tests for POST /api/v1/auth/verify-email/"""

    url = reverse("accounts:verify-email")

    def get_token_for_user(self, user):
        return dumps({"uid": str(user.id)}, salt="accounts.verify-email")

    def test_valid_token_returns_200_and_verifies_user(self, api_client, unverified_user):
        assert unverified_user.is_email_verified is False
        token = self.get_token_for_user(unverified_user)

        response = api_client.post(self.url, {"token": token}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Email verified."

        unverified_user.refresh_from_db()
        assert unverified_user.is_email_verified is True

    def test_verifying_again_is_idempotent(self, api_client, unverified_user):
        token = self.get_token_for_user(unverified_user)
        api_client.post(self.url, {"token": token}, format="json")

        # Call again
        response = api_client.post(self.url, {"token": token}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == "Email verified."

    def test_tampered_token_returns_400(self, api_client):
        response = api_client.post(self.url, {"token": "bad-token:1234"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "invalid_token"

    def test_expired_token_returns_400(self, api_client, unverified_user):
        with freeze_time("2026-01-01 12:00:00"):
            token = self.get_token_for_user(unverified_user)

        with freeze_time("2026-01-02 12:00:01"):  # > 24 hours
            response = api_client.post(self.url, {"token": token}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "token_expired"

    def test_token_for_deleted_user_returns_400(self, api_client, unverified_user):
        token = self.get_token_for_user(unverified_user)
        unverified_user.delete()

        response = api_client.post(self.url, {"token": token}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "invalid_token"


@pytest.mark.django_db(transaction=True)
class TestVerifyEmailResendAPI:
    """Tests for POST /api/v1/auth/verify-email/resend/"""

    url = reverse("accounts:verify-email-resend")
    success_message = "If the account exists and is unverified, an email has been sent."

    def test_resend_for_unverified_user_sends_email(self, api_client, unverified_user):
        mail.outbox.clear()
        response = api_client.post(self.url, {"email": unverified_user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == self.success_message

        assert len(mail.outbox) == 1
        assert mail.outbox[0].to == [unverified_user.email]

    def test_resend_for_unknown_email_sends_no_email(self, api_client):
        mail.outbox.clear()
        response = api_client.post(self.url, {"email": "unknown@example.com"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == self.success_message
        assert len(mail.outbox) == 0

    def test_resend_for_verified_user_sends_no_email(self, api_client, user):
        mail.outbox.clear()
        response = api_client.post(self.url, {"email": user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == self.success_message
        assert len(mail.outbox) == 0

    def test_resend_for_inactive_user_sends_no_email(self, api_client, unverified_user):
        unverified_user.is_active = False
        unverified_user.save()
        mail.outbox.clear()

        response = api_client.post(self.url, {"email": unverified_user.email}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["detail"] == self.success_message
        assert len(mail.outbox) == 0
