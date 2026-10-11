import importlib

import pytest
from django.apps import apps

from apps.documents.models import Document


@pytest.mark.django_db
def test_data_migration_pending_to_not_started(user):
    migration_mod = importlib.import_module(
        "apps.documents.migrations.0003_alter_document_flashcard_generation_status"
    )
    doc = Document.objects.create(user=user, original_name="test.pdf", size=100)
    Document.objects.filter(pk=doc.pk).update(flashcard_generation_status="PENDING")
    doc.refresh_from_db()
    assert doc.flashcard_generation_status == "PENDING"

    migration_mod.update_pending_to_not_started(apps, None)

    doc.refresh_from_db()
    assert doc.flashcard_generation_status == "NOT_STARTED"
