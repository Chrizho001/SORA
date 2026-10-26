import importlib

import pytest
from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard

migration_module = importlib.import_module(
    "apps.flashcards.migrations.0003_populate_decks_for_existing_flashcards"
)
create_decks_for_existing_flashcards = migration_module.create_decks_for_existing_flashcards


@pytest.mark.django_db
class TestPopulateDecksMigration:
    def test_document_with_cards_gets_deck_and_document_without_cards_gets_none(self, user):
        file1 = SimpleUploadedFile("physics_101.pdf", b"pdf content")
        doc_with_cards = Document.objects.create(
            user=user,
            original_name="physics_101.pdf",
            size=100,
            file=file1,
            status=Document.Status.DONE,
        )

        file2 = SimpleUploadedFile("empty_doc.pdf", b"pdf content")
        doc_without_cards = Document.objects.create(
            user=user,
            original_name="empty_doc.pdf",
            size=100,
            file=file2,
            status=Document.Status.DONE,
        )

        initial_deck = Deck.objects.create(user=user, title="Temp Initial Deck")
        c1 = Flashcard.objects.create(
            user=user,
            deck=initial_deck,
            document=doc_with_cards,
            question="Q1",
            answer="A1",
            source=Flashcard.Source.MANUAL,
        )
        c2 = Flashcard.objects.create(
            user=user,
            deck=initial_deck,
            document=doc_with_cards,
            question="Q2",
            answer="A2",
            source=Flashcard.Source.MANUAL,
        )

        create_decks_for_existing_flashcards(apps, None)

        decks_for_doc = Deck.objects.filter(document=doc_with_cards)
        assert decks_for_doc.count() == 1
        new_deck = decks_for_doc.first()
        assert new_deck.title == "physics_101"
        assert new_deck.user == user

        c1.refresh_from_db()
        c2.refresh_from_db()
        assert c1.deck == new_deck
        assert c1.source == Flashcard.Source.AI
        assert c2.deck == new_deck
        assert c2.source == Flashcard.Source.AI

        assert not Deck.objects.filter(document=doc_without_cards).exists()

    def test_migration_deduplicates_deck_titles(self, user):
        file1 = SimpleUploadedFile("notes.pdf", b"content1")
        doc1 = Document.objects.create(
            user=user,
            original_name="notes.pdf",
            size=100,
            file=file1,
            status=Document.Status.DONE,
        )
        file2 = SimpleUploadedFile("notes.pdf", b"content2")
        doc2 = Document.objects.create(
            user=user,
            original_name="notes.pdf",
            size=100,
            file=file2,
            status=Document.Status.DONE,
        )

        temp_deck = Deck.objects.create(user=user, title="Temp Deck")
        Flashcard.objects.create(
            user=user, deck=temp_deck, document=doc1, question="Q1", answer="A1"
        )
        Flashcard.objects.create(
            user=user, deck=temp_deck, document=doc2, question="Q2", answer="A2"
        )

        create_decks_for_existing_flashcards(apps, None)

        deck1 = Deck.objects.get(document=doc1)
        deck2 = Deck.objects.get(document=doc2)

        titles = {deck1.title, deck2.title}
        assert "notes" in titles
        assert "notes (2)" in titles
