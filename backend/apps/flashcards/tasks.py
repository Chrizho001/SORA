from celery import shared_task
from django.db import transaction
from apps.documents.models import Document
from apps.flashcards.models import Flashcard

class FlashcardGeneratorClient:
    """
    Dummy AI interface for generating flashcards.
    """
    def generate(self, summary_text: str) -> list[dict]:
        # Should return a list of {"question": "...", "answer": "..."}
        raise NotImplementedError("Must be mocked in tests or implemented.")


@shared_task
def generate_flashcards_task(document_id: str):
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    document.flashcard_generation_status = Document.FlashcardGenerationStatus.GENERATING
    document.save(update_fields=["flashcard_generation_status"])

    try:
        if not hasattr(document, 'summary'):
            raise ValueError("Document has no summary.")
            
        client = FlashcardGeneratorClient()
        cards_data = client.generate(document.summary.content)

        with transaction.atomic():
            # Clear existing flashcards if any
            Flashcard.objects.filter(document=document).delete()
            
            # Create new ones
            flashcards = [
                Flashcard(
                    user=document.user,
                    document=document,
                    question=card["question"],
                    answer=card["answer"]
                )
                for card in cards_data
            ]
            Flashcard.objects.bulk_create(flashcards)

            document.flashcard_generation_status = Document.FlashcardGenerationStatus.DONE
            document.save(update_fields=["flashcard_generation_status"])

    except Exception as e:
        document.flashcard_generation_status = Document.FlashcardGenerationStatus.FAILED
        document.save(update_fields=["flashcard_generation_status"])
