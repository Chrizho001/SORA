import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
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
    file = SimpleUploadedFile("biology_101.pdf", b"pdf content")
    return Document.objects.create(
        user=user,
        original_name="biology_101.pdf",
        size=100,
        file=file,
        status=Document.Status.DONE,
    )


@pytest.mark.django_db
class TestDeckAPI:
    list_url = reverse("decks:deck-list")

    def test_create_deck_success(self, auth_client, user, document):
        payload = {
            "title": "Cell Biology",
            "description": "Introduction to cells and organelles",
            "document": str(document.id),
        }
        res = auth_client.post(self.list_url, payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["title"] == "Cell Biology"
        assert res.data["description"] == "Introduction to cells and organelles"
        assert str(res.data["document"]) == str(document.id)
        assert res.data["document_name"] == "biology_101.pdf"
        assert res.data["card_count"] == 0
        assert "created_at" in res.data
        assert "updated_at" in res.data

        deck = Deck.objects.get(id=res.data["id"])
        assert deck.user == user
        assert deck.title == "Cell Biology"

    def test_create_deck_blank_title_returns_400(self, auth_client):
        res = auth_client.post(self.list_url, {"title": "   "}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "title" in res.data.get("errors", res.data)

    def test_create_deck_duplicate_title_case_insensitive_returns_400(self, auth_client, user):
        Deck.objects.create(user=user, title="Physics")

        res = auth_client.post(self.list_url, {"title": "physics"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        data = res.data
        assert data.get("code") == "deck_title_taken" or "deck_title_taken" in str(data)

    def test_create_deck_with_foreign_document_returns_400(self, auth_client):
        other_user = User.objects.create_user(email="other@uni.edu", password="Password123!")
        foreign_doc = Document.objects.create(
            user=other_user,
            original_name="foreign.pdf",
            size=50,
            status=Document.Status.DONE,
        )

        res = auth_client.post(
            self.list_url,
            {"title": "Chemistry", "document": str(foreign_doc.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "document" in res.data.get("errors", res.data)

    def test_create_deck_limit_200_per_user(self, auth_client, user):
        # Create 200 decks for this user
        decks = [Deck(user=user, title=f"Deck {i}") for i in range(200)]
        Deck.objects.bulk_create(decks)

        res = auth_client.post(self.list_url, {"title": "Deck 201"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        data = res.data
        assert data.get("code") == "deck_limit" or "deck_limit" in str(data)

    def test_list_decks_returns_only_own_decks_with_card_count(self, auth_client, user):
        other_user = User.objects.create_user(email="other2@uni.edu", password="Password123!")
        Deck.objects.create(user=other_user, title="Foreign Deck")

        deck = Deck.objects.create(user=user, title="My Deck")
        Flashcard.objects.create(user=user, deck=deck, question="Q1", answer="A1")
        Flashcard.objects.create(user=user, deck=deck, question="Q2", answer="A2")

        res = auth_client.get(self.list_url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        result = res.data["results"][0]
        assert result["id"] == str(deck.id)
        assert result["title"] == "My Deck"
        assert result["card_count"] == 2

    def test_list_decks_constant_query_count_1_vs_5(
        self, auth_client, user, django_assert_num_queries
    ):
        # Measure query count with 1 deck
        d1 = Deck.objects.create(user=user, title="Deck 1")
        Flashcard.objects.create(user=user, deck=d1, question="Q1", answer="A1")

        with django_assert_num_queries(
            3
        ):  # 1 for auth, 1 for count, 1 for paginated list with annotation & select_related
            res1 = auth_client.get(self.list_url)
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["count"] == 1

        # Add 4 more decks
        for i in range(2, 6):
            d = Deck.objects.create(user=user, title=f"Deck {i}")
            Flashcard.objects.create(user=user, deck=d, question=f"Q{i}", answer=f"A{i}")

        with django_assert_num_queries(3):  # constant query count: 1 auth + 1 count + 1 list
            res2 = auth_client.get(self.list_url)
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["count"] == 5

    def test_list_decks_filter_by_document(self, auth_client, user, document):
        d1 = Deck.objects.create(user=user, title="Doc Deck", document=document)
        Deck.objects.create(user=user, title="No Doc Deck")

        res = auth_client.get(f"{self.list_url}?document={document.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["id"] == str(d1.id)

    def test_list_decks_filter_invalid_document_uuid_returns_400(self, auth_client):
        res = auth_client.get(f"{self.list_url}?document=invalid-uuid")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_deck_detail_and_foreign_404(self, auth_client, user):
        deck = Deck.objects.create(user=user, title="My Deck")
        detail_url = reverse("decks:deck-detail", args=[deck.id])
        res = auth_client.get(detail_url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["id"] == str(deck.id)

        other_user = User.objects.create_user(email="other3@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(user=other_user, title="Foreign Deck")
        foreign_url = reverse("decks:deck-detail", args=[foreign_deck.id])
        res_foreign = auth_client.get(foreign_url)
        assert res_foreign.status_code == status.HTTP_404_NOT_FOUND
        res_foreign_patch = auth_client.patch(foreign_url, {"title": "Renamed"}, format="json")
        assert res_foreign_patch.status_code == status.HTTP_404_NOT_FOUND
        res_foreign_delete = auth_client.delete(foreign_url)
        assert res_foreign_delete.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_deck_renames_and_duplicate_returns_400(self, auth_client, user):
        deck1 = Deck.objects.create(user=user, title="Deck 1")
        Deck.objects.create(user=user, title="Deck 2")

        detail_url = reverse("decks:deck-detail", args=[deck1.id])
        res = auth_client.patch(detail_url, {"title": "Renamed Deck"}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["title"] == "Renamed Deck"

        # Duplicate title
        res_dup = auth_client.patch(detail_url, {"title": "deck 2"}, format="json")
        assert res_dup.status_code == status.HTTP_400_BAD_REQUEST
        assert res_dup.data.get("code") == "deck_title_taken" or "deck_title_taken" in str(
            res_dup.data
        )

    def test_delete_deck_deletes_cards(self, auth_client, user):
        deck = Deck.objects.create(user=user, title="To Delete")
        Flashcard.objects.create(user=user, deck=deck, question="Q1", answer="A1")

        detail_url = reverse("decks:deck-detail", args=[deck.id])
        res = auth_client.delete(detail_url)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert not Deck.objects.filter(id=deck.id).exists()
        assert not Flashcard.objects.filter(deck_id=deck.id).exists()

    def test_put_deck_returns_405(self, auth_client, user):
        deck = Deck.objects.create(user=user, title="No PUT")
        detail_url = reverse("decks:deck-detail", args=[deck.id])
        res = auth_client.put(detail_url, {"title": "Changed"}, format="json")
        assert res.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
