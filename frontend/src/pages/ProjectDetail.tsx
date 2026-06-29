import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProject, fetchProjectSummary } from '../api/projects';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading: projLoading, isError: projError } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !isNaN(projectId),
  });

  const { data: summary } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => fetchProjectSummary(projectId),
    enabled: !isNaN(projectId),
  });

  if (projLoading) return <p className="text-gray-500 text-sm">Loading project…</p>;
  if (projError || !project) return <p className="text-red-600 text-sm">Project not found.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
      <p className="text-gray-600 text-sm mb-6">{project.description}</p>

      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{summary.total_tasks}</p>
            <p className="text-sm text-gray-500 mt-1">Total Tasks</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{summary.completed_tasks}</p>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </div>
        </div>
      )}
    </div>
  );
}
