import django_filters

from .models import Task


class TaskFilter(django_filters.FilterSet):
    project = django_filters.NumberFilter(field_name='project__id')
    priority = django_filters.NumberFilter(field_name='priority')
    is_complete = django_filters.BooleanFilter(field_name='is_complete')

    class Meta:
        model = Task
        fields = ['project', 'priority', 'is_complete']
