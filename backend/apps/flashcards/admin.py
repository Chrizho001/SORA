from django.contrib import admin
from django.db.models import Count
from django.utils.text import Truncator
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from apps.flashcards.models import Deck, Flashcard


class FlashcardInline(TabularInline):
    model = Flashcard
    extra = 0
    fields = ("question", "answer", "source")
    readonly_fields = ("source",)
    tab = True
    per_page = 20


@admin.register(Deck)
class DeckAdmin(ModelAdmin):
    list_display = ("title", "user", "card_count", "document", "created_at")
    list_select_related = ("user", "document")
    search_fields = ("title", "user__email")
    list_filter = ("created_at",)
    raw_id_fields = ("user", "document")
    readonly_fields = ("created_at", "updated_at")
    inlines = (FlashcardInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_card_count=Count("cards"))

    @display(description=_("Cards"), ordering="_card_count")
    def card_count(self, obj):
        return obj._card_count


@admin.register(Flashcard)
class FlashcardAdmin(ModelAdmin):
    list_display = ("short_question", "deck", "display_source", "user", "created_at")
    list_select_related = ("deck", "user")
    list_filter = ("source", "created_at")
    search_fields = ("question", "answer", "deck__title", "user__email")
    raw_id_fields = ("user", "deck", "document")
    readonly_fields = ("created_at", "updated_at")

    @display(description=_("Question"), ordering="question")
    def short_question(self, obj):
        return Truncator(obj.question).chars(70)

    @display(
        description=_("Source"),
        label={Flashcard.Source.AI.label: "primary", Flashcard.Source.MANUAL.label: "info"},
        ordering="source",
    )
    def display_source(self, obj):
        return obj.get_source_display()
