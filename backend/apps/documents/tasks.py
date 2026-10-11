import logging

import pypdf
from celery import shared_task
from django.conf import settings
from django.db import transaction

from apps.documents.ai import (
    DocumentProcessingError,
    SummarizerClient,
    get_summarizer,
)
from apps.documents.models import Document, Summary
from apps.notifications.models import NotificationType
from apps.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)

__all__ = ["process_document", "DocumentProcessingError", "SummarizerClient"]


def _notify_failure(document: Document) -> None:
    try:
        NotificationService.notify(
            recipient=document.user,
            notification_type=NotificationType.PDF_SUMMARY_FAILED,
            title="Summary Failed",
            body=f"Failed to process '{document.original_name}'.",
            data={"document_id": str(document.id)},
        )
    except Exception as e:
        logger.error("Failed to notify failure for doc %s: %s", document.id, e)


@shared_task
def process_document(document_id: str):
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    # Set status to PROCESSING
    document.status = Document.Status.PROCESSING
    document.save(update_fields=["status"])

    try:
        # Extract Text
        page_count = 0
        extracted_parts = []
        max_pages = getattr(settings, "DOCUMENT_MAX_PAGES", 50)
        max_chars = getattr(settings, "DOCUMENT_MAX_CHARS", 100000)
        total_chars = 0

        with document.file.open("rb") as f:
            pdf = pypdf.PdfReader(f)
            if pdf.is_encrypted:
                raise DocumentProcessingError("PDF is encrypted and cannot be processed.")

            page_count = len(pdf.pages)
            if page_count > max_pages:
                raise DocumentProcessingError(f"PDF is too long (maximum {max_pages} pages).")

            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_parts.append(text)
                    total_chars += len(text)
                    if total_chars >= max_chars:
                        break

        extracted_text = "\n".join(extracted_parts)
        if len(extracted_text) > max_chars:
            extracted_text = extracted_text[:max_chars]

        if not extracted_text.strip():
            raise DocumentProcessingError(
                "No text could be extracted from this PDF. It may be an image-only PDF."
            )

        document.page_count = page_count
        document.extracted_text = extracted_text.strip()
        document.save(update_fields=["page_count", "extracted_text"])

        # Summarize
        client = get_summarizer()
        summary_content = client.summarize(document.extracted_text)

        # Save Summary and update status
        with transaction.atomic():
            Summary.objects.create(
                document=document,
                content=summary_content,
                ai_model_used=client.model_name,
            )
            document.status = Document.Status.DONE
            document.save(update_fields=["status"])

        NotificationService.notify(
            recipient=document.user,
            notification_type=NotificationType.PDF_SUMMARY_READY,
            title="Summary Ready",
            body=f"Your summary for '{document.original_name}' is ready.",
            data={"document_id": str(document.id)},
        )

    except DocumentProcessingError as e:
        document.status = Document.Status.FAILED
        document.error_message = str(e)
        document.save(update_fields=["status", "error_message"])
        _notify_failure(document)
    except Exception:
        logger.exception("Unexpected error processing document %s", document_id)
        document.status = Document.Status.FAILED
        document.error_message = "We couldn't process this PDF. Please try again."
        document.save(update_fields=["status", "error_message"])
        _notify_failure(document)
