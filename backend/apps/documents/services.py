import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.exceptions import ConflictError
from apps.documents.models import Document

logger = logging.getLogger(__name__)


def retry_document(document: Document) -> None:
    """
    Atomically claim and re-queue document processing if eligible.

    - Eligible: FAILED or stale UPLOADED/PROCESSING (processing_started_at older than 10 mins).
    - If DONE: raise ValidationError(code="document_not_retryable").
    - If fresh UPLOADED/PROCESSING: raise ConflictError(code="document_processing").
    """
    now = timezone.now()
    stale_threshold = now - timedelta(minutes=10)

    claim_filter = Q(pk=document.pk) & (
        Q(status=Document.Status.FAILED)
        | (
            Q(status__in=[Document.Status.UPLOADED, Document.Status.PROCESSING])
            & Q(processing_started_at__lt=stale_threshold)
        )
    )

    claimed = Document.objects.filter(claim_filter).update(
        status=Document.Status.PROCESSING,
        processing_started_at=now,
        error_message="",
    )

    if not claimed:
        doc = Document.objects.filter(pk=document.pk).first()
        if not doc or doc.status == Document.Status.DONE:
            raise ValidationError(
                detail="Document has already been processed.",
                code="document_not_retryable",
            )
        raise ConflictError(
            detail="Document is already being analyzed.",
            code="document_processing",
        )

    def enqueue():
        from apps.documents.tasks import process_document

        try:
            process_document.delay(str(document.id))
        except Exception as exc:
            logger.exception("Failed to enqueue document retry for %s: %s", document.id, exc)
            Document.objects.filter(id=document.id).update(
                status=Document.Status.FAILED,
                error_message="Failed to queue document processing.",
            )

    transaction.on_commit(enqueue)
