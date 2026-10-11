import uuid
from django.db import models
from django.conf import settings
from apps.documents.models import Document
from apps.flashcards.models import Flashcard

class QuizSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_sessions")
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="quiz_sessions")
    score = models.IntegerField(null=True, blank=True)
    total_questions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "document"]),
        ]

    def __str__(self):
        return f"Quiz Session {self.id} for {self.document.original_name}"

class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="questions")
    flashcard = models.ForeignKey(Flashcard, null=True, on_delete=models.SET_NULL)
    question_text = models.TextField(default="")
    correct_answer = models.TextField(default="")
    choices = models.JSONField()
    selected_choice = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Question for session {self.session.id}"
