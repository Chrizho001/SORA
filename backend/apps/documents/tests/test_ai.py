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
    with pytest.raises(DocumentProcessingError, match="AI service authentication failed"):
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


def test_gemini_summarizer_inline_pdf_only_when_text_empty():
    from unittest.mock import MagicMock, patch

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="fake-gemini-key")
    dummy_pdf = b"%PDF-1.4 dummy content"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "Gemini summary text"}]}}]
    }

    # Case 1: When text is provided (non-empty), payload has NO inline_data
    with patch("apps.documents.ai.requests.post", return_value=mock_resp) as mock_post:
        res = client.summarize(text="Digital text extracted from PDF", pdf_bytes=dummy_pdf)
        assert res == "Gemini summary text"
        mock_post.assert_called_once()
        sent_payload = mock_post.call_args.kwargs["json"]
        parts = sent_payload["contents"][0]["parts"]
        assert not any("inline_data" in part for part in parts)
        assert any("Digital text extracted from PDF" in part.get("text", "") for part in parts)

    # Case 2: When text is "" (empty), payload HAS inline_data
    with patch("apps.documents.ai.requests.post", return_value=mock_resp) as mock_post:
        res = client.summarize(text="", pdf_bytes=dummy_pdf)
        assert res == "Gemini summary text"
        mock_post.assert_called_once()
        sent_payload = mock_post.call_args.kwargs["json"]
        parts = sent_payload["contents"][0]["parts"]
        assert any("inline_data" in part for part in parts)

    # Case 3: When text is whitespace only, payload HAS inline_data
    with patch("apps.documents.ai.requests.post", return_value=mock_resp) as mock_post:
        res = client.summarize(text="   \n \t  ", pdf_bytes=dummy_pdf)
        assert res == "Gemini summary text"
        mock_post.assert_called_once()
        sent_payload = mock_post.call_args.kwargs["json"]
        parts = sent_payload["contents"][0]["parts"]
        assert any("inline_data" in part for part in parts)


def test_gemini_summarizer_missing_api_key(settings):
    settings.AI_API_KEY = ""
    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="")
    with pytest.raises(DocumentProcessingError, match="AI service authentication failed"):
        client.summarize("Sample text")


def test_gemini_summarizer_503_then_200_retry():
    from unittest.mock import MagicMock, patch

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="valid-key")
    mock_503 = MagicMock()
    mock_503.status_code = 503

    mock_200 = MagicMock()
    mock_200.status_code = 200
    mock_200.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "Retry succeeded summary"}]}}]
    }

    with patch("apps.documents.ai.requests.post", side_effect=[mock_503, mock_200]) as mock_post:
        with patch("apps.documents.ai.time.sleep") as mock_sleep:
            summary = client.summarize("Sample text to summarize")
            assert summary == "Retry succeeded summary"
            assert mock_post.call_count == 2
            mock_sleep.assert_called_once()


@pytest.mark.parametrize(
    "status_code, expected_match",
    [
        (401, "AI service authentication failed"),
        (403, "AI service authentication failed"),
        (429, "AI rate limit reached"),
        (503, "AI service is busy"),
    ],
)
def test_gemini_summarizer_http_errors(status_code, expected_match):
    from unittest.mock import MagicMock, patch

    import requests

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    http_error = requests.exceptions.HTTPError("Error", response=mock_resp)
    mock_resp.raise_for_status.side_effect = http_error

    with patch("apps.documents.ai.requests.post", return_value=mock_resp):
        with patch("apps.documents.ai.time.sleep"):
            with pytest.raises(DocumentProcessingError, match=expected_match):
                client.summarize("Sample text")


def test_gemini_summarizer_request_exception_timeout():
    from unittest.mock import patch

    import requests

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="valid-key")
    with patch(
        "apps.documents.ai.requests.post", side_effect=requests.exceptions.Timeout("Timeout")
    ):
        with patch("apps.documents.ai.time.sleep"):
            with pytest.raises(
                DocumentProcessingError, match="Network error contacting AI service"
            ):
                client.summarize("Sample text")


