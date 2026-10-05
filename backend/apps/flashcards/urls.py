from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.flashcards.views import FlashcardViewSet

app_name = "flashcards"

router = DefaultRouter()
router.register(r"", FlashcardViewSet, basename="flashcard")

urlpatterns = [
    path("", include(router.urls)),
]
