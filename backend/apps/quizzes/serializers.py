from rest_framework import serializers
from apps.quizzes.models import QuizSession, QuizQuestion
from apps.flashcards.models import Flashcard

class QuizFlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ["id", "question"] # explicitly excluding 'answer'

class QuizQuestionSerializer(serializers.ModelSerializer):
    flashcard = QuizFlashcardSerializer(read_only=True)
    
    class Meta:
        model = QuizQuestion
        fields = ["id", "flashcard", "choices", "selected_choice", "is_correct"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not instance.session.finished_at:
            ret.pop("is_correct", None)
        return ret

class QuizSessionSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuizSession
        fields = ["id", "document", "score", "total_questions", "created_at", "finished_at", "questions"]
        read_only_fields = ["id", "document", "score", "total_questions", "created_at", "finished_at"]
