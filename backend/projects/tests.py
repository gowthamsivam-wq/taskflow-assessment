from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Project, Task


# ─── Model smoke tests ────────────────────────────────────────────────────────

class ProjectModelTest(TestCase):
    def test_str(self):
        p = Project(name='Alpha')
        self.assertEqual(str(p), 'Alpha')

    def test_default_status_is_active(self):
        p = Project.objects.create(name='Beta')
        self.assertEqual(p.status, Project.Status.ACTIVE)


class TaskModelTest(TestCase):
    def setUp(self):
        self.project = Project.objects.create(name='TestProj')

    def test_str(self):
        t = Task(title='Do something', project=self.project)
        self.assertEqual(str(t), 'Do something')

    def test_default_priority_is_medium(self):
        t = Task.objects.create(title='T', project=self.project)
        self.assertEqual(t.priority, Task.Priority.MEDIUM)


# ─── API: Projects ────────────────────────────────────────────────────────────

class ProjectAPITest(APITestCase):
    def setUp(self):
        self.project = Project.objects.create(name='Proj1', status='active')

    def test_list_projects(self):
        url = reverse('project-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('results', resp.data)

    def test_create_project(self):
        url = reverse('project-list')
        resp = self.client.post(url, {'name': 'NewProj', 'status': 'active'})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['name'], 'NewProj')

    def test_project_summary_endpoint(self):
        Task.objects.create(title='T1', project=self.project, is_complete=True)
        Task.objects.create(title='T2', project=self.project, is_complete=False)
        url = reverse('project-summary', kwargs={'pk': self.project.pk})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['total_tasks'], 2)
        self.assertEqual(resp.data['completed_tasks'], 1)
        self.assertEqual(resp.data['name'], 'Proj1')


# ─── API: Tasks ───────────────────────────────────────────────────────────────

class TaskAPITest(APITestCase):
    def setUp(self):
        self.project = Project.objects.create(name='P1')
        self.task = Task.objects.create(
            title='Task A', project=self.project, priority=Task.Priority.HIGH
        )

    def test_list_tasks(self):
        url = reverse('task-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_filter_by_project(self):
        other = Project.objects.create(name='P2')
        Task.objects.create(title='Other', project=other)
        url = reverse('task-list') + f'?project={self.project.pk}'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(t['project'] == self.project.pk for t in resp.data['results']))

    def test_filter_by_is_complete(self):
        Task.objects.create(title='Done', project=self.project, is_complete=True)
        url = reverse('task-list') + '?is_complete=true'
        resp = self.client.get(url)
        self.assertTrue(all(t['is_complete'] for t in resp.data['results']))

    # ── Bug #1: missing FK validation ─────────────────────────────────────────
    def test_create_task_with_nonexistent_project_returns_400(self):
        """
        Without validate_project() in TaskSerializer, DRF would raise an IntegrityError
        (500) instead of a clean 400.  This test verifies the serializer catches it.
        """
        url = reverse('task-list')
        resp = self.client.post(url, {
            'title': 'Ghost Task',
            'project': 99999,
            'priority': Task.Priority.LOW,
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Bug #2: icontains on IntegerField ─────────────────────────────────────
    def test_filter_priority_by_integer_not_string_lookup(self):
        """
        Using icontains on an IntegerField causes a DB error ('invalid input syntax
        for type integer').  The TaskFilter uses NumberFilter (exact integer match)
        so this must return 200, not 500.
        """
        url = reverse('task-list') + f'?priority={Task.Priority.HIGH}'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(all(t['priority'] == Task.Priority.HIGH for t in resp.data['results']))


# ─── ORM: annotate / select_related ──────────────────────────────────────────

class OrmQueryTest(TestCase):
    def setUp(self):
        self.p1 = Project.objects.create(name='Alpha')
        self.p2 = Project.objects.create(name='Beta')
        Task.objects.create(title='A1', project=self.p1, is_complete=True)
        Task.objects.create(title='A2', project=self.p1)
        Task.objects.create(title='B1', project=self.p2)

    def test_annotate_task_count_single_query(self):
        from django.db import connection
        from django.db.models import Count, Max
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            qs = list(
                Project.objects.annotate(
                    task_count=Count('tasks'),
                    latest_due=Max('tasks__due_date'),
                )
            )
        self.assertEqual(len(ctx), 1, "Expected a single query using annotate, got N+1")
        self.assertEqual(qs[0].task_count + qs[1].task_count, 3)

    def test_select_related_avoids_n_plus_1(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            tasks = list(Task.objects.select_related('project'))
            _ = [t.project.name for t in tasks]

        self.assertEqual(len(ctx), 1, "select_related should fetch tasks + projects in one JOIN")
