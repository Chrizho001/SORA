"""
Factory Boy factories for the accounts app.

Used across all test modules to create consistent, minimal test data.
Architecture ref: CLAUDE.md ("Tests live in apps/<name>/tests/: factories.py …").
"""

import factory
from django.contrib.auth import get_user_model

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """
    Factory for creating User instances.

    Defaults:
    - Verified (is_email_verified=True) for convenience — most tests need
      a user that can log in. Use ``unverified=True`` trait for unverified users.
    - Password is set to a known strong value (overridable).
    """

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_email_verified = True
    is_active = True

    class Params:
        # Trait: create an unverified user
        unverified = factory.Trait(is_email_verified=False)
        # Trait: create an inactive user
        inactive = factory.Trait(is_active=False)
        # Trait: create a Google-only user (no usable password)
        google_only = factory.Trait(is_email_verified=True)

    @factory.lazy_attribute
    def password(self):
        """
        Return a raw password string for the factory.

        This is NOT the hashed password — the ``_create`` method will
        call ``set_password`` to hash it.
        """
        return "TestPass123!"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Override to use the custom manager's create_user method."""
        password = kwargs.pop("password", None)
        google_only = kwargs.pop("google_only", False)
        user = model_class.objects._normalise_email  # verify manager exists

        user = model_class(**kwargs)
        # Normalise email the same way the manager does
        if user.email:
            user.email = user.email.strip().lower()

        if google_only:
            user.set_unusable_password()
        elif password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user
