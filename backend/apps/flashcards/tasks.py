import logging

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.documents.models import Document
from apps.flashcards.ai import (
    FlashcardGeneratorClient,
    get_flashcard_generator,
    validate_flashcards_data,
)
from apps.flashcards.models import Deck, Flashcard
from apps.notifications.models import NotificationType
from apps.notifications.notification_service import NotificationService

logger = logging.getLogger(__name__)

__all__ = ["generate_flashcards_task", "FlashcardGeneratorClient"]


@shared_task
def generate_flashcards_task(deck_id: str, count: int = 10):
    deck = None
    document = None

    try:
        try:
            deck = Deck.objects.select_related("document", "document__summary", "user").get(
                id=deck_id
            )
            document = deck.document
        except Deck.DoesNotExist:
            # Fallback in case a document_id was passed
            try:
                document = Document.objects.select_related("summary", "user").get(id=deck_id)
                title = document.original_name
                if title.lower().endswith(".pdf"):
                    title = title[:-4]
                deck, _ = Deck.objects.get_or_create(
                    user=document.user, document=document, defaults={"title": title}
                )
            except Document.DoesNotExist:
                logger.error("Neither Deck nor Document found for id=%s", deck_id)
                return

        if not document:
            logger.error("Deck %s has no source document", deck_id)
            return

        document.flashcard_generation_status = Document.FlashcardGenerationStatus.GENERATING
        document.save(update_fields=["flashcard_generation_status"])

        summary_content = ""
        if hasattr(document, "summary") and document.summary and document.summary.content:
            summary_content = document.summary.content

        text = summary_content
        if len(text) < 1500 and document.extracted_text:
            if text:
                text = f"{text}\n\n{document.extracted_text[:12000]}".strip()
            else:
                text = document.extracted_text[:12000].strip()

        if not text:
            raise ValueError("No summary or extracted text available for document.")

        client = get_flashcard_generator()
        cards_data = client.generate(text, count=count)
        cards_data = validate_flashcards_data(cards_data)

        existing_normalised = {
            " ".join(q.casefold().split()) for q in deck.cards.values_list("question", flat=True)
        }

        to_create = []
        for card in cards_data:
            norm_q = " ".join(card["question"].casefold().split())
            if norm_q not in existing_normalised:
                existing_normalised.add(norm_q)
                to_create.append(
                    Flashcard(
                        user=deck.user,
                        deck=deck,
                        document=document,
                        question=card["question"],
                        answer=card["answer"],
                        source=Flashcard.Source.AI,
                    )
                )

        with transaction.atomic():
            if to_create:
                Flashcard.objects.bulk_create(to_create)
                Deck.objects.filter(pk=deck.pk).update(updated_at=timezone.now())

            document.flashcard_generation_status = Document.FlashcardGenerationStatus.DONE
            document.save(update_fields=["flashcard_generation_status"])

        NotificationService.notify(
            recipient=deck.user,
            notification_type=NotificationType.FLASHCARDS_READY,
            title="Flashcards Ready",
            body=f"{len(to_create)} flashcards added to '{deck.title}'",
            data={"deck_id": str(deck.id), "document_id": str(document.id)},
        )

    except Exception:
        logger.exception("Failed to generate flashcards for deck_id=%s", deck_id)
        if document:
            document.flashcard_generation_status = Document.FlashcardGenerationStatus.FAILED
            document.save(update_fields=["flashcard_generation_status"])
        try:
            deck_title = deck.title if deck else (document.original_name if document else "Deck")
            recipient = deck.user if deck else (document.user if document else None)
            if recipient:
                NotificationService.notify(
                    recipient=recipient,
                    notification_type=NotificationType.FLASHCARDS_FAILED,
                    title="Flashcards Failed",
                    body=f"We couldn't generate flashcards for '{deck_title}'. Please try again.",
                    data={
                        "deck_id": str(deck.id) if deck else None,
                        "document_id": str(document.id) if document else None,
                        "error": "flashcards_generation_failed",
                    },
                )
        except Exception as notify_err:
            logger.exception("Failed to send flashcard failure notification: %s", notify_err)
