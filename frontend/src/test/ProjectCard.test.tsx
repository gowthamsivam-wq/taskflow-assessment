import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProjectCard from '../components/ProjectCard';
import type { Project } from '../types';

const base: Project = {
  id: 1,
  name: 'Test Project',
  description: 'A test project description.',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
  task_count: 10,
  completed_task_count: 4,
};

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText('Test Project')).toBeTruthy();
  });

  it('renders status badge', () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('renders completed/total task count', () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText('4/10 tasks done')).toBeTruthy();
  });

  it('renders a progress bar with correct percentage', () => {
    render(<ProjectCard project={base} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('40');
  });

  it('shows 0% progress when task_count is 0', () => {
    render(<ProjectCard project={{ ...base, task_count: 0, completed_task_count: 0 }} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('renders On Hold status correctly', () => {
    render(<ProjectCard project={{ ...base, status: 'on_hold' }} />);
    expect(screen.getByText('On Hold')).toBeTruthy();
  });
});
