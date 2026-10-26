import json
import logging
import time

import requests
from django.conf import settings

from apps.documents.exceptions import DocumentProcessingError

logger = logging.getLogger(__name__)

__all__ = [
    "DocumentProcessingError",
    "validate_flashcards_data",
    "MockFlashcardGenerator",
    "FlashcardGeneratorClient",
    "GeminiFlashcardGeneratorClient",
    "get_flashcard_generator",
]


def validate_flashcards_data(raw_data) -> list[dict]:
    """
    Validate that raw AI output contains valid flashcards with non-empty string question/answer.
    Handles responses wrapped in dicts (e.g. {"flashcards": [...]}, {"cards": [...]}).
    Drops invalid items instead of failing the whole batch; raises DocumentProcessingError
    only if fewer than 1 valid card remains.
    """
    items = raw_data
    if isinstance(items, dict):
        for key in ("flashcards", "cards", "questions"):
            if key in items and isinstance(items[key], list):
                items = items[key]
                break
        else:
            for val in items.values():
                if isinstance(val, list):
                    items = val
                    break

    if not isinstance(items, list) or len(items) == 0:
        logger.error("Invalid flashcard data from AI: expected non-empty list, got %r", raw_data)
        raise DocumentProcessingError("AI service error. Please try again later.")

    valid_cards = []
    for item in items:
        if not isinstance(item, dict):
            logger.warning("Dropping invalid flashcard item: not a dict: %r", item)
            continue
        question = item.get("question")
        answer = item.get("answer")
        if not isinstance(question, str) or not isinstance(answer, str):
            logger.warning("Dropping invalid flashcard item: question/answer not str: %r", item)
            continue
        q_trimmed = question.strip()
        a_trimmed = answer.strip()
        if not q_trimmed or not a_trimmed:
            logger.warning("Dropping invalid flashcard item: empty question or answer: %r", item)
            continue
        if len(q_trimmed) > 500 or len(a_trimmed) > 500:
            logger.warning("Dropping invalid flashcard item: exceeding 500 characters: %r", item)
            continue
        valid_cards.append({"question": q_trimmed, "answer": a_trimmed})

    if len(valid_cards) == 0:
        logger.error("No valid flashcards remained after validation: %r", raw_data)
        raise DocumentProcessingError("AI service error. Please try again later.")

    return valid_cards


class MockFlashcardGenerator:
    """
    Mock AI flashcard generator used when AI_PROVIDER == 'mock'.
    """

    model_name = "mock"

    def generate(self, summary_text: str, count: int = 10) -> list[dict]:
        return [
            {
                "question": f"Key question {i + 1} from document?",
                "answer": f"Deterministic answer {i + 1} based on document summary.",
            }
            for i in range(count)
        ]


class FlashcardGeneratorClient:
    """
    AI interface for generating flashcards using OpenAI / Groq.
    """

    def __init__(self, api_key=None, base_url=None, model_name=None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", None)
        self.base_url = base_url or getattr(
            settings,
            "AI_BASE_URL",
            "https://api.groq.com/openai/v1/chat/completions",
        )
        self.model_name = model_name or getattr(settings, "AI_MODEL_NAME", "openai/gpt-oss-120b")

    def generate(self, summary_text: str, count: int = 10) -> list[dict]:
        if not self.api_key:
            logger.error("AI_API_KEY is not set.")
            raise DocumentProcessingError("AI service authentication failed.")

        system_prompt = (
            f"You are a study assistant. Generate exactly {count} flashcards from the text. "
            "Each flashcard must contain exactly one fact per card, with a question of at most "
            "200 characters and an answer of at most 25 words. "
            "Return a JSON object with a 'flashcards' key containing a list of objects "
            "with 'question' and 'answer' string properties."
        )

        try:
            response = requests.post(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": summary_text},
                    ],
                    "response_format": {"type": "json_object"},
                },
                timeout=120,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as exc:
            logger.error("AI flashcard HTTP error: %s", exc, exc_info=True)
            if exc.response is not None:
                if exc.response.status_code in (401, 403):
                    raise DocumentProcessingError("AI service authentication failed.") from exc
                if exc.response.status_code == 429:
                    raise DocumentProcessingError(
                        "AI rate limit reached. Please wait a moment and try again."
                    ) from exc
                if exc.response.status_code == 503:
                    raise DocumentProcessingError(
                        "AI service is busy. Please try again shortly."
                    ) from exc
            raise DocumentProcessingError("AI service error. Please try again later.") from exc
        except requests.exceptions.RequestException as exc:
            logger.error("AI flashcard network error: %s", exc, exc_info=True)
            raise DocumentProcessingError(
                "Network error contacting AI service. Please try again later."
            ) from exc

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse AI output as JSON: %s", exc, exc_info=True)
            raise DocumentProcessingError("AI service error. Please try again later.") from exc

        return validate_flashcards_data(parsed)


