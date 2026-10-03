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
            priority=2, # medium
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
