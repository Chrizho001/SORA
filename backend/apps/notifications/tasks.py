import json
import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from pywebpush import WebPushException, webpush

from apps.notifications.models import PushSubscription

logger = logging.getLogger(__name__)


@shared_task
def send_web_push_task(
    recipient_id: str, title: str, body: str, data: dict, notification_id: str = None
):
    try:
        subscriptions = PushSubscription.objects.filter(
            user_id=recipient_id, revoked_at__isnull=True
        )
        if not subscriptions.exists():
            return

        payload = {"title": title, "body": body, "data": data}
        if notification_id:
            payload["notification_id"] = notification_id

        vapid_private_key = getattr(settings, "VAPID_PRIVATE_KEY", None)
        vapid_claims = {
            "sub": f"mailto:{getattr(settings, 'VAPID_CLAIM_EMAIL', 'admin@example.com')}"
        }

        if not vapid_private_key:
            logger.warning("VAPID_PRIVATE_KEY not configured. Skipping web push.")
            return

        for sub in subscriptions:
            try:
                sub_info = {
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                }

                webpush(
                    subscription_info=sub_info,
                    data=json.dumps(payload),
                    vapid_private_key=vapid_private_key,
                    vapid_claims=vapid_claims,
                    timeout=10,
                )

                sub.last_used_at = timezone.now()
                sub.save(update_fields=["last_used_at"])

            except WebPushException as ex:
                logger.error(f"WebPush error: {ex}")
                if ex.response and getattr(ex.response, "status_code", None) in [404, 410]:
                    sub.revoked_at = timezone.now()
                    sub.save(update_fields=["revoked_at"])
            except Exception as e:
                logger.error(f"General push error: {e}")

    except Exception as e:
        logger.error(f"Failed to process push task: {e}")


@shared_task
def send_due_task_reminders():
    from datetime import timedelta

    from apps.notifications.models import NotificationType
    from apps.notifications.notification_service import NotificationService
    from apps.tasks.models import Task

    now = timezone.now()
    window_end = now + timedelta(hours=24)

    tasks = Task.objects.filter(
        is_completed=False,
        due_at__gt=now,
        due_at__lte=window_end,
        reminder_sent_at__isnull=True,
    ).select_related("user")
    for task in tasks:
        try:
            NotificationService.notify(
                recipient=task.user,
                notification_type=NotificationType.TASK_DUE_SOON,
                title="Task Due Soon",
                body=f"Your task '{task.title}' is due soon.",
                data={"task_id": str(task.id)},
            )
            task.reminder_sent_at = now
            task.save(update_fields=["reminder_sent_at"])
        except Exception as e:
            logger.error("Failed to send reminder for task_id=%s: %s", task.id, e)
