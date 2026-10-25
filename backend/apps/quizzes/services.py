import logging
import random
from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.exceptions import ConflictError
from apps.flashcards.models import Flashcard
from apps.notifications.models import NotificationType
from apps.notifications.notification_service import NotificationService
from apps.quizzes.models import QuizQuestion, QuizSession

logger = logging.getLogger(__name__)


def start_quiz(user, document) -> QuizSession:
    """Create a quiz session with questions generated from document flashcards."""
    flashcards = list(Flashcard.objects.filter(document=document))
    if len(flashcards) < 4:
        raise ValidationError(
            {"document": ["Document must have at least 4 flashcards to start a quiz."]},
            code="not_enough_flashcards",
        )

    with transaction.atomic():
        session = QuizSession.objects.create(
            user=user, document=document, total_questions=len(flashcards)
        )

        questions = []
        for fc in flashcards:
            distractors = [f.answer for f in flashcards if f.id != fc.id]
            random.shuffle(distractors)
            distractors = distractors[:3]

            choices = distractors + [fc.answer]
            random.shuffle(choices)

            questions.append(
                QuizQuestion(
                    session=session,
                    flashcard=fc,
                    question_text=fc.question,
                    correct_answer=fc.answer,
                    choices=choices,
                )
            )

        QuizQuestion.objects.bulk_create(questions)

    return session


def submit_quiz(
    session: QuizSession, answers_data: list[dict[str, Any]], user=None
) -> QuizSession:
    """Validate and atomically submit a quiz session, grade answers, and send notification."""
    now = timezone.now()
    with transaction.atomic():
        updated = QuizSession.objects.filter(pk=session.pk, finished_at__isnull=True).update(
            finished_at=now
        )
        if not updated:
            raise ConflictError(
                detail="Quiz session already finished.", code="quiz_already_finished"
            )
        session.refresh_from_db()

        score = 0
        questions = {str(q.id): q for q in session.questions.select_related("flashcard")}
        answers_map = {
            str(ans.get("question_id")): ans.get("selected_choice") for ans in answers_data
        }
        questions_to_update = []

        for q_id, q in questions.items():
            if q_id in answers_map:
                choice = answers_map[q_id]
                q.selected_choice = choice
                q.is_correct = choice == q.correct_answer
                if q.is_correct:
                    score += 1
            else:
                q.selected_choice = None
                q.is_correct = False
            questions_to_update.append(q)

        if questions_to_update:
            QuizQuestion.objects.bulk_update(
                questions_to_update, ["selected_choice", "is_correct"]
            )

        session.score = score
        session.finished_at = now
        session.save(update_fields=["score", "finished_at"])

    recipient = user or session.user
    try:
        doc_name = session.document.original_name if session.document else "Quiz"
        NotificationService.notify(
            recipient=recipient,
            notification_type=NotificationType.QUIZ_GRADED,
            title="Quiz Graded",
            body=f"You scored {score}/{session.total_questions} on the quiz for '{doc_name}'.",
            data={"quiz_session_id": str(session.id)},
        )
    except Exception as e:
        logger.error("Failed to notify: %s", e)

    return session
