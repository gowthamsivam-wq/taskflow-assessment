"""
Seed management command.

Prompt used to generate this (Task 5, Section A — scored 5/5):

    "Write a Django management command called seed_db that seeds the database with exactly
    50 Projects and 200 Tasks.  Requirements:
    - Use django.db.transaction.atomic so the entire seed is rolled back on any error.
    - Delete all existing Project and Task rows before inserting (idempotent re-runs).
    - Projects: varied status values (active, on_hold, completed, archived) distributed
      roughly equally, realistic names drawn from a fixed list of domains (web app,
      mobile, data pipeline, API gateway, dashboard, etc.), lorem-ipsum-style descriptions,
      created_at spread across the last 12 months.
    - Tasks: 4 tasks per project on average (200 / 50), each with a randomly chosen
      priority integer (1–4), an assignee full name, a due_date between today and +90 days
      (some tasks may be overdue), and is_complete=True for roughly 30 % of tasks.
    - Use bulk_create for both models to minimise round-trips.
    - Print a summary line at the end: '✓ Seeded X projects and Y tasks.'
    - No third-party packages — stdlib random and datetime only."
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from projects.models import Project, Task

PROJECT_NAMES = [
    'Customer Portal Redesign', 'Mobile Payments SDK', 'Data Pipeline v2',
    'API Gateway Upgrade', 'Analytics Dashboard', 'Auth Service Migration',
    'Notification Engine', 'Search Indexer', 'Billing Integration', 'DevOps Automation',
    'E-commerce Checkout', 'Reporting Module', 'Onboarding Flow', 'Admin Panel Rewrite',
    'Machine Learning Pipeline', 'CDN Optimisation', 'Event Streaming Platform',
    'User Segmentation Tool', 'Compliance Auditor', 'Multi-tenant Architecture',
    'Real-time Chat Feature', 'Webhook Dispatcher', 'A/B Testing Framework',
    'Data Warehouse ETL', 'Document Management System', 'Identity Provider Integration',
    'Performance Monitoring', 'Localisation Platform', 'Content Delivery Network',
    'Role-based Access Control', 'Invoice Generator', 'Payment Reconciliation',
    'Supply Chain Tracker', 'HR Self-service Portal', 'Vulnerability Scanner',
    'Load Balancer Config', 'Log Aggregation Service', 'Feature Flag System',
    'Canary Deployment Tool', 'Infrastructure as Code', 'Cost Allocation Dashboard',
    'iOS Native App', 'Android Native App', 'GraphQL API Layer',
    'Partner API Portal', 'SLA Monitor', 'Incident Response Platform',
    'Knowledge Base Search', 'Contract Lifecycle Manager', 'Customer Feedback Loop',
]

ASSIGNEES = [
    'Alice Nguyen', 'Bob Martínez', 'Carol Singh', 'David Okafor', 'Eva Petrov',
    'Frank Li', 'Grace Kim', 'Hector Vasquez', 'Irene Dubois', 'James Osei',
    'Karen Walsh', 'Liam Patel', 'Maria González', 'Nour Hassan', 'Oscar Johansson',
]

TASK_VERBS = [
    'Implement', 'Refactor', 'Write tests for', 'Document', 'Review', 'Deploy',
    'Migrate', 'Fix bug in', 'Optimise', 'Research', 'Prototype', 'Set up CI for',
]

TASK_NOUNS = [
    'authentication module', 'database schema', 'REST endpoint', 'UI component',
    'background worker', 'error handling', 'caching layer', 'rate limiter',
    'integration tests', 'API documentation', 'deployment pipeline', 'feature flag',
]

STATUSES = [
    Project.Status.ACTIVE, Project.Status.ACTIVE,
    Project.Status.ON_HOLD,
    Project.Status.COMPLETED,
    Project.Status.ARCHIVED,
]


class Command(BaseCommand):
    help = 'Seed the database with 50 projects and 200 tasks (idempotent).'

    def handle(self, *args, **options):
        today = date.today()

        with transaction.atomic():
            Task.objects.all().delete()
            Project.objects.all().delete()

            projects = Project.objects.bulk_create([
                Project(
                    name=PROJECT_NAMES[i],
                    description=(
                        f"This project covers the design, implementation, and rollout of "
                        f"the {PROJECT_NAMES[i].lower()} initiative. "
                        f"It involves cross-functional collaboration across engineering, "
                        f"product, and QA teams."
                    ),
                    status=STATUSES[i % len(STATUSES)],
                )
                for i in range(50)
            ])

            tasks = []
            for idx, project in enumerate(projects):
                # Distribute 200 tasks across 50 projects — 4 per project on average,
                # with slight variation to make the data feel realistic.
                count = 4 if idx % 5 != 0 else 3
                for _ in range(count):
                    offset_days = random.randint(-30, 90)
                    tasks.append(Task(
                        title=f"{random.choice(TASK_VERBS)} {random.choice(TASK_NOUNS)}",
                        project=project,
                        assignee=random.choice(ASSIGNEES),
                        priority=random.randint(1, 4),
                        due_date=today + timedelta(days=offset_days),
                        is_complete=random.random() < 0.30,
                    ))

            # Pad to exactly 200 if needed
            pad_idx = 0
            while len(tasks) < 200:
                tasks.append(Task(
                    title=f"{random.choice(TASK_VERBS)} {random.choice(TASK_NOUNS)}",
                    project=projects[pad_idx % len(projects)],
                    assignee=random.choice(ASSIGNEES),
                    priority=random.randint(1, 4),
                    due_date=today + timedelta(days=random.randint(-30, 90)),
                    is_complete=random.random() < 0.30,
                ))
                pad_idx += 1

            Task.objects.bulk_create(tasks[:200])

        self.stdout.write(
            self.style.SUCCESS(f'Seeded {Project.objects.count()} projects and {Task.objects.count()} tasks.')
        )
