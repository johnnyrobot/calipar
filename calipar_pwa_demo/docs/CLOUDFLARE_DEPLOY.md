# Cloudflare release runbook

CALIPAR PWA is one Workers Static Assets application:

- Worker name: `calipar-pwa-demo`
- Static export: `out/`
- Worker entry: `worker/index.ts`
- Static files bypass Worker execution.
- Only `/api/*` invokes the Worker first.
- No Pages, D1, KV, R2, Durable Objects, or paid storage is used.

The scripts intentionally do not create a Worker, create secrets, infer a
`workers.dev` subdomain, or silently target an existing Worker.

`public/.assetsignore` is copied into `out/`, which is the location Wrangler
reads it from. The repository-root copy documents the same defense-in-depth
exclusions for tooling and review.

## Prerequisites

1. Install the lockfile exactly with `npm ci`.
2. Run `npm run build`; `out/` must include every route, `404.html`,
   `manifest.webmanifest`, and `sw.js`.
3. Run the complete application verification suite.
4. Commit the exact tested source. Preview upload refuses a dirty PWA tree.
5. Run `npx wrangler whoami` and verify the exact Cloudflare account.
6. In the Cloudflare dashboard, verify the account is on Workers Free and has
   no paid services enabled for this application.
7. Check whether `calipar-pwa-demo` already exists. Never overwrite an
   unrelated Worker with the same name.
8. Store `OPENROUTER_API_KEY`, `AI_SESSION_SECRET`,
   `TURNSTILE_SECRET_KEY`, and the public-but-deployment-specific
   `TURNSTILE_SITE_KEY` with `npx wrangler secret put`. Treating the site key as
   a Worker secret keeps it out of source while allowing the status endpoint to
   return it to the browser. Never paste any of these values into this
   repository or a command argument.

The dedicated OpenRouter key must be restricted to free routing and zero-cost
usage in OpenRouter. Secret creation is a manual, audited release step and is
not performed by these scripts.

For a brand-new Worker, the first preview upload establishes the verified,
previously unused Worker name without production traffic. Add the four
bindings immediately afterward, then upload and test a second immutable
preview. Only that fully configured second version is eligible for promotion.

## Validate without uploading

```bash
npm run cloudflare:limits
npm run cloudflare:dry-run
```

The checks fail if the static export is incomplete, includes forbidden files,
exceeds 20,000 assets or 25 MiB per asset, or produces more than a conservative
3 MiB gzipped Worker module total. Dry-run validation is deliberately local
and does not require Cloudflare credentials; upload, promotion, and rollback
all perform an authenticated account check.

## Upload an immutable preview

For a verified unused name:

```bash
CALIPAR_WORKER_INTENT=create \
CALIPAR_CONFIRMED_NEW_WORKER=calipar-pwa-demo \
npm run cloudflare:preview
```

For the CALIPAR Worker that this repository already owns:

```bash
CALIPAR_WORKER_INTENT=update \
CALIPAR_CONFIRMED_EXISTING_WORKER=calipar-pwa-demo \
npm run cloudflare:preview
```

Creation mode refuses to continue if Wrangler can read existing deployments.
It proceeds only when Wrangler returns an explicit not-found result. Update
mode refuses to continue unless existing deployments can be read.

The upload uses `wrangler versions upload --strict` and a
`validation-<git-sha>` preview alias. It does not change production traffic.
It embeds the full Git SHA and `package.json` version in that immutable Worker
version; promotion does not rebuild or replace them.
Wrangler's exact version ID and preview URL are captured under
`.wrangler/release/`; the script never synthesizes either value.

Test that exact preview with browser-like GET requests, route/deep-link checks,
PWA installation/offline checks, security/header inspection, and the bounded
live OpenRouter canary.

## Promote the tested version

Copy the exact UUID returned by the preview command:

```bash
CALIPAR_PROMOTE_WORKER=calipar-pwa-demo \
npm run cloudflare:promote -- 00000000-0000-0000-0000-000000000000
```

The script verifies the version exists remotely, runs a deployment dry run,
and then assigns exactly 100% traffic to that version. It does not rebuild.

After promotion, record the production URL returned by Cloudflare and verify
it directly. Never construct a URL from the Worker or account name.

## Roll back

Use the exact previously verified version UUID:

```bash
CALIPAR_ROLLBACK_WORKER=calipar-pwa-demo \
npm run cloudflare:rollback -- 00000000-0000-0000-0000-000000000000
```

The script verifies the version exists, performs the explicit rollback, and
records the resulting deployment list. Re-run production GET, PWA, and API
health checks after rollback.
