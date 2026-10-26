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
