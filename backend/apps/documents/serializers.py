from rest_framework import serializers

from apps.documents.models import Document, Summary


class SummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Summary
        fields = ["id", "content", "ai_model_used", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    summary = SummarySerializer(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "original_name",
            "size",
            "page_count",
            "status",
            "flashcard_generation_status",
            "error_message",
            "created_at",
            "updated_at",
            "summary",
        ]
        read_only_fields = [
            "id",
            "original_name",
            "size",
            "page_count",
            "status",
            "flashcard_generation_status",
            "error_message",
            "created_at",
            "updated_at",
        ]


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, allow_empty_file=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "file",
            "original_name",
            "size",
            "status",
            "flashcard_generation_status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "original_name",
            "size",
            "status",
            "flashcard_generation_status",
            "created_at",
        ]

    def validate_file(self, value):
        from django.conf import settings

        if value.size == 0:
            raise serializers.ValidationError("File cannot be empty.", code="file_empty")

        if value.content_type != "application/pdf":
            raise serializers.ValidationError(
                "Only PDF files are allowed.", code="invalid_file_type"
            )

        # Check PDF header
        header = value.read(5)
        if header != b"%PDF-":
            raise serializers.ValidationError(
                "Only PDF files are allowed.", code="invalid_file_type"
            )
        value.seek(0)

        max_upload_size = getattr(settings, "MAX_UPLOAD_SIZE", 10 * 1024 * 1024)
        if value.size > max_upload_size:
            raise serializers.ValidationError(
                "File size cannot exceed 10MB.", code="file_too_large"
            )

        return value

    def create(self, validated_data):
        file = validated_data["file"]
        user = self.context["request"].user

        document = Document.objects.create(
            user=user,
            file=file,
            original_name=file.name,
            size=file.size,
            status=Document.Status.UPLOADED,
        )
        return document
