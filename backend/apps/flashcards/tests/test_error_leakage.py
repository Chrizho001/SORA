import json
from unittest.mock import patch

import pytest
import requests
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.ai import DocumentProcessingError
from apps.documents.models import Document, Summary
from apps.flashcards.tasks import generate_flashcards_task
from apps.notifications.models import Notification


@pytest.fixture
def document_with_summary(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    doc = Document.objects.create(
        user=user,
        file=file,
        original_name="test.pdf",
        size=100,
        status=Document.Status.DONE,
    )
    Summary.objects.create(
        document=doc,
        content="Summary content for flashcard generation.",
        ai_model_used="test-model",
    )
    return doc


@pytest.fixture(autouse=True)
def use_openai_provider(settings):
    settings.AI_PROVIDER = "openai"


@pytest.mark.django_db(transaction=True)
class TestFlashcardsErrorLeakage:
    def test_generic_exception_does_not_leak_secret(self, document_with_summary):
        with patch(
            "apps.flashcards.tasks.FlashcardGeneratorClient.generate",
            side_effect=Exception("SECRET-INTERNAL boom"),
        ):
            generate_flashcards_task(str(document_with_summary.id))

        notifications = Notification.objects.filter(recipient=document_with_summary.user)
        assert notifications.exists()
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)

    def test_document_processing_error_from_provider_does_not_leak_secret(
        self, document_with_summary
    ):
        fake_response = requests.Response()
        fake_response.status_code = 500
        fake_response._content = b'{"error": "SECRET-INTERNAL database connection failed"}'
        http_error = requests.HTTPError(response=fake_response)

        with patch("requests.post", side_effect=http_error):
            generate_flashcards_task(str(document_with_summary.id))

        notifications = Notification.objects.filter(recipient=document_with_summary.user)
        assert notifications.exists()
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)

    def test_direct_document_processing_error_does_not_leak_secret(self, document_with_summary):
        with patch(
            "apps.flashcards.tasks.FlashcardGeneratorClient.generate",
            side_effect=DocumentProcessingError("SECRET-INTERNAL custom detail"),
        ):
            generate_flashcards_task(str(document_with_summary.id))

        notifications = Notification.objects.filter(recipient=document_with_summary.user)
        assert notifications.exists()
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)
