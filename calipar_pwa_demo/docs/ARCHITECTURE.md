# Architecture

## Product boundary

`calipar_pwa_demo` is a separate static application and deployment target. It
may reuse CALIPAR's visual language and domain vocabulary, but it has no runtime
dependency on the parent frontend, FastAPI backend, PostgreSQL database,
Firebase project, or Gemini integration.

The demo represents one Program Review Lead. It intentionally omits login,
password recovery, user administration, production authorization, PROC
validation, notifications, and account-security controls. Seeded historical
records may show later review states, but an interactive demo user can only
edit a draft and submit it for review.

## Browser application

Next.js uses App Router with `output: "export"` and trailing-slash routes. A
fixed `/reviews/editor/?id=<id>` route supports browser-created IndexedDB IDs
without introducing a server-rendered dynamic segment.

IndexedDB is the system of record for:

- metadata and version state
- organizations and strategic initiatives
- reviews and their canonical section state
- action plans and resource requests
- aggregate analytics snapshots
- activity records
- preferences
- chat threads and messages

Repository operations own validation and transactions. A mutation and its
corresponding activity entry commit atomically. Dashboard values are derived
from the same records; UI components do not maintain shadow domain arrays.
`BroadcastChannel` communicates committed revisions, reset, and import events
to other tabs on the same origin.

## Offline and update model

Next.js first emits the complete `out/` static export. Serwist Configurator then
bundles `app/sw.ts`, injects a revisioned manifest derived from `out/`, and
writes `out/sw.js`.

The service worker precaches route shells and immutable application assets.
`/api/*` uses `NetworkOnly`, and application records remain in IndexedDB rather
than Cache Storage. A service-worker update does not clear or migrate browser
data outside the versioned database migration path.

The build and artifact verifiers fail if required routes, the manifest, or
`sw.js` are absent, if the injection placeholder remains, or if a secret-like
value or forbidden reference file enters `out/`.

## Cloudflare request routing

One Workers Static Assets deployment owns the Worker code and exact asset set:

```text
Request
├── /api/*  -> worker/index.ts
└── other   -> out/ static asset lookup
```

The configuration uses `run_worker_first: ["/api/*"]`; static asset requests
therefore do not consume Worker invocations. Missing static routes use the
exported 404 page rather than a single-page-application fallback.

The Worker exposes health/status, Turnstile session, and bounded AI task
routes. It does not expose a generic OpenRouter relay. It has no database,
durable state, queue, scheduled reset, or paid Cloudflare storage dependency.

## AI request flow

1. The user acknowledges the AI disclosure and completes managed Turnstile.
2. `/api/ai/session` verifies the single-use token and returns a short-lived,
   signed, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie.
3. A fixed AI task sends the user's prompt plus only the local evidence records
   explicitly selected for that request.
4. The Worker verifies origin, session, rate limit, body size, task schema,
   history length, and context limits.
5. The Worker adds its own system prompt and free/privacy provider policy, then
   calls OpenRouter.
6. Structured replies are schema-validated. Streaming replies use typed SSE
   events and do not retry after output begins.
7. The browser stores accepted generated review content or local chat history
   in IndexedDB.

Numbers, denominators, status totals, and equity gaps are calculated locally.
The model explains supplied facts; it is not trusted to calculate or invent
institutional metrics.

## Versioning

- `schemaVersion` controls IndexedDB/import compatibility.
- `seedVersion` controls deterministic demo fixture evolution.
- The package version describes the application release.
- The source commit identifies the tested tree.
- Cloudflare's Worker version UUID identifies the atomic deployed code/assets.

Record all five where applicable. Do not treat a successful local build as
evidence that a particular Cloudflare version is live.
