import logging
from smtplib import SMTPException

from celery import shared_task
from django.core.management import call_command

from .emails import send_templated_email

logger = logging.getLogger(__name__)


@shared_task
def flush_expired_tokens():
    """Flush expired outstanding and blacklisted JWT tokens."""
    logger.info("Flushing expired tokens")
    call_command("flushexpiredtokens")


@shared_task(
    autoretry_for=(SMTPException, OSError),
    retry_backoff=True,
    max_retries=3,
)
def send_templated_email_task(
    to: str,
    subject: str,
    template: str,
    context: dict,
    user_id: str | None = None,
    mascot_filename: str = "sora_mascot_welcome.png",
    **kwargs,
) -> None:
    """Send a templated email with automatic retries on SMTP / OS errors."""
    try:
        send_templated_email(
            subject=subject,
            template_prefix=template,
            context=context,
            recipient_email=to,
            user_id=user_id,
            mascot_filename=mascot_filename,
            **kwargs,
        )
    except Exception as exc:
        if user_id:
            logger.error(
                "Failed to send email '%s' to user_id=%s: %s",
                subject,
                user_id,
                exc,
                exc_info=True,
            )
        else:
            logger.error(
                "Failed to send email '%s': %s",
                subject,
                exc,
                exc_info=True,
            )
        raise
