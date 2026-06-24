# Session Handoff — Production Deployment Config Review & Fixes

**Date:** 2026-06-22
**Author of work:** Claude Code session (user: CALIPAR Engineering / git: johnnyrobot)
**Status:** ✅ Complete — PR open, awaiting review/merge

---

## 1. TL;DR

A CodeRabbit code review was run against the most recent commit on `main`
(`add176a chore: add production deployment config`). It surfaced **11 findings**
(4 critical, 4 major, 2 minor, 1 dup-of-critical). **All 11 were fixed,
verified, committed, pushed, and opened as a PR.**

- **Branch:** `fix/prod-deploy-review`
- **Commit:** `4fb2103 fix: address production deployment config review findings`
- **PR:** https://github.com/johnnyrobot/calipar/pull/3 (base `main` ← head `fix/prod-deploy-review`, **OPEN**, **MERGEABLE**, no review submitted yet as of 2026-06-22)
- **Working tree:** clean except this untracked `HANDOFF.md`
- **Verification:** `tsc --noEmit` exits 0; `docker compose -f docker-compose.prod.yml config` renders successfully

There is **nothing left to implement**. Remaining work is human review + merge,
plus a couple of optional follow-ups noted in §6.

---

## 2. Repository / environment context

- **Project:** CALIPAR — AI-enhanced Program Review & Integrated Planning platform.
  Next.js 14 frontend + FastAPI backend + PostgreSQL. See `CLAUDE.md` for full overview.
- **Working dir:** `/Users/laccd/code/calipar`
- **Platform:** macOS (darwin), zsh.
- **Docker:** `docker compose` (v2) is available and was used for validation.

### ⚠️ Git remote gotcha (important for the next session)
The repo's `origin` was originally configured as
`https://github.com/johnnyphung-laccd/calipar.git` — **this repo does not exist /
is not accessible** to the authenticated `gh` account.

During this session `origin` was **re-pointed** to the account-owned repo:
```
origin → https://github.com/johnnyrobot/calipar.git   (johnnyrobot has ADMIN)
```
`johnnyrobot/calipar`'s `main` was already at `add176a` (identical to local `main`),
so the PR diff is exactly the intended 11-file change.

> If a future session needs the original `johnnyphung-laccd` remote, confirm the
> correct URL with the user before changing anything — the re-point was a
> deliberate, user-approved decision, not an assumption.

---

## 3. What was reviewed and how

- Tool: **CodeRabbit CLI** v0.6.1 (`coderabbit review --agent --base origin/main`),
  authenticated as `johnnyrobot` (Pro+ plan).
- Scope: the single commit ahead of `origin/main` at session start
  (`add176a`, the production deployment config). Working tree was clean.
- Every finding was **manually verified against the actual code** before fixing —
  a few were downgraded in severity vs. CodeRabbit's label (noted below).

---

## 4. The 11 findings and their fixes

### Critical
1. **Backend image bakes in secrets** — `backend/Dockerfile.prod:32` does
   `COPY --chown=appuser:appgroup . .` into the *final* image, and the old
   `RUN rm` only stripped tests/caches (not `.env` / service-account JSON).
   **Fix:** added `backend/.dockerignore`; removed the redundant `RUN rm` line.
2. **Healthchecks hit `/docs`** — `backend/Dockerfile.prod` HEALTHCHECK and the
   backend service in `docker-compose.prod.yml`. `/docs` is often disabled in prod
   and leaks API shape. A real `/api/health` endpoint already exists
   (`backend/main.py:62`). **Fix:** both now curl `/api/health`.
3. **`typescript.ignoreBuildErrors: true`** in `frontend/next.config.js` masked
   real TS errors. **Fix:** removed the flag **and fixed the 2 errors it hid**:
   - `frontend/app/(dashboard)/admin/users/page.tsx:183` — Badge `variant: 'danger'`
     is not in the Badge union → changed to `'error'` (the red variant).
   - `frontend/app/forgot-password/page.tsx:60` — `auth` is typed `Auth | null`;
     added a `if (!auth) throw …` guard before `sendPasswordResetEmail(auth, …)`.
4. **`NEXT_PUBLIC_API_URL` hardcoded** to `https://calipar.site` in
   `docker-compose.prod.yml:24`. **Fix:** parameterized to `${NEXT_PUBLIC_API_URL}`
   (already documented in `.env.example`).

### Major
5. **User auto-provisioning race condition** — `backend/routers/auth.py` adds a new
   `User` on first Firebase login without handling concurrent inserts of the same
   `firebase_uid`. **Fix:** wrapped commit in `try/except IntegrityError` →
   `rollback()` + re-query by `firebase_uid`. (`firebase_uid` is `unique=True` in
   `backend/models/user.py:28`, so the constraint actually fires.) Imported
   `IntegrityError` from `sqlalchemy.exc`.
