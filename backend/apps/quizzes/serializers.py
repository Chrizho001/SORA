from rest_framework import serializers

from apps.quizzes.models import QuizQuestion, QuizSession


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            "id",
            "position",
            "question_text",
            "choices",
            "selected_choice",
            "is_correct",
            "correct_answer",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if not instance.session.finished_at:
            ret.pop("selected_choice", None)
            ret.pop("is_correct", None)
            ret.pop("correct_answer", None)
        return ret


class QuizSessionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizSession
        fields = [
            "id",
            "deck",
            "deck_title",
            "score",
            "total_questions",
            "created_at",
            "finished_at",
        ]
        read_only_fields = fields


class QuizSessionDetailSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = QuizSession
        fields = [
            "id",
            "deck",
            "deck_title",
            "score",
            "total_questions",
            "created_at",
            "finished_at",
            "questions",
        ]
        read_only_fields = fields


QuizSessionSerializer = QuizSessionDetailSerializer


class StartQuizSerializer(serializers.Serializer):
    question_count = serializers.IntegerField(
        required=False, default=10, min_value=1, max_value=50
    )


class AnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_choice = serializers.CharField(max_length=2000, allow_blank=True)


class SubmitQuizSerializer(serializers.Serializer):
    answers = AnswerSerializer(many=True, max_length=500, required=False, default=list)

    def validate(self, attrs):
        session = self.context.get("session")
        answers = attrs.get("answers", [])
        if not session:
            return attrs

        session_questions = {str(q.id): q for q in session.questions.all()}
        seen_question_ids = set()

        for ans in answers:
            q_id = str(ans.get("question_id"))
            if q_id in seen_question_ids:
                raise serializers.ValidationError(
                    "Duplicate question_id in answers.", code="duplicate_question"
                )
            seen_question_ids.add(q_id)

            if q_id not in session_questions:
                raise serializers.ValidationError(
                    "question_id does not belong to this quiz session.", code="invalid_question"
                )

            question = session_questions[q_id]
            choice = ans.get("selected_choice")
            if choice not in question.choices:
                raise serializers.ValidationError(
                    "selected_choice is not one of this question's choices.", code="invalid_choice"
                )

        return attrs
