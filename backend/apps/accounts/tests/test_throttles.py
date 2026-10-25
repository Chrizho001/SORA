import copy

import pytest
from django.conf import settings
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status


@pytest.fixture
def throttle_2_per_min(monkeypatch):
    from rest_framework.throttling import SimpleRateThrottle

    drf_settings = copy.deepcopy(settings.REST_FRAMEWORK)
    rates = dict(drf_settings.get("DEFAULT_THROTTLE_RATES", {}))
    rates.update(
        {
            "auth_verify": "2/min",
            "auth_refresh": "2/min",
            "auth_password": "2/min",
        }
    )
    drf_settings["DEFAULT_THROTTLE_RATES"] = rates
    monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", rates)
    cache.clear()
    with override_settings(REST_FRAMEWORK=drf_settings):
        yield
    cache.clear()


@pytest.mark.django_db
class TestAuthThrottles:
    """Test rate limiting on auth endpoints (SEC-02)."""

    def test_verify_email_throttle(self, api_client, throttle_2_per_min):
        url = reverse("accounts:verify-email")
        payload = {"token": "dummy_token"}

        res1 = api_client.post(url, payload, format="json")
        assert res1.status_code == status.HTTP_400_BAD_REQUEST

        res2 = api_client.post(url, payload, format="json")
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

        res3 = api_client.post(url, payload, format="json")
        assert res3.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert res3.data["code"] == "throttled"

    def test_token_refresh_throttle(self, api_client, throttle_2_per_min):
        url = reverse("accounts:token-refresh")

        res1 = api_client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        assert res1.status_code == status.HTTP_401_UNAUTHORIZED

        res2 = api_client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        assert res2.status_code == status.HTTP_401_UNAUTHORIZED

        res3 = api_client.post(url, HTTP_X_REQUESTED_WITH="XMLHttpRequest")
        assert res3.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert res3.data["code"] == "throttled"

    def test_password_reset_confirm_throttle(self, api_client, throttle_2_per_min):
        url = reverse("accounts:password-reset-confirm")
        payload = {
            "uid": "dummy_uid",
            "token": "dummy_token",
            "new_password": "short",
            "new_password_confirm": "short",
        }

        res1 = api_client.post(url, payload, format="json")
        assert res1.status_code == status.HTTP_400_BAD_REQUEST

        res2 = api_client.post(url, payload, format="json")
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

        res3 = api_client.post(url, payload, format="json")
        assert res3.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert res3.data["code"] == "throttled"
