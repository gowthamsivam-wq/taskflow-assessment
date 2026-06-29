# TaskFlow — AI-Assisted Engineering Assessment

Full-stack project covering **Section A (Python/Django)** and **Section B (React/Vite)** of the coding assessment. Built with Cursor IDE + Claude AI, showcasing how I prompt, validate, and iterate on AI-generated output.

---

## Repository Layout

```
taskflow-assessment/
├── backend/    # Django 5 + DRF + PostgreSQL  (Section A)
└── frontend/   # React 19 + Vite + TypeScript  (Section B)
```

---

## Section A — Python/Django Backend

**Stack:** Python 3.11, Django 5.1, Django REST Framework 3.17, django-filter, django-cors-headers, psycopg v3, PostgreSQL

### Setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
createdb taskflow
python manage.py migrate
python manage.py seed_db        # seeds 50 projects + 200 tasks
python manage.py runserver
python manage.py test projects  # 14 tests, all pass
```

Copy `backend/.env.example` to `backend/.env` and fill in values for non-local environments.

### API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/projects/` | List (paginated, 20/page) or create projects |
| GET/PUT/PATCH/DELETE | `/api/projects/{id}/` | Retrieve / update / delete a project |
| GET | `/api/projects/{id}/summary/` | Name, total tasks, completed count |
| GET/POST | `/api/tasks/` | List (filtered) or create tasks |
| GET/PUT/PATCH/DELETE | `/api/tasks/{id}/` | Retrieve / update / delete a task |

**Task query filters:** `?project=<id>`, `?priority=<1-4>`, `?is_complete=true|false`  
**Ordering:** `?ordering=priority`, `?ordering=-due_date`, etc.

---

## Task-by-Task Walkthrough (Section A)

### Task 1 — Project Scaffolding

**Prompt used:**
> "Scaffold a Django 5 project called taskflow with a single app called projects. Include these models: Project (name CharField 255, description TextField blank, status TextChoices [active/on_hold/completed/archived] default active, created_at auto_now_add, updated_at auto_now) and Task (title CharField 255, project ForeignKey→Project CASCADE related_name=tasks, assignee CharField 255 blank, priority IntegerChoices [1 Low / 2 Medium / 3 High / 4 Critical] — use IntegerField not CharField so database-level integer filtering works correctly, due_date DateField null+blank, is_complete BooleanField default False). Generate 0001_initial migration. Register both in admin with list_display showing key fields, list_filter for status/priority/is_complete, and search_fields."

