from rest_framework import serializers
from apps.flashcards.models import Flashcard

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ["id", "document", "question", "answer", "created_at", "updated_at"]
        read_only_fields = ["id", "document", "created_at", "updated_at"]
