import pytest
from unittest.mock import patch, MagicMock
from apps.documents.models import Document
from apps.documents.tasks import process_document
from django.core.files.uploadedfile import SimpleUploadedFile


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    return Document.objects.create(user=user, file=file, original_name="test.pdf", size=100)


@pytest.mark.django_db
class TestProcessDocumentTask:
    
    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_success(self, mock_pdf_reader, mock_summarize, document):
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
    def test_task_fails_if_encrypted(self, mock_pdf_reader, document):
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

    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_no_text_extracted(self, mock_pdf_reader, document):
        # Mock PDF
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "   " # empty text
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        # Run task
        process_document(str(document.id))

        # Check DB
        document.refresh_from_db()
        assert document.status == Document.Status.FAILED
        assert "No text could be extracted" in document.error_message

    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_task_fails_if_ai_raises_exception(self, mock_pdf_reader, mock_summarize, document):
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
        assert "AI Rate Limit Exceeded" in document.error_message
