from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from apps.documents.models import Document, Summary
from apps.flashcards.models import Flashcard


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def document(user):
    from django.core.files.uploadedfile import SimpleUploadedFile

    file = SimpleUploadedFile("test.pdf", b"content")
    return Document.objects.create(
        user=user, original_name="test.pdf", size=100, file=file, status=Document.Status.DONE
    )


@pytest.fixture
def flashcard(user, document):
    return Flashcard.objects.create(user=user, document=document, question="Q1", answer="A1")


@pytest.mark.django_db
class TestFlashcardAPI:
    url = reverse("flashcards:flashcard-list")

    def test_list_flashcards(self, auth_client, flashcard):
        res = auth_client.get(self.url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["question"] == "Q1"

    def test_list_flashcards_by_document(self, auth_client, user, document, flashcard):
        other_doc = Document.objects.create(user=user, original_name="other.pdf", size=10)
        Flashcard.objects.create(user=user, document=other_doc, question="Q2", answer="A2")

        res = auth_client.get(f"{self.url}?document={document.id}")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["question"] == "Q1"

    def test_update_flashcard(self, auth_client, flashcard):
        url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.patch(url, {"question": "New Q"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["question"] == "New Q"
        assert res.data["answer"] == "A1"

    def test_delete_flashcard(self, auth_client, flashcard):
        url = reverse("flashcards:flashcard-detail", args=[flashcard.id])
        res = auth_client.delete(url)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert Flashcard.objects.count() == 0

    def test_others_flashcard_404(self, auth_client):
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(email="other@test.com", password="pwd")
        other_doc = Document.objects.create(user=other_user, original_name="other.pdf", size=10)
        fc = Flashcard.objects.create(
            user=other_user, document=other_doc, question="Q", answer="A"
        )

        url = reverse("flashcards:flashcard-detail", args=[fc.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_queues_task(self, mock_delay, auth_client, document):
        Summary.objects.create(document=document, content="Summary", ai_model_used="test")

        url = reverse("documents:document-generate-flashcards", args=[document.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_202_ACCEPTED
        mock_delay.assert_called_once_with(str(document.id))

        document.refresh_from_db()
        assert (
            document.flashcard_generation_status == Document.FlashcardGenerationStatus.GENERATING
        )

    def test_generate_flashcards_fails_if_not_done(self, auth_client, user):
        doc = Document.objects.create(
            user=user,
            status=Document.Status.PROCESSING,
            original_name="processing.pdf",
            size=100,
        )
        url = reverse("documents:document-generate-flashcards", args=[doc.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_resets_status_if_queuing_fails(
        self, mock_delay, auth_client, document
    ):
        Summary.objects.create(document=document, content="Summary", ai_model_used="test")
        mock_delay.side_effect = RuntimeError("Broker down")

        url = reverse("documents:document-generate-flashcards", args=[document.id])
        with pytest.raises(RuntimeError):
            auth_client.post(url)

        document.refresh_from_db()
        assert (
            document.flashcard_generation_status != Document.FlashcardGenerationStatus.GENERATING
        )

        # Retry should not 409
        mock_delay.side_effect = None
        res_retry = auth_client.post(url)
        assert res_retry.status_code == status.HTTP_202_ACCEPTED

    @patch("apps.flashcards.tasks.generate_flashcards_task.delay")
    def test_generate_flashcards_reclaims_stale_job(self, mock_delay, auth_client, document):
        from datetime import timedelta

        from django.utils import timezone

        Summary.objects.create(document=document, content="Summary", ai_model_used="test")
        document.flashcard_generation_status = Document.FlashcardGenerationStatus.GENERATING
        document.flashcard_generation_started_at = timezone.now() - timedelta(minutes=15)
        document.save()

        url = reverse("documents:document-generate-flashcards", args=[document.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_202_ACCEPTED
        mock_delay.assert_called_once()
