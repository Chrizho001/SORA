import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("flashcards", "0003_populate_decks_for_existing_flashcards"),
    ]

    operations = [
        migrations.AlterField(
            model_name="flashcard",
            name="deck",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="cards",
                to="flashcards.deck",
            ),
        ),
        migrations.AlterField(
            model_name="flashcard",
            name="source",
            field=models.CharField(
                choices=[("MANUAL", "Manual"), ("AI", "AI")], default="MANUAL", max_length=10
            ),
        ),
    ]
