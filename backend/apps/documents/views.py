from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer, DocumentUploadSerializer


from rest_framework.decorators import action

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        # Queue celery task
        from apps.documents.tasks import process_document
        process_document.delay(str(document.id))

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED, headers=headers)

    @action(detail=True, methods=["post"], url_path="generate-flashcards")
    def generate_flashcards(self, request, pk=None):
        document = self.get_object()
        
        if document.status != Document.Status.DONE:
            return Response(
                {"error": "Document summary must be completed before generating flashcards."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Queue celery task
        from apps.flashcards.tasks import generate_flashcards_task
        generate_flashcards_task.delay(str(document.id))

        document.flashcard_generation_status = Document.FlashcardGenerationStatus.PENDING
        document.save(update_fields=["flashcard_generation_status"])

        return Response({"status": "Generating flashcards..."}, status=status.HTTP_202_ACCEPTED)

