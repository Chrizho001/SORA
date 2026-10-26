import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower

from apps.documents.models import Document


class Deck(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="decks"
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    document = models.ForeignKey(
        Document, on_delete=models.SET_NULL, null=True, blank=True, related_name="decks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(Lower("title"), "user", name="uniq_deck_title_per_user"),
        ]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
        ]

    def __str__(self):
        return self.title


class Flashcard(models.Model):
    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AI = "AI", "AI"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="flashcards"
    )
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name="cards")
    document = models.ForeignKey(
        Document, on_delete=models.SET_NULL, null=True, blank=True, related_name="flashcards"
    )
    question = models.TextField()
    answer = models.TextField()
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["user", "deck"]),
        ]

    def __str__(self):
        return f"Flashcard: {self.question[:20]}"
