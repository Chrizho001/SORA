from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.flashcards.models import Flashcard
from apps.flashcards.serializers import FlashcardSerializer


class FlashcardViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = FlashcardSerializer

    def get_queryset(self):
        qs = Flashcard.objects.filter(user=self.request.user)
        document_id = self.request.query_params.get("document")
        if document_id:
            from rest_framework import serializers

            try:
                document_id = serializers.UUIDField().to_internal_value(document_id)
                qs = qs.filter(document_id=document_id)
            except serializers.ValidationError:
                raise serializers.ValidationError(
                    {"document": ["Invalid UUID format."]}, code="validation_error"
                )
        return qs
