from django.db import migrations


def populate_deck_and_title(apps, schema_editor):
    QuizSession = apps.get_model("quizzes", "QuizSession")
    Deck = apps.get_model("flashcards", "Deck")

    for session in QuizSession.objects.filter(deck__isnull=True).select_related("document"):
        deck = None
        if session.document_id:
            deck = Deck.objects.filter(document_id=session.document_id).first()

        if deck:
            session.deck = deck
            session.deck_title = deck.title[:120]
        elif session.document and session.document.original_name:
            session.deck_title = session.document.original_name[:120]
        else:
            session.deck_title = "Deleted deck"

        session.save(update_fields=["deck", "deck_title"])


def reverse_populate(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("quizzes", "0004_add_deck_and_position"),
    ]

    operations = [
        migrations.RunPython(populate_deck_and_title, reverse_code=reverse_populate),
    ]
