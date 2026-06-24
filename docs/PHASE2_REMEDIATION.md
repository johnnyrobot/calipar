# CALIPAR — Phase 2 Remediation Plan

**Date:** 2026-06-23 (Wave 1 executed 2026-06-24)
**Author:** Claude Code session (user: CALIPAR Engineering)
**Status:** **Wave 1 executed** in this PR (branch `fix/nextjs-cve-and-config-hardening`,
off `main`). Waves 0/2/3/4 remain plan-only, awaiting greenlight.
**Basis:** Phase 1 Gap Analysis of the local codebase against the verified upstream
"Source of Truth" (see §Provenance). Every gap is primary-source-verified and carries
file:line evidence.

---

## 1. TL;DR

Eleven gaps were identified between the CALIPAR codebase and the current official
standards of its stack (Next.js, React, FastAPI, Pydantic, Firebase, google-genai,
python-jose). They are remediated in five waves ordered
**security → fail-safe defaults → config correctness → deprecations/currency → major upgrades**.
Each wave is an independently shippable, independently verifiable PR.

**The single highest-value fix:** Wave 1 / Step 1 — bump **Next.js `14.1.0` → `14.2.x`**
to clear **CVE-2025-29927** (CVSS 9.1). It is nearly free (the app is client-component
heavy with no `middleware.ts`) and is the only true security patch in the set.

Already handled by PR #3 (`fix/prod-deploy-review`) and intentionally **excluded** here:
baked-in secrets, `/docs` healthchecks, `typescript.ignoreBuildErrors`, hardcoded
`NEXT_PUBLIC_API_URL`, auth race condition, missing `.dockerignore`s, `npm ci` pinning,
Firebase key mount.

---

## 2. Gap reference legend

| ID | Gap | Type | Severity | Evidence |
|----|-----|------|----------|----------|
| **G1** | Next.js `14.1.0` ships CVE-2025-29927 code | Breaking/Security | High* | `frontend/package.json:28` |
| **G2** | `DEPLOYMENT.md` systemd launches **dev** compose in prod | Config gap | High | `docs/DEPLOYMENT.md:268,292` |
| **G3** | `debug: bool = True` default (drives SQL echo in prod) | Config gap | High | `backend/config.py:38` (consumed `database.py:15,22`, `services/demo_mode.py:51,57`) |
| **G4** | `secret_key` insecure hardcoded default — and **dead** (no consumers) | Config gap | Med-High | `backend/config.py:39` |
| **G5** | CORS hardcoded to `localhost:3000` (no prod origin) | Config gap | Medium | `backend/main.py:31-40` |
| **G6** | Deprecated Pydantic v1 `class Config` | Deprecated method | Medium | `backend/config.py:41` |
| **G7** | `DEPLOYMENT.md` Firebase env var / path mismatch vs compose | Config gap | Medium | `docs/DEPLOYMENT.md:132` vs `docker-compose.prod.yml:10` |
| **G8** | Vulnerable **and unused** `python-jose` / `passlib` in lockfile | Dependency hygiene | Medium | `backend/requirements.txt:20-21` |
| **G9** | FastAPI ~29 minors / firebase-admin 1 major behind | Currency | Medium | `backend/requirements.txt:2,15` |
| **G10** | React 18 / Next 14 currency (couples to G1-full) | Currency | Low-Med | `frontend/package.json:28,31` |
| **G11** | Two unused drag-drop libs (bloat) | Hygiene | Low | `frontend/package.json:23,30` |

`*` **G1 severity is calibrated down** by an absent `middleware.ts`: the CVE only has a
live exploit path when a security check runs in Next.js middleware (confirmed by the
official advisory). CALIPAR has none, so it is **High-latent, not currently exploitable** —
but the vulnerable code still ships and the risk goes live the moment any `middleware.ts`
is added, so the bump is still the right first move.

---

## 3. Wave 0 — Pre-flight (decisions + safety net, ~30 min)

| Step | Action |
|------|--------|
| 0.1 | **Land PR #3 first**, then branch Wave 1 off fresh `main` as `fix/nextjs-cve-and-config-hardening`. Don't entangle a security bump with an in-review PR. |
| 0.2 | **Verification gate** (run before/after each wave): `cd frontend && npx tsc --noEmit && npm run build`; `cd backend && pytest`; `docker compose -f docker-compose.prod.yml config`; plus `npm audit` and `pip-audit` for dependency waves. |
| 0.3 | **Resolve input for G5:** in production, is the browser calling the backend **same-origin** (proxy routes `/api`→backend under one domain) or **cross-origin** (e.g. `app.calipar.site` → `api.calipar.site`)? Sets the correct CORS origins. Blocks Wave 2 / Step 5 only. |

---

## 4. Wave 1 — Security & fail-safe defaults (fast, high-value, low-risk — one PR)

