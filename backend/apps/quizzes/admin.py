from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from .models import QuizQuestion, QuizSession


class QuizQuestionInline(TabularInline):
    model = QuizQuestion
    extra = 0
    can_delete = False
    fields = ("position", "question_text", "correct_answer", "selected_choice", "is_correct")
    readonly_fields = fields
    ordering = ("position",)
    tab = True


@admin.register(QuizSession)
class QuizSessionAdmin(ModelAdmin):
    """Quizzes are started and graded through the API; the admin inspects results."""

    list_display = (
        "display_deck",
        "user",
        "display_score",
        "total_questions",
        "created_at",
        "finished_at",
    )
    list_select_related = ("user",)
    list_filter = ("created_at", "finished_at")
    search_fields = ("deck_title", "user__email")
    readonly_fields = (
        "id",
        "user",
        "deck",
        "deck_title",
        "document",
        "score",
        "total_questions",
        "created_at",
        "finished_at",
    )
    inlines = (QuizQuestionInline,)

    def has_add_permission(self, request):
        return False

    @display(description=_("Deck"), ordering="deck_title")
    def display_deck(self, obj):
        return obj.deck_title or _("Deleted deck")

    @display(
        description=_("Score"),
        label={
            _("Excellent"): "success",
            _("Passed"): "info",
            _("Needs work"): "danger",
            _("In progress"): "warning",
        },
    )
    def display_score(self, obj):
        if obj.finished_at is None or obj.score is None:
            return _("In progress")
        ratio = obj.score / obj.total_questions if obj.total_questions else 0
        if ratio >= 0.8:
            return _("Excellent")
        return _("Passed") if ratio >= 0.5 else _("Needs work")


@admin.register(QuizQuestion)
class QuizQuestionAdmin(ModelAdmin):
    """Every field of a quiz question, read-only: questions are created and graded by the API."""

    list_display = ("question_text", "session", "position", "is_correct")
    list_select_related = ("session",)
    list_filter = ("is_correct",)
    search_fields = ("question_text", "correct_answer", "session__user__email")
    fields = (
        "id",
        "session",
        "flashcard",
        "position",
        "question_text",
        "correct_answer",
        "choices",
        "selected_choice",
        "is_correct",
    )
    readonly_fields = fields

    def has_add_permission(self, request):
        return False
