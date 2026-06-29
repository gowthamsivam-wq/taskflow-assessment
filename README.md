# TaskFlow — AI-Assisted Engineering Assessment

Full-stack project covering **Section A (Python/Django)** and **Section B (React/Vite)** of the coding assessment. Built with Cursor IDE + Claude AI.

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
python manage.py runserver 8001
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