class GeminiFlashcardGeneratorClient:
    """
    Interface for generating flashcards using Google Gemini.
    """

    def __init__(self, api_key=None, base_url=None, model_name=None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", "")
        self.base_url = base_url or getattr(
            settings,
            "AI_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/models",
        )
        self.model_name = model_name or getattr(settings, "AI_MODEL_NAME", "gemini-3.5-flash")

    def generate(self, summary_text: str, count: int = 10) -> list[dict]:
        if not self.api_key:
            logger.error("Gemini API key is not configured in settings.")
            raise DocumentProcessingError("AI service authentication failed.")

        endpoint = f"{self.base_url.rstrip('/')}/{self.model_name}:generateContent"

        prompt = (
            f"You are an expert academic tutor. Generate exactly {count} high-yield study "
            "flashcards from the text below. Each flashcard must contain exactly one fact "
            "per card, with a question of at most 200 characters and an answer of at most "
            "25 words. Return a JSON object with a 'flashcards' key containing a list of "
            f"objects with 'question' and 'answer' string properties.\n\n{summary_text}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}

        max_attempts = 4
        last_error = None
        for attempt in range(max_attempts):
            try:
                response = requests.post(endpoint, headers=headers, json=payload, timeout=90)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        logger.error("Gemini returned empty candidate list: %s", data)
                        raise DocumentProcessingError("AI service error. Please try again later.")
                    content = (
                        candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    )
                    try:
                        parsed = json.loads(content)
                    except json.JSONDecodeError as exc:
                        logger.error(
                            "Failed to parse Gemini output as JSON: %s", exc, exc_info=True
                        )
                        raise DocumentProcessingError(
                            "AI service error. Please try again later."
                        ) from exc
                    return validate_flashcards_data(parsed)

                if response.status_code in (503, 429) and attempt < max_attempts - 1:
                    time.sleep(1.5 * (attempt + 1))
                    continue

                response.raise_for_status()

            except requests.exceptions.HTTPError as exc:
                last_error = exc
                logger.error("Gemini HTTP error: %s", exc, exc_info=True)
                status_code = exc.response.status_code if exc.response is not None else 0
                if status_code in (401, 403):
                    raise DocumentProcessingError("AI service authentication failed.") from exc
                if status_code == 429:
                    raise DocumentProcessingError(
                        "AI rate limit reached. Please wait a moment and try again."
                    ) from exc
                if status_code == 503:
                    raise DocumentProcessingError(
                        "AI service is busy. Please try again shortly."
                    ) from exc
                raise DocumentProcessingError("AI service error. Please try again later.") from exc

            except requests.exceptions.RequestException as exc:
                last_error = exc
                logger.error("Gemini network error: %s", exc, exc_info=True)
                if attempt < max_attempts - 1:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                raise DocumentProcessingError(
                    "Network error contacting AI service. Please try again later."
                ) from exc

        logger.error("Failed to generate flashcards with Gemini after retries: %s", last_error)
        raise DocumentProcessingError("AI service error. Please try again later.")


def get_flashcard_generator():
    provider = getattr(settings, "AI_PROVIDER", "mock")
    if provider == "mock":
        return MockFlashcardGenerator()
    if provider == "gemini":
        return GeminiFlashcardGeneratorClient()
    return FlashcardGeneratorClient()
