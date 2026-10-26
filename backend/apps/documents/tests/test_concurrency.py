from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document, Summary
from apps.documents.tasks import process_document


@pytest.fixture
def document(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    return Document.objects.create(user=user, file=file, original_name="test.pdf", size=100)


@pytest.fixture(autouse=True)
def use_openai_provider(settings):
    settings.AI_PROVIDER = "openai"


@pytest.mark.django_db(transaction=True)
@patch("apps.notifications.notification_service.NotificationService.notify")
class TestDocumentConcurrencyAndIdempotency:
    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_running_task_twice_leaves_one_summary_and_status_done(
        self, mock_pdf_reader, mock_summarize, mock_notify, document
    ):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf
        mock_summarize.return_value = "Summary Content"

        # First run
        process_document(str(document.id))
        document.refresh_from_db()
        assert document.status == Document.Status.DONE
        assert Summary.objects.filter(document=document).count() == 1

        # Second run (e.g. duplicate delivery)
        process_document(str(document.id))
        document.refresh_from_db()
        assert document.status == Document.Status.DONE
        assert Summary.objects.filter(document=document).count() == 1
        assert document.error_message == ""

    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_summary_already_exists_no_integrity_error_and_status_done(
        self, mock_pdf_reader, mock_summarize, mock_notify, document
    ):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf
        mock_summarize.return_value = "New Summary"

        # Pre-create Summary
        Summary.objects.create(
            document=document,
            content="Pre-existing summary",
            ai_model_used="test-model",
        )

        process_document(str(document.id))
        document.refresh_from_db()
        assert document.status == Document.Status.DONE
        assert Summary.objects.filter(document=document).count() == 1

    @patch("apps.documents.tasks.SummarizerClient.summarize")
    @patch("apps.documents.tasks.pypdf.PdfReader")
    def test_document_deleted_mid_run_no_exception_escapes(
        self, mock_pdf_reader, mock_summarize, mock_notify, document
    ):
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Content"
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        doc_id = str(document.id)

        # Delete the document when summarize() is invoked mid-run
        def delete_document_mid_run(*args, **kwargs):
            Document.objects.filter(id=doc_id).delete()
            return "Summary"

        mock_summarize.side_effect = delete_document_mid_run

        # Should not raise any exception
        process_document(doc_id)
        assert not Document.objects.filter(id=doc_id).exists()
