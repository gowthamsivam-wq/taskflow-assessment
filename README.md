# TaskFlow — AI-Assisted Engineering Assessment

Full-stack project covering **Section A (Python/Django)** and **Section B (React/Vite)** of the coding assessment. Built with Cursor IDE + Claude AI, showcasing how I prompt, validate, and iterate on AI-generated output.

---

## Repository Layout

```
taskflow-assessment/
├── backend/    # Django 5 + DRF + PostgreSQL  (Section A)
└── frontend/   # React 18 + Vite + TypeScript  (Section B)
```

---

## Section A — Python/Django Backend

**Stack:** Python 3.11, Django 5.1, Django REST Framework 3.17, django-filter, psycopg v3, PostgreSQL

### Setup

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
createdb taskflow
python manage.py migrate
python manage.py seed_db   # seeds 50 projects + 200 tasks
python manage.py runserver
python manage.py test projects --verbosity=2   # 14 tests, all pass
```

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
- `ProjectViewSet.get_queryset()` annotates `task_count=Count('tasks')` so the serializer can expose it without a separate query.
- `TaskFilter` uses `django_filters.NumberFilter` for `priority` (exact integer match) — not `CharFilter` or `icontains`.
- `@action(detail=True, url_path='summary')` on ProjectViewSet handles `GET /api/projects/{id}/summary/` cleanly.
- Page size 20 set globally in `REST_FRAMEWORK['PAGE_SIZE']`.

---

### Task 3 — Debug & Refactor (Bug Analysis)

#### Bug #1 — Missing FK Validation

**Buggy pattern:**
```python
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'project', ...]
    # No validate_project() — DRF passes the value straight to the DB
    # Result: IntegrityError (500) instead of a clean ValidationError (400)
```

**Root cause:** DRF's default `PrimaryKeyRelatedField` validates that the FK value is a valid integer but does NOT verify the referenced row exists. Without an explicit validator, an invalid project ID reaches `save()` and PostgreSQL raises an IntegrityError, which Django surfaces as a 500.

**Fix:** Add `validate_project()` in the serializer that queries the DB before accepting the value, returning a clean 400 with a human-readable message.

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

**`annotate` query (single round-trip):**
```python
Project.objects.annotate(
    task_count=Count('tasks'),
    latest_due=Max('tasks__due_date'),
)
# SQL: SELECT projects.*, COUNT(tasks.id), MAX(tasks.due_date)
#      FROM projects LEFT JOIN tasks ON tasks.project_id = projects.id
#      GROUP BY projects.id
# One query, no N+1.
```

**`select_related` vs `prefetch_related`:**

| | `select_related` | `prefetch_related` |
|---|---|---|
| Mechanism | SQL JOIN | Separate query + Python join |
| Use when | FK or OneToOne (single related object) | ManyToMany or reverse FK (many related objects) |
| Our case | `Task → Project` is a FK | → use `select_related('project')` |

`TaskViewSet.get_queryset()` uses `select_related('project')` — accessing `task.project.name` across 200 tasks costs 1 query total, not 201.

---

### Task 5 — Seed Command Prompt (Score: 5/5)

Full prompt is in the docstring at the top of `backend/projects/management/commands/seed_db.py`. Key elements:
- Exact counts (50 projects, 200 tasks)
- `transaction.atomic` stated explicitly for safe rollback on error
- Idempotency (delete before insert) specified
- Data variety: `status` distribution, `priority` 1–4, due dates spanning -30 to +90 days, 30% completion rate
- `bulk_create` for both models to minimise DB round-trips
- No third-party packages — stdlib `random` + `datetime` only
- Output confirmation line specified

---

## Section B — React/Vite Frontend

**Stack:** React 19, Vite 8, TypeScript, TailwindCSS v3.4, React Router v7, React Query v5, MSW v2, Vitest + React Testing Library

### Setup

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm test             # 18 tests, all pass
npm run build        # TypeScript check + Vite bundle
```

---

## Task-by-Task Walkthrough (Section B)

### Task 1 — Setup

**Tailwind version decision:** Pinned `tailwindcss@^3.4` deliberately. Tailwind v4 (the npm default in 2026) uses a completely different setup — Vite plugin + `@import "tailwindcss"`, no `tailwind.config.js` or `@tailwind` directives. AI tools frequently mix v3 and v4 syntax, causing styles to silently not apply. Pinning v3 avoids that trap.

---

### Task 2 — State Management: React Query vs Zustand

**Choice: React Query v5 for all server state.**

| Concern | React Query | Zustand |
|---|---|---|
| Cache invalidation after mutation | Built-in | Manual |
| Loading / error / stale states | Built-in per query | Manual |
| Optimistic updates | `onMutate` + `onError` rollback | Manual |
| Background refetch, dedup | Built-in | Manual |
| Global UI state (modals, filters) | Not intended for | Ideal |

**Decision rationale:** All state in this app is server state — projects and tasks that need fetching, caching, and mutations. React Query is the right tool. Zustand would be appropriate for significant client-only shared state (multi-step form wizards, user preferences that don't round-trip to a server). Zustand is installed to show awareness of it, but not used for server state.

---

### Task 3 — Bug Analysis

#### Bug #1 — Missing `useEffect` Dependency Array

**Buggy pattern:**
```tsx
useEffect(() => {
  fetchProjects().then(setProjects);
}); // ← no dependency array
```

**Root cause:** Without `[]`, the effect runs after every render. `setProjects` triggers a re-render → the effect runs again → infinite loop. The network tab shows hundreds of identical requests per second.

**Fix:** Add `[]`, or use React Query — which eliminates `useEffect` for data fetching entirely.

**Catching test:** `test_fetches_projects_exactly_once_on_mount` — spies on `fetchProjects` and asserts it was called exactly once after mount.

---

#### Bug #2 — State Array Mutation

**Buggy pattern:**
```tsx
projects.sort((a, b) => ...);  // ← mutates in-place
setProjects(projects);          // same reference → React sees no change, no re-render
```

**Root cause:** React uses reference equality to decide whether to re-render. Mutating the array and calling `setState` with the same reference does nothing.

**Fix:** Always return a new array — `[...projects].sort(...)` or `.filter(...)`.

**Catching test:** `test_filters_projects_by_status_without_mutating` — filters to `active`, switches back to `All`, asserts the full count is restored (proves the original array was not mutated).

---

### Task 5 — Modal Prompt (Score: 5/5)

Full prompt is in the docstring at the top of `frontend/src/components/Modal.tsx`. Key elements:
- Typed props (isOpen, onClose, title, children, footer slot) listed explicitly
- Focus trap: Tab/Shift+Tab cycle within modal, initial focus on first focusable element, restore focus on close
- Escape key closes
- Overlay click closes; panel click does not propagate
- CSS transition animation via Tailwind classes
- No third-party focus-trap library — native implementation with refs
- Clean unmount when `isOpen` is false
