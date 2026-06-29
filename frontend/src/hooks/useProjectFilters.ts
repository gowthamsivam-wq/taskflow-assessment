import { useMemo } from 'react';
import { useFilterStore } from '@/store/filterStore';
import type { Project } from '@/types';

export function useProjectFilters(projects: Project[]): Project[] {
  const { status, search } = useFilterStore();

  return useMemo(
    () =>
      projects.filter((p) => {
        const matchesStatus = status === 'all' || p.status === status;
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [projects, status, search],
  );
}
