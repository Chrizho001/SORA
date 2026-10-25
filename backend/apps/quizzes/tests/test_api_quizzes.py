import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.flashcards.models import Deck, Flashcard
from apps.notifications.models import Notification
from apps.quizzes.models import QuizQuestion, QuizSession

User = get_user_model()


@pytest.fixture
def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def deck(user):
    return Deck.objects.create(user=user, title="Biology Deck")


@pytest.fixture
def flashcards(user, deck):
    cards = []
    for i in range(12):
        cards.append(
            Flashcard.objects.create(
                user=user,
                deck=deck,
                question=f"Question {i}?",
                answer=f"Distinct Answer {i}",
                source=Flashcard.Source.MANUAL,
            )
        )
    return cards


@pytest.fixture
def four_flashcards(user, deck):
    cards = []
    for i in range(4):
        cards.append(
            Flashcard.objects.create(
                user=user,
                deck=deck,
                question=f"Question {i}?",
                answer=f"Answer {i}",
                source=Flashcard.Source.MANUAL,
            )
        )
    return cards


@pytest.fixture
def quiz_session(user, deck, four_flashcards):
    session = QuizSession.objects.create(
        user=user, deck=deck, deck_title=deck.title, total_questions=4
    )
    for i, fc in enumerate(four_flashcards):
        QuizQuestion.objects.create(
            session=session,
            flashcard=fc,
            question_text=fc.question,
            correct_answer=fc.answer,
            choices=["Answer 0", "Answer 1", "Answer 2", "Answer 3"],
            position=i,
        )
    return session


