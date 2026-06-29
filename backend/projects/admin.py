from django.contrib import admin

from .models import Project, Task


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'assignee', 'priority', 'due_date', 'is_complete')
    list_filter = ('priority', 'is_complete', 'project', 'due_date')
    search_fields = ('title', 'assignee')
    list_select_related = ('project',)
    date_hierarchy = 'due_date'
