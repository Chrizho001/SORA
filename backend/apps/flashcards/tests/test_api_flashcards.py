from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard

User = get_user_model()


@pytest.fixture
def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("biology.pdf", b"pdf content")
    return Document.objects.create(
        user=user,
        original_name="biology.pdf",
        size=100,
        file=file,
        status=Document.Status.DONE,
    )


@pytest.fixture
def deck(user, document):
    return Deck.objects.create(user=user, title="Biology Deck", document=document)


@pytest.fixture
def flashcard(user, deck, document):
    return Flashcard.objects.create(
        user=user,
        deck=deck,
        document=document,
        question="What is DNA?",
        answer="Genetic material.",
        source=Flashcard.Source.MANUAL,
    )


@pytest.mark.django_db
class TestFlashcardAPI:
    list_url = reverse("flashcards:flashcard-list")

    def test_create_flashcard_success(self, auth_client, user, deck):
        old_updated_at = deck.updated_at
        payload = {
            "deck": str(deck.id),
            "question": "What is ATP?",
            "answer": "Energy currency of the cell.",
        }
        res = auth_client.post(self.list_url, payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["question"] == "What is ATP?"
        assert res.data["answer"] == "Energy currency of the cell."
        assert str(res.data["deck"]) == str(deck.id)
        assert res.data["source"] == "MANUAL"
        assert res.data["document"] is None

        card = Flashcard.objects.get(id=res.data["id"])
        assert card.user == user
        assert card.deck == deck
        assert card.source == Flashcard.Source.MANUAL

        # Deck updated_at must be bumped
        deck.refresh_from_db()
        assert deck.updated_at > old_updated_at

    def test_create_flashcard_foreign_deck_returns_400(self, auth_client):
        other_user = User.objects.create_user(email="other@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(user=other_user, title="Foreign Deck")

        payload = {
            "deck": str(foreign_deck.id),
            "question": "Question?",
            "answer": "Answer.",
        }
        res = auth_client.post(self.list_url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "deck" in res.data.get("errors", res.data)

    def test_create_flashcard_blank_or_whitespace_fields_returns_400(self, auth_client, deck):
        # Blank question
        res = auth_client.post(
            self.list_url,
            {"deck": str(deck.id), "question": "   ", "answer": "Valid answer"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        # Blank answer
        res = auth_client.post(
            self.list_url,
            {"deck": str(deck.id), "question": "Valid question", "answer": "   "},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_flashcard_over_500_chars_returns_400(self, auth_client, deck):
        long_text = "a" * 501
        res = auth_client.post(
            self.list_url,
            {"deck": str(deck.id), "question": long_text, "answer": "Valid"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        res2 = auth_client.post(
            self.list_url,
            {"deck": str(deck.id), "question": "Valid", "answer": long_text},
            format="json",
        )
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_flashcard_deck_full_returns_400(self, auth_client, user, deck):
        # Create 500 cards in this deck
        cards = [
            Flashcard(
                user=user,
                deck=deck,
                question=f"Question {i}",
                answer=f"Answer {i}",
                source=Flashcard.Source.MANUAL,
            )
            for i in range(500)
        ]
        Flashcard.objects.bulk_create(cards)

        payload = {
            "deck": str(deck.id),
            "question": "501st question",
            "answer": "501st answer",
        }
        res = auth_client.post(self.list_url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        data = res.data
        assert data.get("code") == "deck_full" or "deck_full" in str(data)

    def test_create_flashcard_source_and_document_are_read_only(
        self, auth_client, user, deck, document
    ):
        payload = {
            "deck": str(deck.id),
            "question": "Q",
            "answer": "A",
            "source": "AI",
            "document": str(document.id),
        }
        res = auth_client.post(self.list_url, payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["source"] == "MANUAL"
        assert res.data["document"] is None

        card = Flashcard.objects.get(id=res.data["id"])
        assert card.source == Flashcard.Source.MANUAL
        assert card.document is None

    def test_list_flashcards_by_deck(self, auth_client, user, deck):
        other_deck = Deck.objects.create(user=user, title="Other Deck")
        Flashcard.objects.create(
            user=user, deck=deck, question="Q1", answer="A1", source=Flashcard.Source.MANUAL
        )
        Flashcard.objects.create(
            user=user, deck=other_deck, question="Q2", answer="A2", source=Flashcard.Source.MANUAL
        )

        res = auth_client.get(f"{self.list_url}?deck={deck.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["question"] == "Q1"

    def test_list_flashcards_invalid_deck_uuid_returns_400(self, auth_client):
        res = auth_client.get(f"{self.list_url}?deck=not-a-uuid")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_flashcard_and_foreign_404(self, auth_client, flashcard):
        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.get(detail_url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["id"] == str(flashcard.id)

        other_user = User.objects.create_user(email="other2@uni.edu", password="Password123!")
        other_deck = Deck.objects.create(user=other_user, title="Foreign")
        foreign_card = Flashcard.objects.create(
            user=other_user, deck=other_deck, question="FQ", answer="FA"
        )
        foreign_url = reverse("flashcards:flashcard-detail", args=[foreign_card.id])
        res_foreign = auth_client.get(foreign_url)
        assert res_foreign.status_code == status.HTTP_404_NOT_FOUND
        res_foreign_patch = auth_client.patch(foreign_url, {"question": "Renamed"}, format="json")
        assert res_foreign_patch.status_code == status.HTTP_404_NOT_FOUND
        res_foreign_delete = auth_client.delete(foreign_url)
        assert res_foreign_delete.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_flashcard_edits_fields_and_bumps_deck_updated_at(
        self, auth_client, deck, flashcard
    ):
        # Set deck updated_at back in time
        past = timezone.now() - timedelta(hours=2)
        Deck.objects.filter(pk=deck.pk).update(updated_at=past)
        deck.refresh_from_db()

        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(
            detail_url, {"question": "Updated Q", "answer": "Updated A"}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.data["question"] == "Updated Q"
        assert res.data["answer"] == "Updated A"

        deck.refresh_from_db()
        assert deck.updated_at > past

    def test_patch_flashcard_moves_deck_and_bumps_both(self, auth_client, user, deck, flashcard):
        target_deck = Deck.objects.create(user=user, title="Target Deck")
        past = timezone.now() - timedelta(hours=2)
        Deck.objects.filter(pk__in=[deck.pk, target_deck.pk]).update(updated_at=past)

        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(detail_url, {"deck": str(target_deck.id)}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert str(res.data["deck"]) == str(target_deck.id)

        flashcard.refresh_from_db()
        assert flashcard.deck == target_deck

        deck.refresh_from_db()
        target_deck.refresh_from_db()
        assert deck.updated_at > past
        assert target_deck.updated_at > past

    def test_patch_flashcard_foreign_deck_returns_400(self, auth_client, flashcard):
        other_user = User.objects.create_user(email="other3@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(user=other_user, title="Foreign")

        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(detail_url, {"deck": str(foreign_deck.id)}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_flashcard_full_deck_returns_400(self, auth_client, user, flashcard):
        full_deck = Deck.objects.create(user=user, title="Full Deck")
        cards = [
            Flashcard(
                user=user,
                deck=full_deck,
                question=f"Q{i}",
                answer=f"A{i}",
                source=Flashcard.Source.MANUAL,
            )
            for i in range(500)
        ]
        Flashcard.objects.bulk_create(cards)

        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(detail_url, {"deck": str(full_deck.id)}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data.get("code") == "deck_full" or "deck_full" in str(res.data)

    def test_patch_flashcard_source_and_document_are_ignored(
        self, auth_client, flashcard, document
    ):
        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(
            detail_url, {"source": "AI", "document": str(document.id)}, format="json"
        )
        assert res.status_code == status.HTTP_200_OK
        flashcard.refresh_from_db()
        assert flashcard.source == Flashcard.Source.MANUAL

    def test_delete_flashcard_bumps_deck_updated_at(self, auth_client, deck, flashcard):
        past = timezone.now() - timedelta(hours=2)
        Deck.objects.filter(pk=deck.pk).update(updated_at=past)

        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.delete(detail_url)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert not Flashcard.objects.filter(id=flashcard.id).exists()

        deck.refresh_from_db()
        assert deck.updated_at > past

    def test_put_flashcard_returns_405(self, auth_client, deck, flashcard):
        detail_url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.put(
            detail_url,
            {"deck": str(deck.id), "question": "Put Q", "answer": "Put A"},
            format="json",
        )
        assert res.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
