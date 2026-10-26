from datetime import timedelta

from django.db import IntegrityError
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.exceptions import ConflictError
from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard
from apps.flashcards.serializers import DeckSerializer, FlashcardSerializer
from apps.flashcards.tasks import generate_flashcards_task
from apps.quizzes.serializers import QuizSessionDetailSerializer, StartQuizSerializer
from apps.quizzes.services import start_quiz


class DeckViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = DeckSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            Deck.objects.filter(user=self.request.user)
            .select_related("document")
            .annotate(card_count=Count("cards"))
            .order_by("-updated_at")
        )
        document_id = self.request.query_params.get("document")
        if document_id:
            try:
                document_id = serializers.UUIDField().to_internal_value(document_id)
                qs = qs.filter(document_id=document_id)
            except serializers.ValidationError:
                raise serializers.ValidationError(
                    {"document": ["Invalid UUID format."]}, code="validation_error"
                )
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if Deck.objects.filter(user=user).count() >= 200:
            raise ValidationError(
                {"detail": "Maximum deck limit reached (200 decks per user)."},
                code="deck_limit",
            )
        try:
            serializer.save(user=user)
        except IntegrityError:
            raise ValidationError(
                {"title": ["You already have a deck with this title."]},
                code="deck_title_taken",
            )

    def perform_update(self, serializer):
        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError(
                {"title": ["You already have a deck with this title."]},
                code="deck_title_taken",
            )

    def get_throttles(self):
        if self.action == "generate_flashcards":
            self.throttle_scope = "ai_jobs"
        elif self.action == "start_quiz":
            self.throttle_scope = "quiz_create"
        return super().get_throttles()

    @action(detail=True, methods=["post"], url_path="generate-flashcards")
    def generate_flashcards(self, request, pk=None):
        deck = self.get_object()

        if not deck.document:
            raise ValidationError(
                {"deck": ["Deck does not have a source document."]},
                code="no_source_document",
            )

        document = deck.document
        if document.status != Document.Status.DONE:
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
            raise ValidationError(
                {"count": ["Count must be an integer between 5 and 20."]},
                code="invalid_count",
            )

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
                "Flashcards are already being generated for this document.",
                code="generation_in_progress",
            )

        try:
            generate_flashcards_task.delay(str(deck.id), count=count)
        except Exception:
            Document.objects.filter(pk=document.pk).update(
                flashcard_generation_status=Document.FlashcardGenerationStatus.FAILED,
                flashcard_generation_started_at=None,
            )
            raise

        return Response({"status": "GENERATING"}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="start-quiz", url_name="start-quiz")
    def start_quiz(self, request, pk=None):
        deck = self.get_object()

        serializer = StartQuizSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question_count = serializer.validated_data.get("question_count", 10)

        session = start_quiz(user=request.user, deck=deck, question_count=question_count)
        return Response(
            QuizSessionDetailSerializer(session).data,
            status=status.HTTP_201_CREATED,
        )


class FlashcardViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    serializer_class = FlashcardSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Flashcard.objects.filter(user=self.request.user)
        deck_id = self.request.query_params.get("deck")
        if deck_id:
            try:
                deck_id = serializers.UUIDField().to_internal_value(deck_id)
                qs = qs.filter(deck_id=deck_id)
            except serializers.ValidationError:
                raise serializers.ValidationError(
                    {"deck": ["Invalid UUID format."]}, code="validation_error"
                )

        document_id = self.request.query_params.get("document")
        if document_id:
            try:
                document_id = serializers.UUIDField().to_internal_value(document_id)
                qs = qs.filter(document_id=document_id)
            except serializers.ValidationError:
                raise serializers.ValidationError(
                    {"document": ["Invalid UUID format."]}, code="validation_error"
                )
        return qs

    def perform_create(self, serializer):
        card = serializer.save(user=self.request.user)
        Deck.objects.filter(pk=card.deck_id).update(updated_at=timezone.now())

    def perform_update(self, serializer):
        old_deck_id = serializer.instance.deck_id
        card = serializer.save()
        new_deck_id = card.deck_id
        Deck.objects.filter(pk__in=[old_deck_id, new_deck_id]).update(updated_at=timezone.now())

    def perform_destroy(self, instance):
        deck_id = instance.deck_id
        instance.delete()
        Deck.objects.filter(pk=deck_id).update(updated_at=timezone.now())
