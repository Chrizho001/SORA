import logging

import pypdf
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

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
        body = (
            f"Failed to process '{document.original_name}': {document.error_message}"
            if document.error_message
            else f"Failed to process '{document.original_name}'."
        )
        NotificationService.notify(
            recipient=document.user,
            notification_type=NotificationType.PDF_SUMMARY_FAILED,
            title="Summary Failed",
            body=body,
            data={"document_id": str(document.id), "error": document.error_message},
        )
    except Exception as e:
        logger.error("Failed to notify failure for doc %s: %s", document.id, e)


SAFE_DOCUMENT_ERRORS = {
    "PDF is encrypted with a password and cannot be processed.",
    (
        "No text could be extracted from this PDF, and visual analysis could not read it. "
        "Please ensure the PDF is clear and readable."
    ),
    "AI service error. Please try again later.",
    "AI rate limit reached. Please wait a moment and try again.",
    "AI service is busy. Please try again shortly.",
    "Network error contacting AI service. Please try again later.",
    "AI service authentication failed.",
}


def _handle_failure(document_id: str, safe_message: str) -> None:
    error_msg = (
        safe_message
        if safe_message in SAFE_DOCUMENT_ERRORS or safe_message.startswith("PDF is too long")
        else "We couldn't process this PDF. Please try again."
    )
    try:
        with transaction.atomic():
            try:
                doc = Document.objects.select_for_update().get(id=document_id)
            except Document.DoesNotExist:
                return

            if doc.status == Document.Status.DONE:
                return

            doc.status = Document.Status.FAILED
            doc.error_message = error_msg
            doc.processing_started_at = None
            doc.save(update_fields=["status", "error_message", "processing_started_at"])

        _notify_failure(doc)
    except Document.DoesNotExist:
        return
    except Exception as e:
        logger.error("Error handling failure for document %s: %s", document_id, e)


@shared_task
def process_document(document_id: str):
    try:
        doc_entry = (
            Document.objects.filter(id=document_id)
            .values("status", "processing_started_at")
            .first()
        )
    except Exception:
        return

    if not doc_entry:
        return

    if (
        doc_entry["status"] == Document.Status.DONE
        and Summary.objects.filter(document_id=document_id).exists()
    ):
        logger.info("Document %s already processed and DONE with summary. Skipping.", document_id)
        return

    now = timezone.now()
    started_at = doc_entry["processing_started_at"] or now
    Document.objects.filter(id=document_id).update(
        status=Document.Status.PROCESSING,
        processing_started_at=started_at,
    )

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    try:
        # Extract Text
        page_count = 0
        extracted_parts = []
        max_pages = getattr(settings, "DOCUMENT_MAX_PAGES", 50)
        max_chars = getattr(settings, "DOCUMENT_MAX_CHARS", 100000)
        total_chars = 0
        pdf_bytes = None

        with document.file.open("rb") as f:
            pdf_bytes = f.read()
            f.seek(0)
            pdf = pypdf.PdfReader(f)
            if pdf.is_encrypted:
                raise DocumentProcessingError(
                    "PDF is encrypted with a password and cannot be processed."
                )

            page_count = len(pdf.pages)
            if page_count > max_pages:
                raise DocumentProcessingError(
                    f"PDF is too long ({page_count} pages; maximum allowed is {max_pages} pages)."
                )

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

        client = get_summarizer()

        # If no digital text could be extracted (e.g. image-only / scanned PDF),
        # use native multimodal PDF reading
        if not extracted_text.strip():
            logger.info(
                "No digital text found in doc %s. Attempting native multimodal PDF reading.",
                document_id,
            )
            try:
                summary_content = client.summarize(text="", pdf_bytes=pdf_bytes)
                extracted_text = (
                    "[Image-only / scanned PDF processed natively via AI Multimodal Vision]"
                )
            except Exception as exc:
                logger.warning("Multimodal PDF processing failed for doc %s: %s", document_id, exc)
                raise DocumentProcessingError(
                    "No text could be extracted from this PDF, and visual analysis could "
                    "not read it. Please ensure the PDF is clear and readable."
                ) from exc
        else:
            summary_content = client.summarize(text=extracted_text, pdf_bytes=pdf_bytes)

        with transaction.atomic():
            try:
                doc = Document.objects.select_for_update().get(id=document_id)
            except Document.DoesNotExist:
                return

            if (
                doc.status == Document.Status.DONE
                and Summary.objects.filter(document=doc).exists()
            ):
                return

            Summary.objects.update_or_create(
                document=doc,
                defaults={
                    "content": summary_content,
                    "ai_model_used": client.model_name,
                },
            )
            doc.page_count = page_count
            doc.extracted_text = extracted_text.strip()
            doc.status = Document.Status.DONE
            doc.error_message = ""
            doc.processing_started_at = None
            doc.save(
                update_fields=[
                    "page_count",
                    "extracted_text",
                    "status",
                    "error_message",
                    "processing_started_at",
                ]
            )

        try:
            NotificationService.notify(
                recipient=doc.user,
                notification_type=NotificationType.PDF_SUMMARY_READY,
                title="Summary Ready",
                body=f"Your summary for '{doc.original_name}' is ready.",
                data={"document_id": str(doc.id)},
            )
        except Exception as e:
            logger.error("Failed to notify summary ready for doc %s: %s", doc.id, e)

    except DocumentProcessingError as e:
        _handle_failure(document_id, str(e))
    except Exception:
        logger.exception("Unexpected error processing document %s", document_id)
        _handle_failure(document_id, "We couldn't process this PDF. Please try again.")
