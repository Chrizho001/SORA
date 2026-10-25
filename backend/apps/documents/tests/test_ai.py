import importlib

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.ai import (
    DocumentProcessingError,
    MockSummarizer,
    SummarizerClient,
    get_summarizer,
)
from apps.documents.models import Document
from apps.documents.tasks import process_document


def test_prod_settings_refuses_mock_ai_provider(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.setenv("SECRET_KEY", "dummy-secret-key")
    import config.settings.base

    importlib.reload(config.settings.base)
    with pytest.raises(ImproperlyConfigured, match="AI_PROVIDER"):
        # Reload or import config.settings.prod
        if "config.settings.prod" in importlib.sys.modules:
            importlib.reload(importlib.import_module("config.settings.prod"))
        else:
            importlib.import_module("config.settings.prod")


def test_prod_settings_accepts_openai_ai_provider(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("SECRET_KEY", "dummy-secret-key")
    monkeypatch.setenv("FRONTEND_URL", "https://sora.study")
    monkeypatch.setenv("EMAIL_HOST", "smtp.example.com")
    import config.settings.base

    importlib.reload(config.settings.base)

    mod = importlib.import_module("config.settings.prod")
    importlib.reload(mod)
    assert mod.AI_PROVIDER == "openai"
    monkeypatch.setenv("AI_PROVIDER", "mock")
    importlib.reload(config.settings.base)


def test_mock_summarizer_returns_mock_model_name():
    summarizer = MockSummarizer()
    assert summarizer.model_name == "mock"
    summary = summarizer.summarize("Sample text content")
    assert isinstance(summary, str)
    assert len(summary) > 0


def test_summarizer_client_without_api_key_raises_error(settings):
    settings.AI_API_KEY = ""
    client = SummarizerClient(api_key="")
    with pytest.raises(DocumentProcessingError, match="AI_API_KEY"):
        client.summarize("Sample text")


def test_get_summarizer_returns_correct_class(settings):
    settings.AI_PROVIDER = "mock"
    assert isinstance(get_summarizer(), MockSummarizer)

    settings.AI_PROVIDER = "openai"
    assert isinstance(get_summarizer(), SummarizerClient)


@pytest.mark.django_db
def test_process_document_with_mock_provider(user):
    file = SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")
    doc = Document.objects.create(
        user=user,
        file=file,
        original_name="test.pdf",
        size=100,
        extracted_text="Some extracted text for testing summary generation.",
    )

    from unittest.mock import MagicMock, patch

    with patch("apps.documents.tasks.pypdf.PdfReader") as mock_pdf_reader:
        mock_pdf = MagicMock()
        mock_pdf.is_encrypted = False
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Extracted content for mock summary."
        mock_pdf.pages = [mock_page]
        mock_pdf_reader.return_value = mock_pdf

        process_document(str(doc.id))

    doc.refresh_from_db()
    assert doc.status == Document.Status.DONE
    assert hasattr(doc, "summary")
    assert doc.summary.ai_model_used == "mock"


def test_summarizer_client_with_api_key_success(monkeypatch):
    from unittest.mock import MagicMock

    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Generated OpenAI summary."}}]
    }
    monkeypatch.setattr("apps.documents.ai.requests.post", lambda *a, **kw: mock_resp)

    client = SummarizerClient(api_key="valid-key")
    result = client.summarize("Some document text.")
    assert result == "Generated OpenAI summary."
