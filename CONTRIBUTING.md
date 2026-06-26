# Contributing to CALIPAR

Thanks for your interest in contributing! CALIPAR is an AI-enhanced Program Review &
Integrated Planning platform — a Next.js 14+ frontend, a FastAPI backend, and PostgreSQL.

## Getting started

```bash
cp .env.example .env        # fill in Firebase + Google AI keys
docker-compose up -d        # frontend :3000, backend :8000, db :5432
```

Or run each service manually — see [`README`](./README.md) / [`CLAUDE.md`](./CLAUDE.md)
and `docs/` for the full setup.

### Frontend (`frontend/`)
```bash
npm ci
npm run dev          # http://localhost:3000
npm run lint         # ESLint (flat config)
npx tsc --noEmit     # type-check
npm run build        # production build
```

### Backend (`backend/`)
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload    # http://localhost:8000/docs
python -m pytest             # tests
```

## Workflow

1. **Fork** the repo and create a topic branch off `main`
   (`fix/...`, `feat/...`, `chore/...`, `docs/...`).
2. Make focused changes — keep each PR to a single concern.
3. **Run the checks locally** before opening a PR:
   - frontend: `npx tsc --noEmit`, `npm run lint`, `npm run build`
   - backend: `python -m pytest`
   These are the same gates enforced by CI (`.github/workflows/ci.yml`), which also
   builds both production Docker images.
4. Open a PR against `main` and fill in the PR template.

## Conventions

- **Commits:** conventional-style prefixes (`fix:`, `feat:`, `chore:`, `docs:`, `ci:`).
- **Code style:** match the surrounding code. TypeScript is `strict`; avoid `any`
  (`@typescript-eslint/no-explicit-any` is an error). Python follows the existing
  module/router/service layout.
- **Tests:** add or update tests for behavioural changes where a suite exists.
- **Docs:** update `docs/` and `.env.example` when you change configuration or setup.
- **Secrets:** never commit `.env`, service-account JSON, API keys, or personal data.

## Reporting bugs & requesting features

Open a [GitHub issue](https://github.com/johnnyrobot/calipar/issues) using the bug-report
or feature-request template. For security-sensitive reports, please use a
[private security advisory](https://github.com/johnnyrobot/calipar/security/advisories/new)
rather than a public issue.

By contributing, you agree your contributions are licensed under the same terms as the
project and that you will follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