| # | Gap | Concrete change | Files | Verify |
|---|-----|-----------------|-------|--------|
| 1 | **G1** 🔴 | Bump **Next.js `14.1.0` → latest `14.2.x`** — clears CVE-2025-29927. Near-zero migration (client-heavy app, no `middleware.ts`). | `frontend/package.json`, `package-lock.json` | `npm ci && npm run build`, `tsc --noEmit` |
| 2 | **G8** | **Remove** unused `python-jose` + `passlib[bcrypt]` (grep-confirmed: zero imports; clears CVE-2024-33663/33664). | `backend/requirements.txt` | `pip-audit`, `pytest`, image rebuild |
| 3 | **G3** | `debug` default **`True` → `False`**. Confirm prod `.env` sets `DEBUG=false`. | `backend/config.py:38` | `settings.debug` consumers still resolve |
| 4 | **G4** | **Delete** the dead `secret_key` line (no consumers). | `backend/config.py:39` | grep confirms no references |

> Steps 2–4 touch only `config.py` + `requirements.txt` → one tiny, easily-reviewed commit.
> **This wave eliminates 3 CVEs and both fail-open defaults.**

### Wave 1 — execution result (2026-06-24)

- **Pinned `next` 14.1.0 → `14.2.35`** (the ceiling of the 14.x line; CVE-2025-29927
  is patched at 14.2.25). `eslint-config-next` bumped to match. **`npm run build` ✅
  (18/18 routes), `tsc` clean for the changed files.** CVE-2025-29927 confirmed **gone**
  from `npm audit`.
- **`npm audit` surfaced a residual wall of newer Next.js advisories** (mostly DoS via
  Server Components / Image Optimizer; some XSS/SSRF/cache-poisoning) that affect the
  **entire 14.x line** — every one is fixed only in **`15.5.16+`** (npm's suggested fix is
  `next@16.2.9`, semver-major). **These cannot be cleared within 14.x**, so they are
  deferred to **Wave 4** (major upgrade). Severity for CALIPAR is lower: most are DoS, and
  several require features the app doesn't use (Pages Router i18n, WebSocket upgrades).
  → This **strengthens the Wave 4 priority** from "future-proofing" toward "security currency."
- **Removed `python-jose` + `passlib`** (zero imports; clears CVE-2024-33663/33664).
  Full `pip-audit` should run in CI (it can't build `psycopg2-binary` from source in this
  sandbox).
- **`debug` default → `False`** (4 SQL-`echo` consumers intact); **deleted dead `secret_key`**.
- **Caveat (Wave 0.1 entanglement):** branched off `main` *before* PR #3 merged, so `tsc`
  still reports the **two pre-existing TS errors PR #3 fixes** (`admin/users` Badge variant,
  `forgot-password` auth null-guard) — untouched by this wave, and build-ignored on `main`
  via the still-present `ignoreBuildErrors: true`. Land PR #3 to clear them.

---

## 5. Wave 2 — Configuration correctness (one PR)

| # | Gap | Concrete change | Files |
|---|-----|-----------------|-------|
| 5 | **G5** | Make CORS origins **env-driven** — add a `cors_allow_origins` setting (comma-split), feed it to `CORSMiddleware`; set prod value per the Wave-0 topology answer. Remove hardcoded `localhost:3000`. | `backend/main.py:31-40`, `backend/config.py` |
| 6 | **G2** 🟠 | Repoint DEPLOYMENT.md systemd units + commands to **`docker-compose.prod.yml`** (currently launch the *dev* compose → `--reload` + dev DB password in prod). Fix the stale `calipar/generations/calipar_app` path. | `docs/DEPLOYMENT.md:75,267-269,291-293` |
| 7 | **G7** | Reconcile Firebase creds: guide says `FIREBASE_SERVICE_ACCOUNT_PATH=./backend/secrets/…`; real compose reads **`FIREBASE_CREDENTIALS_PATH=./config/firebase-service-account.json`**. Make doc + `.env.example` match the compose. | `docs/DEPLOYMENT.md:129-133`, `.env.example` |
| 7b | (adjacent) | Flag for ops: prod compose services carry **no reverse-proxy routing labels** on the external `proxy` network — confirm routing is defined elsewhere, else the proxy can't reach them. | `docker-compose.prod.yml:42-44` |

---

## 6. Wave 3 — Deprecations & currency (deliberate, test-gated — one PR, can split)

| # | Gap | Concrete change | Verify |
|---|-----|-----------------|--------|
| 8 | **G6** | Migrate `class Config` → `model_config = SettingsConfigDict(...)`; drop now-redundant `os.getenv` defaults (pydantic-settings reads env natively). Deprecated now; primary docs do **not** commit to a V3 removal date, so low urgency but trivial. | `pytest`, app boots |
| 9 | **G9** | Bump **FastAPI `0.109.2` → current `0.13x`** (3.11 base supports it), **firebase-admin `6.4.0` → `7.x`** (review 7.0 breaking notes), **pydantic/pydantic-settings** to latest 2.x, **firebase JS `12.6.0` → `12.15.0`** (patch). | `pytest` + full `npm run build` after each |
| 10 | **G11** | Remove **both** unused DnD libs (zero imports) — or keep only `@hello-pangea/dnd` if drag-drop is roadmapped. | `npm run build` |

