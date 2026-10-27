from django.contrib import admin
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import RangeDateTimeFilter
from unfold.decorators import display

from .models import Task


@admin.register(Task)
class TaskAdmin(ModelAdmin):
    list_display = ("title", "user", "display_priority", "due_at", "display_state")
    list_select_related = ("user",)
    list_filter = ("is_completed", "priority", ("due_at", RangeDateTimeFilter))
    list_filter_submit = True
    search_fields = ("title", "description", "user__email")
    raw_id_fields = ("user",)
    readonly_fields = (
        "id",
        "completed_at",
        "reminder_sent_at",
        "overdue_notified_at",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "id",
                    "user",
                    "title",
                    "description",
                    "due_at",
                    "priority",
                    "is_completed",
                )
            },
        ),
        (
            _("Reminders"),
            {
                "classes": ["tab"],
                "fields": (
                    "completed_at",
                    "reminder_sent_at",
                    "overdue_notified_at",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    @display(
        description=_("Priority"),
        label={
            Task.Priority.HIGH.label: "danger",
            Task.Priority.MEDIUM.label: "warning",
            Task.Priority.LOW.label: "info",
        },
        ordering="priority",
    )
    def display_priority(self, obj):
        return obj.get_priority_display()

    @display(
        description=_("State"),
        label={_("Done"): "success", _("Overdue"): "danger", _("Open"): "primary"},
        ordering="is_completed",
    )
    def display_state(self, obj):
        if obj.is_completed:
            return _("Done")
        if obj.due_at and obj.due_at < timezone.now():
            return _("Overdue")
        return _("Open")