@pytest.mark.django_db
class TestStartQuizAPI:
    def test_start_quiz_deck_less_than_4_cards_returns_400(self, auth_client, deck, user):
        for i in range(3):
            Flashcard.objects.create(user=user, deck=deck, question=f"Q{i}", answer=f"A{i}")
        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res = auth_client.post(url, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data.get("code") == "not_enough_flashcards" or "not_enough_flashcards" in str(
            res.data
        )

    def test_start_quiz_4_cards_only_3_distinct_answers_returns_400(self, auth_client, deck, user):
        answers = ["Paris", "Berlin", "London", "  paris  "]  # Paris normalized duplicate
        for i, ans in enumerate(answers):
            Flashcard.objects.create(user=user, deck=deck, question=f"Q{i}", answer=ans)

        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res = auth_client.post(url, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data.get("code") == "not_enough_flashcards" or "not_enough_flashcards" in str(
            res.data
        )

    def test_start_quiz_success_default_count(self, auth_client, deck, flashcards):
        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res = auth_client.post(url, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert str(res.data["deck"]) == str(deck.id)
        assert res.data["deck_title"] == "Biology Deck"
        assert res.data["total_questions"] == 10
        assert len(res.data["questions"]) == 10
        assert res.data["score"] is None
        assert res.data["finished_at"] is None

    def test_start_quiz_question_count_capped_at_eligible_cards(self, auth_client, deck, user):
        for i in range(5):
            Flashcard.objects.create(
                user=user, deck=deck, question=f"Q{i}", answer=f"Unique Answer {i}"
            )

        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res = auth_client.post(url, {"question_count": 20}, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["total_questions"] == 5
        assert len(res.data["questions"]) == 5

    def test_start_quiz_invalid_question_count_returns_400(self, auth_client, deck, flashcards):
        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res_zero = auth_client.post(url, {"question_count": 0}, format="json")
        assert res_zero.status_code == status.HTTP_400_BAD_REQUEST

        res_over = auth_client.post(url, {"question_count": 51}, format="json")
        assert res_over.status_code == status.HTTP_400_BAD_REQUEST

    def test_every_question_has_4_distinct_choices_including_correct_answer(
        self, auth_client, deck, flashcards
    ):
        url = reverse("decks:deck-start-quiz", args=[deck.id])
        # Loop 20 times to cover randomness in distractor selection and shuffling
        for _ in range(20):
            res = auth_client.post(url, {"question_count": 4}, format="json")
            assert res.status_code == status.HTTP_201_CREATED
            session = QuizSession.objects.get(id=res.data["id"])
            for q in session.questions.all():
                assert len(q.choices) == 4
                assert len(set(q.choices)) == 4
                assert q.correct_answer in q.choices

    def test_unfinished_payload_no_leakage_sec_09(self, auth_client, deck, flashcards):
        url = reverse("decks:deck-start-quiz", args=[deck.id])
        res = auth_client.post(url, {"question_count": 4}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

        questions = res.data["questions"]
        assert len(questions) == 4
        for q in questions:
            assert "id" in q
            assert "position" in q
            assert "question_text" in q
            assert "choices" in q
            assert len(q["choices"]) == 4

            # SEC-09 & spec: no correct_answer, is_correct, selected_choice or flashcard
            assert "correct_answer" not in q
            assert "is_correct" not in q
            assert "selected_choice" not in q
            assert "flashcard" not in q

    def test_start_quiz_foreign_deck_returns_404(self, auth_client):
        other_user = User.objects.create_user(email="other@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(user=other_user, title="Foreign Deck")
        for i in range(5):
            Flashcard.objects.create(
                user=other_user, deck=foreign_deck, question=f"FQ{i}", answer=f"FA{i}"
            )

        url = reverse("decks:deck-start-quiz", args=[foreign_deck.id])
        res = auth_client.post(url, format="json")
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_start_quiz_throttle_scope_is_quiz_create(self):
        from apps.flashcards.views import DeckViewSet

        view = DeckViewSet()
        view.action = "start_quiz"
        view.format_kwarg = None
        view.get_throttles()
        assert view.throttle_scope == "quiz_create"


@pytest.mark.django_db
class TestSubmitAndGradingAPI:
    def test_retrieve_unfinished_session_hides_answers(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-detail", args=[quiz_session.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        q0 = res.data["questions"][0]
        assert "is_correct" not in q0
        assert "correct_answer" not in q0
        assert "selected_choice" not in q0
        assert "flashcard" not in q0

    def test_submit_quiz_success_and_notification(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = list(quiz_session.questions.all())

        wrong_for_2 = [c for c in questions[2].choices if c != questions[2].correct_answer][0]
        wrong_for_3 = [c for c in questions[3].choices if c != questions[3].correct_answer][0]

        payload = {
            "answers": [
                {
                    "question_id": str(questions[0].id),
                    "selected_choice": questions[0].correct_answer,
                },
                {
                    "question_id": str(questions[1].id),
                    "selected_choice": questions[1].correct_answer,
                },
                {"question_id": str(questions[2].id), "selected_choice": wrong_for_2},
                {"question_id": str(questions[3].id), "selected_choice": wrong_for_3},
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["score"] == 2
        assert res.data["finished_at"] is not None

        # Check notification
        notif = Notification.objects.filter(recipient=quiz_session.user).last()
        assert notif is not None
        assert f"You scored 2/4 on '{quiz_session.deck_title}'." in notif.body

    def test_finished_session_reveals_answers(self, auth_client, quiz_session):
        url_submit = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        q0 = quiz_session.questions.first()
        auth_client.post(
            url_submit,
            {"answers": [{"question_id": str(q0.id), "selected_choice": q0.correct_answer}]},
            format="json",
        )

        url_detail = reverse("quizzes:quizsession-detail", args=[quiz_session.id])
        res = auth_client.get(url_detail)
        assert res.status_code == status.HTTP_200_OK

        q_res = res.data["questions"][0]
        assert "is_correct" in q_res
        assert q_res["is_correct"] is True
        assert q_res["correct_answer"] == q0.correct_answer
        assert q_res["selected_choice"] == q0.correct_answer

    def test_submit_quiz_already_finished_returns_409(self, auth_client, quiz_session):
        quiz_session.finished_at = timezone.now()
        quiz_session.save()

        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        res = auth_client.post(url, {"answers": []}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT
        assert res.data["code"] == "quiz_already_finished"

    def test_submit_duplicate_question_id_returns_400(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        q = quiz_session.questions.first()
        payload = {
            "answers": [
                {"question_id": str(q.id), "selected_choice": q.choices[0]},
                {"question_id": str(q.id), "selected_choice": q.choices[0]},
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "duplicate_question"

        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is None
        assert quiz_session.score is None

    def test_submit_invalid_question_id_returns_400(self, auth_client, quiz_session, user, deck):
        # Create another session
        other_session = QuizSession.objects.create(
            user=user, deck=deck, deck_title=deck.title, total_questions=1
        )
        other_q = QuizQuestion.objects.create(
            session=other_session,
            question_text="Other?",
            correct_answer="A0",
            choices=["A0", "A1", "A2", "A3"],
        )

        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        payload = {
            "answers": [
                {"question_id": str(other_q.id), "selected_choice": "A0"},
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "invalid_question"

        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is None

    def test_submit_invalid_choice_returns_400(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        q = quiz_session.questions.first()
        payload = {
            "answers": [
                {"question_id": str(q.id), "selected_choice": "NOT_A_VALID_CHOICE"},
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "invalid_choice"

        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is None

    def test_submit_partial_answers(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = list(quiz_session.questions.order_by("position"))
        payload = {
            "answers": [
                {
                    "question_id": str(questions[0].id),
                    "selected_choice": questions[0].correct_answer,
                },
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["score"] == 1
        quiz_session.refresh_from_db()
        assert quiz_session.score == 1
        assert quiz_session.finished_at is not None

        res_questions = {q["id"]: q for q in res.data["questions"]}
        assert res_questions[str(questions[0].id)]["is_correct"] is True
        for q in questions[1:]:
            assert res_questions[str(q.id)]["is_correct"] is False
            assert res_questions[str(q.id)]["selected_choice"] is None

    def test_submit_empty_answers_list(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        res = auth_client.post(url, {}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["score"] == 0
        quiz_session.refresh_from_db()
        assert quiz_session.score == 0
        assert quiz_session.finished_at is not None

    def test_foreign_session_returns_404(self, auth_client, deck):
        other_user = User.objects.create_user(email="other5@uni.edu", password="Password123!")
        foreign_deck = Deck.objects.create(user=other_user, title="Foreign")
        foreign_session = QuizSession.objects.create(
            user=other_user, deck=foreign_deck, deck_title=foreign_deck.title, total_questions=1
        )
        url_detail = reverse("quizzes:quizsession-detail", args=[foreign_session.id])
        assert auth_client.get(url_detail).status_code == status.HTTP_404_NOT_FOUND

        url_submit = reverse("quizzes:quizsession-submit", args=[foreign_session.id])
        res_submit = auth_client.post(url_submit, {}, format="json")
        assert res_submit.status_code == status.HTTP_404_NOT_FOUND

    def test_submit_quiz_throttle_scope_is_quiz_submit(self):
        from apps.quizzes.views import QuizSessionViewSet

        view = QuizSessionViewSet()
        view.action = "submit"
        view.format_kwarg = None
        view.get_throttles()
        assert view.throttle_scope == "quiz_submit"


@pytest.mark.django_db
class TestQuizHistoryAndPerformance:
    list_url = reverse("quizzes:quizsession-list")

    def test_list_sessions_is_lightweight_and_constant_queries_perf_02(
        self, auth_client, user, deck, django_assert_num_queries
    ):
        s1 = QuizSession.objects.create(
            user=user, deck=deck, deck_title=deck.title, total_questions=4
        )
        QuizQuestion.objects.create(
            session=s1, question_text="Q1", correct_answer="A1", choices=["A1", "A2", "A3", "A4"]
        )

        with django_assert_num_queries(3):  # 1 auth, 1 count, 1 list
            res1 = auth_client.get(self.list_url)
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["count"] == 1
        first_session = res1.data["results"][0]
        assert "questions" not in first_session
        assert set(first_session.keys()) == {
            "id",
            "deck",
            "deck_title",
            "score",
            "total_questions",
            "created_at",
            "finished_at",
        }

        # Create 4 more sessions with questions
        for i in range(2, 6):
            s = QuizSession.objects.create(
                user=user, deck=deck, deck_title=deck.title, total_questions=4
            )
            QuizQuestion.objects.create(
                session=s,
                question_text=f"Q{i}",
                correct_answer=f"A{i}",
                choices=["A1", "A2", "A3", "A4"],
            )

        with django_assert_num_queries(3):  # constant query count: 1 auth, 1 count, 1 list
            res2 = auth_client.get(self.list_url)
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["count"] == 5

    def test_delete_deck_keeps_session_and_deck_title(self, auth_client, user, deck, quiz_session):
        deck.delete()

        quiz_session.refresh_from_db()
        assert quiz_session.deck is None
        assert quiz_session.deck_title == "Biology Deck"

        # Session can still be retrieved via API
        url = reverse("quizzes:quizsession-detail", args=[quiz_session.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["deck"] is None
        assert res.data["deck_title"] == "Biology Deck"

    def test_editing_card_after_quiz_does_not_change_quiz_snapshot(
        self, auth_client, quiz_session, four_flashcards
    ):
        fc = four_flashcards[0]
        q0 = quiz_session.questions.get(flashcard=fc)
        orig_question_text = q0.question_text
        orig_correct_answer = q0.correct_answer

        # Edit flashcard in DB
        fc.question = "Brand new completely different question?"
        fc.answer = "Brand new answer"
        fc.save()

        q0.refresh_from_db()
        assert q0.question_text == orig_question_text
        assert q0.correct_answer == orig_correct_answer
