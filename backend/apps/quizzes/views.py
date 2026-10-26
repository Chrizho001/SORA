from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.quizzes.models import QuizSession
from apps.quizzes.serializers import (
    QuizSessionDetailSerializer,
    QuizSessionListSerializer,
    SubmitQuizSerializer,
)
from apps.quizzes.services import submit_quiz


class QuizSessionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return QuizSessionListSerializer
        return QuizSessionDetailSerializer

    def get_queryset(self):
        qs = QuizSession.objects.filter(user=self.request.user)
        if self.action in ("retrieve", "submit"):
            qs = qs.prefetch_related("questions")
        return qs

    def get_throttles(self):
        if self.action == "submit":
            self.throttle_scope = "quiz_submit"
        return super().get_throttles()

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        session = self.get_object()

        serializer = SubmitQuizSerializer(data=request.data, context={"session": session})
        serializer.is_valid(raise_exception=True)
        answers_data = serializer.validated_data.get("answers", [])

        session = submit_quiz(session=session, answers_data=answers_data, user=request.user)

        response_serializer = self.get_serializer(session)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
