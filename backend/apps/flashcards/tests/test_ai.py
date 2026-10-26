import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.documents.models import Document, Summary
from apps.flashcards.ai import (
    DocumentProcessingError,
    FlashcardGeneratorClient,
    MockFlashcardGenerator,
    get_flashcard_generator,
    validate_flashcards_data,
)
from apps.flashcards.models import Flashcard
from apps.flashcards.tasks import generate_flashcards_task


def test_validate_flashcards_data_valid_list():
    raw = [
        {"question": "What is Python?", "answer": "A programming language."},
        {"question": "What is Django?", "answer": "A web framework."},
    ]
    res = validate_flashcards_data(raw)
    assert len(res) == 2
    assert res[0]["question"] == "What is Python?"


def test_validate_flashcards_data_valid_dict_with_flashcards():
    raw = {
        "flashcards": [
            {"question": "Q1", "answer": "A1"},
        ]
    }
    res = validate_flashcards_data(raw)
    assert len(res) == 1
    assert res[0]["question"] == "Q1"


def test_validate_flashcards_data_valid_dict_with_cards():
    raw = {
        "cards": [
            {"question": "Q2", "answer": "A2"},
        ]
    }
    res = validate_flashcards_data(raw)
    assert len(res) == 1
    assert res[0]["question"] == "Q2"


@pytest.mark.parametrize(
    "invalid_input",
    [
        [],  # empty list
        {},  # empty dict
        {"flashcards": []},  # empty flashcards list
        [{"question": "", "answer": "A"}],  # empty question
        [{"question": "Q", "answer": "  "}],  # whitespace answer
        [{"question": "Q"}],  # missing answer
        [{"answer": "A"}],  # missing question
        [{"question": 123, "answer": "A"}],  # non-string question
        "just a string",  # string instead of list
        [None],  # list with None
    ],
)
def test_validate_flashcards_data_rejects_invalid(invalid_input):
    with pytest.raises(DocumentProcessingError):
        validate_flashcards_data(invalid_input)


def test_flashcard_generator_client_without_api_key_raises_error(settings):
    settings.AI_API_KEY = ""
    client = FlashcardGeneratorClient(api_key="")
    with pytest.raises(DocumentProcessingError, match="AI service authentication failed"):
        client.generate("Some summary text")


def test_get_flashcard_generator_returns_correct_class(settings):
    settings.AI_PROVIDER = "mock"
    assert isinstance(get_flashcard_generator(), MockFlashcardGenerator)

    settings.AI_PROVIDER = "openai"
    assert isinstance(get_flashcard_generator(), FlashcardGeneratorClient)


@pytest.mark.django_db
def test_generate_flashcards_with_mock_provider(user):
    file = SimpleUploadedFile("test.pdf", b"content")
    doc = Document.objects.create(
        user=user,
        original_name="test.pdf",
        size=100,
        file=file,
        status=Document.Status.DONE,
    )
    Summary.objects.create(document=doc, content="Document summary.", ai_model_used="mock")

    generate_flashcards_task(str(doc.id))

    doc.refresh_from_db()
    assert doc.flashcard_generation_status == Document.FlashcardGenerationStatus.DONE
    cards = Flashcard.objects.filter(document=doc)
    assert cards.count() >= 4  # e.g. 5 mock cards
    for card in cards:
        assert card.question.strip()
        assert card.answer.strip()
        assert "Failed to parse" not in card.question


@pytest.mark.django_db
def test_generate_flashcards_fails_on_junk_ai_output(user, monkeypatch):
    file = SimpleUploadedFile("test.pdf", b"content")
    doc = Document.objects.create(
        user=user,
        original_name="test.pdf",
        size=100,
        file=file,
        status=Document.Status.DONE,
    )
    Summary.objects.create(document=doc, content="Document summary.", ai_model_used="mock")

    class JunkClient:
        model_name = "junk"

        def generate(self, text):
            # Returns junk output
            return [{"question": "", "answer": ""}]

    monkeypatch.setattr("apps.flashcards.tasks.get_flashcard_generator", lambda: JunkClient())

    generate_flashcards_task(str(doc.id))

    doc.refresh_from_db()
    assert doc.flashcard_generation_status == Document.FlashcardGenerationStatus.FAILED
    assert Flashcard.objects.filter(document=doc).count() == 0


def test_flashcard_generator_client_with_api_key_success(monkeypatch):
    import json
    from unittest.mock import MagicMock

    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        [
                            {"question": "Q1?", "answer": "A1."},
                            {"question": "Q2?", "answer": "A2."},
                        ]
                    )
                }
            }
        ]
    }
    monkeypatch.setattr("apps.flashcards.ai.requests.post", lambda *a, **kw: mock_resp)

    client = FlashcardGeneratorClient(api_key="valid-key")
    cards = client.generate("Some text")
    assert len(cards) == 2
    assert cards[0]["question"] == "Q1?"


