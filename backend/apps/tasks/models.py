import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Task(models.Model):
    class Priority(models.IntegerChoices):
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    priority = models.IntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    overdue_notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_at", "-priority"]
        indexes = [
            models.Index(fields=["user", "due_at"]),
            models.Index(fields=["user", "is_completed"]),
        ]

    def __str__(self):
        return self.title

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._loaded_values = {
            "due_at": instance.due_at,
            "is_completed": instance.is_completed,
        }
        return instance

    def save(self, *args, **kwargs):
        if self.is_completed and not self.completed_at:
            self.completed_at = timezone.now()
        elif not self.is_completed:
            self.completed_at = None

        loaded = getattr(self, "_loaded_values", None)
        if loaded is not None:
            due_at_changed = self.due_at != loaded.get("due_at")
            reopened = loaded.get("is_completed") is True and not self.is_completed
            if due_at_changed or reopened:
                self.reminder_sent_at = None
                self.overdue_notified_at = None
                if "update_fields" in kwargs and kwargs["update_fields"] is not None:
                    kwargs["update_fields"] = set(kwargs["update_fields"]) | {
                        "reminder_sent_at",
                        "overdue_notified_at",
                    }

        if (
            "update_fields" in kwargs
            and kwargs["update_fields"] is not None
            and "completed_at" not in kwargs["update_fields"]
        ):
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"completed_at"}

        super().save(*args, **kwargs)
        self._loaded_values = {
            "due_at": self.due_at,
            "is_completed": self.is_completed,
        }
