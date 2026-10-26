from datetime import UTC
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from apps.documents.models import Document, Summary


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def valid_pdf():
    return SimpleUploadedFile("test.pdf", b"%PDF-1.4...", content_type="application/pdf")


@pytest.fixture
def large_pdf():
    # 11MB file with valid header
    content = b"%PDF-1.4\n" + b"0" * (11 * 1024 * 1024)
    return SimpleUploadedFile("large.pdf", content, content_type="application/pdf")


@pytest.fixture
def text_file():
    return SimpleUploadedFile("test.txt", b"Hello world", content_type="text/plain")


@pytest.mark.django_db
class TestDocumentAPI:
    url = reverse("documents:document-list")

    @patch("apps.documents.tasks.process_document.delay")
    def test_upload_valid_pdf(
        self, mock_process, auth_client, user, valid_pdf, django_capture_on_commit_callbacks
    ):
        with django_capture_on_commit_callbacks(execute=True):
            res = auth_client.post(self.url, {"file": valid_pdf}, format="multipart")
        assert res.status_code == status.HTTP_202_ACCEPTED
        assert res.data["status"] == Document.Status.UPLOADED
        assert res.data["original_name"] == "test.pdf"

        # Check DB
        doc = Document.objects.get(id=res.data["id"])
        assert doc.user == user
        assert doc.size > 0

        # Check if task was queued
        mock_process.assert_called_once_with(str(doc.id))

    def test_upload_broker_failure_marks_document_failed(
        self, auth_client, user, valid_pdf, django_capture_on_commit_callbacks
    ):
        with patch(
            "apps.documents.tasks.process_document.delay",
            side_effect=Exception("Redis connection error"),
        ):
            with django_capture_on_commit_callbacks(execute=True):
                res = auth_client.post(self.url, {"file": valid_pdf}, format="multipart")

        assert res.status_code == status.HTTP_202_ACCEPTED
        doc = Document.objects.get(id=res.data["id"])
        assert doc.status == Document.Status.FAILED
        assert doc.error_message == "Failed to queue document processing."

    def test_upload_non_pdf_fails(self, auth_client, text_file):
        res = auth_client.post(self.url, {"file": text_file}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed." in res.data["errors"]["file"]

    def test_upload_large_pdf_fails(self, auth_client, large_pdf):
        res = auth_client.post(self.url, {"file": large_pdf}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "File size cannot exceed 10MB." in res.data["errors"]["file"]

    def test_upload_fake_pdf_fails(self, auth_client):
        fake_pdf = SimpleUploadedFile(
            "fake.pdf", b"this is not a pdf file", content_type="application/pdf"
        )
        res = auth_client.post(self.url, {"file": fake_pdf}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed." in res.data["errors"]["file"]

    def test_list_documents(self, auth_client, user):
        Document.objects.create(user=user, original_name="test1.pdf", size=100)
        Document.objects.create(user=user, original_name="test2.pdf", size=200)

        # Other user's document
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(email="other@test.com", password="pwd")
        Document.objects.create(user=other_user, original_name="other.pdf", size=300)

        res = auth_client.get(self.url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 2
        names = [d["original_name"] for d in res.data["results"]]
        assert "test1.pdf" in names
        assert "test2.pdf" in names

    def test_list_documents_constant_queries_and_no_summary_content(
        self, auth_client, user, django_assert_num_queries
    ):
        doc1 = Document.objects.create(
            user=user,
            original_name="doc1.pdf",
            size=100,
            status=Document.Status.DONE,
            extracted_text="Lots of extracted text...",
        )
        Summary.objects.create(document=doc1, content="Summary 1", ai_model_used="gemini")

        # 1 document: 1 auth user, 1 count, 1 list (with select_related)
        with django_assert_num_queries(3):
            res1 = auth_client.get(self.url)
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["count"] == 1
        item1 = res1.data["results"][0]
        assert "summary" not in item1
        assert item1["has_summary"] is True
        expected_fields = {
            "id",
            "original_name",
            "size",
            "page_count",
            "status",
            "error_message",
            "flashcard_generation_status",
            "has_summary",
            "created_at",
        }
        assert set(item1.keys()) == expected_fields

        # Create 4 more documents (some with summary, some without)
        for i in range(2, 6):
            doc = Document.objects.create(
                user=user,
                original_name=f"doc{i}.pdf",
                size=200,
                status=Document.Status.DONE,
                extracted_text="More extracted text...",
            )
            if i % 2 == 0:
                Summary.objects.create(
                    document=doc, content=f"Summary {i}", ai_model_used="gemini"
                )

        # 5 documents: query count must be identical (3: 1 auth, 1 count, 1 list)
        with django_assert_num_queries(3):
            res5 = auth_client.get(self.url)
        assert res5.status_code == status.HTTP_200_OK
        assert res5.data["count"] == 5
        for item in res5.data["results"]:
            assert "summary" not in item
            assert set(item.keys()) == expected_fields

    def test_retrieve_document_with_summary(self, auth_client, user):
        doc = Document.objects.create(
            user=user, original_name="test.pdf", size=100, status=Document.Status.DONE
        )
        Summary.objects.create(
            document=doc, content="This is a summary", ai_model_used="fake-model"
        )

        url = reverse("documents:document-detail", args=[doc.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["status"] == "DONE"
        assert res.data["summary"]["content"] == "This is a summary"

    def test_retrieve_unowned_document_returns_404(self, auth_client):
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(email="other@test.com", password="pwd")
        doc = Document.objects.create(user=other_user, original_name="other.pdf", size=300)

        url = reverse("documents:document-detail", args=[doc.id])
        res = auth_client.get(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_document(self, auth_client, user, valid_pdf):
        doc = Document.objects.create(user=user, original_name="test.pdf", size=100)

        url = reverse("documents:document-detail", args=[doc.id])
        res = auth_client.delete(url)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert not Document.objects.filter(id=doc.id).exists()

    @patch("apps.documents.tasks.process_document.delay")
    def test_retry_failed_document(
        self, mock_process, auth_client, user, django_capture_on_commit_callbacks
    ):
        doc = Document.objects.create(
            user=user,
            original_name="failed.pdf",
            size=100,
            status=Document.Status.FAILED,
            error_message="Previous error",
        )
        url = reverse("documents:document-retry", args=[doc.id])
        with django_capture_on_commit_callbacks(execute=True):
            res = auth_client.post(url)
        assert res.status_code == status.HTTP_202_ACCEPTED
        doc.refresh_from_db()
        assert doc.status == Document.Status.PROCESSING
        assert doc.error_message == ""
        assert doc.processing_started_at is not None
        mock_process.assert_called_once_with(str(doc.id))

    def test_retry_done_document_returns_400(self, auth_client, user):
        doc = Document.objects.create(
            user=user,
            original_name="done.pdf",
            size=100,
            status=Document.Status.DONE,
        )
        url = reverse("documents:document-retry", args=[doc.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data["code"] == "document_not_retryable"

    def test_retry_fresh_processing_document_returns_409(self, auth_client, user):
        from django.utils import timezone

        doc = Document.objects.create(
            user=user,
            original_name="processing.pdf",
            size=100,
            status=Document.Status.PROCESSING,
            processing_started_at=timezone.now(),
        )
        url = reverse("documents:document-retry", args=[doc.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_409_CONFLICT
        assert res.data["code"] == "document_processing"

    @patch("apps.documents.tasks.process_document.delay")
    def test_retry_stale_processing_document_returns_202(
        self, mock_process, auth_client, user, django_capture_on_commit_callbacks
    ):
        from datetime import datetime

        from freezegun import freeze_time

        with freeze_time("2026-10-25 10:00:00"):
            doc = Document.objects.create(
                user=user,
                original_name="stale.pdf",
                size=100,
                status=Document.Status.PROCESSING,
                processing_started_at=datetime(2026, 10, 25, 10, 0, 0, tzinfo=UTC),
            )

        # 11 minutes later: stale!
        with freeze_time("2026-10-25 10:11:00"):
            from rest_framework_simplejwt.tokens import RefreshToken

            refresh = RefreshToken.for_user(user)
            auth_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

            url = reverse("documents:document-retry", args=[doc.id])
            with django_capture_on_commit_callbacks(execute=True):
                res = auth_client.post(url)
            assert res.status_code == status.HTTP_202_ACCEPTED
            doc.refresh_from_db()
            assert doc.status == Document.Status.PROCESSING
            mock_process.assert_called_once_with(str(doc.id))

    def test_retry_other_users_document_returns_404(self, auth_client):
        from django.contrib.auth import get_user_model

        other_user = get_user_model().objects.create_user(
            email="other@example.com", password="Password123!"
        )
        doc = Document.objects.create(
            user=other_user,
            original_name="other.pdf",
            size=100,
            status=Document.Status.FAILED,
        )
        url = reverse("documents:document-retry", args=[doc.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_document_put_and_patch_return_405(self, auth_client, user):
        doc = Document.objects.create(
            user=user,
            original_name="doc.pdf",
            size=100,
            status=Document.Status.DONE,
        )
        url = reverse("documents:document-detail", args=[doc.id])
        res_put = auth_client.put(url, {"original_name": "renamed.pdf"}, format="json")
        assert res_put.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert res_put.data["code"] == "method_not_allowed"

        res_patch = auth_client.patch(url, {"original_name": "renamed.pdf"}, format="json")
        assert res_patch.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
        assert res_patch.data["code"] == "method_not_allowed"
