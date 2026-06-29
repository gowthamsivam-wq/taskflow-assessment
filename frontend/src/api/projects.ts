import type { PaginatedResponse, Project, ProjectSummary, Task } from '../types';
import client from './client';

export const fetchProjects = (params?: Record<string, string>) =>
  client.get<PaginatedResponse<Project>>('/projects/', { params }).then((r) => r.data);

export const fetchProject = (id: number) =>
  client.get<Project>(`/projects/${id}/`).then((r) => r.data);

export const fetchProjectSummary = (id: number) =>
  client.get<ProjectSummary>(`/projects/${id}/summary/`).then((r) => r.data);

export const fetchTasks = (params?: Record<string, string | number | boolean>) =>
  client.get<PaginatedResponse<Task>>('/tasks/', { params }).then((r) => r.data);

export const updateTask = (id: number, data: Partial<Task>) =>
  client.patch<Task>(`/tasks/${id}/`, data).then((r) => r.data);
