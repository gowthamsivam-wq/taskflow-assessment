import { create } from 'zustand';
import type { ProjectStatus } from '../types';

interface FilterState {
  status: ProjectStatus | 'all';
  search: string;
  setStatus: (status: ProjectStatus | 'all') => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  status: 'all',
  search: '',
  setStatus: (status) => set({ status }),
  setSearch: (search) => set({ search }),
  reset: () => set({ status: 'all', search: '' }),
}));
