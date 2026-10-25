from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from freezegun import freeze_time

from apps.notifications.models import Notification, NotificationType
from apps.notifications.tasks import send_due_task_reminders
from apps.tasks.models import Task


@pytest.mark.django_db
def test_send_due_task_reminders(user):
    now = timezone.now()
    due_task = Task.objects.create(
        user=user,
        title="Physics Homework",
        due_at=now + timedelta(minutes=10),
    )
    completed_task = Task.objects.create(
        user=user,
        title="Math Homework",
        due_at=now + timedelta(minutes=10),
        is_completed=True,
    )
    far_task = Task.objects.create(
        user=user,
        title="History Essay",
        due_at=now + timedelta(days=5),
    )

    send_due_task_reminders()

    notifs = Notification.objects.filter(recipient=user, type=NotificationType.TASK_DUE_SOON)
    assert notifs.count() == 1
    assert "Physics Homework" in notifs.first().body

    due_task.refresh_from_db()
    assert due_task.reminder_sent_at is not None

    completed_task.refresh_from_db()
    assert completed_task.reminder_sent_at is None

    far_task.refresh_from_db()
    assert far_task.reminder_sent_at is None

    # Idempotency check: re-running does not create duplicate notifications
    send_due_task_reminders()
    assert (
        Notification.objects.filter(recipient=user, type=NotificationType.TASK_DUE_SOON).count()
        == 1
    )


@pytest.mark.django_db
def test_send_due_task_reminders_reschedule_due_soon(user):
    with freeze_time("2026-10-25 10:00:00"):
        now = timezone.now()
        task = Task.objects.create(
            user=user,
            title="Lab Report",
            due_at=now + timedelta(hours=2),
        )

        send_due_task_reminders()

        task.refresh_from_db()
        assert task.reminder_sent_at is not None
        due_soon_qs = Notification.objects.filter(
            recipient=user, type=NotificationType.TASK_DUE_SOON
        )
        assert due_soon_qs.count() == 1

        # Reschedule to a new due date within 24h
        task = Task.objects.get(id=task.id)
        task.due_at = now + timedelta(hours=4)
        task.save()

        task.refresh_from_db()
        assert task.reminder_sent_at is None

        # Re-running reminder sends notification again
        send_due_task_reminders()
        assert due_soon_qs.count() == 2


@pytest.mark.django_db
def test_send_due_task_reminders_overdue_pass(user):
    with freeze_time("2026-10-25 12:00:00"):
        now = timezone.now()
        overdue_task = Task.objects.create(
            user=user,
            title="Submit Thesis",
            due_at=now - timedelta(hours=2),
        )
        completed_task = Task.objects.create(
            user=user,
            title="Finish Slides",
            due_at=now - timedelta(hours=3),
            is_completed=True,
            completed_at=now - timedelta(hours=3),
        )
        future_task = Task.objects.create(
            user=user,
            title="Future Assignment",
            due_at=now + timedelta(hours=2),
        )

        send_due_task_reminders()

        # Check overdue notification
        overdue_notifs = Notification.objects.filter(
            recipient=user, type=NotificationType.TASK_OVERDUE
        )
        assert overdue_notifs.count() == 1
        notif = overdue_notifs.first()
        assert notif.title == "Task overdue"
        assert notif.body == f"'{overdue_task.title}' is overdue."
        assert notif.data == {"task_id": str(overdue_task.id)}

        overdue_task.refresh_from_db()
        assert overdue_task.overdue_notified_at is not None

        completed_task.refresh_from_db()
        assert completed_task.overdue_notified_at is None

        future_task.refresh_from_db()
        assert future_task.overdue_notified_at is None

        # Idempotency check
        send_due_task_reminders()
        assert (
            Notification.objects.filter(recipient=user, type=NotificationType.TASK_OVERDUE).count()
            == 1
        )

        # Reschedule overdue task to another time in the past
        overdue_task = Task.objects.get(id=overdue_task.id)
        overdue_task.due_at = now - timedelta(hours=1)
        overdue_task.save()

        overdue_task.refresh_from_db()
        assert overdue_task.overdue_notified_at is None

        # Re-running sends overdue notification again
        send_due_task_reminders()
        assert (
            Notification.objects.filter(recipient=user, type=NotificationType.TASK_OVERDUE).count()
            == 2
        )


@pytest.mark.django_db
def test_send_due_task_reminders_failure_isolation(user):
    with freeze_time("2026-10-25 12:00:00"):
        now = timezone.now()
        task1 = Task.objects.create(user=user, title="Task 1", due_at=now - timedelta(hours=2))
        task2 = Task.objects.create(user=user, title="Task 2", due_at=now - timedelta(hours=1))

        from apps.notifications.notification_service import NotificationService

        original_notify = NotificationService.notify

        def fail_for_task1(*args, **kwargs):
            if kwargs.get("data", {}).get("task_id") == str(task1.id):
                raise RuntimeError("Push failure simulated")
            return original_notify(*args, **kwargs)

        with patch.object(NotificationService, "notify", side_effect=fail_for_task1):
            send_due_task_reminders()

        task1.refresh_from_db()
        task2.refresh_from_db()

        # Task 1 failed, so its flag is not set
        assert task1.overdue_notified_at is None
        # Task 2 succeeded despite Task 1's failure
        assert task2.overdue_notified_at is not None
        assert Notification.objects.filter(
            recipient=user, data={"task_id": str(task2.id)}
        ).exists()


def test_celery_test_settings():
    from django.conf import settings

    assert getattr(settings, "CELERY_TASK_ALWAYS_EAGER", None) is True
    assert getattr(settings, "CELERY_TASK_EAGER_PROPAGATES", None) is True
    assert getattr(settings, "CELERY_BROKER_URL", None) == "memory://"
