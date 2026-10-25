from unittest.mock import patch

import pytest

from apps.documents.models import Document, Summary
from apps.flashcards.models import Flashcard
from apps.flashcards.tasks import generate_flashcards_task


@pytest.fixture
def document(user):
    from django.core.files.uploadedfile import SimpleUploadedFile

    file = SimpleUploadedFile("test.pdf", b"content")
    return Document.objects.create(
        user=user, original_name="test.pdf", size=100, file=file, status=Document.Status.DONE
    )


@pytest.fixture
def summary(document):
    return Summary.objects.create(
        document=document, content="This is a summary", ai_model_used="test"
    )


@pytest.fixture(autouse=True)
def use_openai_provider(settings):
    settings.AI_PROVIDER = "openai"


@pytest.mark.django_db
@patch("apps.notifications.notification_service.NotificationService.notify")
class TestGenerateFlashcardsTask:
    @patch("apps.flashcards.tasks.FlashcardGeneratorClient.generate")
    def test_task_success(self, mock_generate, mock_notify, document, summary):
        mock_generate.return_value = [
            {"question": "Q1?", "answer": "A1."},
            {"question": "Q2?", "answer": "A2."},
        ]

        generate_flashcards_task(str(document.id))

        document.refresh_from_db()
        assert document.flashcard_generation_status == Document.FlashcardGenerationStatus.DONE

        cards = Flashcard.objects.filter(document=document)
        assert cards.count() == 2
        assert cards[0].question == "Q1?"
        assert cards[1].question == "Q2?"

    @patch("apps.flashcards.tasks.FlashcardGeneratorClient.generate")
    def test_task_fails_on_ai_error(self, mock_generate, mock_notify, document, summary):
        mock_generate.side_effect = Exception("AI failure")

        generate_flashcards_task(str(document.id))

        document.refresh_from_db()
        assert document.flashcard_generation_status == Document.FlashcardGenerationStatus.FAILED
        assert Flashcard.objects.filter(document=document).count() == 0

        from apps.notifications.models import NotificationType

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args.kwargs
        assert call_kwargs["notification_type"] == NotificationType.FLASHCARDS_FAILED
        assert call_kwargs["title"] == "Flashcards Failed"
        assert (
            call_kwargs["body"]
            == f"We couldn't generate flashcards for '{document.original_name}'. Please try again."
        )
        assert call_kwargs["data"] == {
            "document_id": str(document.id),
            "error": "flashcards_generation_failed",
        }
