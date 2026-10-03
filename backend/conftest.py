"""
Shared test fixtures for the entire backend.

These fixtures are available to all test modules without importing.
Architecture ref: 01-authentication.md §7 (fixtures), CLAUDE.md.

Fixture list:
    - ``api_client``      — unauthenticated DRF APIClient
    - ``password``        — a known strong password string
    - ``user``            — a verified, active user (can log in)
    - ``unverified_user`` — an active but unverified user
    - ``auth_client``     — APIClient with Bearer auth for ``user``
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.tests.factories import UserFactory


# ──────────────────────────────────────────────
# Autouse: clear cache between tests so throttle
# state doesn't leak (01-authentication.md §6).
# ──────────────────────────────────────────────
@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear the Django cache before each test to prevent throttle leakage."""
    cache.clear()
    yield
    cache.clear()


# ──────────────────────────────────────────────
# Shared password
# ──────────────────────────────────────────────
@pytest.fixture()
def password():
    """A known strong password that passes all validators."""
    return "TestPass123!"


# ──────────────────────────────────────────────
# API clients
# ──────────────────────────────────────────────
@pytest.fixture()
def api_client():
    """An unauthenticated DRF APIClient."""
    return APIClient()


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────
@pytest.fixture()
def user(password):
    """A verified, active user that can log in with ``password``."""
    return UserFactory(
        email="testuser@example.com",
        password=password,
        is_email_verified=True,
    )


@pytest.fixture()
def unverified_user(password):
    """An active but unverified user — cannot log in until email is verified."""
    return UserFactory(
        email="unverified@example.com",
        password=password,
        is_email_verified=False,
    )


# ──────────────────────────────────────────────
# Authenticated client
# ──────────────────────────────────────────────
@pytest.fixture()
def auth_client(user):
    """
    An APIClient pre-authenticated with a Bearer access token for ``user``.

    Use this for endpoints that require ``IsAuthenticated``.
    """
    client = APIClient()
    token = AccessToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client
