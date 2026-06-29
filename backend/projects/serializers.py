from rest_framework import serializers

from .models import Project, Task


class TaskSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'project', 'assignee', 'priority', 'priority_display',
            'due_date', 'is_complete',
        ]

    def validate_priority(self, value):
        valid = {choice[0] for choice in Task.Priority.choices}
        if value not in valid:
            raise serializers.ValidationError(
                f"Priority must be one of {sorted(valid)} (integer values)."
            )
        return value


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True, default=0)
    completed_task_count = serializers.IntegerField(read_only=True, default=0)
    latest_due = serializers.DateField(read_only=True, allow_null=True, default=None)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'status',
            'created_at', 'updated_at',
            'task_count', 'completed_task_count', 'latest_due',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ProjectSummarySerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    name = serializers.CharField()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
