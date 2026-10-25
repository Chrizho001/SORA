import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard
from apps.quizzes.models import QuizQuestion, QuizSession


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def document(user):
    from django.core.files.uploadedfile import SimpleUploadedFile

    file = SimpleUploadedFile("test.pdf", b"content")
    return Document.objects.create(user=user, original_name="test.pdf", size=100, file=file)


@pytest.fixture
def deck(user, document):
    return Deck.objects.create(user=user, document=document, title="Quiz Deck")


@pytest.fixture
def four_flashcards(user, document, deck):
    fcs = []
    for i in range(4):
        fcs.append(
            Flashcard.objects.create(
                user=user, deck=deck, document=document, question=f"Q{i}", answer=f"A{i}"
            )
        )
    return fcs


@pytest.fixture
def quiz_session(user, document, four_flashcards):
    session = QuizSession.objects.create(user=user, document=document, total_questions=4)
    for fc in four_flashcards:
        QuizQuestion.objects.create(
            session=session,
            flashcard=fc,
            question_text=fc.question,
            correct_answer=fc.answer,
            choices=["A0", "A1", "A2", "A3"],
        )
    return session


@pytest.mark.django_db
class TestQuizAPI:
    def test_start_quiz_success(self, auth_client, document, four_flashcards):
        url = reverse("documents:document-start-quiz", args=[document.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_201_CREATED
        assert "questions" in res.data
        assert len(res.data["questions"]) == 4
        assert "is_correct" not in res.data["questions"][0]
        assert "answer" not in res.data["questions"][0]["flashcard"]

    def test_start_quiz_fails_less_than_4(self, auth_client, document, user, deck):
        Flashcard.objects.create(
            user=user, deck=deck, document=document, question="Q1", answer="A1"
        )
        url = reverse("documents:document-start-quiz", args=[document.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "detail" in res.data
        assert "code" in res.data
        assert "error" not in res.data

    def test_retrieve_unfinished_session(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-detail", args=[quiz_session.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert "is_correct" not in res.data["questions"][0]

    def test_submit_quiz(self, auth_client, quiz_session, four_flashcards):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = quiz_session.questions.all()

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

        assert "is_correct" in res.data["questions"][0]
        assert res.data["questions"][0]["is_correct"] is True

    def test_submit_quiz_already_finished(self, auth_client, quiz_session):
        quiz_session.finished_at = timezone.now()
        quiz_session.save()

        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        res = auth_client.post(url, {"answers": []}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT
        assert res.data["code"] == "quiz_already_finished"

    def test_submit_quiz_malformed_body_does_not_lock_session(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        res = auth_client.post(url, {"answers": "invalid"}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST

        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is None
        assert quiz_session.score is None

        res_valid = auth_client.post(url, {"answers": []}, format="json")
        assert res_valid.status_code == status.HTTP_200_OK
        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is not None

    def test_submit_duplicate_question_id(self, auth_client, quiz_session):
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

    def test_submit_invalid_question_id(
        self, auth_client, quiz_session, user, document, four_flashcards
    ):
        # Create another session with its own question
        other_session = QuizSession.objects.create(user=user, document=document, total_questions=1)
        other_q = QuizQuestion.objects.create(
            session=other_session,
            flashcard=four_flashcards[0],
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
        assert quiz_session.score is None

    def test_submit_invalid_choice(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        q = quiz_session.questions.first()
        payload = {
            "answers": [
                {"question_id": str(q.id), "selected_choice": "INVALID_NOT_IN_CHOICES"},
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "invalid_choice"
        quiz_session.refresh_from_db()
        assert quiz_session.finished_at is None
        assert quiz_session.score is None

    def test_submit_partial_answers(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = list(quiz_session.questions.order_by("id"))
        # Answer only 1 of 4 correctly
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
        assert (
            res_questions[str(questions[0].id)]["selected_choice"] == questions[0].correct_answer
        )

        for q in questions[1:]:
            assert res_questions[str(q.id)]["is_correct"] is False
            assert res_questions[str(q.id)]["selected_choice"] is None

    def test_submit_empty_answers_list(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        # answers key omitted or empty
        res = auth_client.post(url, {}, format="json")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["score"] == 0
        quiz_session.refresh_from_db()
        assert quiz_session.score == 0
        assert quiz_session.finished_at is not None

        for q in res.data["questions"]:
            assert q["is_correct"] is False
            assert q["selected_choice"] is None

    def test_submit_score_bounds_property(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = list(quiz_session.questions.all())
        payload = {
            "answers": [
                {"question_id": str(q.id), "selected_choice": q.correct_answer} for q in questions
            ]
        }
        res = auth_client.post(url, payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        score = res.data["score"]
        assert 0 <= score <= quiz_session.total_questions
