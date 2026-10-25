from datetime import UTC, timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.tasks.models import Task


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def task(user):
    return Task.objects.create(user=user, title="My Task")


@pytest.mark.django_db
class TestTaskCRUD:
    url = reverse("tasks:task-list")

    def test_create_task(self, auth_client, user):
        payload = {
            "title": "New Task",
            "description": "Task description",
            "priority": 3,
        }
        res = auth_client.post(self.url, payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["title"] == "New Task"
        assert res.data["priority"] == 3
        assert Task.objects.filter(user=user, title="New Task").exists()

    def test_create_task_without_title_returns_400(self, auth_client):
        res = auth_client.post(self.url, {"description": "No title"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in res.data["errors"]

    def test_list_tasks_returns_paginated_owned_tasks(self, auth_client, user):
        Task.objects.create(user=user, title="Task 1")
        Task.objects.create(user=user, title="Task 2")

        # Create task for another user
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(email="other@test.com", password="pwd")
        Task.objects.create(user=other_user, title="Other Task")

        res = auth_client.get(self.url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 2
        titles = [t["title"] for t in res.data["results"]]
        assert "Task 1" in titles
        assert "Other Task" not in titles

    def test_retrieve_owned_task(self, auth_client, task):
        url = reverse("tasks:task-detail", args=[task.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["title"] == task.title

    def test_retrieve_unowned_task_returns_404(self, auth_client, user):
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(email="other@test.com", password="pwd")
        other_task = Task.objects.create(user=other_user, title="Other Task")

        url = reverse("tasks:task-detail", args=[other_task.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_update_task(self, auth_client, task):
        url = reverse("tasks:task-detail", args=[task.id])
        res = auth_client.patch(url, {"title": "Updated Task"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["title"] == "Updated Task"
        task.refresh_from_db()
        assert task.title == "Updated Task"

    def test_delete_task(self, auth_client, task):
        url = reverse("tasks:task-detail", args=[task.id])
        res = auth_client.delete(url)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task.id).exists()

    def test_put_task_returns_405_method_not_allowed(self, auth_client, task):
        url = reverse("tasks:task-detail", args=[task.id])
        res = auth_client.put(url, {"title": "Replaced Title"}, format="json")
        assert res.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_patch_due_at_clears_reminder_flags(self, auth_client, user):
        now = timezone.now()
        task = Task.objects.create(
            user=user,
            title="Assignment",
            due_at=now,
            reminder_sent_at=now,
            overdue_notified_at=now,
        )
        url = reverse("tasks:task-detail", args=[task.id])
        new_due = (now + timedelta(days=2)).isoformat()
        res = auth_client.patch(url, {"due_at": new_due}, format="json")
        assert res.status_code == status.HTTP_200_OK

        task.refresh_from_db()
        assert task.reminder_sent_at is None
        assert task.overdue_notified_at is None

    def test_patch_reopen_clears_reminder_flags(self, auth_client, user):
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
        url = reverse("tasks:task-detail", args=[task.id])
        res = auth_client.patch(url, {"is_completed": False}, format="json")
        assert res.status_code == status.HTTP_200_OK

        task.refresh_from_db()
        assert task.is_completed is False
        assert task.completed_at is None
        assert task.reminder_sent_at is None
        assert task.overdue_notified_at is None


@pytest.mark.django_db
class TestCompletionLogic:
    def test_completion_updates_completed_at(self, auth_client, task):
        url = reverse("tasks:task-detail", args=[task.id])
        assert task.completed_at is None

        res = auth_client.patch(url, {"is_completed": True}, format="json")
        assert res.status_code == status.HTTP_200_OK

        task.refresh_from_db()
        assert task.is_completed is True
        assert task.completed_at is not None

        res = auth_client.patch(url, {"is_completed": False}, format="json")
        assert res.status_code == status.HTTP_200_OK

        task.refresh_from_db()
        assert task.is_completed is False
        assert task.completed_at is None


@pytest.mark.django_db
class TestFilteringAndOrdering:
    url = reverse("tasks:task-list")

    @pytest.fixture
    def setup_tasks(self, user):
        now = timezone.now()
        # open task, due today
        Task.objects.create(user=user, title="Task 1", due_at=now, priority=1)
        # completed task, due tomorrow
        Task.objects.create(
            user=user,
            title="Task 2",
            due_at=now + timedelta(days=1),
            is_completed=True,
            priority=3,
        )
        # open task, no due date (to-do)
        Task.objects.create(user=user, title="Task 3", due_at=None, priority=2)
        # open task, due yesterday
        Task.objects.create(user=user, title="Task 4", due_at=now - timedelta(days=1), priority=3)

    def test_filter_by_is_completed(self, auth_client, setup_tasks):
        res = auth_client.get(f"{self.url}?is_completed=true")
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Task 2"

        res = auth_client.get(f"{self.url}?is_completed=false")
        assert res.data["count"] == 3

    def test_filter_by_priority(self, auth_client, setup_tasks):
        res = auth_client.get(f"{self.url}?priority=3")
        assert res.data["count"] == 2
        titles = [t["title"] for t in res.data["results"]]
        assert "Task 2" in titles
        assert "Task 4" in titles

    def test_filter_by_date(self, auth_client, setup_tasks):
        today = timezone.now().date().isoformat()
        res = auth_client.get(f"{self.url}?date={today}")
        # should return Task 1
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Task 1"

    def test_filter_by_date_range(self, auth_client, setup_tasks):
        past = (timezone.now() - timedelta(days=2)).isoformat().replace("+", "%2B")
        future = (timezone.now() + timedelta(days=2)).isoformat().replace("+", "%2B")
        res = auth_client.get(f"{self.url}?from={past}&to={future}")
        assert res.data["count"] == 3

    def test_default_ordering(self, auth_client, setup_tasks):
        res = auth_client.get(self.url)
        results = res.data["results"]
        # order should be due_at ascending, nulls last
        assert results[0]["title"] == "Task 4"  # yesterday
        assert results[1]["title"] == "Task 1"  # today
        assert results[2]["title"] == "Task 2"  # tomorrow
        assert results[3]["title"] == "Task 3"  # null due_at (last)

    def test_filter_by_date_with_timezone(self, auth_client, user):
        from datetime import datetime

        # Task A: 2026-10-26T02:00:00Z (which is 2026-10-25 22:00:00 in America/New_York)
        due_a = datetime(2026, 10, 26, 2, 0, 0, tzinfo=UTC)
        # Task B: 2026-10-25T03:00:00Z (which is 2026-10-24 23:00:00 in America/New_York)
        due_b = datetime(2026, 10, 25, 3, 0, 0, tzinfo=UTC)

        task_a = Task.objects.create(user=user, title="NY Oct 25 Task", due_at=due_a)
        task_b = Task.objects.create(user=user, title="NY Oct 24 Task", due_at=due_b)

        res = auth_client.get(f"{self.url}?date=2026-10-25&tz=America/New_York")
        assert res.status_code == status.HTTP_200_OK
        ids = [t["id"] for t in res.data["results"]]
        assert str(task_a.id) in ids
        assert str(task_b.id) not in ids

    def test_filter_by_invalid_timezone_returns_400(self, auth_client):
        res = auth_client.get(f"{self.url}?tz=Mars/Base")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "validation_error"
        assert "tz" in res.data["errors"]
