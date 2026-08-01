# AGENTS.md

This file applies only to `/Users/laccd/code/calipar/calipar_pwa_demo`.
Do not modify the parent CALIPAR application or any sibling checkout unless the
user explicitly expands the scope.

## Project purpose and boundary

This directory is a standalone, public, no-login CALIPAR demonstration PWA.
It is not an authentication bypass or deployment mode for the parent
Next.js/FastAPI/PostgreSQL/Firebase application. The demo uses synthetic data,
stores its workspace in the visitor's browser, and optionally sends explicit
AI requests through a same-origin Cloudflare Worker.

Preserve these product boundaries:

- No Firebase login, FastAPI dependency, PostgreSQL database, Gemini key, or
  production CALIPAR user data.
- One demo Program Review Lead persona; no admin, PROC, or production role
  simulation.
- IndexedDB is the system of record for reviews, plans, resources, activity,
  preferences, and chat. Do not add a server-side application database.
- Seed data must remain synthetic. Do not introduce student-level, employee,
  confidential, regulated, or institution-owned records.
- Keep CALIPAR branding and the BSD-3-Clause branding requirements.

The current implementation and release status are documented in
`HANDOFF.md`. Read it before making changes or claiming release readiness.

## Stack and important paths

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS v3.
- Static export from `next.config.ts` to `out/`.
- Serwist service worker source in `app/sw.ts`; generated worker at `out/sw.js`.
- Browser repository and IndexedDB schema under `lib/db/`.
- Domain types, validation, and derived values under `lib/domain/`.
- Import sanitization under `lib/utils/sanitize.ts`.
- Cloudflare Worker and AI policy in `worker/index.ts`.
- Cloudflare Workers Static Assets configuration in `wrangler.jsonc`.
- Browser tests under `tests/e2e/` and `tests/a11y/`.
- Worker contract tests in `tests/worker/ai-worker.test.ts`.
- Release scripts under `scripts/cloudflare/` and artifact checks under
  `scripts/verify/`.

## Setup and commands

Use Node.js 20.9 or newer and earlier than Node 23, with npm 10 or newer.
Install the lockfile exactly:

```bash
npm ci
```

Development frontend:

```bash
npm run dev
```

Production-like static assets plus Worker routing:

```bash
npm run build
npm run preview
```

Primary checks:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:worker
npm run build
npm run verify:artifacts
npm run cloudflare:limits
npm run cloudflare:dry-run
npm run test:e2e
npm run test:a11y
npm run test:lighthouse
```

`npm run verify:full` is the release gate. A narrow passing suite is not a
substitute for the complete gate. Record environmental or flaky failures
separately, but do not call the release green while any required gate fails.

## Local-data invariants

- Repository mutations and corresponding activity records must commit in one
  transaction.
- Dashboard metrics must be derived from stored domain records, not parallel
  hard-coded UI arrays.
- Reset must flush pending writes, require confirmation, clear domain and chat
  records, and deterministically reseed the workspace.
- Exported backups are versioned, unencrypted JSON. Import is replace-only,
  validates the complete graph, sanitizes text, offers a pre-import backup,
  and must leave the database unchanged on failure.
- Keep `/reviews/editor/?id=<local-id>` statically exportable; do not reintroduce
  a runtime dynamic route for browser-created IDs.
- Service-worker updates and normal application upgrades must not silently
  delete IndexedDB data.

## AI, privacy, and security invariants

The browser must never receive or store `OPENROUTER_API_KEY`,
`AI_SESSION_SECRET`, or `TURNSTILE_SECRET_KEY`. Secrets belong in local
`.dev.vars` or Cloudflare secret bindings only. Never print, copy into test
artifacts, add to source, or pass a secret as a command-line argument.

The Worker must remain a fixed task proxy, not a generic OpenRouter relay:

- Request `openrouter/free` and accept only `openrouter/free` or a returned
  model ending in `:free`.
- Enforce zero maximum prompt, completion, and request prices.
- Require zero-data-retention routing and deny provider data collection.
- Do not relax privacy or free-only policy when compatible capacity is
  unavailable.
- Do not accept browser-selected providers, models, tools, token limits, URLs,
  or pricing policy.
- Require same-origin request checks, a verified short-lived Turnstile-backed
  session cookie, and rate limiting before AI work.
- Keep AI and session responses `Cache-Control: no-store`; `/api/*` is
  `NetworkOnly` in the service worker.
- Never log prompts, selected local evidence, chat content, cookies, tokens,
  secrets, raw IP addresses, or full upstream error bodies.
- Bound request bodies before full buffering. Bound SSE output, structured
  response bytes, field lengths, item counts, and aggregate output before
  returning or storing it.
- Treat imported workspace/chat text and provider output as untrusted. Render
  through safe React/Markdown paths and sanitize any HTML-bearing content.
- Do not automatically send the full workspace. Every AI request must disclose
  and limit the prompt/history/context it transmits.

The app must state the AI exception accurately: workspace data is local, but
explicit prompts, included chat history, and selected context leave the device
through Cloudflare, OpenRouter, and a routed provider.

## PWA and deployment rules

- Deploy this directory only, using one Cloudflare Worker with Static Assets.
- `assets.run_worker_first` stays restricted to `/api/*`; normal static assets
  should bypass Worker execution.
- Do not publish `openrouter-llms-full.txt`, `.dev.vars`, source maps, test
  output, repository metadata, or local workspace exports.
- Do not infer a Cloudflare hostname, account, Worker ownership, version UUID,
  or preview URL. Use exact values returned by authenticated Wrangler commands.
- Preview upload, promotion, and rollback are separate explicit operations.
  Never promote an untested or rebuilt version in place of the tested preview.
- Secret creation and production deployment require explicit user approval.
- A passing dry run proves bundle compatibility only; it does not prove a live
  preview, live OpenRouter call, or production deployment.

## Testing expectations

For implementation changes, run the smallest relevant regression first, then
the complete affected gates. Before release, all of these must be true:

- TypeScript and zero-warning ESLint pass.
- Unit and Worker coverage thresholds pass.
- Static export, service worker, artifact secret scan, and Workers Free limits
  pass.
- Chromium desktop/mobile and WebKit workflows pass without unexplained
  flakes.
- Axe reports no serious or critical violations.
- Lighthouse meets the repository budgets.
- The active Codex Security scan is completed and sealed, or a new scan of the
  exact release snapshot replaces it.
- A live AI canary is run only against an authorized preview/production URL
  with a fresh session cookie and dedicated free-only provider key.

Do not weaken assertions, privacy controls, free-only enforcement, or user
disclosures to make a gate pass.

## Git and generated files

At the handoff captured in `HANDOFF.md`, this entire directory is untracked in
the parent `/Users/laccd/code/calipar` repository and has no nested `.git`.
Confirm current Git state before staging or committing; do not assume a clean
per-file diff exists. Do not commit generated directories such as `node_modules/`,
`.next/`, `out/`, `.wrangler/`, `.lighthouseci/`, or `test-results/`.

The workflow under `.github/workflows/` is a template. GitHub will not execute
it from this nested directory; moving it into the parent repository's root
workflow directory requires explicit approval.

## Safety and change discipline

- Preserve unrelated user changes.
- Use `rg`/`rg --files` for searches and `apply_patch` for hand edits.
- Do not delete or overwrite browser exports, release records, scan artifacts,
  or credentials without explicit approval.
- Do not claim deployment, live-model validation, security completion, or
  release readiness without direct evidence for that exact target and version.

