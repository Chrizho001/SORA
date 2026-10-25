from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.flashcards.views import DeckViewSet

app_name = "decks"

router = DefaultRouter()
router.register(r"", DeckViewSet, basename="deck")

urlpatterns = [
    path("", include(router.urls)),
]
