import json
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.ai import DocumentProcessingError
from apps.documents.models import Document, Summary
from apps.flashcards.ai import (
    MockFlashcardGenerator,
    validate_flashcards_data,
)
from apps.flashcards.models import Deck, Flashcard
from apps.flashcards.tasks import generate_flashcards_task
from apps.notifications.models import NotificationType


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("test.pdf", b"content")
    return Document.objects.create(
        user=user, original_name="test.pdf", size=100, file=file, status=Document.Status.DONE
    )


@pytest.fixture
def summary(document):
    return Summary.objects.create(
        document=document, content="Short summary text", ai_model_used="test"
    )


@pytest.fixture
def deck(user, document):
    return Deck.objects.create(user=user, title="Physics Deck", document=document)


@pytest.mark.django_db
@patch("apps.notifications.notification_service.NotificationService.notify")
class TestGenerateFlashcardsTask:
    def test_mock_flashcard_generator_returns_count_deterministic_cards(self, mock_notify):
        gen = MockFlashcardGenerator()
        cards = gen.generate("some summary", count=7)
        assert len(cards) == 7
        for c in cards:
            assert "question" in c and c["question"]
            assert "answer" in c and c["answer"]

    def test_validate_flashcards_data_drops_invalid_items_instead_of_failing_batch(
        self, mock_notify
    ):
        raw = {
            "flashcards": [
                {"question": "Valid Q1", "answer": "Valid A1"},
                {"question": "", "answer": "Invalid Q"},  # blank question
                "not a dict",  # invalid type
                {"question": "Valid Q2", "answer": "Valid A2"},
                {"question": "Valid Q3", "answer": "   "},  # whitespace answer
            ]
        }
        valid = validate_flashcards_data(raw)
        assert len(valid) == 2
        assert valid[0]["question"] == "Valid Q1"
        assert valid[1]["question"] == "Valid Q2"

    def test_validate_flashcards_data_fails_if_zero_valid_cards(self, mock_notify):
        raw = {
            "flashcards": [
                {"question": "", "answer": "Invalid Q"},
                {"question": "Valid Q", "answer": " "},
            ]
        }
        with pytest.raises(DocumentProcessingError):
            validate_flashcards_data(raw)

    def test_task_appends_cards_and_never_deletes_existing_manual_cards(
        self, mock_notify, user, deck, document, summary
    ):
        # Create an existing manual card
        existing_card = Flashcard.objects.create(
            user=user,
            deck=deck,
            question="Existing manual question?",
            answer="Existing manual answer.",
            source=Flashcard.Source.MANUAL,
        )

        with patch("apps.flashcards.tasks.get_flashcard_generator") as mock_get_gen:
            mock_client = MagicMock()
            mock_client.generate.return_value = [
                {"question": "New AI Q1?", "answer": "New AI A1."},
                {"question": "New AI Q2?", "answer": "New AI A2."},
            ]
            mock_get_gen.return_value = mock_client

            generate_flashcards_task(str(deck.id), count=2)

        # Existing card must still exist and be unchanged
        existing_card.refresh_from_db()
        assert existing_card.question == "Existing manual question?"
        assert existing_card.source == Flashcard.Source.MANUAL

        # Total cards in deck should now be 3 (1 manual + 2 AI)
        deck_cards = Flashcard.objects.filter(deck=deck).order_by("created_at")
        assert deck_cards.count() == 3

        ai_cards = deck_cards.filter(source=Flashcard.Source.AI)
        assert ai_cards.count() == 2
        for ac in ai_cards:
            assert ac.document == document

        document.refresh_from_db()
        assert document.flashcard_generation_status == Document.FlashcardGenerationStatus.DONE

        # Check notification
        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args.kwargs
        assert call_kwargs["notification_type"] == NotificationType.FLASHCARDS_READY
        assert "2 flashcards added to 'Physics Deck'" in call_kwargs["body"]
        assert call_kwargs["data"]["deck_id"] == str(deck.id)

    def test_task_skips_normalised_duplicate_questions(
        self, mock_notify, user, deck, document, summary
    ):
        # Pre-populate card with question
        Flashcard.objects.create(
            user=user,
            deck=deck,
            question="What is Quantum Mechanics?",
            answer="Physics of the very small.",
            source=Flashcard.Source.MANUAL,
        )

        with patch("apps.flashcards.tasks.get_flashcard_generator") as mock_get_gen:
            mock_client = MagicMock()
            # Returns a card with whitespace/case variation of existing question,
            # and a brand new one
            mock_client.generate.return_value = [
                {
                    "question": "  what   IS quantum  mechanics?  ",
                    "answer": "Duplicate question answer.",
                },
                {
                    "question": "What is Entanglement?",
                    "answer": "Spooky action at a distance.",
                },
            ]
            mock_get_gen.return_value = mock_client

            generate_flashcards_task(str(deck.id), count=2)

        # Only the non-duplicate card should have been added
        assert Flashcard.objects.filter(deck=deck).count() == 2
        assert Flashcard.objects.filter(deck=deck, question="What is Entanglement?").exists()

    def test_task_appends_extracted_text_when_summary_under_1500_chars(
        self, mock_notify, user, deck, document, summary
    ):
        summary.content = "Short summary."  # < 1500 chars
        summary.save()
        document.extracted_text = "Extracted document text goes here."
        document.save()

        with patch("apps.flashcards.tasks.get_flashcard_generator") as mock_get_gen:
            mock_client = MagicMock()
            mock_client.generate.return_value = [
                {"question": "Q1?", "answer": "A1."},
            ]
            mock_get_gen.return_value = mock_client

            generate_flashcards_task(str(deck.id), count=1)

            # Check that generate was called with both summary and extracted text
            passed_text = mock_client.generate.call_args.args[0]
            assert "Short summary." in passed_text
            assert "Extracted document text goes here." in passed_text

    def test_task_failure_sends_notification_and_sets_failed_status(
        self, mock_notify, user, deck, document, summary
    ):
        with patch("apps.flashcards.tasks.get_flashcard_generator") as mock_get_gen:
            mock_client = MagicMock()
            mock_client.generate.side_effect = Exception("SECRET-INTERNAL-CRASH")
            mock_get_gen.return_value = mock_client

            generate_flashcards_task(str(deck.id), count=5)

        document.refresh_from_db()
        assert document.flashcard_generation_status == Document.FlashcardGenerationStatus.FAILED

        mock_notify.assert_called_once()
        call_kwargs = mock_notify.call_args.kwargs
        assert call_kwargs["notification_type"] == NotificationType.FLASHCARDS_FAILED
        assert call_kwargs["title"] == "Flashcards Failed"
        assert "SECRET-INTERNAL-CRASH" not in call_kwargs["body"]
        assert "SECRET-INTERNAL-CRASH" not in json.dumps(call_kwargs["data"])
        assert "Physics Deck" in call_kwargs["body"]
