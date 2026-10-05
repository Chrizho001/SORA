from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.quizzes.views import QuizSessionViewSet

app_name = "quizzes"

router = DefaultRouter()
router.register(r"", QuizSessionViewSet, basename="quizsession")

urlpatterns = [
    path("", include(router.urls)),
]
