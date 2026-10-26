import pytest

from apps.flashcards.models import Deck, Flashcard
from apps.notifications.models import Notification
from apps.quizzes.models import QuizSession


@pytest.mark.django_db
class TestModelIndexes:
    """
    PERF-03 index verification tests.
    Ensures that ordering fields for list endpoints have matching database indexes.
    """

    def test_notification_indexes(self):
        index_fields = [tuple(idx.fields) for idx in Notification._meta.indexes]
        assert ("recipient", "-created_at") in index_fields

    def test_quiz_session_indexes(self):
        index_fields = [tuple(idx.fields) for idx in QuizSession._meta.indexes]
        assert ("user", "-created_at") in index_fields

    def test_deck_indexes(self):
        index_fields = [tuple(idx.fields) for idx in Deck._meta.indexes]
        assert ("user", "-updated_at") in index_fields

    def test_flashcard_indexes(self):
        index_fields = [tuple(idx.fields) for idx in Flashcard._meta.indexes]
        assert ("user", "deck") in index_fields
