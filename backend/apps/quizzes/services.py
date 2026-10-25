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


def start_quiz(user, deck, question_count: int = 10) -> QuizSession:
    """Create a quiz session with questions generated from a deck's flashcards."""
    all_cards = list(Flashcard.objects.filter(deck=deck))

    # 1. Eligibility: >= 4 cards whose answers are distinct after normalisation
    eligible_cards = []
    seen_norm_answers = set()
    for card in all_cards:
        norm = " ".join(card.answer.casefold().split())
        if norm not in seen_norm_answers:
            seen_norm_answers.add(norm)
            eligible_cards.append(card)

    if len(seen_norm_answers) < 4:
        raise ValidationError(
            {"deck": ["Deck must have at least 4 flashcards with distinct answers."]},
            code="not_enough_flashcards",
        )

    # 2. Sample n = min(question_count, len(eligible_cards)) at random
    n = min(question_count, len(eligible_cards))
    sampled_cards = random.sample(eligible_cards, n)

    with transaction.atomic():
        session = QuizSession.objects.create(
            user=user,
            deck=deck,
            deck_title=deck.title,
            total_questions=len(sampled_cards),
        )

        questions = []
        for index, correct_card in enumerate(sampled_cards):
            correct_norm = " ".join(correct_card.answer.casefold().split())

            # Distractors: candidate answers from the deck whose norm differs from correct
            candidates = []
            seen_cand_norms = set()
            for card in all_cards:
                cand_norm = " ".join(card.answer.casefold().split())
                if cand_norm != correct_norm and cand_norm not in seen_cand_norms:
                    seen_cand_norms.add(cand_norm)
                    candidates.append(card.answer)

            # Sort by abs(len(c) - len(correct)), take closest 6, sample 3
            candidates.sort(key=lambda c: abs(len(c) - len(correct_card.answer)))
            closest = candidates[:6]
            distractors = random.sample(closest, 3)

            choices = distractors + [correct_card.answer]
            random.shuffle(choices)

            questions.append(
                QuizQuestion(
                    session=session,
                    flashcard=correct_card,
                    question_text=correct_card.question,
                    correct_answer=correct_card.answer,
                    choices=choices,
                    position=index,
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
        questions = {str(q.id): q for q in session.questions.all()}
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
        deck_title = session.deck_title or (
            session.document.original_name if session.document else "the quiz"
        )
        NotificationService.notify(
            recipient=recipient,
            notification_type=NotificationType.QUIZ_GRADED,
            title="Quiz Graded",
            body=f"You scored {score}/{session.total_questions} on '{deck_title}'.",
            data={"quiz_session_id": str(session.id)},
        )
    except Exception as e:
        logger.error("Failed to notify: %s", e)

    return session
