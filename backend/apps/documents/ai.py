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

    def summarize(self, text: str) -> str:
        return f"Mock summary of document ({len(text)} characters)."


class SummarizerClient:
    """
    Interface for the third-party AI summarization service (OpenAI).
    """

    def __init__(self, api_key=None):
        self.api_key = api_key or getattr(settings, "AI_API_KEY", None)
        self.model_name = "gpt-4o-mini"

    def summarize(self, text: str) -> str:
        """
        Takes raw extracted text and returns an AI-generated summary.
        """
        if not self.api_key:
            raise DocumentProcessingError("AI_API_KEY is not set.")

        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful assistant. Summarize the following text concisely."
                        ),
                    },
                    {"role": "user", "content": text},
                ],
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


def get_summarizer():
    provider = getattr(settings, "AI_PROVIDER", "mock")
    if provider == "mock":
        return MockSummarizer()
    return SummarizerClient()
