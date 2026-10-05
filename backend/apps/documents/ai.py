class SummarizerClient:
    """
    Interface for the third-party AI summarization service.
    Currently stubbed out.
    """
    def __init__(self, api_key=None):
        pass

    def summarize(self, text: str) -> str:
        """
        Takes raw extracted text and returns an AI-generated summary.
        In production, this will call the actual AI API (e.g., Gemini, OpenAI).
        """
        raise NotImplementedError("SummarizerClient must be mocked in tests or fully implemented.")
