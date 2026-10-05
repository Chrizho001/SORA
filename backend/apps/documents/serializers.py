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
            "error_message",
            "created_at",
            "updated_at",
        ]


class DocumentUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = ["id", "file", "original_name", "size", "status", "created_at"]
        read_only_fields = ["id", "original_name", "size", "status", "created_at"]

    def validate_file(self, value):
        if value.content_type != "application/pdf":
            raise serializers.ValidationError("Only PDF files are allowed.", code="invalid_file_type")
        
        # 10 MB limit
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB.", code="file_too_large")
            
        return value

    def create(self, validated_data):
        file = validated_data["file"]
        user = self.context["request"].user
        
        document = Document.objects.create(
            user=user,
            file=file,
            original_name=file.name,
            size=file.size,
            status=Document.Status.UPLOADED
        )
        return document
