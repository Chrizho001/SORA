import uuid
from django.db import models
from django.conf import settings
from apps.documents.models import Document

class Flashcard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="flashcards")
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="flashcards")
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["user", "document"]),
        ]

    def __str__(self):
        return f"Flashcard: {self.question[:20]}"
