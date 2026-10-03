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
        
        is_completed = self.request.query_params.get("is_completed")
        if is_completed is not None:
            if is_completed.lower() == "true":
                qs = qs.filter(is_completed=True)
            elif is_completed.lower() == "false":
                qs = qs.filter(is_completed=False)
                
        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
            
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(due_at__date=date)
            
        from_date = self.request.query_params.get("from")
        if from_date:
            qs = qs.filter(due_at__gte=from_date)
            
        to_date = self.request.query_params.get("to")
        if to_date:
            qs = qs.filter(due_at__lte=to_date)
            
        return qs.order_by(F("due_at").asc(nulls_last=True), "-priority")
