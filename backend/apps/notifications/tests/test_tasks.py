from datetime import timedelta

import pytest
from django.utils import timezone

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


def test_celery_test_settings():
    from django.conf import settings

    assert getattr(settings, "CELERY_TASK_ALWAYS_EAGER", None) is True
    assert getattr(settings, "CELERY_TASK_EAGER_PROPAGATES", None) is True
    assert getattr(settings, "CELERY_BROKER_URL", None) == "memory://"
