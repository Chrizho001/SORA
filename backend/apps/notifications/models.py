import uuid

from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    TASK_DUE_SOON = "TASK_DUE_SOON", "Task Due Soon"
    TASK_OVERDUE = "TASK_OVERDUE", "Task Overdue"
    PDF_SUMMARY_READY = "PDF_SUMMARY_READY", "PDF Summary Ready"
    PDF_SUMMARY_FAILED = "PDF_SUMMARY_FAILED", "PDF Summary Failed"
    FLASHCARDS_READY = "FLASHCARDS_READY", "Flashcards Ready"
    FLASHCARDS_FAILED = "FLASHCARDS_FAILED", "Flashcards Failed"
    QUIZ_READY = "QUIZ_READY", "Quiz Ready"
    QUIZ_GRADED = "QUIZ_GRADED", "Quiz Graded"
    SECURITY_NEW_LOGIN = "SECURITY_NEW_LOGIN", "New Login"
    SECURITY_PASSWORD_CHANGED = "SECURITY_PASSWORD_CHANGED", "Password Changed"
    SECURITY_EMAIL_CHANGED = "SECURITY_EMAIL_CHANGED", "Email Changed"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=50, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read_at"]),
        ]

    def __str__(self):
        return f"{self.type} for {self.recipient.email}"


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions"
    )
    endpoint = models.URLField(max_length=1024, unique=True)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=512, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Push Sub for {self.user.email}"


class NotificationPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences"
    )
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    in_app_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "notification_type")

    def __str__(self):
        return f"{self.notification_type} prefs for {self.user.email}"
