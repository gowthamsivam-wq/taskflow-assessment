import type { Project, Task } from '@/types';

export const mockProjects: Project[] = [
  { id: 1, name: 'Customer Portal Redesign', description: 'Redesign the customer portal.', status: 'active', created_at: '2026-01-10T10:00:00Z', updated_at: '2026-06-01T10:00:00Z', task_count: 8, completed_task_count: 5 },
  { id: 2, name: 'Mobile Payments SDK', description: 'Build a mobile payments SDK.', status: 'completed', created_at: '2025-11-01T10:00:00Z', updated_at: '2026-05-20T10:00:00Z', task_count: 5, completed_task_count: 5 },
  { id: 3, name: 'Data Pipeline v2', description: 'Upgrade the data pipeline.', status: 'on_hold', created_at: '2026-02-15T10:00:00Z', updated_at: '2026-06-10T10:00:00Z', task_count: 12, completed_task_count: 3 },
  { id: 4, name: 'API Gateway Upgrade', description: 'Upgrade the API gateway.', status: 'active', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-06-20T10:00:00Z', task_count: 3, completed_task_count: 1 },
  { id: 5, name: 'Analytics Dashboard', description: 'Build analytics dashboard.', status: 'archived', created_at: '2025-09-01T10:00:00Z', updated_at: '2025-12-01T10:00:00Z', task_count: 0, completed_task_count: 0 },
  { id: 6, name: 'Auth Service Migration', description: 'Migrate to new auth service.', status: 'active', created_at: '2026-04-01T10:00:00Z', updated_at: '2026-06-28T10:00:00Z', task_count: 7, completed_task_count: 2 },
];

export const mockTasks: Task[] = [
  { id: 1, title: 'Implement login flow', project: 1, assignee: 'Alice Nguyen', priority: 3, priority_display: 'High', due_date: '2026-07-15', is_complete: false },
  { id: 2, title: 'Write unit tests', project: 1, assignee: 'Bob Martínez', priority: 2, priority_display: 'Medium', due_date: '2026-07-20', is_complete: true },
  { id: 3, title: 'Setup CI pipeline', project: 4, assignee: 'Carol Singh', priority: 4, priority_display: 'Critical', due_date: '2026-07-01', is_complete: false },
  { id: 4, title: 'Refactor database schema', project: 3, assignee: 'David Okafor', priority: 1, priority_display: 'Low', due_date: '2026-08-01', is_complete: false },
];
