import pytest
from django.utils import timezone

from apps.tasks.models import Task


@pytest.mark.django_db
class TestTaskModel:
    def test_create_task(self, user):
        task = Task.objects.create(
            user=user,
            title="Buy groceries",
            description="Milk, eggs, bread",
            priority=2,  # medium
        )
        assert task.id is not None
        assert task.user == user
        assert task.title == "Buy groceries"
        assert task.description == "Milk, eggs, bread"
        assert task.due_at is None
        assert task.priority == 2
        assert task.is_completed is False
        assert task.completed_at is None
        assert task.created_at is not None
        assert task.updated_at is not None
        assert str(task) == "Buy groceries"

    def test_completed_task_saves_completed_at(self, user):
        task = Task.objects.create(
            user=user,
            title="Do laundry",
            is_completed=True,
            completed_at=timezone.now(),
        )
        assert task.is_completed is True
        assert task.completed_at is not None

    def test_default_priority_is_medium(self, user):
        task = Task.objects.create(
            user=user,
            title="Default priority task",
        )
        assert task.priority == 2

    def test_create_task_has_overdue_notified_at_field(self, user):
        task = Task.objects.create(
            user=user,
            title="Test task",
        )
        assert hasattr(task, "overdue_notified_at")
        assert task.overdue_notified_at is None

    def test_rearming_clears_reminders_on_due_at_change(self, user):
        now = timezone.now()
        task = Task.objects.create(
            user=user,
            title="Assignment",
            due_at=now,
            reminder_sent_at=now,
            overdue_notified_at=now,
        )
        # Reload from database to populate _loaded_values via from_db
        task = Task.objects.get(id=task.id)
        assert task.reminder_sent_at is not None
        assert task.overdue_notified_at is not None

        # Change due_at
        task.due_at = now + timezone.timedelta(hours=2)
        task.save()

        task.refresh_from_db()
        assert task.reminder_sent_at is None
        assert task.overdue_notified_at is None

    def test_rearming_clears_reminders_on_reopening_task(self, user):
        now = timezone.now()
        task = Task.objects.create(
            user=user,
            title="Assignment",
            due_at=now,
            is_completed=True,
            completed_at=now,
            reminder_sent_at=now,
            overdue_notified_at=now,
        )
        # Reload from DB
        task = Task.objects.get(id=task.id)
        assert task.is_completed is True

        # Re-open task
        task.is_completed = False
        task.save()

        task.refresh_from_db()
        assert task.is_completed is False
        assert task.completed_at is None
        assert task.reminder_sent_at is None
        assert task.overdue_notified_at is None

    def test_rearming_preserves_reminders_when_other_fields_change(self, user):
        now = timezone.now()
        task = Task.objects.create(
            user=user,
            title="Assignment",
            due_at=now,
            reminder_sent_at=now,
            overdue_notified_at=now,
        )
        task = Task.objects.get(id=task.id)

        # Only edit title
        task.title = "Updated Assignment Title"
        task.save()

        task.refresh_from_db()
        assert task.title == "Updated Assignment Title"
        assert task.reminder_sent_at == now
        assert task.overdue_notified_at == now
