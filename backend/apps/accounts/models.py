"""
Data models for the accounts app.

Architecture ref: 01-authentication.md §3 (Data model).

Models:
- ``User``          — Custom user with email-based auth, UUID PK, email verification.
- ``SocialAccount`` — Links external identities (e.g. Google) to users.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model using email as the unique identifier.

    Fields and constraints are defined in 01-authentication.md §3.
    Uses UUID primary keys per architecture/00-overview.md.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text=_("Unique identifier for the user."),
    )
    email = models.EmailField(
        _("email address"),
        max_length=254,
        unique=True,
        help_text=_("Required. Stored lower-cased and trimmed."),
    )
    first_name = models.CharField(
        _("first name"),
        max_length=150,
    )
    last_name = models.CharField(
        _("last name"),
        max_length=150,
        blank=True,
    )
    is_active = models.BooleanField(
        _("active"),
        default=True,
        help_text=_("Designates whether this user should be treated as active."),
    )
    is_email_verified = models.BooleanField(
        _("email verified"),
        default=False,
        help_text=_("True once the user has confirmed their email address."),
    )
    is_staff = models.BooleanField(
        _("staff status"),
        default=False,
        help_text=_("Designates whether the user can log into the admin site."),
    )
    date_joined = models.DateTimeField(
        _("date joined"),
        default=timezone.now,
    )
    updated_at = models.DateTimeField(
        _("updated at"),
        auto_now=True,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        
    def __str__(self):
        return self.email

    @property
    def has_password(self):
        """
        True if the user has a usable password (i.e. not a Google-only account).

        Exposed in ``UserSerializer`` so the PWA knows whether to show
        "change password" or "set a password via reset".
        """
        return self.has_usable_password()


class SocialAccount(models.Model):
    """
    Links an external identity (e.g. Google) to a local user.

    One user can have at most one account per provider.
    Defined in 01-authentication.md §3.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="social_accounts",
        help_text=_("The local user this social identity belongs to."),
    )
    provider = models.CharField(
        _("provider"),
        max_length=30,
        choices=[("google", "Google")],
        help_text=_("Identity provider name."),
    )
    provider_uid = models.CharField(
        _("provider UID"),
        max_length=255,
        help_text=_("The provider's stable subject id (e.g. Google 'sub')."),
    )
    email = models.EmailField(
        _("provider email"),
        help_text=_("Email asserted by the provider at the last login (informational)."),
    )
    extra_data = models.JSONField(
        _("extra data"),
        default=dict,
        blank=True,
        help_text=_("Selected claims (name, picture, locale). Never stores tokens."),
    )
    created_at = models.DateTimeField(
        _("created at"),
        auto_now_add=True,
    )
    last_login_at = models.DateTimeField(
        _("last login at"),
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = _("social account")
        verbose_name_plural = _("social accounts")
        constraints = [
            # A provider UID is globally unique per provider
            models.UniqueConstraint(
                fields=["provider", "provider_uid"],
                name="social_provider_uid_unique",
            ),
            # A user can link at most one account per provider
            models.UniqueConstraint(
                fields=["user", "provider"],
                name="social_user_provider_unique",
            ),
        ]

    def __str__(self):
        return f"{self.provider}:{self.provider_uid} → {self.user.email}"
