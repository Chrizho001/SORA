from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from apps.flashcards.models import Flashcard
from apps.flashcards.serializers import FlashcardSerializer

class FlashcardViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]
    serializer_class = FlashcardSerializer

    def get_queryset(self):
        qs = Flashcard.objects.filter(user=self.request.user)
        document_id = self.request.query_params.get("document")
        if document_id:
            qs = qs.filter(document_id=document_id)
        return qs
