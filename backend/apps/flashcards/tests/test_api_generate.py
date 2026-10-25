from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.documents.models import Document, Summary
from apps.flashcards.models import Deck

User = get_user_model()


@pytest.fixture
def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("biology_notes.pdf", b"pdf content")
    doc = Document.objects.create(
        user=user,
        original_name="biology_notes.pdf",
        size=100,
        file=file,
        status=Document.Status.DONE,
    )
    Summary.objects.create(
        document=doc,
        content="This is the summary content for biology.",
        ai_model_used="test-model",
    )
    return doc


@pytest.fixture
def deck_with_doc(user, document):
    return Deck.objects.create(user=user, title="Bio Deck", document=document)


@pytest.fixture
def deck_without_doc(user):
    return Deck.objects.create(user=user, title="Manual Deck", document=None)


@pytest.mark.django_db
class TestDeckGenerateFlashcardsAPI:
    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_success(self, mock_delay, auth_client, deck_with_doc, document):
        url = reverse("decks:deck-generate-flashcards", args=[deck_with_doc.id])
        res = auth_client.post(url, {"count": 12}, format="json")

        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data["status"] == "GENERATING"
        mock_delay.assert_called_once_with(str(deck_with_doc.id), count=12)

        document.refresh_from_db()
        assert (
            document.flashcard_generation_status == Document.FlashcardGenerationStatus.GENERATING
        )

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_default_count_is_10(
        self, mock_delay, auth_client, deck_with_doc, document
    ):
        url = reverse("decks:deck-generate-flashcards", args=[deck_with_doc.id])
        res = auth_client.post(url, format="json")

        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data["status"] == "GENERATING"
        mock_delay.assert_called_once_with(str(deck_with_doc.id), count=10)

    def test_generate_flashcards_no_source_document_returns_400(
        self, auth_client, deck_without_doc
    ):
        url = reverse("decks:deck-generate-flashcards", args=[deck_without_doc.id])
        res = auth_client.post(url, format="json")

        assert res.status_code == status.HTTP_400_BAD_REQUEST
        data = res.data
        assert data.get("code") == "no_source_document" or "no_source_document" in str(data)

    def test_generate_flashcards_document_not_done_returns_400(self, auth_client, user):
        doc = Document.objects.create(
            user=user,
            original_name="processing.pdf",
            size=100,
            status=Document.Status.PROCESSING,
        )
        deck = Deck.objects.create(user=user, title="Proc Deck", document=doc)
        url = reverse("decks:deck-generate-flashcards", args=[deck.id])
        res = auth_client.post(url, format="json")

        assert res.status_code == status.HTTP_400_BAD_REQUEST
        data = res.data
        assert data.get("code") == "summary_not_ready" or "summary_not_ready" in str(data)

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_conflict_when_already_generating(
        self, mock_delay, auth_client, deck_with_doc, document
    ):
        document.flashcard_generation_status = Document.FlashcardGenerationStatus.GENERATING
        document.save()

        url = reverse("decks:deck-generate-flashcards", args=[deck_with_doc.id])
        res = auth_client.post(url, format="json")

        assert res.status_code == status.HTTP_409_CONFLICT
        data = res.data
        assert data.get("code") == "generation_in_progress" or "generation_in_progress" in str(
            data
        )
        mock_delay.assert_not_called()

    def test_generate_flashcards_foreign_deck_returns_404(self, auth_client, document):
        other_user = User.objects.create_user(email="foreign@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(
            user=other_user, title="Foreign Deck", document=document
        )

        url = reverse("decks:deck-generate-flashcards", args=[foreign_deck.id])
        res = auth_client.post(url, format="json")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_generate_flashcards_invalid_count_returns_400(self, auth_client, deck_with_doc):
        url = reverse("decks:deck-generate-flashcards", args=[deck_with_doc.id])
        # Below 5
        res = auth_client.post(url, {"count": 4}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Above 20
        res2 = auth_client.post(url, {"count": 21}, format="json")
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_legacy_document_generate_flashcards_creates_deck_and_returns_deck_id(
        self, mock_delay, auth_client, user, document
    ):
        url = reverse("documents:document-generate-flashcards", args=[document.id])
        res = auth_client.post(url, {"count": 8}, format="json")

        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data["status"] == "GENERATING"
        assert "deck_id" in res.data

        deck = Deck.objects.get(id=res.data["deck_id"])
        assert deck.user == user
        assert deck.document == document
        assert deck.title == "biology_notes"
        mock_delay.assert_called_once_with(str(deck.id), count=8)

    def test_generate_flashcards_uses_ai_jobs_throttle_scope(self):
        from apps.flashcards.views import DeckViewSet

        view = DeckViewSet()
        view.action = "generate_flashcards"
        view.format_kwarg = None
        view.get_throttles()
        assert view.throttle_scope == "ai_jobs"
