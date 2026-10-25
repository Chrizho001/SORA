import json
from unittest.mock import MagicMock, patch

import pytest
import requests
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.ai import DocumentProcessingError
from apps.documents.models import Document
from apps.documents.tasks import process_document
from apps.notifications.models import Notification


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    return Document.objects.create(user=user, file=file, original_name="test.pdf", size=100)


@pytest.fixture(autouse=True)
def use_openai_provider(settings):
    settings.AI_PROVIDER = "openai"


@pytest.mark.django_db(transaction=True)
class TestDocumentErrorLeakage:
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_generic_exception_does_not_leak_secret(self, mock_pdf_reader, document):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted text content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        with patch(
            "apps.documents.tasks.SummarizerClient.summarize",
            side_effect=Exception("SECRET-INTERNAL boom"),
        ):
            process_document(str(document.id))

        document.refresh_from_db()
        assert "SECRET-INTERNAL" not in document.error_message

        notifications = Notification.objects.filter(recipient=document.user)
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_document_processing_error_from_provider_does_not_leak_secret(
        self, mock_pdf_reader, document
    ):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted text content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        # Provider raises HTTP error with secret internal body
        fake_response = requests.Response()
        fake_response.status_code = 500
        fake_response._content = b'{"error": "SECRET-INTERNAL database connection failed"}'
        http_error = requests.HTTPError(response=fake_response)

        with patch("requests.post", side_effect=http_error):
            process_document(str(document.id))

        document.refresh_from_db()
        assert "SECRET-INTERNAL" not in document.error_message

        notifications = Notification.objects.filter(recipient=document.user)
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_direct_document_processing_error_does_not_leak_secret(
        self, mock_pdf_reader, document
    ):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted text content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        with patch(
            "apps.documents.tasks.SummarizerClient.summarize",
            side_effect=DocumentProcessingError("SECRET-INTERNAL custom provider detail"),
        ):
            process_document(str(document.id))

        document.refresh_from_db()
        assert "SECRET-INTERNAL" not in document.error_message

        notifications = Notification.objects.filter(recipient=document.user)
        for notif in notifications:
            assert "SECRET-INTERNAL" not in notif.body
            assert "SECRET-INTERNAL" not in json.dumps(notif.data)
