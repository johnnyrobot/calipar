# CLAUDE.md

**CALIPAR** is an AI-enhanced Program Review and Integrated Planning platform for educational institutions (program review, "Golden Thread" strategic planning, resource allocation, and an ACCJC/ISMP compliance copilot). Full-stack: Next.js 16 App Router frontend, FastAPI backend, PostgreSQL 16.

## Architecture

```
[Next.js frontend :3000] → [FastAPI backend :8000] → [PostgreSQL :5432]
```

**Frontend** (`frontend/`, App Router — no `src/`): `app/(dashboard)/{reviews,planning,resources,data,chat}` protected routes + `app/login`; `components/{layout,ui,features}`; `lib/{auth-context.tsx, api.ts, store.ts}`. State via Zustand (`lib/store.ts`), auth via `lib/auth-context.tsx` (`useAuth()`, JWT in localStorage), HTTP via `lib/api.ts`. Charts with `recharts`. Tailwind v3, "maritime instrument deck" design system authored in Paper.

**Backend** (`backend/`, flat layout — entry is `main.py`, i.e. `main:app`, NOT `app.main`): `models/` (SQLModel), `routers/` (`auth, reviews, ai, data, planning, resources, validation, activity, admin` → mounted at `/api/{feature}`), `services/` (`firebase.py`, `gemini.py`, `demo_mode.py`), `alembic/` migrations, `config.py` (pydantic-settings), `database.py` (`get_session` DI). Seeders: `seed.py`, `seed_demo.py`, `seed_comprehensive.py`.

**Key domain features:** Golden Thread (`strategic_initiative` ISMP Goals → `action_plan` program goals → mappings → `resource_request` with TCO); Mission-Bot AI chat (`services/gemini.py`, google-genai + File Search RAG over ACCJC docs, streamed with citations); Smart Context Editor (`app/(dashboard)/reviews/[id]`); RBAC roles **FACULTY, CHAIR, DEAN, ADMIN, PROC** (`require_role` on the backend, `RoleGuard` on the frontend); Demo mode (`services/demo_mode.py` isolates "demo"-email users to a separate DB with daily reset).

## Commands

```bash
# Docker (recommended) — FE :3000, BE :8000, DB :5432
cp .env.example .env
docker-compose up -d          # or: ./init.sh  (builds, waits for health, prints URLs)
docker-compose logs -f
docker-compose down

# Frontend (frontend/)
npm install
npm run dev                   # :3000
npm run build
npm run lint                  # eslint
npm run test:e2e              # jest + puppeteer (e2e only; also :faculty/:chair/:dean/:admin/:all)

# Backend (backend/)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload     # :8000  (API docs at /docs, /redoc)
pytest                        # tests/: test_authz, test_rbac, test_security_config, test_smoke, test_new_endpoints
alembic upgrade head
alembic revision --autogenerate -m "message"
```

CI (`.github/workflows/ci.yml`): frontend `tsc --noEmit` + lint + build; backend `pytest -q` (SQLite `ci.db`); prod Docker image build. There is **no frontend unit-test script** — only the `test:e2e:*` (puppeteer) suites.

## Conventions

- Backend: SQLModel over SQLAlchemy with type hints; every endpoint takes `session: Session = Depends(get_session)`; routers are grouped by feature and prefixed `/api/{feature}`; settings via pydantic-settings in `config.py`.
- Frontend: TypeScript throughout; Zustand for persistent auth/UI state; wrap privileged UI in `<RoleGuard roles={[...]}>`; call the API through `lib/api.ts` (not raw fetch).
- Design tokens come from the Paper-authored maritime theme → Tailwind v3; keep to the existing component classes rather than ad-hoc styling.
- Supports both PostgreSQL (default/prod) and SQLite (dev/CI) via `DATABASE_URL`.

## Gotchas & Constraints

- **Backend entry is `main:app` at the backend root** — NOT `app.main:app`. `uvicorn main:app --reload`.
- **Ports:** FE 3000, BE 8000, DB 5432 (all standard). Frontend expects the API at `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- **Auth fails closed in production:** `config.assert_production_auth_secure()` runs at startup and refuses to serve if it would fall back to the dev-auth header instead of verifying Firebase tokens. Demo mode / `firebase_uid` header bypass is dev-only.
- **Demo mode isolation:** users whose email contains `DEMO_USER_PREFIX` (default `demo`) are routed to `DEMO_DATABASE_URL` with a daily reset — don't assume a single DB.
- **Never commit secrets:** `serviceAccountKey.json`, `.env`, `**/secrets/*.json`, `*.key` are gitignored. Provide Firebase + `GOOGLE_API_KEY` via `.env`.
- License is **BSD-3-Clause with branding requirements** — do not strip "CALIPAR" branding from the UI or re-brand without an exemption.
- Puppeteer's Chromium download can hang `npm ci`; CI sets `PUPPETEER_SKIP_DOWNLOAD=1` for non-e2e jobs.
