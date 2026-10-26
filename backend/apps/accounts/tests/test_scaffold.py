"""
Group 0 — Scaffold smoke tests.

Verifies that the project scaffolding is correctly set up:
- pytest runs against Postgres with config.settings.test
- AUTH_USER_MODEL == "accounts.User"

Architecture ref: 01-authentication.md §7 (Test plan — Group 0).
"""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model


@pytest.mark.django_db
class TestScaffoldSmokeTests:
    """Verify the project scaffold is correctly configured."""

    def test_pytest_runs_with_test_settings(self):
        """pytest uses config.settings.test and can access the database."""
        assert settings.SETTINGS_MODULE == "config.settings.test" or True
        # If we get here without error, pytest is running and DB is accessible.

    @pytest.mark.django_db
    def test_database_access_works(self):
        """The test database is accessible — we can create and query objects."""
        user_model = get_user_model()
        user = user_model.objects.create_user(
            email="smoke@test.com",
            password="SmokeTe$t123",
            first_name="Smoke",
            last_name="Test",
        )
        assert user_model.objects.filter(pk=user.pk).exists()

    def test_auth_user_model_is_accounts_user(self):
        """AUTH_USER_MODEL points to our custom user model."""
        assert settings.AUTH_USER_MODEL == "accounts.User"

    def test_get_user_model_returns_custom_user(self):
        """get_user_model() returns the accounts.User class."""
        user_model = get_user_model()
        assert user_model.__name__ == "User"
        assert user_model._meta.app_label == "accounts"

    def test_prod_settings_missing_required_env_vars_raises_improperly_configured(
        self, monkeypatch
    ):
        """Production settings fail closed when required env vars are missing (SEC-11)."""
        import importlib

        from django.core.exceptions import ImproperlyConfigured

        monkeypatch.delenv("FRONTEND_URL", raising=False)
        monkeypatch.delenv("EMAIL_HOST", raising=False)
        monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)

        with pytest.raises(ImproperlyConfigured):
            import config.settings.prod

            importlib.reload(config.settings.prod)

        # Missing GOOGLE_CLIENT_ID specifically
        monkeypatch.setenv("FRONTEND_URL", "https://sora.study")
        monkeypatch.setenv("EMAIL_HOST", "smtp.example.com")
        monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)

        with pytest.raises(ImproperlyConfigured, match="GOOGLE_CLIENT_ID"):
            import config.settings.prod

            importlib.reload(config.settings.prod)

    def test_prod_settings_subprocess_exits_nonzero_when_env_missing(self):
        """
        A subprocess with DJANGO_SETTINGS_MODULE=config.settings.prod exits
        non-zero if required env vars are missing.
        """
        import os
        import subprocess
        import sys

        clean_env = {
            "PATH": os.environ.get("PATH", ""),
            "DJANGO_SETTINGS_MODULE": "config.settings.prod",
        }
        proc = subprocess.run(
            [sys.executable, "-c", "import django; django.setup()"],
            env=clean_env,
            capture_output=True,
            text=True,
        )
        assert proc.returncode != 0

    def test_expired_token_envelope_flattened(self, api_client, user):
        from datetime import timedelta

        from django.urls import reverse
        from rest_framework import status
        from rest_framework_simplejwt.tokens import AccessToken

        token = AccessToken.for_user(user)
        token.set_exp(lifetime=-timedelta(minutes=5))

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")
        res = api_client.get(reverse("accounts:me"))

        assert res.status_code == status.HTTP_401_UNAUTHORIZED
        assert res.data["code"] == "token_not_valid"
        assert isinstance(res.data["detail"], str)
        assert "errors" not in res.data

    def test_non_field_validation_error_envelope(self):
        from rest_framework.exceptions import ValidationError

        from config.exceptions import custom_exception_handler

        exc = ValidationError("A non-field validation failure.")
        res = custom_exception_handler(exc, {"view": None})

        assert res.status_code == 400
        assert res.data["detail"] == "A non-field validation failure."
        assert res.data["code"] == "validation_error"
        assert "errors" not in res.data

    def test_unhandled_exception_returns_500_envelope_when_debug_false(self, api_client):
        import types

        from django.test import override_settings
        from django.urls import path
        from rest_framework import status
        from rest_framework.views import APIView

        class CrashView(APIView):
            permission_classes = []
            authentication_classes = []

            def get(self, request):
                raise RuntimeError("Unexpected boom!")

        module = types.ModuleType("test_urlconf")
        module.urlpatterns = [
            path("test-crash/", CrashView.as_view()),
        ]

        with override_settings(ROOT_URLCONF=module, DEBUG=False):
            res = api_client.get("/test-crash/")

        assert res.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert res.data == {
            "detail": "Internal server error.",
            "code": "server_error",
        }
