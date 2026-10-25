from rest_framework import serializers

from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard


class DeckSerializer(serializers.ModelSerializer):
    document_name = serializers.CharField(
        source="document.original_name", read_only=True, allow_null=True, default=None
    )
    card_count = serializers.IntegerField(read_only=True, default=0)
    document = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.none(), required=False, allow_null=True
    )

    class Meta:
        model = Deck
        fields = [
            "id",
            "title",
            "description",
            "document",
            "document_name",
            "card_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "document_name", "card_count", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            self.fields["document"].queryset = Document.objects.filter(user=request.user)

    def validate_title(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Title cannot be blank.", code="blank")
        if len(trimmed) > 120:
            raise serializers.ValidationError(
                "Title must be 120 characters or fewer.", code="max_length"
            )
        return trimmed

    def validate_description(self, value):
        if value and len(value) > 1000:
            raise serializers.ValidationError(
                "Description must be 1000 characters or fewer.", code="max_length"
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None

        title = attrs.get("title")
        if title and user:
            qs = Deck.objects.filter(user=user, title__iexact=title)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"title": ["A deck with this title already exists."]},
                    code="deck_title_taken",
                )

        if not self.instance and user:
            if Deck.objects.filter(user=user).count() >= 200:
                raise serializers.ValidationError(
                    {"deck": ["You cannot create more than 200 decks."]},
                    code="deck_limit",
                )

        return attrs


class FlashcardSerializer(serializers.ModelSerializer):
    deck = serializers.PrimaryKeyRelatedField(queryset=Deck.objects.none())

    class Meta:
        model = Flashcard
        fields = [
            "id",
            "deck",
            "document",
            "question",
            "answer",
            "source",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "document", "source", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            self.fields["deck"].queryset = Deck.objects.filter(user=request.user)

    def validate_question(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Question cannot be blank.", code="blank")
        if len(trimmed) > 500:
            raise serializers.ValidationError(
                "Question must be 500 characters or fewer.", code="max_length"
            )
        return trimmed

    def validate_answer(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Answer cannot be blank.", code="blank")
        if len(trimmed) > 500:
            raise serializers.ValidationError(
                "Answer must be 500 characters or fewer.", code="max_length"
            )
        return trimmed

    def validate(self, attrs):
        target_deck = attrs.get("deck")
        if not target_deck and self.instance:
            target_deck = self.instance.deck

        if target_deck:
            if not self.instance or self.instance.deck_id != target_deck.id:
                if Flashcard.objects.filter(deck=target_deck).count() >= 500:
                    raise serializers.ValidationError(
                        {"deck": ["Deck cannot contain more than 500 cards."]},
                        code="deck_full",
                    )
        return attrs
