"""
Custom user manager for email-based authentication.

Architecture ref: 01-authentication.md §3 (Data model — UserManager).

Key behaviours:
- ``create_user`` normalises email (lower-case, strip) and requires it.
- ``create_superuser`` forces is_staff, is_superuser, is_email_verified = True.
"""

import logging

from django.contrib.auth.models import BaseUserManager

logger = logging.getLogger(__name__)


class UserManager(BaseUserManager):
    """
    Manager for the custom User model that uses email as the unique identifier
    instead of a username.
    """

    def _normalise_email(self, email):
        """
        Lower-case the entire email address and strip whitespace.

        The spec (01-authentication §3) says: "Stored lower-cased and trimmed".
        Django's default ``normalize_email`` only lower-cases the domain part;
        we lower-case the full address for case-insensitive uniqueness.
        """
        if not email:
            return email
        return email.strip().lower()

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with the given email and password.

        Raises ``ValueError`` if email is not provided.
        """
        if not email:
            raise ValueError("Users must have an email address.")

        email = self._normalise_email(email)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        logger.info("User created: user_id=%s", user.id)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with is_staff, is_superuser, and
        is_email_verified all set to True.
        """
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        extra_fields["is_email_verified"] = True

        if not password:
            raise ValueError("Superusers must have a password.")

        user = self.create_user(email, password, **extra_fields)
        logger.info("Superuser created: user_id=%s", user.id)
        return user
