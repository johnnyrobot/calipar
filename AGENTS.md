# AGENTS.md

**CALIPAR** — an AI-Enhanced Program Review and Integrated Planning platform for educational institutions. Stack: **Next.js 16 (App Router) + TypeScript + Tailwind v3** frontend, **Python FastAPI + SQLModel** backend, **PostgreSQL 16**, **Firebase** auth, and **Google Gemini** (google-genai) for the Mission-Bot RAG copilot. Orchestrated with Docker Compose.

## Setup

```bash
cp .env.example .env         # fill Firebase + GOOGLE_API_KEY; see docs/FIREBASE_SETUP.md
```

- Docker path (recommended): Docker Desktop only.
- Native path: Python 3.11+, Node.js 20+, PostgreSQL 16.
  - Backend: `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
  - Frontend: `cd frontend && npm install`
- Place the Firebase service-account JSON at `backend/serviceAccountKey.json` (gitignored). Without it, use demo mode / dev-auth for local work.

## Build & Run

```bash
# Whole stack (FE :3000, BE :8000, DB :5432)
docker-compose up -d          # or ./init.sh (builds + health-waits + prints URLs)

# Dev, run each service directly
cd backend  && uvicorn main:app --reload           # entry is main:app (backend root)
cd frontend && npm run dev                          # http://localhost:3000

# Production
npm run build                                        # frontend
docker build -f backend/Dockerfile.prod -t calipar-backend backend
```

API docs live at `http://localhost:8000/docs` (Swagger) and `/redoc`.

## Testing

- **Backend:** `cd backend && pytest` — suites in `backend/tests/` (`test_authz`, `test_rbac`, `test_security_config`, `test_smoke`, `test_new_endpoints`); config in `backend/pytest.ini` (asyncio auto mode). CI runs it against SQLite.
- **Frontend:** jest + puppeteer **e2e only** — `npm run test:e2e` (or role-scoped `test:e2e:faculty|chair|dean|admin`, and `test:e2e:all`). There is no unit-test script; type safety is checked with `npx tsc --noEmit`.
- **Before a change is done** (matches `.github/workflows/ci.yml`): frontend `tsc --noEmit` + `npm run lint` + `npm run build` clean; backend `pytest -q` green; if you touched the prod image, `docker build -f backend/Dockerfile.prod backend` succeeds.
- Ran DB migrations? `alembic upgrade head` and confirm the app boots.

## Code Style

- **Backend:** FastAPI + SQLModel with type hints. Endpoints receive the DB session via `Depends(get_session)`. Group routes by feature under `/api/{feature}` in `routers/`. Config via pydantic-settings in `config.py`. Enforce access with `require_role(Role.X)`.
- **Frontend:** TypeScript + App Router. Persistent state via Zustand (`lib/store.ts`); auth via `useAuth()` (`lib/auth-context.tsx`); API calls through `lib/api.ts`; gate privileged UI with `<RoleGuard>`. Tailwind v3 using the Paper-authored maritime design tokens — don't hand-roll one-off styles.
- Roles across the system: FACULTY, CHAIR, DEAN, ADMIN, PROC.

## Commit & PR Conventions

- Git repo; `main` is the default branch (CI runs on PRs and pushes to `main`). Branch off `main`, open a PR, keep CI green (frontend tsc/lint/build, backend pytest, prod Docker build).
- Do not commit secrets or the SQLite scratch DBs — `.env*`, `serviceAccountKey.json`, `**/secrets/*.json`, `*.key`, `_mig_check.db`/`ci.db` are excluded.

## Security & Data

- **Fail-closed auth:** `assert_production_auth_secure()` runs at startup and refuses to serve in production if Firebase token verification isn't configured (the dev-auth `firebase_uid` header path is dev-only). Never weaken this to "make it run."
- **Secrets** (`GOOGLE_API_KEY`, `FIREBASE_*`, service-account JSON) come from `.env` / gitignored files only.
- **Demo mode** isolates `demo`-prefixed users to `DEMO_DATABASE_URL` with a daily reset — keep demo and real data separate; don't cross-write.
- License is **BSD-3-Clause with branding requirements** — do not remove or replace CALIPAR UI branding without an exemption.
