import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from apps.documents.serializers import DocumentUploadSerializer


@pytest.mark.django_db
class TestUploadLimits:
    url = reverse("documents:document-list")

    def test_empty_file_rejected(self, auth_client):
        empty_file = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        res = auth_client.post(self.url, {"file": empty_file}, format="multipart")

        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "file" in res.data["errors"]

        empty_file2 = SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf")
        serializer = DocumentUploadSerializer(data={"file": empty_file2})
        assert not serializer.is_valid()
        assert serializer.errors["file"][0].code == "file_empty"

    def test_request_content_length_exceeds_max_body_size_returns_413(self, auth_client):
        content = b"%PDF-1.4\ncontent"
        pdf = SimpleUploadedFile("test.pdf", content, content_type="application/pdf")
        too_large_length = 12 * 1024 * 1024 + 1

        res = auth_client.post(
            self.url,
            {"file": pdf},
            format="multipart",
            CONTENT_LENGTH=str(too_large_length),
        )

        assert res.status_code == 413
        assert res.json() == {
            "detail": "Request body too large.",
            "code": "request_entity_too_large",
        }

    def test_file_exceeding_max_upload_size_rejected(self, auth_client):
        # 10 MB + 1 byte
        content = b"%PDF-1.4\n" + b"0" * (10 * 1024 * 1024 - 9 + 1)
        oversized_file = SimpleUploadedFile("too_big.pdf", content, content_type="application/pdf")

        res = auth_client.post(self.url, {"file": oversized_file}, format="multipart")

        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "file" in res.data["errors"]

        oversized_file2 = SimpleUploadedFile(
            "too_big.pdf", content, content_type="application/pdf"
        )
        serializer = DocumentUploadSerializer(data={"file": oversized_file2})
        assert not serializer.is_valid()
        assert serializer.errors["file"][0].code == "file_too_large"
