import pytest
from django.urls import reverse
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.documents.models import Document, Summary
from unittest.mock import patch
import apps.documents.tasks

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
    def test_upload_valid_pdf(self, mock_process, auth_client, user, valid_pdf):
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

    def test_upload_non_pdf_fails(self, auth_client, text_file):
        res = auth_client.post(self.url, {"file": text_file}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed." in res.data["errors"]["file"]

    def test_upload_large_pdf_fails(self, auth_client, large_pdf):
        res = auth_client.post(self.url, {"file": large_pdf}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "File size cannot exceed 10MB." in res.data["errors"]["file"]

    def test_upload_fake_pdf_fails(self, auth_client):
        fake_pdf = SimpleUploadedFile("fake.pdf", b"this is not a pdf file", content_type="application/pdf")
        res = auth_client.post(self.url, {"file": fake_pdf}, format="multipart")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed." in res.data["errors"]["file"]

    def test_list_documents(self, auth_client, user):
        doc1 = Document.objects.create(user=user, original_name="test1.pdf", size=100)
        doc2 = Document.objects.create(user=user, original_name="test2.pdf", size=200)

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

    def test_retrieve_document_with_summary(self, auth_client, user):
        doc = Document.objects.create(user=user, original_name="test.pdf", size=100, status=Document.Status.DONE)
        Summary.objects.create(document=doc, content="This is a summary", ai_model_used="fake-model")

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
    def test_retry_failed_document(self, mock_process, auth_client, user):
        doc = Document.objects.create(
            user=user, original_name="failed.pdf", size=100,
            status=Document.Status.FAILED, error_message="Previous error"
        )
        url = reverse("documents:document-retry", args=[doc.id])
        res = auth_client.post(url)
        assert res.status_code == status.HTTP_202_ACCEPTED
        doc.refresh_from_db()
        assert doc.status == Document.Status.PROCESSING
        assert doc.error_message == ""
        mock_process.assert_called_once_with(str(doc.id))
