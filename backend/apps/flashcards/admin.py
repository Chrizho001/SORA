from django.contrib import admin

from apps.flashcards.models import Deck, Flashcard

admin.site.register(Deck)
admin.site.register(Flashcard)
