import { http, HttpResponse } from 'msw';
import { mockProjects, mockTasks } from './data';
import type { Task } from '@/types';

const BASE = 'http://localhost:8001/api';

// In-memory stores so mutations are reflected within the same session
let projects = [...mockProjects];
let tasks = [...mockTasks];

export const handlers = [
  http.get(`${BASE}/projects/`, () =>
    HttpResponse.json({ count: projects.length, next: null, previous: null, results: projects }),
  ),

  http.get(`${BASE}/projects/:id/`, ({ params }) => {
    const p = projects.find((p) => p.id === Number(params.id));
    return p ? HttpResponse.json(p) : new HttpResponse(null, { status: 404 });
  }),

  http.get(`${BASE}/projects/:id/summary/`, ({ params }) => {
    const p = projects.find((p) => p.id === Number(params.id));
    if (!p) return new HttpResponse(null, { status: 404 });
    const projectTasks = tasks.filter((t) => t.project === p.id);
    return HttpResponse.json({
      project_id: p.id,
      name: p.name,
      total_tasks: projectTasks.length,
      completed_tasks: projectTasks.filter((t) => t.is_complete).length,
    });
  }),

  http.get(`${BASE}/tasks/`, () =>
    HttpResponse.json({ count: tasks.length, next: null, previous: null, results: tasks }),
  ),

  http.patch(`${BASE}/tasks/:id/`, async ({ params, request }) => {
    const body = (await request.json()) as Partial<Task>;
    const idx = tasks.findIndex((t) => t.id === Number(params.id));
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    tasks[idx] = { ...tasks[idx], ...body };
    return HttpResponse.json(tasks[idx]);
  }),
];
