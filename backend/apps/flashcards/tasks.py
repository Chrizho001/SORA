import logging

from celery import shared_task
from django.db import transaction

from apps.documents.models import Document
from apps.flashcards.ai import (
    FlashcardGeneratorClient,
    get_flashcard_generator,
    validate_flashcards_data,
)
from apps.flashcards.models import Flashcard
from apps.notifications.models import NotificationType
from apps.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)

__all__ = ["generate_flashcards_task", "FlashcardGeneratorClient"]


@shared_task
def generate_flashcards_task(document_id: str):
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    document.flashcard_generation_status = Document.FlashcardGenerationStatus.GENERATING
    document.save(update_fields=["flashcard_generation_status"])

    try:
        if not hasattr(document, "summary"):
            raise ValueError("Document has no summary.")

        client = get_flashcard_generator()
        cards_data = client.generate(document.summary.content)
        cards_data = validate_flashcards_data(cards_data)

        with transaction.atomic():
            # Clear existing flashcards if any
            Flashcard.objects.filter(document=document).delete()

            # Create new ones
            flashcards = [
                Flashcard(
                    user=document.user,
                    document=document,
                    question=card["question"],
                    answer=card["answer"],
                )
                for card in cards_data
            ]
            Flashcard.objects.bulk_create(flashcards)

            document.flashcard_generation_status = Document.FlashcardGenerationStatus.DONE
            document.save(update_fields=["flashcard_generation_status"])

        NotificationService.notify(
            recipient=document.user,
            notification_type=NotificationType.FLASHCARDS_READY,
            title="Flashcards Ready",
            body=(
                f"{len(flashcards)} flashcards have been generated for '{document.original_name}'."
            ),
            data={"document_id": str(document.id)},
        )

    except Exception as e:
        logger.exception("Failed to generate flashcards for document_id=%s", document_id)
        document.flashcard_generation_status = Document.FlashcardGenerationStatus.FAILED
        document.save(update_fields=["flashcard_generation_status"])
        try:
            NotificationService.notify(
                recipient=document.user,
                notification_type=NotificationType.PDF_SUMMARY_FAILED,
                title="Flashcards Failed",
                body=f"Failed to generate flashcards for '{document.original_name}': {str(e)}",
                data={"document_id": str(document.id), "error": str(e)},
            )
        except Exception:
            pass