> Keep Step 9's dependency bumps **separate from Wave 1's security fix** so a regression
> in a routine bump can't block the CVE patch.

---

## 7. Wave 4 — Major upgrades (separate epic, schedule deliberately)

| # | Gap | Scope | Notes |
|---|-----|-------|-------|
| 11 | **G1-full / G10** | **Next 14.2 → 15 → 16** + **React 18 → 19** via `npx @next/codemod@canary upgrade`. | App Router adopts React 19; async-dynamic-API codemod is low-impact here (client-heavy), **but Next 16 *removes* the sync fallback** so the migration becomes mandatory at 16. Review the uncached-by-default caching change. Multi-day. |
| 12 | Optional hardening (adjacent, not in verified gaps) | (a) gunicorn-managed uvicorn workers vs current `--workers 2`; (b) **Alembic migrations** instead of `create_db_and_tables()` at startup (`backend/main.py:18`); (c) `/api/health` checks DB connectivity (HANDOFF §6). | Load-test (a) before changing. |

---

## 8. Sequencing rationale (dependency graph)

```
Wave 0 (merge #3, gates, CORS input)
   └─> Wave 1  [SECURITY] ── ships alone, fastest, lowest risk
          └─> Wave 2  [CONFIG] ── needs Wave-0 CORS answer
                 └─> Wave 3  [CURRENCY] ── deliberate, test-gated
                        └─> Wave 4  [MAJOR UPGRADE] ── separate epic
```

| Wave | Effort | Risk | Value | Ship priority |
|------|--------|------|-------|---------------|
| 1 — Security & defaults | ~1–2 hrs | Low | **Highest** (3 CVEs + 2 fail-open defaults) | **Do first** |
| 2 — Config correctness | ~2–3 hrs | Low | High (prevents dev-stack-in-prod) | Next |
| 3 — Deprecations/currency | ~Half-day | Medium | Medium | Soon |
| 4 — Major upgrades | Multi-day | Medium-High | Medium (future-proofing) | Scheduled epic |

---

## 9. Provenance (verified Source of Truth, as of June 2026)

All security/breaking claims below were confirmed against primary sources (GitHub
Advisory DB, NVD, official vendor docs). Independently corroborated by direct
WebFetch verification and a 3-vote adversarial deep-research workflow run.

| Fact | Verdict | Primary source |
|------|---------|----------------|
| CVE-2025-29927 affects Next 14.x `< 14.2.25` (14.1.0 vulnerable); CVSS 9.1; patched 12.3.5/13.5.9/14.2.25/15.2.3 | CONFIRMED | github.com/advisories/GHSA-f82v-jwr5-mffw · nvd.nist.gov/vuln/detail/CVE-2025-29927 · vercel.com/blog/postmortem-on-next-js-middleware-bypass |
| Bypass impact conditional on auth in middleware; whole middleware layer bypassed | CONFIRMED | GHSA-f82v-jwr5-mffw |
| Self-hosted (next start / standalone) NOT auto-mitigated; only Vercel was | CONFIRMED | Vercel postmortem |
| Next 15 App Router → React 19; Pages Router keeps React 18 (not a blanket minimum) | CONFIRMED | nextjs.org/blog/next-15 |
| `cookies/headers/draftMode/params/searchParams` async in 15; sync fallback removed in 16 | CONFIRMED | nextjs.org/blog/next-15 |
| python-jose 3.3.0 affected by CVE-2024-33663 (CWE-327) / CVE-2024-33664; fixed 3.4.0 | CONFIRMED | github.com/advisories/GHSA-6c5p-j8vq-pqhj |
| Pydantic `class Config` deprecated in V2 (→ `model_config`); V3 removal **not** stated in primary docs | CONFIRMED (deprecation) / UNCONFIRMED (V3 timeline) | pydantic.dev migration guide |
| google-genai is the current official SDK; google-generativeai deprecated | CONFIRMED (web search) | github.com/google-gemini/deprecated-generative-ai-python |
| Current latest (Jun 2026): Next ~16.2.x · FastAPI 0.138.0 · firebase-admin(Py) 7.4.0 · firebase JS 12.15.0 | CONFIRMED (web search) | PyPI / npm |
| FastAPI prod: multiple workers (gunicorn+uvicorn or 1/container); no `--reload` | CONFIRMED (web search) | fastapi.tiangolo.com/deployment/server-workers |

> Note: rows marked "web search" were single-source verified; the GHSA/NVD/nextjs.org
> rows were verified against primary documents directly.
