from django.db import migrations


def create_decks_for_existing_flashcards(apps, schema_editor):
    Document = apps.get_model("documents", "Document")
    Deck = apps.get_model("flashcards", "Deck")
    Flashcard = apps.get_model("flashcards", "Flashcard")

    # Find distinct documents that have flashcards
    doc_ids_with_cards = (
        Flashcard.objects.filter(document__isnull=False)
        .values_list("document_id", flat=True)
        .distinct()
    )

    for doc in Document.objects.filter(id__in=doc_ids_with_cards).select_related("user"):
        raw_name = doc.original_name or "Untitled"
        if raw_name.lower().endswith(".pdf"):
            base_title = raw_name[:-4].strip()
        else:
            base_title = raw_name.strip()
        if not base_title:
            base_title = "Untitled"

        title = base_title[:120]
        existing_titles = set(Deck.objects.filter(user=doc.user).values_list("title", flat=True))
        existing_lower = {t.lower() for t in existing_titles}
        if title.lower() in existing_lower:
            counter = 2
            while True:
                suffix = f" ({counter})"
                candidate = f"{base_title[: 120 - len(suffix)]}{suffix}"
                if candidate.lower() not in existing_lower:
                    title = candidate
                    break
                counter += 1

        deck = Deck.objects.create(
            user=doc.user,
            title=title,
            description="",
            document=doc,
        )
        Flashcard.objects.filter(document=doc).update(deck=deck, source="AI")


class Migration(migrations.Migration):
    dependencies = [
        ("flashcards", "0002_add_deck_and_flashcard_source"),
    ]

    operations = [
        migrations.RunPython(
            create_decks_for_existing_flashcards,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
