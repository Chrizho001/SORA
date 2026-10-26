from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import F
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.tasks.models import Task
from apps.tasks.serializers import TaskQuerySerializer, TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = Task.objects.filter(user=self.request.user)

        serializer = TaskQuerySerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        if "is_completed" in self.request.query_params and "is_completed" in validated:
            qs = qs.filter(is_completed=validated["is_completed"])

        if "priority" in validated:
            qs = qs.filter(priority=validated["priority"])

        if "date" in validated:
            tz_str = validated.get("tz") or "UTC"
            start = datetime.combine(validated["date"], time.min, tzinfo=ZoneInfo(tz_str))
            end = start + timedelta(days=1)
            qs = qs.filter(due_at__gte=start, due_at__lt=end)

        if "from" in validated:
            qs = qs.filter(due_at__gte=validated["from"])

        if "to" in validated:
            qs = qs.filter(due_at__lte=validated["to"])

        return qs.order_by(F("due_at").asc(nulls_last=True), "-priority")
