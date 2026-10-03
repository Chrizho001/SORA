"""
Group 1 — User model & manager tests.

Tests for the custom User model, UserManager, and SocialAccount model.
Verifies email normalisation, password hashing, default field values,
uniqueness constraints, and model behaviour.

Architecture ref: 01-authentication.md §3 (Data model), §7 (Group 1).
"""

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import identify_hasher
from django.db import IntegrityError

User = get_user_model()


@pytest.mark.django_db
class TestUserManager:
    """Tests for UserManager.create_user and create_superuser."""

    def test_create_user_stores_email_lowercased_and_trimmed(self):
        """create_user normalises email: lower-case full address, strip whitespace."""
        user = User.objects.create_user(
            email="  Ada.Lovelace@Example.COM  ",
            password="TestPass123!",
            first_name="Ada",
            last_name="Lovelace",
        )
        assert user.email == "ada.lovelace@example.com"

    def test_create_user_without_email_raises_value_error(self):
        """create_user raises ValueError when email is empty or None."""
        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(
                email="",
                password="TestPass123!",
                first_name="Ada",
                last_name="Lovelace",
            )

        with pytest.raises(ValueError, match="email"):
            User.objects.create_user(
                email=None,
                password="TestPass123!",
                first_name="Ada",
                last_name="Lovelace",
            )

    def test_password_is_hashed_with_argon2(self):
        """The password is hashed with Argon2 and check_password works."""
        raw_password = "TestPass123!"
        user = User.objects.create_user(
            email="argon2test@example.com",
            password=raw_password,
            first_name="Test",
            last_name="User",
        )
        # Verify the hasher is Argon2
        hasher = identify_hasher(user.password)
        assert hasher.algorithm == "argon2"

        # Verify check_password works
        assert user.check_password(raw_password) is True
        assert user.check_password("wrong") is False

    def test_new_user_default_field_values(self):
        """New users default to is_active=True, is_email_verified=False, is_staff=False."""
        user = User.objects.create_user(
            email="defaults@example.com",
            password="TestPass123!",
            first_name="Default",
            last_name="User",
        )
        assert user.is_active is True
        assert user.is_email_verified is False
        assert user.is_staff is False

    def test_duplicate_email_different_case_raises_integrity_error(self):
        """A duplicate email (different case) raises IntegrityError."""
        User.objects.create_user(
            email="unique@example.com",
            password="TestPass123!",
            first_name="First",
            last_name="User",
        )
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="UNIQUE@example.com",
                password="TestPass123!",
                first_name="Second",
                last_name="User",
            )

    def test_create_superuser_sets_required_flags(self):
        """create_superuser sets is_staff, is_superuser, and is_email_verified to True."""
        superuser = User.objects.create_superuser(
            email="admin@example.com",
            password="AdminPass123!",
            first_name="Admin",
            last_name="User",
        )
        assert superuser.is_staff is True
        assert superuser.is_superuser is True
        assert superuser.is_email_verified is True

    def test_user_id_is_uuid(self):
        """The id field is a UUID."""
        user = User.objects.create_user(
            email="uuid@example.com",
            password="TestPass123!",
            first_name="UUID",
            last_name="User",
        )
        assert isinstance(user.id, uuid.UUID)

    def test_str_returns_email(self):
        """str(user) returns the email address."""
        user = User.objects.create_user(
            email="display@example.com",
            password="TestPass123!",
            first_name="Display",
            last_name="User",
        )
        assert str(user) == "display@example.com"


@pytest.mark.django_db
class TestUserModel:
    """Tests for model properties and behaviour."""

    def test_has_password_property_with_usable_password(self):
        """has_password returns True for a user with a usable password."""
        user = User.objects.create_user(
            email="haspw@example.com",
            password="TestPass123!",
            first_name="Has",
            last_name="Password",
        )
        assert user.has_password is True

    def test_has_password_property_with_unusable_password(self):
        """has_password returns False for a Google-only user with unusable password."""
        user = User.objects.create_user(
            email="nopw@example.com",
            password=None,
            first_name="No",
            last_name="Password",
        )
        user.set_unusable_password()
        user.save()
        assert user.has_password is False

    def test_date_joined_is_set_on_creation(self):
        """date_joined is automatically set when a user is created."""
        user = User.objects.create_user(
            email="joined@example.com",
            password="TestPass123!",
            first_name="Date",
            last_name="Joined",
        )
        assert user.date_joined is not None

    def test_updated_at_is_set_on_save(self):
        """updated_at is automatically updated on each save."""
        user = User.objects.create_user(
            email="updated@example.com",
            password="TestPass123!",
            first_name="Updated",
            last_name="At",
        )
        original_updated_at = user.updated_at
        user.first_name = "Changed"
        user.save()
        user.refresh_from_db()
        assert user.updated_at >= original_updated_at
