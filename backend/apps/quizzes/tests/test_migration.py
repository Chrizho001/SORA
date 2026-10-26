import importlib

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document
from apps.flashcards.models import Deck
from apps.quizzes.models import QuizSession

User = get_user_model()

migration_module = importlib.import_module(
    "apps.quizzes.migrations.0005_populate_quizsession_deck_and_title"
)
populate_deck_and_title = migration_module.populate_deck_and_title


@pytest.mark.django_db
class TestPopulateQuizSessionDeckMigration:
    def test_populates_deck_and_title_from_document_deck(self, user):
        file = SimpleUploadedFile("history.pdf", b"content")
        doc = Document.objects.create(user=user, original_name="history.pdf", size=100, file=file)
        deck = Deck.objects.create(user=user, title="History 101", document=doc)

        session = QuizSession.objects.create(
            user=user,
            document=doc,
            deck=None,
            deck_title="",
            total_questions=4,
        )

        populate_deck_and_title(apps, None)

        session.refresh_from_db()
        assert session.deck == deck
        assert session.deck_title == "History 101"

    def test_fallback_to_document_name_when_no_deck_exists(self, user):
        file = SimpleUploadedFile("math.pdf", b"content")
        doc = Document.objects.create(user=user, original_name="math.pdf", size=100, file=file)

        session = QuizSession.objects.create(
            user=user,
            document=doc,
            deck=None,
            deck_title="",
            total_questions=4,
        )

        populate_deck_and_title(apps, None)

        session.refresh_from_db()
        assert session.deck is None
        assert session.deck_title == "math.pdf"

    def test_fallback_to_deleted_deck_when_no_document(self, user):
        session = QuizSession.objects.create(
            user=user,
            document=None,
            deck=None,
            deck_title="",
            total_questions=4,
        )

        populate_deck_and_title(apps, None)

        session.refresh_from_db()
        assert session.deck is None
        assert session.deck_title == "Deleted deck"
