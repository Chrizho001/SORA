from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.notifications.views import (
    NotificationPreferenceViewSet,
    NotificationViewSet,
    PushSubscriptionViewSet,
)

app_name = "notifications"

router = DefaultRouter()
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"push-subscriptions", PushSubscriptionViewSet, basename="pushsubscription")
router.register(
    r"notification-preferences",
    NotificationPreferenceViewSet,
    basename="notificationpreference",
)

urlpatterns = [
    path("", include(router.urls)),
]
