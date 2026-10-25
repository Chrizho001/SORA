import uuid

import django.db.models.deletion
import django.db.models.functions.text
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_document_flashcard_generation_status"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("flashcards", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Deck",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="decks",
                        to="documents.document",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="decks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="deck",
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower("title"),
                models.F("user"),
                name="uniq_deck_title_per_user",
            ),
        ),
        migrations.AddIndex(
            model_name="deck",
            index=models.Index(
                fields=["user", "-updated_at"], name="flashcards__user_id_0f0d36_idx"
            ),
        ),
        migrations.AddField(
            model_name="flashcard",
            name="deck",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="cards",
                to="flashcards.deck",
            ),
        ),
        migrations.AddField(
            model_name="flashcard",
            name="source",
            field=models.CharField(
                choices=[("MANUAL", "Manual"), ("AI", "AI")], default="AI", max_length=10
            ),
        ),
        migrations.AlterField(
            model_name="flashcard",
            name="document",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="flashcards",
                to="documents.document",
            ),
        ),
        migrations.RemoveIndex(
            model_name="flashcard",
            name="flashcards__user_id_e199c5_idx",
        ),
        migrations.AddIndex(
            model_name="flashcard",
            index=models.Index(fields=["user", "deck"], name="flashcards__user_id_f4f034_idx"),
        ),
    ]
