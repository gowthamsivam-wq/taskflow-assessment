export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export type TaskPriority = 1 | 2 | 3 | 4;

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  task_count: number;
  completed_task_count: number;
}

export interface Task {
  id: number;
  title: string;
  project: number;
  assignee: string;
  priority: TaskPriority;
  priority_display: string;
  due_date: string | null;
  is_complete: boolean;
}

export interface ProjectSummary {
  project_id: number;
  name: string;
  total_tasks: number;
  completed_tasks: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
