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

  it('renders task count', () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByText('10 tasks')).toBeTruthy();
  });

  it('renders a progress bar', () => {
    render(<ProjectCard project={base} />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows 0% progress when task_count is 0', () => {
    render(<ProjectCard project={{ ...base, task_count: 0 }} />);
    expect(screen.getByText('0 tasks')).toBeTruthy();
  });

  it('renders On Hold status correctly', () => {
    render(<ProjectCard project={{ ...base, status: 'on_hold' }} />);
    expect(screen.getByText('On Hold')).toBeTruthy();
  });
});
