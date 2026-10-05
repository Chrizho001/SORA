from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer, DocumentUploadSerializer


from rest_framework.decorators import action

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentUploadSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        # Queue celery task
        from apps.documents.tasks import process_document
        process_document.delay(str(document.id))

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED, headers=headers)

    @action(detail=True, methods=["post"], url_path="generate-flashcards")
    def generate_flashcards(self, request, pk=None):
        document = self.get_object()
        
        if document.status != Document.Status.DONE:
            return Response(
                {"error": "Document summary must be completed before generating flashcards."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Queue celery task
        from apps.flashcards.tasks import generate_flashcards_task
        generate_flashcards_task.delay(str(document.id))

        document.flashcard_generation_status = Document.FlashcardGenerationStatus.PENDING
        document.save(update_fields=["flashcard_generation_status"])

        return Response({"status": "Generating flashcards..."}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="start-quiz")
    def start_quiz(self, request, pk=None):
        document = self.get_object()
        
        from apps.flashcards.models import Flashcard
        flashcards = list(Flashcard.objects.filter(document=document))
        if len(flashcards) < 4:
            return Response(
                {"error": "Document must have at least 4 flashcards to start a quiz."},
                status=status.HTTP_400_BAD_REQUEST
            )

        import random
        from apps.quizzes.models import QuizSession, QuizQuestion
        
        session = QuizSession.objects.create(
            user=request.user,
            document=document,
            total_questions=len(flashcards)
        )

        questions = []
        for fc in flashcards:
            distractors = [f.answer for f in flashcards if f.id != fc.id]
            random.shuffle(distractors)
            distractors = distractors[:3]
            
            choices = distractors + [fc.answer]
            random.shuffle(choices)
            
            questions.append(QuizQuestion(
                session=session,
                flashcard=fc,
                choices=choices
            ))
            
        QuizQuestion.objects.bulk_create(questions)
        
        from apps.quizzes.serializers import QuizSessionSerializer
        serializer = QuizSessionSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

