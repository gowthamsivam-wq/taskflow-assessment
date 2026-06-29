import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, fetchTasks, updateTask } from '@/api/projects';
import { useFilterStore } from '@/store/filterStore';
import { useProjectFilters } from '@/hooks/useProjectFilters';
import ProjectCard from '@/components/ProjectCard';
import ProjectCardSkeleton from '@/components/ProjectCardSkeleton';
import Modal from '@/components/Modal';
import type { ProjectStatus, Task } from '@/types';

const STATUS_FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

export default function Dashboard() {
  const { pathname } = useLocation();
  const pageTitle = pathname === '/projects' ? 'Projects' : 'Dashboard';

  // Client UI state lives in Zustand — persists across navigations without re-fetching
  const { status, search, setStatus, setSearch } = useFilterStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const queryClient = useQueryClient();

  const { data: projectsPage, isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(),
  });

  const { data: tasksPage } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchTasks(),
  });

  // Optimistic toggle — update the cache immediately, roll back on error
  const toggleTask = useMutation({
    mutationFn: (task: Task) => updateTask(task.id, { is_complete: !task.is_complete }),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshot = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], (old: typeof tasksPage) =>
        old
          ? {
              ...old,
              results: old.results.map((t) =>
                t.id === task.id ? { ...t, is_complete: !t.is_complete } : t,
              ),
            }
          : old,
      );
      return { snapshot };
    },
    onError: (_err, _task, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(['tasks'], ctx.snapshot);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const projects = projectsPage?.results ?? [];
  const tasks = tasksPage?.results ?? [];

  // Filtering is handled by the Zustand-backed custom hook — no derived state, no mutation risk
  const filtered = useProjectFilters(projects);

  if (projectsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600 text-sm">Failed to load projects. Please try again.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{pageTitle}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56"
          aria-label="Search projects"
        />
        <div className="flex gap-1" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Project grid */}
      {projectsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-lg">No projects found</p>
          <p className="text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {/* Tasks section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {tasks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No tasks yet.</p>
          ) : (
            tasks.slice(0, 10).map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={task.is_complete}
                  onChange={() => toggleTask.mutate(task)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 cursor-pointer"
                  aria-label={`Mark "${task.title}" as ${task.is_complete ? 'incomplete' : 'complete'}`}
                />
                <button
                  onClick={() => setSelectedTask(task)}
                  className={`flex-1 text-left text-sm ${task.is_complete ? 'line-through text-gray-400' : 'text-gray-800'} hover:text-indigo-600 transition-colors`}
                >
                  {task.title}
                </button>
                <span className="text-xs text-gray-400">{task.assignee}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Task detail modal */}
      <Modal
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title ?? ''}
        footer={
          <>
            <button
              onClick={() => setSelectedTask(null)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (selectedTask) toggleTask.mutate(selectedTask);
                setSelectedTask(null);
              }}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {selectedTask?.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
            </button>
          </>
        }
      >
        <dl className="space-y-2 text-sm">
          <div><dt className="font-medium text-gray-700">Assignee</dt><dd className="text-gray-600">{selectedTask?.assignee}</dd></div>
          <div><dt className="font-medium text-gray-700">Priority</dt><dd className="text-gray-600">{selectedTask?.priority_display}</dd></div>
          <div><dt className="font-medium text-gray-700">Due Date</dt><dd className="text-gray-600">{selectedTask?.due_date ?? '—'}</dd></div>
          <div><dt className="font-medium text-gray-700">Status</dt><dd className="text-gray-600">{selectedTask?.is_complete ? 'Complete' : 'Incomplete'}</dd></div>
        </dl>
      </Modal>
    </div>
  );
}
