import pytest
from django.urls import reverse
from rest_framework import status
from apps.notifications.models import Notification, NotificationType, PushSubscription, NotificationPreference

@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client

@pytest.fixture
def notification(user):
    return Notification.objects.create(
        recipient=user,
        type=NotificationType.TASK_DUE_SOON,
        title="Test",
        body="Body"
    )

@pytest.mark.django_db
class TestNotificationAPI:
    def test_list_notifications(self, auth_client, notification):
        url = reverse("notifications:notification-list")
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Test"
        
    def test_unread_count(self, auth_client, notification):
        url = reverse("notifications:notification-unread-count")
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["unread_count"] == 1

    def test_mark_read(self, auth_client, notification):
        url = reverse("notifications:notification-read", args=[notification.id])
        res = auth_client.patch(url)
        assert res.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.read_at is not None

    def test_mark_all_read(self, auth_client, notification):
        url = reverse("notifications:notification-read-all")
        res = auth_client.patch(url)
        assert res.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.read_at is not None

@pytest.mark.django_db
class TestPushSubscriptionAPI:
    def test_create_subscription(self, auth_client, user):
        url = reverse("notifications:pushsubscription-list")
        res = auth_client.post(url, {
            "endpoint": "https://fcm.googleapis.com/fcm/send/fake",
            "p256dh": "p256dh_key",
            "auth": "auth_key"
        })
        assert res.status_code == status.HTTP_201_CREATED
        assert PushSubscription.objects.filter(user=user).count() == 1

    @pytest.mark.parametrize("endpoint", [
        "http://fcm.googleapis.com/test",
        "https://169.254.169.254/latest/meta-data/",
        "https://evil.com/push",
    ])
    def test_create_subscription_rejects_ssrf_endpoints(self, auth_client, user, endpoint):
        url = reverse("notifications:pushsubscription-list")
        res = auth_client.post(url, {
            "endpoint": endpoint,
            "p256dh": "p256dh_key",
            "auth": "auth_key"
        })
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "endpoint" in res.data or "endpoint" in getattr(res, 'data', {}).get("errors", {})

@pytest.mark.django_db
class TestNotificationPreferenceAPI:
    def test_update_preference(self, auth_client, user):
        url = reverse("notifications:notificationpreference-update-preference")
        res = auth_client.patch(url, {
            "notification_type": "TASK_DUE_SOON",
            "push_enabled": False
        })
        assert res.status_code == status.HTTP_200_OK
        pref = NotificationPreference.objects.get(user=user, notification_type="TASK_DUE_SOON")
        assert not pref.push_enabled