def test_gemini_summarizer_empty_candidates():
    from unittest.mock import MagicMock, patch

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"candidates": []}

    with patch("apps.documents.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match="AI service error"):
            client.summarize("Sample text")


def test_gemini_summarizer_invalid_json():
    from unittest.mock import MagicMock, patch

    from apps.documents.ai import GeminiSummarizerClient

    client = GeminiSummarizerClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"candidates": [{"content": {"parts": []}}]}

    with patch("apps.documents.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match="AI service error"):
            client.summarize("Sample text")


@pytest.mark.parametrize(
    "status_code, expected_match",
    [
        (401, "AI service authentication failed"),
        (403, "AI service authentication failed"),
        (429, "AI rate limit reached"),
        (503, "AI service is busy"),
        (500, "AI service error"),
    ],
)
def test_summarizer_client_http_errors(status_code, expected_match):
    from unittest.mock import MagicMock, patch

    import requests

    from apps.documents.ai import SummarizerClient

    client = SummarizerClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    http_error = requests.exceptions.HTTPError("Error", response=mock_resp)
    mock_resp.raise_for_status.side_effect = http_error

    with patch("apps.documents.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match=expected_match):
            client.summarize("Sample text")


def test_summarizer_client_request_exception():
    from unittest.mock import patch

    import requests

    from apps.documents.ai import SummarizerClient

    client = SummarizerClient(api_key="valid-key")
    with patch(
        "apps.documents.ai.requests.post",
        side_effect=requests.exceptions.RequestException("Err"),
    ):
        with pytest.raises(DocumentProcessingError, match="Network error contacting AI service"):
            client.summarize("Sample text")


# ── Slow or refused generations (2026-10-27: long PDFs timed out and failed with a vague error) ──


def _gemini_ok(text="Summary"):
    from unittest.mock import MagicMock

    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
    return resp


def test_gemini_allows_long_generations(settings):
    """A 43-page PDF measured 87 s; the read timeout must leave room for longer documents."""
    from unittest.mock import patch

    from apps.documents.ai import GeminiSummarizerClient

    with patch("apps.documents.ai.requests.post", return_value=_gemini_ok()) as mock_post:
        GeminiSummarizerClient(api_key="k").summarize("text")
    connect, read = mock_post.call_args.kwargs["timeout"]
    assert connect <= 15
    assert read >= 240


def test_gemini_read_timeout_is_not_retried_and_says_too_long():
    """Retrying a generation that already ran out of time only doubles the wait."""
    from unittest.mock import patch

    import requests

    from apps.documents.ai import GeminiSummarizerClient

    with patch(
        "apps.documents.ai.requests.post", side_effect=requests.exceptions.ReadTimeout()
    ) as mock_post:
        with pytest.raises(DocumentProcessingError, match="took too long"):
            GeminiSummarizerClient(api_key="k").summarize("text")
    assert mock_post.call_count == 1


def test_gemini_connection_error_is_retried():
    from unittest.mock import patch

    import requests

    from apps.documents.ai import GeminiSummarizerClient

    with patch(
        "apps.documents.ai.requests.post",
        side_effect=[requests.exceptions.ConnectionError(), _gemini_ok("ok")],
    ) as mock_post:
        with patch("apps.documents.ai.time.sleep"):
            assert GeminiSummarizerClient(api_key="k").summarize("text") == "ok"
    assert mock_post.call_count == 2


@pytest.mark.parametrize(
    "body",
    [
        {"promptFeedback": {"blockReason": "SAFETY"}},
        {"candidates": [{"finishReason": "RECITATION", "content": {}}]},
        {"candidates": [{"finishReason": "SAFETY"}]},
    ],
)
def test_gemini_refusal_has_a_clear_message(body):
    from unittest.mock import MagicMock, patch

    from apps.documents.ai import GeminiSummarizerClient

    resp = MagicMock()
    resp.status_code = 200
    resp.json.return_value = body
    with patch("apps.documents.ai.requests.post", return_value=resp):
        with pytest.raises(DocumentProcessingError, match="declined to summarise"):
            GeminiSummarizerClient(api_key="k").summarize("text")
