from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import Notification, NotificationPreference, PushSubscription


@admin.register(Notification)
class NotificationAdmin(ModelAdmin):
    list_display = ("title", "display_type", "recipient", "display_read", "created_at")
    list_select_related = ("recipient",)
    list_filter = ("type", "created_at")
    search_fields = ("title", "body", "recipient__email")
    raw_id_fields = ("recipient",)
    readonly_fields = ("created_at", "read_at")

    @display(description=_("Type"), label=True, ordering="type")
    def display_type(self, obj):
        return obj.get_type_display()

    @display(
        description=_("Read"),
        label={_("Read"): "success", _("Unread"): "warning"},
        ordering="read_at",
    )
    def display_read(self, obj):
        return _("Read") if obj.read_at else _("Unread")


@admin.register(PushSubscription)
class PushSubscriptionAdmin(ModelAdmin):
    """Endpoint keys are credentials for sending pushes, so they are never shown."""

    list_display = ("user", "display_device", "display_state", "last_used_at", "created_at")
    list_select_related = ("user",)
    list_filter = ("revoked_at", "created_at")
    search_fields = ("user__email", "user_agent")
    exclude = ("p256dh", "auth", "endpoint")
    readonly_fields = (
        "user",
        "user_agent",
        "created_at",
        "updated_at",
        "last_used_at",
        "revoked_at",
    )

    def has_add_permission(self, request):
        return False

    @display(description=_("Device"))
    def display_device(self, obj):
        return (obj.user_agent or "—")[:60]

    @display(
        description=_("State"),
        label={_("Active"): "success", _("Revoked"): "danger"},
        ordering="revoked_at",
    )
    def display_state(self, obj):
        return _("Revoked") if obj.revoked_at else _("Active")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(ModelAdmin):
    list_display = ("user", "notification_type", "in_app_enabled", "push_enabled", "email_enabled")
    list_select_related = ("user",)
    list_filter = ("notification_type", "in_app_enabled", "push_enabled", "email_enabled")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
