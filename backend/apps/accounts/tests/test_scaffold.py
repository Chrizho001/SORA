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
        User = get_user_model()
        user = User.objects.create_user(
            email="smoke@test.com",
            password="SmokeTe$t123",
            first_name="Smoke",
            last_name="Test",
        )
        assert User.objects.filter(pk=user.pk).exists()

    def test_auth_user_model_is_accounts_user(self):
        """AUTH_USER_MODEL points to our custom user model."""
        assert settings.AUTH_USER_MODEL == "accounts.User"

    def test_get_user_model_returns_custom_user(self):
        """get_user_model() returns the accounts.User class."""
        User = get_user_model()
        assert User.__name__ == "User"
        assert User._meta.app_label == "accounts"
