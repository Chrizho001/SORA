"""
Serializers for the accounts app.

Serializers handle input validation. Business logic belongs in services.py.
Endpoint specifications: 01-authentication.md §4.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for returning user details.
    Shape specified in 01-authentication.md §4 (Shared response shapes).
    """

    auth_providers = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "is_email_verified",
            "has_password",
            "auth_providers",
            "date_joined",
        )
        read_only_fields = fields

    def get_auth_providers(self, obj):
        """List the linked social providers (e.g. ['google'])."""
        if hasattr(obj, "social_accounts"):
            return [account.provider for account in obj.social_accounts.all()]
        return []


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for POST /api/v1/auth/register/.
    Validates input, checks for email uniqueness, and validates passwords.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return email

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        if password and password_confirm and password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Run Django's AUTH_PASSWORD_VALIDATORS on the password
        if password:
            try:
                # We construct a dummy user for the validator (needed for similarity check)
                dummy_user = User(
                    email=attrs.get("email", ""),
                    first_name=attrs.get("first_name", ""),
                    last_name=attrs.get("last_name", ""),
                )
                validate_password(password, dummy_user)
            except ValidationError as e:
                # ValidationError from django.core.exceptions is translated to DRF ValidationError
                raise serializers.ValidationError({"password": list(e.messages)})

        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/verify-email/."""

    token = serializers.CharField()


class VerifyEmailResendSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/verify-email/resend/."""

    email = serializers.EmailField()


class LoginSerializer(serializers.Serializer):
    """
    Serializer for POST /api/v1/auth/login/.
    Only validates that fields are present. View handles authentication.
    """

    email = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/password/change/."""

    old_password = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect old password.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        if password and password_confirm and password != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        if password:
            try:
                validate_password(password, self.context["request"].user)
            except ValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})

        return attrs


class GoogleLoginSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/google/."""

    token = serializers.CharField()


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/password-reset/."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for POST /api/v1/auth/password-reset/confirm/."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password_confirm = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        password = attrs.get("new_password")
        password_confirm = attrs.get("new_password_confirm")

        if password and password_confirm and password != password_confirm:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})

        if password:
            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError as DjangoValidationError

            try:
                validate_password(password)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"new_password": list(e.messages)})

        return attrs


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile (PATCH /api/v1/auth/me/).
    Fields first_name and last_name, max 150, trimmed.
    Every other field is read-only and ignored.
    """

    first_name = serializers.CharField(
        max_length=150, required=False, allow_blank=False, trim_whitespace=True
    )
    last_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, trim_whitespace=True
    )

    class Meta:
        model = User
        fields = ("first_name", "last_name")
