from django.db.models import Count, Max, Q, ExpressionWrapper, FloatField
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import TaskFilter
from .models import Project, Task
from .serializers import ProjectSerializer, ProjectSummarySerializer, TaskSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    ordering_fields = ['name', 'status', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Project.objects.annotate(
            task_count=Count('tasks'),
            completed_task_count=Count('tasks', filter=Q(tasks__is_complete=True)),
            latest_due=Max('tasks__due_date'),
        )

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        project = self.get_object()
        aggregates = project.tasks.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(is_complete=True)),
        )
        data = {
            'project_id': project.pk,
            'name': project.name,
            'total_tasks': aggregates['total'],
            'completed_tasks': aggregates['completed'],
        }
        serializer = ProjectSummarySerializer(data)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    filterset_class = TaskFilter
    ordering_fields = ['priority', 'due_date', 'is_complete', 'title']
    ordering = ['-priority', 'due_date']

    def get_queryset(self):
        # select_related avoids an N+1 when the serializer or admin accesses task.project.name
        return Task.objects.select_related('project')