def test_flashcard_generator_client_invalid_json_raises_error(monkeypatch):
    from unittest.mock import MagicMock

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"choices": [{"message": {"content": "not json"}}]}
    monkeypatch.setattr("apps.flashcards.ai.requests.post", lambda *a, **kw: mock_resp)

    client = FlashcardGeneratorClient(api_key="valid-key")
    with pytest.raises(DocumentProcessingError, match="AI service error"):
        client.generate("Some text")


def test_gemini_flashcard_generator_missing_api_key(settings):
    settings.AI_API_KEY = ""
    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="")
    with pytest.raises(DocumentProcessingError, match="AI service authentication failed"):
        client.generate("Some summary")


def test_gemini_flashcard_generator_success():
    import json
    from unittest.mock import MagicMock, patch

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                [
                                    {
                                        "question": "What is AI?",
                                        "answer": "Artificial Intelligence.",
                                    },
                                ]
                            )
                        }
                    ]
                }
            }
        ]
    }

    with patch("apps.flashcards.ai.requests.post", return_value=mock_resp):
        cards = client.generate("Some summary")
        assert len(cards) == 1
        assert cards[0]["question"] == "What is AI?"


def test_gemini_flashcard_generator_503_then_200_retry():
    import json
    from unittest.mock import MagicMock, patch

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    mock_503 = MagicMock()
    mock_503.status_code = 503

    mock_200 = MagicMock()
    mock_200.status_code = 200
    mock_200.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": json.dumps([{"question": "Retry Q?", "answer": "Retry A."}])}
                    ]
                }
            }
        ]
    }

    with patch("apps.flashcards.ai.requests.post", side_effect=[mock_503, mock_200]) as mock_post:
        with patch("apps.flashcards.ai.time.sleep") as mock_sleep:
            cards = client.generate("Some summary")
            assert len(cards) == 1
            assert cards[0]["question"] == "Retry Q?"
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
def test_gemini_flashcard_generator_http_errors(status_code, expected_match):
    from unittest.mock import MagicMock, patch

    import requests

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    http_error = requests.exceptions.HTTPError("Error", response=mock_resp)
    mock_resp.raise_for_status.side_effect = http_error

    with patch("apps.flashcards.ai.requests.post", return_value=mock_resp):
        with patch("apps.flashcards.ai.time.sleep"):
            with pytest.raises(DocumentProcessingError, match=expected_match):
                client.generate("Some summary")


def test_gemini_flashcard_generator_request_exception_timeout():
    from unittest.mock import patch

    import requests

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    with patch(
        "apps.flashcards.ai.requests.post", side_effect=requests.exceptions.Timeout("Timeout")
    ):
        with patch("apps.flashcards.ai.time.sleep"):
            with pytest.raises(
                DocumentProcessingError, match="Network error contacting AI service"
            ):
                client.generate("Some summary")


def test_gemini_flashcard_generator_empty_candidates():
    from unittest.mock import MagicMock, patch

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"candidates": []}

    with patch("apps.flashcards.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match="AI service error"):
            client.generate("Some summary")


def test_gemini_flashcard_generator_invalid_json():
    from unittest.mock import MagicMock, patch

    from apps.flashcards.ai import GeminiFlashcardGeneratorClient

    client = GeminiFlashcardGeneratorClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "not-json-content"}]}}]
    }

    with patch("apps.flashcards.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match="AI service error"):
            client.generate("Some summary")


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
def test_flashcard_generator_client_http_errors(status_code, expected_match):
    from unittest.mock import MagicMock, patch

    import requests

    from apps.flashcards.ai import FlashcardGeneratorClient

    client = FlashcardGeneratorClient(api_key="valid-key")
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    http_error = requests.exceptions.HTTPError("Error", response=mock_resp)
    mock_resp.raise_for_status.side_effect = http_error

    with patch("apps.flashcards.ai.requests.post", return_value=mock_resp):
        with pytest.raises(DocumentProcessingError, match=expected_match):
            client.generate("Some summary")


def test_flashcard_generator_client_request_exception():
    from unittest.mock import patch

    import requests

    from apps.flashcards.ai import FlashcardGeneratorClient

    client = FlashcardGeneratorClient(api_key="valid-key")
    with patch(
        "apps.flashcards.ai.requests.post",
        side_effect=requests.exceptions.RequestException("Err"),
    ):
        with pytest.raises(DocumentProcessingError, match="Network error contacting AI service"):
            client.generate("Some summary")
