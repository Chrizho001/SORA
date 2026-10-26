from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer, DocumentUploadSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_throttles(self):
        if self.action in ["create", "generate_flashcards", "retry"]:
            self.throttle_scope = "ai_jobs"
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.db import transaction

        with transaction.atomic():
            document = serializer.save()

            def enqueue():
                import logging

                from apps.documents.tasks import process_document

                logger = logging.getLogger(__name__)
                try:
                    process_document.delay(str(document.id))
                except Exception as exc:
                    logger.exception(
                        "Failed to enqueue document processing for %s: %s", document.id, exc
                    )
                    Document.objects.filter(id=document.id).update(
                        status=Document.Status.FAILED,
                        error_message="Failed to queue document processing.",
                    )

            transaction.on_commit(enqueue)

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

        count = request.data.get("count", 10)
        try:
            count = int(count)
            if count < 5 or count > 20:
                raise ValueError()
        except (TypeError, ValueError):
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"count": ["Count must be an integer between 5 and 20."]},
                code="invalid_count",
            )

        from apps.flashcards.models import Deck

        deck = Deck.objects.filter(user=request.user, document=document).first()
        if not deck:
            title = document.original_name
            if title.lower().endswith(".pdf"):
                title = title[:-4]
            base_title = title
            counter = 1
            while Deck.objects.filter(user=request.user, title__iexact=title).exists():
                counter += 1
                title = f"{base_title} ({counter})"
            deck = Deck.objects.create(user=request.user, title=title, document=document)

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
            generate_flashcards_task.delay(str(deck.id), count=count)
        except Exception:
            Document.objects.filter(pk=document.pk).update(
                flashcard_generation_status=Document.FlashcardGenerationStatus.FAILED,
                flashcard_generation_started_at=None,
            )
            raise

        return Response(
            {"status": "GENERATING", "deck_id": str(deck.id)},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        document = self.get_object()
        from apps.documents.services import retry_document

        retry_document(document)
        return Response(
            {"status": "Retrying document analysis..."},
            status=status.HTTP_202_ACCEPTED,
        )
