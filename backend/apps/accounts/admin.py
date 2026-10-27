"""
Django admin registration for accounts models (django-unfold).

Also re-registers Django's Group and SimpleJWT's token admins with Unfold, so every page
shares the theme.
"""

from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.db.models import Count
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.token_blacklist.admin import (
    BlacklistedTokenAdmin as BaseBlacklistedTokenAdmin,
)
from rest_framework_simplejwt.token_blacklist.admin import (
    OutstandingTokenAdmin as BaseOutstandingTokenAdmin,
)
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from unfold.admin import ModelAdmin, TabularInline
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import SocialAccount, User


class SocialAccountInline(TabularInline):
    model = SocialAccount
    extra = 0
    fields = ("provider", "email", "created_at", "last_login_at")
    readonly_fields = fields
    can_delete = False
    show_change_link = True
    tab = True


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """Admin configuration for the custom User model."""

    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    inlines = (SocialAccountInline,)

    list_display = (
        "display_student",
        "display_verified",
        "display_role",
        "deck_count",
        "is_active",
        "date_joined",
    )
    list_filter = (
        "is_email_verified",
        "is_active",
        "is_staff",
        "is_superuser",
        ("date_joined", RangeDateFilter),
    )
    list_filter_submit = True
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("id", "last_login", "date_joined", "updated_at")
    list_fullwidth = True

    # Override fieldsets since we don't have a username field
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name")}),
        (
            _("Permissions"),
            {
                "classes": ["tab"],
                "fields": (
                    "is_active",
                    "is_email_verified",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            _("Important dates"),
            {"classes": ["tab"], "fields": ("last_login", "date_joined", "updated_at")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_deck_count=Count("decks", distinct=True))

    @display(description=_("Student"), header=True, ordering="email")
    def display_student(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip() or "—"
        initials = "".join(part[0] for part in name.split()[:2]).upper() if name != "—" else "?"
        return [name, obj.email, initials]

    @display(
        description=_("Email"),
        label={_("Verified"): "success", _("Unverified"): "warning"},
        ordering="is_email_verified",
    )
    def display_verified(self, obj):
        return _("Verified") if obj.is_email_verified else _("Unverified")

    @display(
        description=_("Role"),
        label={_("Superuser"): "danger", _("Staff"): "info", _("Student"): "primary"},
    )
    def display_role(self, obj):
        if obj.is_superuser:
            return _("Superuser")
        return _("Staff") if obj.is_staff else _("Student")

    @display(description=_("Decks"), ordering="_deck_count")
    def deck_count(self, obj):
        return obj._deck_count


@admin.register(SocialAccount)
class SocialAccountAdmin(ModelAdmin):
    """Admin configuration for SocialAccount."""

    list_display = ("user", "display_provider", "email", "created_at", "last_login_at")
    list_filter = ("provider",)
    search_fields = ("user__email", "provider_uid", "email")
    raw_id_fields = ("user",)
    readonly_fields = ("id", "created_at")

    @display(description=_("Provider"), label=True, ordering="provider")
    def display_provider(self, obj):
        return obj.get_provider_display()


admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


admin.site.unregister(OutstandingToken)
admin.site.unregister(BlacklistedToken)


@admin.register(OutstandingToken)
class OutstandingTokenAdmin(BaseOutstandingTokenAdmin, ModelAdmin):
    pass


@admin.register(BlacklistedToken)
class BlacklistedTokenAdmin(BaseBlacklistedTokenAdmin, ModelAdmin):
    pass
