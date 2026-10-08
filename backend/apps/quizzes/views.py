from rest_framework import viewsets, mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.quizzes.models import QuizSession, QuizQuestion
from apps.quizzes.serializers import QuizSessionSerializer
from django.utils import timezone

class QuizSessionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    permission_classes = [IsAuthenticated]
    serializer_class = QuizSessionSerializer

    def get_queryset(self):
        return QuizSession.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        session = self.get_object()
        
        if session.finished_at:
            return Response({"error": "Quiz session already finished."}, status=status.HTTP_400_BAD_REQUEST)

        answers_data = request.data.get("answers", [])
        
        score = 0
        questions = {str(q.id): q for q in session.questions.select_related("flashcard")}
        questions_to_update = []
        
        for ans in answers_data:
            q_id = ans.get("question_id")
            choice = ans.get("selected_choice")
            if q_id in questions:
                q = questions[q_id]
                q.selected_choice = choice
                q.is_correct = (choice == q.flashcard.answer)
                if q.is_correct:
                    score += 1
                questions_to_update.append(q)

        if questions_to_update:
            QuizQuestion.objects.bulk_update(questions_to_update, ["selected_choice", "is_correct"])

        session.score = score
        session.finished_at = timezone.now()
        session.save(update_fields=["score", "finished_at"])

        try:
            from apps.notifications.notification_service import NotificationService
            from apps.notifications.models import NotificationType
            NotificationService.notify(
                recipient=request.user,
                notification_type=NotificationType.QUIZ_GRADED,
                title="Quiz Graded",
                body=f"You scored {score}/{session.total_questions} on the quiz for '{session.document.original_name}'.",
                data={"quiz_session_id": str(session.id)}
            )
        except Exception as e:
            # Continue even if notification fails
            import logging
            logging.getLogger(__name__).error(f"Failed to notify: {e}")

        serializer = self.get_serializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)
