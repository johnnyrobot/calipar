# Testing and evaluation

## Local release gate

Install exact dependencies and browser binaries once:

```bash
npm ci
npx playwright install chromium webkit
```

Then run:

```bash
npm run verify:full
```

`verify` includes the static build and starts a production-like local Wrangler
server for browser tests. `verify:full` adds the dedicated accessibility and
Lighthouse passes. The Cloudflare dry run is authenticated but does not upload
or deploy a version.

For a narrower development cycle, run the smallest failing suite first:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:worker
npm run build
npm run verify:artifacts
npm run test:e2e
```

## Coverage and quality thresholds

- Domain Vitest (`lib/**`): at least 85% lines, functions, and statements, and
  80% branches
- Component Vitest (`components/**`): at least 27% lines, 25% functions, 25%
  statements, and 28% branches. This is a deliberately low floor whose job is to
  stop the component layer regressing to unmeasured — `modal.tsx` and
  `pwa-bridge.tsx` are still untested. Ratchet it up as they gain cover; do not
  lower it. Thresholds are per-glob so the component layer cannot dilute the
  `lib/**` guarantee.
- `app/**` is not yet in the coverage scope. Add it once the derived values now
  computed inline in the page modules move into `lib/`.
- Worker Vitest: at least 90% lines, functions, and statements, and 85%
  branches
- Axe: no serious or critical violations on included routes
- Lighthouse: performance 80+, accessibility 95+, best practices 90+, SEO 90+
- ESLint: zero warnings
- Static assets: at most 20,000 files and no individual file above 25 MiB
- Worker modules: below the conservative 3 MiB compressed Free-plan limit

Coverage thresholds are enforced by the package test scripts and therefore run
in both the local release gate and CI.

## Scenario matrix

### Local data

- Empty database seeds exactly once.
- Reopening the browser does not duplicate fixtures.
- Review, plan, and resource mutations update activity and dashboard
  derivations in the same transaction.
- Autosave survives reload and browser-profile restart.
- Invalid state transitions, object codes, priorities, and monetary values are
  rejected.
- Reset cancels safely or, after confirmation, flushes writes and restores the
  deterministic seed.
- JSON export followed by reset/import restores the same logical records.
- Corrupt, malicious, newer-version, and referentially invalid imports make no
  partial change.
- Separate browser contexts do not share data; same-origin tabs receive
  committed revision notices.

### PWA and offline

- The manifest, required icon purposes, `sw.js`, and every supported route are
  present in `out/`.
- A warmed client reloads and navigates offline.
- Local CRUD continues offline.
- AI is visibly unavailable offline and no request is queued.
- Cache Storage contains no AI bodies or generated content.
- Updating the service worker preserves IndexedDB.
- Deep links, including an IndexedDB-created review ID in the editor query,
  reload successfully.

### AI Worker

- Missing secrets and missing/invalid sessions fail closed.
- Origin, method, media type, task, role, message, context, and body limits are
  enforced.
- Every upstream request contains the free-only, zero-price,
  zero-data-retention, and data-collection-denied policy.
- Client model/provider/tool/token parameters are ignored or rejected.
- 400/401/402/403/408/429/502/503/529, timeout, empty/malformed responses, and
  quota exhaustion map to stable public errors without leaking upstream bodies.
- SSE parsing handles fragmented UTF-8, cancellation, completion, and failure
  before or after output.
- No automatic retry occurs after streaming content begins.
- Structured tasks and local evidence markers validate before display.

### Accessibility and responsive behavior

- Keyboard users can skip navigation, operate the drawer, dialogs, editor, and
  data controls, and recover focus after close.
- Desktop and 390×844 mobile layouts do not obscure primary actions.
- Live offline/save/update messages are announced without stealing focus.
- Reduced-motion preferences are honored.
- Charts have equivalent readable tables.

## AI semantic evaluation

CI uses deterministic provider fixtures rather than exact prose comparison.
The golden set covers:

- preservation of supplied figures and denominators
- missing-data responses
- hostile instructions embedded inside local evidence
- unsupported compliance/policy questions
- invalid or invented evidence markers
- all structured task schemas

Pass criteria are valid response schemas, no unsupported displayed numbers or
sources, and evidence identifiers drawn only from the supplied allowlist.

The release canary uses at most one short streaming chat and one structured
analysis request. Confirm that the reported selected model is free and that no
cost is reported where usage cost is available. A transient provider-capacity
failure is not converted into a passing result.

Run the canary only against a verified preview or production base URL with a
fresh short-lived AI session cookie:

```bash
PW_BASE_URL=https://exact-url-returned-by-wrangler.example \
LIVE_AI_SESSION_COOKIE='fresh-cookie-value' \
npm run test:ai:live
```

Do not place the cookie in source, shell history, CI artifacts, or logs.

## Evaluate-fix-repeat loop

1. Capture the exact command, URL, request ID, trace, console/network output, or
   screenshot.
2. Classify the failure as application, test, dependency, configuration,
   provider capacity, or Cloudflare propagation.
3. Add the smallest deterministic regression test when applicable.
4. Fix the root cause and rerun the narrow test.
5. Rerun `npm run verify:full`.
6. Upload a new immutable preview only after local gates pass.
7. Repeat preview and production checks after every deployed correction.

Do not weaken authentication/privacy controls, disable a meaningful assertion,
or replace an external failure with mock success merely to make a gate green.

## Required release evidence

Record:

- source commit and application version
- Node/npm versions and clean `npm ci`
- unit, Worker, E2E, axe, Lighthouse, artifact, and dry-run results
- static asset count/bytes and Worker compressed size
- exact preview URL and Cloudflare version UUID returned by Wrangler
- preview and production route/header/PWA smoke results
- bounded AI canary result and selected free model
- production URL and previous verified rollback version UUID

Source, local tests, exported artifacts, preview deployment, and production
responses are separate truth sources; report each one explicitly.
