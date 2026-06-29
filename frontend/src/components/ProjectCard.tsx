import type { Project, ProjectStatus } from '@/types';

interface ProjectCardProps {
  project: Project;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: 'bg-green-100 text-green-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const progress =
    project.task_count > 0
      ? Math.round((project.completed_task_count / project.task_count) * 100)
      : 0;

  return (
    <article className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 leading-snug">{project.name}</h2>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[project.status]}`}
          aria-label={`Status: ${STATUS_LABEL[project.status]}`}
        >
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{project.completed_task_count}/{project.task_count} tasks done</span>
          <span>{progress}% complete</span>
        </div>
        <div
          className="h-1.5 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}
