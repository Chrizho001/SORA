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

    def create(self, validated_data):
        user = self.context["request"].user
        endpoint = validated_data.get("endpoint")
        
        sub, created = PushSubscription.objects.update_or_create(
            user=user, endpoint=endpoint,
            defaults={
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
