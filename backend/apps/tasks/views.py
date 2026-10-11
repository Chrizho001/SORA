from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import F
from apps.tasks.models import Task
from apps.tasks.serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Task.objects.filter(user=self.request.user)
        
        from apps.tasks.serializers import TaskQuerySerializer
        serializer = TaskQuerySerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        
        if "is_completed" in self.request.query_params and "is_completed" in validated:
            qs = qs.filter(is_completed=validated["is_completed"])
                
        if "priority" in validated:
            qs = qs.filter(priority=validated["priority"])
            
        if "date" in validated:
            qs = qs.filter(due_at__date=validated["date"])
            
        if "from" in validated:
            qs = qs.filter(due_at__gte=validated["from"])
            
        if "to" in validated:
            qs = qs.filter(due_at__lte=validated["to"])
            
        return qs.order_by(F("due_at").asc(nulls_last=True), "-priority")
