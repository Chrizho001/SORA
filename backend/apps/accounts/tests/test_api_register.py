"""
Group 2 — Register endpoint tests.

Architecture ref: 01-authentication.md §4 (POST register/), §7 (Group 2).
"""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db(transaction=True)
class TestRegisterAPI:
    """Tests for POST /api/v1/auth/register/"""

    url = reverse("accounts:register")

    def test_valid_payload_returns_201_and_serializer_shape(self, api_client):
        payload = {
            "email": "ada@uni.edu",
            "password": "Secure!Password123",
            "password_confirm": "Secure!Password123",
            "first_name": "Ada",
            "last_name": "Lovelace",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert "password" not in data
        assert "password_confirm" not in data
        assert data["email"] == "ada@uni.edu"
        assert data["first_name"] == "Ada"
        assert data["last_name"] == "Lovelace"
        assert data["is_email_verified"] is False
        assert "id" in data
        assert data["auth_providers"] == []
        assert data["has_password"] is True

    def test_user_created_unverified_with_hashed_password(self, api_client):
        payload = {
            "email": "grace@uni.edu",
            "password": "Secure!Password123",
            "password_confirm": "Secure!Password123",
            "first_name": "Grace",
            "last_name": "Hopper",
        }
        api_client.post(self.url, payload, format="json")

        user = User.objects.get(email="grace@uni.edu")
        assert user.is_email_verified is False
        assert user.check_password("Secure!Password123") is True

    def test_verification_email_sent_on_success(self, api_client):
        payload = {
            "email": "emailtest@uni.edu",
            "password": "Secure!Password123",
            "password_confirm": "Secure!Password123",
            "first_name": "Email",
            "last_name": "Test",
        }
        api_client.post(self.url, payload, format="json")

        assert len(mail.outbox) == 1
        email_msg = mail.outbox[0]
        assert email_msg.to == ["emailtest@uni.edu"]
        assert f"{settings.FRONTEND_URL}/verify-email?token=" in email_msg.body

    def test_email_link_ignores_origin_and_referer_headers(self, api_client):
        mail.outbox.clear()
        payload = {
            "email": "origin_check@uni.edu",
            "password": "Secure!Password123",
            "password_confirm": "Secure!Password123",
            "first_name": "Origin",
            "last_name": "Check",
        }
        response = api_client.post(
            self.url,
            payload,
            format="json",
            HTTP_ORIGIN="https://evil.example",
            HTTP_REFERER="https://evil.example/x",
        )
        assert response.status_code == status.HTTP_201_CREATED
        links = [
            line.strip()
            for line in mail.outbox[0].body.splitlines()
            if "verify-email?token=" in line
        ]
        assert len(links) == 1
        assert links[0].startswith(settings.FRONTEND_URL)
        assert "evil.example" not in mail.outbox[0].body

    def test_duplicate_email_any_case_returns_400(self, api_client, user):
        # user email is testuser@example.com
        payload = {
            "email": "TESTUSER@example.com",
            "password": "Secure!Password123",
            "password_confirm": "Secure!Password123",
            "first_name": "Duplicate",
            "last_name": "Test",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        assert "email" in response.data["errors"]

    def test_weak_password_returns_400(self, api_client):
        payload = {
            "email": "weak@uni.edu",
            "password": "123",
            "password_confirm": "123",
            "first_name": "Weak",
            "last_name": "Pass",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data["errors"]

    def test_password_confirm_mismatch_returns_400(self, api_client):
        payload = {
            "email": "mismatch@uni.edu",
            "password": "Secure!Password123",
            "password_confirm": "Different!Password123",
            "first_name": "Mis",
            "last_name": "Match",
        }
        response = api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data["errors"]

    def test_missing_required_fields_returns_400_listing_each(self, api_client):
        response = api_client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["code"] == "validation_error"
        errors = response.data["errors"]
        assert "email" in errors
        assert "password" in errors
        assert "password_confirm" in errors
        assert "first_name" in errors
        # last_name is also required by the serializer according to spec
        assert "last_name" in errors

    def test_error_envelope_shape(self, api_client):
        response = api_client.post(self.url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.data
        assert "detail" in data
        assert data["code"] == "validation_error"
        assert isinstance(data["errors"], dict)

    def test_rate_limiting_auth_register(self, api_client):
        # 10 requests per hour allowed
        # Make 10 bad requests (to save DB time, empty payload)
        for _ in range(10):
            response = api_client.post(self.url, {}, format="json")
            assert response.status_code == status.HTTP_400_BAD_REQUEST

        # 11th request should hit the throttle
        response = api_client.post(self.url, {}, format="json")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data["code"] == "throttled"

    def test_registration_email_failure_does_not_log_email(self, api_client, monkeypatch, caplog):
        import logging
        from unittest.mock import MagicMock

        apps_logger = logging.getLogger("apps")
        caplog.set_level(logging.DEBUG, logger="apps")
        apps_logger.addHandler(caplog.handler)

        try:
            mock_send = MagicMock(side_effect=Exception("SMTP connection refused"))
            monkeypatch.setattr("apps.accounts.tasks.send_templated_email", mock_send)

            target_email = "super_private_secret@uni.edu"
            payload = {
                "email": target_email,
                "password": "Secure!Password123",
                "password_confirm": "Secure!Password123",
                "first_name": "Private",
                "last_name": "User",
            }

            response = api_client.post(self.url, payload, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            assert target_email not in caplog.text
            user = User.objects.get(email=target_email)
            assert str(user.id) in caplog.text
        finally:
            apps_logger.removeHandler(caplog.handler)
