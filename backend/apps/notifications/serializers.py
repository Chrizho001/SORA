from rest_framework import serializers
from apps.notifications.models import Notification, PushSubscription, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "body", "data", "read_at", "created_at", "expires_at"]
        read_only_fields = ["id", "type", "title", "body", "data", "read_at", "created_at", "expires_at"]

class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ["id", "endpoint", "p256dh", "auth", "user_agent"]
        read_only_fields = ["id"]
        extra_kwargs = {"endpoint": {"validators": []}}

    def validate_endpoint(self, value):
        from urllib.parse import urlparse
        
        PUSH_HOSTS = {"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"}
        PUSH_HOST_SUFFIXES = (".notify.windows.com", ".push.apple.com")
        
        url = urlparse(value)
        host = (url.hostname or "").lower()
        if url.scheme != "https" or not (host in PUSH_HOSTS or host.endswith(PUSH_HOST_SUFFIXES)):
            raise serializers.ValidationError("Unsupported push service.", code="invalid_push_endpoint")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        endpoint = validated_data.get("endpoint")
        
        sub, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                "user": user,
                "p256dh": validated_data.get("p256dh"),
                "auth": validated_data.get("auth"),
                "user_agent": validated_data.get("user_agent", ""),
                "revoked_at": None, 
            }
        )
        return sub

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ["notification_type", "in_app_enabled", "push_enabled", "email_enabled"]