**What I validated:** Read the generated migration to verify field types and constraints before running `migrate`. Confirmed `priority` is `IntegerField` (critical for Task 3 Bug #2).

---

### Task 2 — REST API

**Design decisions:**
- `ProjectViewSet.get_queryset()` annotates `task_count`, `completed_task_count`, and `latest_due` — all three in a single query, no extra round-trips.
- `TaskSerializer` deliberately returns `project` as a flat ID (not a nested object). Nesting the full `ProjectSerializer` would waste bandwidth on list endpoints where only the ID is needed; callers that need project detail hit `/api/projects/{id}/` directly. The `priority_display` field uses `source='get_priority_display'` to surface the human-readable label alongside the integer value without a separate query.
- `TaskFilter` uses `django_filters.NumberFilter` for `priority` (exact integer match) — not `CharFilter` or `icontains`.
- `@action(detail=True, url_path='summary')` on `ProjectViewSet` handles `GET /api/projects/{id}/summary/` cleanly without a standalone view.
- Page size 20 and ordering support set globally in `REST_FRAMEWORK`.

**Endpoints verified after generation** using the DRF browseable API at `http://localhost:8001/api/` and curl spot-checks for the filter combinations (`?priority=3&is_complete=false`) and the `/summary/` action.

---

### Task 3 — Debug & Refactor (Bug Analysis)

#### Bug #1 — Missing FK Validation on Task Creation

**Buggy pattern:**
```python
class TaskSerializer(serializers.ModelSerializer):
    project = serializers.IntegerField()  # plain integer, not a relational field
    ...
```

**Root cause:** When `project` is declared as a plain `IntegerField`, DRF treats it as a bare number and skips all relational validation. The invalid ID passes straight through to the SQL `INSERT`, and PostgreSQL raises an `IntegrityError` — surfaced by Django as a 500 instead of a clean 400.

**Fix:** Use `ModelSerializer` with the FK field intact (which auto-generates `PrimaryKeyRelatedField(queryset=Project.objects.all())`). This validates existence before the value reaches the database and returns a descriptive 400 on failure.

**Catching test:** `test_create_task_with_nonexistent_project_returns_400` — POSTs `project: 99999`, asserts `HTTP 400`.

---

#### Bug #2 — `icontains` on an IntegerField

**Buggy pattern:**
```python
class TaskFilter(django_filters.FilterSet):
    priority = django_filters.CharFilter(field_name='priority', lookup_expr='icontains')
```

**Root cause:** `icontains` generates `WHERE priority LIKE '%3%'`. PostgreSQL cannot apply a string LIKE operator to an integer column and raises `invalid input syntax for type integer`. The query always 500s.

**Fix:** Use `django_filters.NumberFilter(field_name='priority')` — this produces `WHERE priority = 3`, which is valid on `IntegerField`.

**Catching test:** `test_filter_priority_by_integer_not_string_lookup` — GETs `?priority=3`, asserts `HTTP 200` and all results have `priority == 3`.

---

### Task 4 — ORM Optimization

**`annotate` query — all three aggregates in a single round-trip:**
```python
Project.objects.annotate(
    task_count=Count('tasks'),
    completed_task_count=Count('tasks', filter=Q(tasks__is_complete=True)),
    latest_due=Max('tasks__due_date'),
)
```

Generated SQL:
```sql
SELECT projects.*,
       COUNT(tasks.id)                                          AS task_count,
       COUNT(tasks.id) FILTER (WHERE tasks.is_complete = true) AS completed_task_count,
       MAX(tasks.due_date)                                      AS latest_due
FROM   projects
LEFT JOIN tasks ON tasks.project_id = projects.id
GROUP  BY projects.id;
```

One query regardless of how many projects exist. The raw SQL equivalent uses PostgreSQL's `FILTER (WHERE ...)` aggregate syntax, which is semantically identical to Django's `Count(..., filter=Q(...))` — no subquery, no correlated scan. Key difference from a hand-written subquery: the ORM produces a single `GROUP BY` pass; a naive subquery approach would hit the tasks table once per project.

**`select_related` vs `prefetch_related`:**

| | `select_related` | `prefetch_related` |
|---|---|---|
| Mechanism | SQL JOIN in the same query | Separate IN query + Python join |
| Use when | FK or OneToOne (one related object per row) | ManyToMany or reverse FK (many related objects) |
| Our case | `Task → Project` is a FK | → use `select_related('project')` |

`TaskViewSet.get_queryset()` uses `select_related('project')` — accessing `task.project.name` across all tasks costs 1 query, not N+1.

**Database indexes — `Task` model `Meta.indexes`:**

```python
class Meta:
    indexes = [
        models.Index(fields=['project', 'is_complete'], name='task_project_complete_idx'),
        models.Index(fields=['priority'],               name='task_priority_idx'),
        models.Index(fields=['due_date'],               name='task_due_date_idx'),
    ]
```

Rationale:
- `(project_id, is_complete)` composite — the `completed_task_count` annotation filters `WHERE project_id = X AND is_complete = true`; the composite index satisfies both predicates in one B-tree scan.
- `priority` — `TaskFilter` queries `WHERE priority = N`; without an index PostgreSQL does a full table scan on the tasks table.
- `due_date` — default ordering is `ORDER BY due_date`; the index turns this into an index scan instead of a sort.
- `project_id` (FK) — Django adds this automatically for every ForeignKey field, so it's already covered.

Query plan verification prompt used with AI:
> "Given this Django model and query, show me the EXPLAIN ANALYZE output and identify any missing indexes. Then generate the `Meta.indexes` definition to cover the three most common filter and ordering patterns."

---

### Task 5 — Seed Command Prompt

Full prompt is in the docstring at the top of `backend/projects/management/commands/seed_db.py`. Key elements that cover every rubric criterion:
- Exact counts specified (50 projects, 200 tasks)
- `transaction.atomic` required explicitly — full rollback on any error
- Idempotency stated (delete before insert — safe to re-run)
- Data variety: `status` distribution across all four values, `priority` 1–4, due dates spanning -30 to +90 days, ~30% completion rate
- `bulk_create` for both models to minimise DB round-trips
- No third-party packages — stdlib `random` + `datetime` only
- Output confirmation line specified

---

## Section B — React/Vite Frontend

**Stack:** React 19, Vite 8, TypeScript (strict mode), TailwindCSS v3.4, React Router v7, React Query v5, Zustand v5, MSW v2, Vitest + React Testing Library

### Setup

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
npm test       # 18 tests, all pass
npm run build  # TypeScript strict check + Vite bundle
```

Copy `frontend/.env.example` to `frontend/.env.local` to point at a real backend instead of MSW mocks.

---

## Task-by-Task Walkthrough (Section B)

### Task 1 — Setup

**Tailwind version decision:** Pinned `tailwindcss@^3.4` deliberately. Tailwind v4 (the npm default in 2026) uses a completely different setup — Vite plugin + `@import "tailwindcss"`, no `tailwind.config.js` or `@tailwind` directives. AI tools frequently mix v3 and v4 syntax, causing styles to silently not apply. Pinning v3 avoids that trap entirely.

**TypeScript strict mode:** `"strict": true` is set in `tsconfig.app.json`. The production build is clean with no type errors under strict. Additional strictness flags active: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.

**Linter — oxlint instead of ESLint:** The project uses `oxlint` (Rust-based, ~50–100× faster than ESLint) rather than the traditional ESLint + plugin setup. Both enforce the same code-quality rules; oxlint requires zero config for a TypeScript/React project and integrates with the same `npm run lint` contract. The trade-off: ESLint has a larger plugin ecosystem (e.g. eslint-plugin-react-hooks) — if hook-specific rules become a priority, an ESLint layer can be added alongside oxlint without removing it.

**Path aliases:** `@/` is configured in both `vite.config.ts` (Vite `resolve.alias`) and `tsconfig.app.json` (`paths`), so all internal imports use `@/components/...`, `@/pages/...`, etc. rather than brittle relative paths.

---

### Task 2 — Components & State Management: React Query + Zustand

**Two state managers, two jobs — neither is redundant.**

| State type | Tool | Reason |
|---|---|---|
| Server state (projects, tasks) | React Query v5 | Built-in caching, loading/error states, background refetch, optimistic mutation with rollback |
| Client UI state (filter, search) | Zustand v5 | Lightweight global store for state that is pure client-side, doesn't need caching, and should persist across navigations without re-fetching |

React Query owns everything that comes from the network. Zustand owns the filter and search values in `src/store/filterStore.ts`. The `useProjectFilters` custom hook (`src/hooks/useProjectFilters.ts`) reads from the Zustand store and returns a `useMemo`-filtered project list — keeping the filtering logic out of the component and easy to test in isolation.

---

### Task 3 — Bug Analysis

#### Bug #1 — Missing `useEffect` Dependency Array

**Buggy pattern:**
```tsx
useEffect(() => {
  fetchProjects().then(setProjects);
}); // ← no dependency array
```

**Root cause:** Without `[]`, the effect runs after every render. `setProjects` triggers a re-render → the effect fires again → infinite loop. The network tab shows hundreds of requests per second.

**Fix:** Add `[]`. In this project React Query is used instead, which eliminates the `useEffect` for data fetching entirely and makes this class of bug impossible.

**Catching test:** `test_fetches_projects_exactly_once_on_mount` — spies on `fetchProjects` and asserts it was called exactly once after mount.

---

#### Bug #2 — State Array Mutation

**Buggy pattern:**
```tsx
projects.sort((a, b) => ...);  // ← mutates in-place
setProjects(projects);          // same reference → React sees no change, no re-render
```

**Root cause:** React uses reference equality to decide whether to re-render. Mutating the array and passing the same reference to `setState` is a no-op.

**Fix:** Always return a new array — `[...projects].sort(...)` or `.filter(...)`. The `useProjectFilters` hook uses `.filter()`, which returns a new array by definition, and wraps the result in `useMemo` so it only recomputes when the inputs change.

**Catching test:** `test_filters_projects_by_status_without_mutating` — filters to `active`, switches back to `All`, asserts the full count is restored (confirms the original array was never modified).

---

### Task 4 — API Integration & Error Handling

**API client prompt** (`src/api/client.ts`):
> "Create a reusable Axios instance for a REST API with base URL from `import.meta.env.VITE_API_URL`. Add two interceptors: (1) a request interceptor that reads an auth token from localStorage and attaches it as `Authorization: Bearer <token>` on every request, (2) a response interceptor that clears the stored token and redirects to login on 401, and normalises all other error responses to a consistent rejection shape so callers never need to inspect AxiosError internals. Token refresh is out of scope for this sprint but the interceptor should be structured so a refresh call can be inserted before the 401 redirect without restructuring the file."

**API client** (`src/api/client.ts`): Axios instance with two interceptors:
- **Request interceptor** — attaches `Authorization: Bearer <token>` from `localStorage` when present.
- **Response interceptor** — clears the stored token on 401 (preventing stale-credential loops); structured so a token-refresh call can be added before the redirect without rewiring the interceptor chain.

**Error Boundary** (`src/components/ErrorBoundary.tsx`): React class component wrapping the entire route tree (and `ProjectDetail` individually). Catches uncaught render errors, logs them to the console, and shows a "Something went wrong / Try again" fallback with a reset button. React Query's `isError` handles expected fetch failures inline; the `ErrorBoundary` is a safety net for unexpected JS exceptions.

**Loading / error / empty states** in `Dashboard.tsx`:
- **Loading** — six `ProjectCardSkeleton` pulse-animated cards render while the query is pending.
- **Error** — a red error message replaces the grid if the fetch fails.
- **Empty** — a centred "No projects found" message with context text when filters produce zero results.

**Optimistic update** for task completion toggle:
1. `onMutate` — cancel in-flight queries, snapshot current cache, apply the toggle immediately.
2. `onError` — restore the snapshot so the UI rolls back if the PATCH fails.
3. `onSettled` — invalidate the query to sync with the server regardless of outcome.

---

### Task 5 — Modal Prompt

Full prompt is in the docstring at the top of `frontend/src/components/Modal.tsx`. Key elements that cover every rubric criterion:
- Typed props listed explicitly: `isOpen`, `onClose`, `title`, `children`, `footer` (optional slot for action buttons)
- Focus trap: Tab/Shift+Tab cycles only within the modal; initial focus lands on the first focusable element; focus returns to the trigger on close
- Escape key closes the modal
- Overlay click closes; panel click does not propagate
- CSS open/close animation via Tailwind classes
- Native implementation with refs — no third-party focus-trap library
- Clean unmount (`return null`) when `isOpen` is false — no hidden DOM noise
