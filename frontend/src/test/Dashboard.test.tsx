/**
 * Tests covering:
 * - Bug #1: useEffect missing dependency array → infinite re-renders
 *   (validated by checking that the API is called exactly once on mount)
 * - Bug #2: filter function mutating state array instead of returning new array
 *   (validated by confirming filter changes re-render the UI correctly)
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import * as projectsApi from '../api/projects';
import { useFilterStore } from '../store/filterStore';

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Dashboard', () => {
  // Zustand is a singleton — reset filter state before every test so tests don't bleed into each other
  beforeEach(() => useFilterStore.getState().reset());
  // ── Bug #1: Missing dependency array in useEffect ─────────────────────────
  it('fetches projects exactly once on mount (no infinite re-render loop)', async () => {
    const spy = vi.spyOn(projectsApi, 'fetchProjects');
    renderDashboard();

    await waitFor(() => expect(screen.queryByText('Customer Portal Redesign')).toBeTruthy());

    // If the dependency array were missing, fetchProjects would be called many more times.
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  // ── Bug #2: Filter mutating state instead of returning new array ───────────
  it('filters projects by status without mutating the original list', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Customer Portal Redesign')).toBeTruthy());

    // Initial: all 6 projects visible
    expect(screen.getAllByRole('article').length).toBe(6);

    // Filter to 'active' — must update correctly
    fireEvent.click(screen.getByRole('button', { name: /^Active$/ }));
    await waitFor(() => {
      const cards = screen.getAllByRole('article');
      // active projects in mock data: ids 1, 4, 6
      expect(cards.length).toBe(3);
    });

    // Switch back to 'All' — original list must be intact (no mutation)
    fireEvent.click(screen.getByRole('button', { name: /^All$/ }));
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(6);
    });
  });

  it('filters projects by search term', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Customer Portal Redesign')).toBeTruthy());

    await user.type(screen.getByRole('searchbox'), 'Mobile');
    expect(screen.getAllByRole('article').length).toBe(1);
    expect(screen.getByText('Mobile Payments SDK')).toBeTruthy();
  });

  it('shows empty state when no projects match', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Customer Portal Redesign')).toBeTruthy());

    await user.type(screen.getByRole('searchbox'), 'xyznonexistent');
    expect(screen.getByText('No projects found')).toBeTruthy();
  });

  it('shows skeleton cards while loading', () => {
    // Projects query is pending — skeleton must render
    vi.spyOn(projectsApi, 'fetchProjects').mockReturnValue(new Promise(() => {}));
    const { container } = renderDashboard();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('shows error state when fetch fails', async () => {
    vi.spyOn(projectsApi, 'fetchProjects').mockRejectedValue(new Error('network'));
    renderDashboard();
    await waitFor(() =>
      expect(screen.getByText(/Failed to load projects/i)).toBeTruthy(),
    );
    vi.restoreAllMocks();
  });
});
