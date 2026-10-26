import uuid

from django.conf import settings
from django.db import models

from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard


class QuizSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_sessions"
    )
    deck = models.ForeignKey(
        Deck, on_delete=models.SET_NULL, null=True, blank=True, related_name="quiz_sessions"
    )
    deck_title = models.CharField(max_length=120, default="", blank=True)
    document = models.ForeignKey(
        Document, on_delete=models.SET_NULL, null=True, blank=True, related_name="quiz_sessions"
    )
    score = models.IntegerField(null=True, blank=True)
    total_questions = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"Quiz Session {self.id} for {self.deck_title or 'Deleted deck'}"


class QuizQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(QuizSession, on_delete=models.CASCADE, related_name="questions")
    flashcard = models.ForeignKey(Flashcard, null=True, on_delete=models.SET_NULL)
    question_text = models.TextField(default="")
    correct_answer = models.TextField(default="")
    choices = models.JSONField()
    selected_choice = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(null=True, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position"]

    def __str__(self):
        return f"Question {self.position} for session {self.session.id}"
