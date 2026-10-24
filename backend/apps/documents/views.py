from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer, DocumentUploadSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_throttles(self):
        if self.action in ["create", "generate_flashcards"]:
            self.throttle_scope = "ai_jobs"
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        # Queue celery task
        from apps.documents.tasks import process_document

        process_document.delay(str(document.id))

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED, headers=headers)

    def perform_destroy(self, instance):
        from django.db import transaction

        file = instance.file
        instance.delete()
        if file:
            transaction.on_commit(lambda: file.delete(save=False))

    @action(detail=True, methods=["post"], url_path="generate-flashcards")
    def generate_flashcards(self, request, pk=None):
        document = self.get_object()

        if document.status != Document.Status.DONE:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"document": ["Document summary must be completed before generating flashcards."]},
                code="summary_not_ready",
            )

        from datetime import timedelta

        from django.db.models import Q
        from django.utils import timezone

        from apps.accounts.exceptions import ConflictError

        now = timezone.now()
        stale_threshold = now - timedelta(minutes=10)

        claim_filter = Q(pk=document.pk) & (
            ~Q(flashcard_generation_status=Document.FlashcardGenerationStatus.GENERATING)
            | Q(flashcard_generation_started_at__lt=stale_threshold)
        )
        claimed = Document.objects.filter(claim_filter).update(
            flashcard_generation_status=Document.FlashcardGenerationStatus.GENERATING,
            flashcard_generation_started_at=now,
        )

        if not claimed:
            raise ConflictError(
                "Flashcards are already being generated.", code="generation_in_progress"
            )

        # Queue celery task
        from apps.flashcards.tasks import generate_flashcards_task

        try:
            generate_flashcards_task.delay(str(document.id))
        except Exception:
            Document.objects.filter(pk=document.pk).update(
                flashcard_generation_status=Document.FlashcardGenerationStatus.FAILED,
                flashcard_generation_started_at=None,
            )
            raise

        return Response({"status": "Generating flashcards..."}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="start-quiz")
    def start_quiz(self, request, pk=None):
        document = self.get_object()

        from apps.quizzes.serializers import QuizSessionSerializer
        from apps.quizzes.services import start_quiz

        session = start_quiz(user=request.user, document=document)
        serializer = QuizSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        document = self.get_object()
        if document.status == Document.Status.PROCESSING:
            return Response(
                {"detail": "Document is already being analyzed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document.status = Document.Status.PROCESSING
        document.error_message = ""
        document.save(update_fields=["status", "error_message"])

        from apps.documents.tasks import process_document

        process_document.delay(str(document.id))
        return Response(
            {"status": "Retrying document analysis..."},
            status=status.HTTP_202_ACCEPTED,
        )
