import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task
def flush_expired_tokens():
    """Flush expired outstanding and blacklisted JWT tokens."""
    logger.info("Flushing expired tokens")
    call_command("flushexpiredtokens")
