import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class DocumentProcessingError(Exception):
    pass


class MockSummarizer:
    """
    Mock AI summarizer used when AI_PROVIDER == 'mock'.
    """

    model_name = "mock"

    def summarize(self, text: str = "", pdf_bytes: bytes = None) -> str:
        if not text and pdf_bytes:
            return "Mock summary of image-based multimodal document."
        return f"Mock summary of document ({len(text)} characters)."


class SummarizerClient:
    """
    Interface for the third-party AI summarization service (OpenAI).
    """

    def __init__(self, api_key=None, base_url=None, model_name=None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", None)
        self.base_url = base_url or getattr(
            settings,
            "AI_BASE_URL",
            "https://api.groq.com/openai/v1/chat/completions",
        )
        self.model_name = model_name or getattr(
            settings, "AI_MODEL_NAME", "openai/gpt-oss-120b"
        )

    def summarize(self, text: str = "", pdf_bytes: bytes = None) -> str:
        """
        Takes raw extracted text and returns an AI-generated summary.
        """
        if not self.api_key:
            raise DocumentProcessingError("AI_API_KEY is not set.")

        if not text or not text.strip():
            raise DocumentProcessingError(
                "AI provider requires digital text. For image-only or scanned PDFs, please use Google Gemini."
            )

        max_chars = getattr(settings, "AI_MAX_PROMPT_CHARS", 22000)
        if len(text) > max_chars:
            text = (
                text[:max_chars]
                + "\n\n[Note: Document text truncated to fit AI token limit.]"
            )

        try:
            response = requests.post(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_name,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a helpful study assistant. Summarize the following lecture or course text concisely. Extract key concepts, definitions, and takeaways."
                            ),
                        },
                        {"role": "user", "content": text},
                    ],
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as exc:
            if exc.response is not None:
                if exc.response.status_code == 413:
                    raise DocumentProcessingError(
                        "Document exceeds Groq token limit (8,000 tokens/min). Please try a shorter chapter or section."
                    ) from exc
                if exc.response.status_code == 429:
                    raise DocumentProcessingError(
                        "AI rate limit reached. Please wait a moment and try again."
                    ) from exc
            raise DocumentProcessingError(f"AI summarization service error: {exc}") from exc
        except requests.exceptions.RequestException as exc:
            raise DocumentProcessingError(f"Network error contacting AI service: {exc}") from exc


class GeminiSummarizerClient:
    """
    Interface for Google Gemini AI summarization service.
    Supports both extracted text and native multimodal PDF input (e.g. image-only slides).
    """

    def __init__(self, api_key=None, base_url=None, model_name=None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", "")
        self.base_url = base_url or getattr(
            settings,
            "AI_BASE_URL",
            "https://generativelanguage.googleapis.com/v1beta/models",
        )
        self.model_name = model_name or getattr(
            settings, "AI_MODEL_NAME", "gemini-3.5-flash"
        )

    def summarize(self, text: str = "", pdf_bytes: bytes = None) -> str:
        if not self.api_key:
            raise DocumentProcessingError("Gemini API key is not configured in settings.")

        endpoint = f"{self.base_url.rstrip('/')}/{self.model_name}:generateContent"

        prompt_instruction = (
            "You are an expert academic study assistant. Provide a comprehensive, high-quality, "
            "and beautifully structured study guide summary of the provided course or lecture material.\n\n"
            "Formatting Rules:\n"
            "1. Output clean, human-readable Markdown only.\n"
            "2. Never use raw HTML tags (do NOT output <br>, <p>, <div>, <span>, <b>, or <i>).\n"
            "3. Use clear Markdown headings (## Section Title, ### Core Concept).\n"
            "4. Format lists and takeaways with neat bullet points (- or *).\n"
            "5. Bold key terms using **term** for visual hierarchy.\n"
            "6. For comparisons or data summaries, use well-formed Markdown tables with header rows.\n"
            "7. Extract clear definitions, core formulas/principles, and bulleted exam takeaways."
        )

        parts = []
        if pdf_bytes:
            import base64

            b64_pdf = base64.b64encode(pdf_bytes).decode("utf-8")
            parts.append({"inline_data": {"mime_type": "application/pdf", "data": b64_pdf}})
            prompt_text = prompt_instruction
            if text and text.strip():
                prompt_text += f"\n\nExtracted text reference:\n{text[:30000]}"
            parts.append({"text": prompt_text})
        else:
            if not text or not text.strip():
                raise DocumentProcessingError("No text or PDF content provided for summarization.")
            max_chars = getattr(settings, "AI_MAX_PROMPT_CHARS", 500000)
            if len(text) > max_chars:
                text = text[:max_chars] + "\n\n[Note: Document excerpted to fit token limits.]"
            parts.append({"text": f"{prompt_instruction}\n\n{text}"})

        payload = {"contents": [{"parts": parts}]}
        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}

        import time

        max_attempts = 4
        last_error = None
        for attempt in range(max_attempts):
            try:
                response = requests.post(endpoint, headers=headers, json=payload, timeout=120)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if not candidates:
                        raise DocumentProcessingError("Gemini returned an empty candidate list.")
                    content_parts = candidates[0].get("content", {}).get("parts", [])
                    if not content_parts or "text" not in content_parts[0]:
                        raise DocumentProcessingError("Gemini returned a response without text.")
                    return content_parts[0]["text"]

                if response.status_code in (503, 429) and attempt < max_attempts - 1:
                    time.sleep(1.5 * (attempt + 1))
                    continue

                response.raise_for_status()

            except requests.exceptions.HTTPError as exc:
                last_error = exc
                status_code = exc.response.status_code if exc.response is not None else 0
                error_body = exc.response.text if exc.response is not None else str(exc)
                try:
                    err_json = exc.response.json()
                    err_msg = err_json.get("error", {}).get("message", error_body)
                except Exception:
                    err_msg = error_body

                if status_code in (401, 403):
                    raise DocumentProcessingError(
                        f"Google Gemini authentication failed: {err_msg}"
                    ) from exc
                if status_code == 429:
                    raise DocumentProcessingError(
                        "Google Gemini rate limit reached. Please wait a moment and try again."
                    ) from exc
                if status_code == 503:
                    raise DocumentProcessingError(
                        "Google Gemini is currently experiencing temporary high traffic. Please try again shortly."
                    ) from exc
                raise DocumentProcessingError(
                    f"Google Gemini API error ({status_code}): {err_msg}"
                ) from exc

            except requests.exceptions.RequestException as exc:
                last_error = exc
                if attempt < max_attempts - 1:
                    time.sleep(1.5 * (attempt + 1))
                    continue
                raise DocumentProcessingError(
                    f"Network error communicating with Google Gemini: {exc}"
                ) from exc

        raise DocumentProcessingError(f"Failed to generate summary with Gemini: {last_error}")


def get_summarizer():
    provider = getattr(settings, "AI_PROVIDER", "mock")
    if provider == "mock":
        return MockSummarizer()
    if provider == "gemini":
        return GeminiSummarizerClient()
    return SummarizerClient()