6. **Frontend missing `.dockerignore`** — lower impact than backend (the final
   stage only copies `.next/standalone`), but `.env*` still hit the builder layer.
   **Fix:** added `frontend/.dockerignore`.
7. **`package-lock.json*` glob + `npm install`** in `frontend/Dockerfile.prod:3`
   → non-reproducible builds. **Fix:** pinned `package-lock.json` (no glob) and
   switched to `npm ci`. (Verified `frontend/package-lock.json` exists.)
8. **Firebase key mounted from outside repo** —
   `../infrastructure/shared/firebase-service-account.json` in
   `docker-compose.prod.yml:10`. **Fix:** parameterized as
   `${FIREBASE_CREDENTIALS_PATH:-./config/firebase-service-account.json}`;
   documented in `.env.example`; added `config/` + `firebase-service-account.json`
   to `.gitignore`.

### Minor
9. **Frontend had no healthcheck** in compose. **Fix:** added one using
   `wget --no-verbose --tries=1 --spider http://localhost:3000/` with
   `start_period: 20s`. **Note:** uses `wget` (BusyBox-provided in
   `node:20-alpine`) because `curl` is NOT installed in that image.
10. **Backend `RUN rm` cleanup** became redundant once `.dockerignore` exists.
    **Fix:** removed (covered by #1).

---

## 5. Files changed (commit `4fb2103`)

```
 .env.example                                  |  3 ++   # FIREBASE_CREDENTIALS_PATH doc
 .gitignore                                    |  3 ++   # config/ + firebase key
 backend/.dockerignore                         | 40 ++++ # NEW
 backend/Dockerfile.prod                       |  4 +--  # /api/health, drop RUN rm
 backend/routers/auth.py                       | 18 +++  # IntegrityError race fix
 docker-compose.prod.yml                       | 12 ++   # healthchecks, params, mount
 frontend/.dockerignore                        | 31 ++++ # NEW
 frontend/Dockerfile.prod                      |  4 +--  # pin lockfile + npm ci
 frontend/app/(dashboard)/admin/users/page.tsx |  2 +-  # Badge 'danger'->'error'
 frontend/app/forgot-password/page.tsx         |  3 ++   # null-guard auth
 frontend/next.config.js                       |  3 --   # remove ignoreBuildErrors
```

---

## 6. Verification performed

- **TypeScript:** `cd frontend && npx tsc --noEmit` → **exit 0** (clean). This is
  the gate the removed `ignoreBuildErrors` flag was bypassing, so it now matters.
- **Compose:** `docker compose -f docker-compose.prod.yml config` renders OK;
  confirmed in the rendered output: backend healthcheck → `/api/health`, frontend
  healthcheck present, Firebase mount resolves to repo-local
  `./config/firebase-service-account.json`, `NEXT_PUBLIC_API_URL` substitutes.
  (Rendering requires a `.env` to exist because of the pre-existing
  `env_file: .env` directive; a temp `.env` was used for validation and removed.)
- **Python:** `backend/routers/auth.py` parses (`ast.parse`).
- Cleaned up a `frontend/tsconfig.tsbuildinfo` artifact generated by the typecheck.

### Not run (would need a real build/deploy)
- `npm run build` (full Next.js production build) — only `tsc` was run.
- `docker compose build` / actual container startup / live healthcheck hits.
- Backend test suite (`pytest`) — the auth change is small but untested here.

---

## 7. Suggested next steps

1. **Merge PR #3** after human review.
2. **Before first prod deploy with this compose file:** create the
   `./config/firebase-service-account.json` (or set `FIREBASE_CREDENTIALS_PATH`)
   and ensure `.env` includes `NEXT_PUBLIC_API_URL` (e.g. `https://calipar.site`)
   plus the `NEXT_PUBLIC_FIREBASE_*` vars — they're now blank if unset.
3. **Optional hardening / follow-ups not in scope of this PR:**
   - Run `npm run build` and `docker compose build` end-to-end to confirm the
     images build cleanly with the new `.dockerignore` + `npm ci`.
   - Add a `pytest` test for the auto-provisioning race / IntegrityError path.
   - Consider a dedicated lightweight `/api/health` that also checks DB
     connectivity (currently returns a static `{"status":"healthy"}`).
   - The original `johnnyphung-laccd` remote question is unresolved — confirm with
     the user whether `johnnyrobot/calipar` is the long-term canonical remote.

---

## 8. Quick reference

```bash
# Where things are
git branch --show-current            # fix/prod-deploy-review
gh pr view 3 --web                   # open the PR

# Re-verify
cd frontend && npx tsc --noEmit                       # expect exit 0
docker compose -f docker-compose.prod.yml config      # needs a .env present

# Re-run the review (CodeRabbit CLI v0.6.1, authed as johnnyrobot)
coderabbit review --agent --base origin/main
```

> Note: this doc lives at `docs/HANDOFF.md` and is committed on the
> `fix/prod-deploy-review` branch (part of PR #3). It's session meta — remove it
> before merge if you'd rather it not land on `main`.
