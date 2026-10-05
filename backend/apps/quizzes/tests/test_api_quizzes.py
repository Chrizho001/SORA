import pytest
from django.urls import reverse
from rest_framework import status
from apps.documents.models import Document
from apps.flashcards.models import Flashcard
from apps.quizzes.models import QuizSession, QuizQuestion
from django.utils import timezone

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
def four_flashcards(user, document):
    fcs = []
    for i in range(4):
        fcs.append(Flashcard.objects.create(user=user, document=document, question=f"Q{i}", answer=f"A{i}"))
    return fcs

@pytest.fixture
def quiz_session(user, document, four_flashcards):
    session = QuizSession.objects.create(user=user, document=document, total_questions=4)
    for fc in four_flashcards:
        QuizQuestion.objects.create(session=session, flashcard=fc, choices=["A0", "A1", "A2", "A3"])
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

    def test_start_quiz_fails_less_than_4(self, auth_client, document, user):
        Flashcard.objects.create(user=user, document=document, question="Q1", answer="A1")
        url = reverse("documents:document-start-quiz", args=[document.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_unfinished_session(self, auth_client, quiz_session):
        url = reverse("quizzes:quizsession-detail", args=[quiz_session.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert "is_correct" not in res.data["questions"][0]

    def test_submit_quiz(self, auth_client, quiz_session, four_flashcards):
        url = reverse("quizzes:quizsession-submit", args=[quiz_session.id])
        questions = quiz_session.questions.all()
        
        payload = {
            "answers": [
                {"question_id": str(questions[0].id), "selected_choice": questions[0].flashcard.answer}, 
                {"question_id": str(questions[1].id), "selected_choice": questions[1].flashcard.answer}, 
                {"question_id": str(questions[2].id), "selected_choice": "WRONG"}, 
                {"question_id": str(questions[3].id), "selected_choice": "WRONG"}, 
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
        assert res.status_code == status.HTTP_400_BAD_REQUEST
