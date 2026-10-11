from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document
from apps.documents.tasks import process_document
from apps.notifications.models import NotificationType


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    return Document.objects.create(user=user, file=file, original_name="test.pdf", size=100)


@pytest.fixture(autouse=True)
def use_openai_provider(settings):
    settings.AI_PROVIDER = "openai"


@pytest.mark.django_db
@patch("apps.notifications.notification_service.NotificationService.notify")
class TestProcessDocumentTask:
    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_success(self, mock_pdf_reader, mock_summarize, mock_notify, document):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "This is the extracted text."
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        # Mock AI
        mock_summarize.return_value = "This is the AI summary."

        # Run task synchronously
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.DONE
        assert document.extracted_text == "This is the extracted text."
        assert document.page_count == 1
        assert hasattr(document, "summary")
        assert document.summary.content == "This is the AI summary."

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_encrypted(self, mock_pdf_reader, mock_notify, document):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = True
        mock_pdf_reader.return_value = mock_pdf

        # Run task
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.FAILED
        assert "encrypted" in document.error_message
        mock_notify.assert_called_once()
        assert (
            mock_notify.call_args.kwargs["notification_type"]
            == NotificationType.PDF_SUMMARY_FAILED
        )

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_no_text_extracted(self, mock_pdf_reader, mock_notify, document):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "   "  # empty text
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        # Run task
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.FAILED
        assert "No text could be extracted" in document.error_message
        mock_notify.assert_called_once()
        assert (
            mock_notify.call_args.kwargs["notification_type"]
            == NotificationType.PDF_SUMMARY_FAILED
        )

    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_ai_raises_exception(
        self, mock_pdf_reader, mock_summarize, mock_notify, document
    ):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Some text."
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        # Mock AI
        mock_summarize.side_effect = Exception("AI Rate Limit Exceeded")

        # Run task
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.FAILED
        assert "We couldn't process this PDF" in document.error_message
        mock_notify.assert_called_once()
        assert (
            mock_notify.call_args.kwargs["notification_type"]
            == NotificationType.PDF_SUMMARY_FAILED
        )

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_too_many_pages(self, mock_pdf_reader, mock_notify, document):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_pdf.pages = [MagicMock()] * 51
        mock_pdf_reader.return_value = mock_pdf

        # Run task
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.FAILED
        assert "PDF is too long" in document.error_message
        mock_notify.assert_called_once()
        assert (
            mock_notify.call_args.kwargs["notification_type"]
            == NotificationType.PDF_SUMMARY_FAILED
        )

    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_caps_extracted_text_at_max_chars(
        self, mock_pdf_reader, mock_summarize, mock_notify, document, settings
    ):
        settings.DOCUMENT_MAX_CHARS = 50
        mock_summarize.return_value = "Summary"

        page1 = MagicMock()
        page1.extract_text.return_value = "A" * 30
        page2 = MagicMock()
        page2.extract_text.return_value = "B" * 30
        page3 = MagicMock()
        page3.extract_text.return_value = "C" * 30

        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_pdf.pages = [page1, page2, page3]
        mock_pdf_reader.return_value = mock_pdf

        process_document(str(document.id))

        document.refresh_from_db()
        assert document.status == Document.Status.DONE
        assert len(document.extracted_text) <= 50
        # Page 3 should not have been extracted because page 1 + page 2 already exceeded 50 chars
        page3.extract_text.assert_not_called()
