from rest_framework import serializers
from apps.tasks.models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "due_at",
            "priority",
            "is_completed",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        return Task.objects.create(user=user, **validated_data)

class TaskQuerySerializer(serializers.Serializer):
    is_completed = serializers.BooleanField(required=False)
    priority = serializers.ChoiceField(choices=Task.Priority.choices, required=False)
    date = serializers.DateField(required=False)

    def get_fields(self):
        fields = super().get_fields()
        fields["from"] = serializers.DateTimeField(required=False)
        fields["to"] = serializers.DateTimeField(required=False)
        return fields
