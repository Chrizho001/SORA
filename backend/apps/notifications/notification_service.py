import logging

from django.db import transaction

from apps.notifications.models import Notification, NotificationPreference, NotificationType

logger = logging.getLogger(__name__)


def _dispatch_push(recipient_id, title, body, data, notification_id=None):
    try:
        # Function-local import to prevent circular import with apps.notifications.tasks
        from apps.notifications.tasks import send_web_push_task

        send_web_push_task.delay(
            recipient_id=recipient_id,
            title=title,
            body=body,
            data=data,
            notification_id=notification_id,
        )
    except Exception as exc:
        logger.warning(
            "Failed to enqueue web push task for recipient %s: %s",
            recipient_id,
            exc,
            exc_info=True,
        )


class NotificationService:
    _dispatch_push = staticmethod(_dispatch_push)

    @staticmethod
    def notify(recipient, notification_type, title, body, data=None):
        if data is None:
            data = {}

        # Check preferences
        try:
            pref = NotificationPreference.objects.get(
                user=recipient, notification_type=notification_type
            )
            in_app = pref.in_app_enabled
            push = pref.push_enabled
        except NotificationPreference.DoesNotExist:
            # Default to true
            in_app = True
            push = True

        # Always force security notifications
        if notification_type in [
            NotificationType.SECURITY_NEW_LOGIN,
            NotificationType.SECURITY_PASSWORD_CHANGED,
            NotificationType.SECURITY_EMAIL_CHANGED,
        ]:
            in_app = True
            push = True

        notification = None
        if in_app:
            notification = Notification.objects.create(
                recipient=recipient,
                type=notification_type,
                title=title,
                body=body,
                data=data,
            )

        if push:
            recipient_id = str(recipient.id)
            notification_id = str(notification.id) if notification else None
            transaction.on_commit(
                lambda: _dispatch_push(
                    recipient_id=recipient_id,
                    title=title,
                    body=body,
                    data=data,
                    notification_id=notification_id,
                )
            )

        return notification
