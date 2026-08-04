# Handoff — calipar_pwa_demo

**Written:** 2026-07-31 23:15 (America/Los_Angeles)
**Workspace:** `/Users/laccd/code/calipar/calipar_pwa_demo`
**Git repo root:** `/Users/laccd/code/calipar` (the demo has no nested `.git`)
**Branch:** `feat/pwa-demo-workspace-seam`, pushed to `origin`. At the time of writing HEAD was `16ec12d`; the commit that added this file to the repo comes after it.
**Next session focus:** architecture candidate 1 — give workspace derivations an interface

---

## Read these first, in this order

Do not re-derive what these already say.

| Path | What it gives you |
| --- | --- |
| `calipar_pwa_demo/CLAUDE.md` | Commands, architecture, conventions, gotchas. Written this session. |
| `calipar_pwa_demo/AGENTS.md` | Binding product, privacy, security and release rules. Pre-existing; treat as constraints, not suggestions. |
| `calipar_pwa_demo/HANDOFF.md` | Release status and open blockers. Updated this session — the WebKit section and the E2E-under-load warning are new and load-bearing. |
| `calipar_pwa_demo/docs/TESTING.md` | Coverage thresholds, now per-glob. Updated this session. |
| `git show c5d1518` | Everything built this session, with the confirmed root-cause hypothesis in the message. |

---

## State

**Green:** `typecheck`, `lint` (zero-warning), `test:unit` (9 files / 58 tests), `test:worker` (1 file / 29 tests), `build` (51 precached URLs), `verify:artifacts` (156 assets, digest `d62c4f88c6966002`), **full `test:e2e` 37 passed / 5 skipped / 0 failed**.

**Still blocking release** (4 of the original 5 in `HANDOFF.md`): five serious/critical axe failures, Lighthouse budget failures on `/` and `/dashboard/`, the unsealed Codex Security scan, and no Cloudflare preview or live AI canary. Nothing this session touched any of them.

**Working tree is clean.** The commit is local only — nothing pushed, no PR.

---

## What happened this session

Four things, in order. Only the last matters for what comes next.

1. `/init` wrote `CLAUDE.md`.
2. `/setup-matt-pocock-skills` configured the tracker as **local markdown under `.scratch/<feature-slug>/`** (see `docs/agents/issue-tracker.md`), default triage labels, single-context domain docs. `.scratch/` is gitignored, so tickets stay local.
3. `/diagnosing-bugs` resolved the WebKit editor-opening failure. Root cause and both fixes are written up in `HANDOFF.md` under "WebKit editor-opening race — resolved". It was a latch-at-mount deadlock, not a flake.
4. `/improve-codebase-architecture` produced five candidates; candidate 3 was grilled and built. Candidates 1, 2, 4, 5 remain — preserved below because the report file is volatile.

---

## Next session: candidate 1 — give workspace derivations an interface

**The problem in one line:** `lib/domain/selectors.ts` has zero call sites, while every page reimplements its job inline and the copies have already drifted apart.

**Two divergences are shipping today.** Both are real user-visible inconsistencies, not theoretical:

- `app/(demo)/data/page.tsx:8-10` defines a local `rate()` rounding to **one** decimal. `lib/db/repository.ts:850` `safeRate` rounds to **two**. The same underlying rate renders differently on `/data/` than on `/dashboard/`.
- `app/(demo)/resources/page.tsx:27` sums **all** resource requests. `lib/db/repository.ts:911-916` `requestedAmountCents` sums only `requested` + `recommended`. The dashboard's "RESOURCE PIPELINE" figure and the resources page's "REQUESTED" figure disagree.

**Most-duplicated expression** — the completed-section count, 6 copies:
`app/(demo)/dashboard/page.tsx:90`, `app/(demo)/reviews/page.tsx:58`, `app/(demo)/chat/page.tsx:121`, `components/review-editor.tsx:145`, and structurally again inside `app/(demo)/dashboard/page.tsx:33`.

**Other inline derivations worth folding in:**

- `app/(demo)/planning/page.tsx:84`, `:86`, `:98` — the same status filter runs **three times per column**.
- `app/(demo)/data/page.tsx:18-20` reimplements `selectAnalyticsForOrganization` / `deriveAnalyticsTrend`; `:23-25`, `:29-37`, `:96`, `:106` re-derive the same three rates four more times.
- `app/(demo)/resources/page.tsx:76` reimplements `selectResourcesForReview` minus its `reviewId` filter and title tiebreak.
- `app/(demo)/dashboard/page.tsx:88` `data.reviews.slice(0, 4)` is **unsorted** — `getWorkspaceSnapshot` returns raw IndexedDB order, while `listReviews` (`lib/db/repository.ts:265-269`) sorts by `updatedAt` desc. "Reviews in motion" is in arbitrary order.
- `app/(demo)/chat/page.tsx:118` and `:231` compute `reviews.slice(0, 3)` independently — the "what Mission-Bot can see" sidebar and what is actually sent are two separate expressions that could diverge.
- Currency formatter duplicated with identical `Intl` options under two names: `app/(demo)/dashboard/page.tsx:8-14` (`money`) and `app/(demo)/resources/page.tsx:11-13` (`currency`).
- `components/review-editor.tsx:200` gates submission on `completion < 6` while `lib/db/repository.ts:399` exports `validateReviewSubmission`, which the editor never calls.

**Why `/grill-with-docs` and not plain `/grilling`:** this is substantially a naming problem — what the derivations are called becomes the project's domain vocabulary. There is **no `CONTEXT.md` and no `docs/adr/`** in this repo yet. `/grill-with-docs` writes them as decisions crystallise. `docs/agents/domain.md` already tells agents where to look.

**Scope judgement:** one module, roughly 8 call sites. Fits one context window — go `/grill-with-docs` → `/implement` and skip `/to-spec` + `/to-tickets`.

**Sequencing note:** `app/**` is deliberately outside the coverage scope until this candidate lands, because it moves logic out of the page modules. See `docs/TESTING.md`. Once candidate 1 is done, add `app/**/*.tsx` to `include` in `vitest.config.ts` with its own glob threshold.

---

## Remaining candidates, preserved

The full report, with before/after diagrams for each candidate, is at
`docs/architecture-reviews/2026-07-31-deepening-candidates.html` — open it in a browser.
The substance is repeated here so this document stands alone. Stated order of
work: 1, then 2, then 4 and 5.

### Candidate 2 — put the commit invariant behind an interface (`Strong`)

`lib/db/repository.ts:333, 412, 473, 534, 603`. Five mutators each hand-roll the identical six-step body: fetch existing → revision check → referential validation → schema parse with `revision + 1` → `transaction("rw", <table>, activities)` put + activity → `publish(...)`.

`AGENTS.md` states this as a hard rule ("mutations and corresponding activity records must commit in one transaction"), but it is enforced by copy-paste across five sites. A sixth mutator can silently omit the activity or the publish.

Call-site evidence:
- `expectedRevision` is passed at only **3 of 9** mutation sites.
- `app/(demo)/planning/page.tsx:65` passes it with **no handler** for the `CONFLICT` it can raise.
- `app/(demo)/resources/page.tsx` never passes it on any path.
- `app/(demo)/chat/page.tsx:109` writes outside its own `try`; since `send` is invoked as `void send()`, a failure is an unhandled rejection with no UI.
- The catch-and-stringify idiom is written **12 times**, while `components/workspace-provider.tsx` already has it extracted as `errorMessage()` — still not exported.
- `app/(demo)/planning/page.tsx:29` and `app/(demo)/resources/page.tsx:26` duplicate the same "which review am I attached to" heuristic verbatim.

### Candidate 4 — give the free-only / ZDR policy its own interface (`Worth exploring`)

`worker/index.ts:574, 591, 628, 656-666, 756, 853-862`. The product's central safety claim is six checks spread across the file, reachable only by constructing a Request, minting a signed cookie and stubbing global `fetch`.

**Important:** `worker/index.ts` is **already deep** — a 2-function external interface (`handleRequest`, `worker.fetch`) over 1352 lines. Do not break it up. The proposal is an *internal* seam, private to the implementation and used by its own tests. Nothing new gets exported.

Costs today: every authenticated test round-trips `/api/ai/session` with a faked Turnstile just to mint a cookie, which offsets the fetch stub so assertions index `mock.calls[1]`. The four-arm `task` switch is restated 4× (schema, prompt, validator, token limit). The `AIErrorPayload` envelope is hand-rebuilt 3× at `worker/index.ts:82`, `:816`, `:1278`.

### Candidate 5 — one SSE codec instead of two implementations (`Worth exploring`)

`worker/index.ts:770, 893-902` and `lib/ai/client.ts:198-219` implement the same wire format twice — the buffering loop is verbatim in both, as are the "stream ended before completion" error and message. Event names are string literals on both sides despite `ChatStreamEvent` existing at `lib/ai/contracts.ts:128-132`. Each side is verified by its own hand-written string fixtures with nothing linking them.

Also worth knowing: `lib/ai/contracts.ts` `AI_LIMITS.historyMessageCharacters` is 2,000 while `ChatMessageSchema.content` in `lib/domain/types.ts:218` allows 20,000 — a stored chat message can be 10× what the worker will accept back as history.

### Not a candidate, but a live bug

`components/pwa-bridge.tsx` keeps its `offline` state private and exports no hook or context. So `components/review-editor.tsx:148` reads `navigator.onLine` **during render** with no subscription to `online`/`offline` events. The "Help me draft" button's disabled state only updates when something else happens to re-render the component.

---

## Environment traps that cost time this session

Only the first is written up in `HANDOFF.md`; the rest are here.

1. **Host load invalidates E2E verdicts.** Three consecutive runs gave 10%, 33% and 100% failure rates purely because load reached 48 (Spotlight `mds_stores` and a VM, not the tests). The same suite was clean at load 7. Run `uptime` before trusting any E2E result. **Never raise `--workers` above the configured 2** — `playwright.config.ts:11-14` explains why; it starves workerd and manufactures failures that look like application bugs.
2. **A non-`multiple` `<select>` reports its first option's value when nothing matches.** This made a regression test pass against the very bug it was written for. Assert on what the submit handler passes to the repository, not on the rendered select value. Always verify a new regression test goes red against the reverted fix.
3. **Vitest 4 removed the `basic` reporter.** `--reporter=basic` fails to start.
4. **`--coverage.include` alone does nothing** — coverage must be enabled with `--coverage.enabled`.
5. **Testing Library auto-cleanup is not registered**, because `vitest.config.ts` does not set `globals: true`. Call `cleanup()` in `afterEach` yourself, or queries leak across tests.
6. **`react-hooks/set-state-in-effect` is an error under the zero-warning lint gate.** Setting state in an effect to sync from props will fail `npm run lint`. Derive instead — which is the better shape anyway and is the pattern both fixes this session used.

---

## Do not repeat these

- **Do not re-diagnose the WebKit editor flake.** Resolved, root cause documented, regression-covered.
- **Do not "fix" `components/review-editor.tsx:38-39` or `app/(demo)/reviews/new/page.tsx:23` back into `useState` initialisers.** The derived form is deliberate; both were latch-at-mount deadlocks.
- **Do not lower the `components/**` coverage floor.** It is a ratchet at 25/28/25/27, set just under the measured 28.11. Raise it as `modal.tsx` and `pwa-bridge.tsx` gain tests.
- **Do not weaken the `lib/**` thresholds.** They are held at exactly 85/85/85/80 and per-glob specifically so the new component layer cannot dilute them.
- **Do not commit `openrouter-llms-full.txt`.** 3.5 MB local reference dump, now gitignored. Re-download rather than committing.
- **Do not strip CALIPAR branding** — BSD-3-Clause with branding requirements.

---

## Open decisions for the user

1. ~~`.scratch/` is not gitignored.~~ Resolved in `16ec12d` — the local issue tracker directory is gitignored, so specs and tickets stay in the working copy.
2. ~~Nothing is pushed.~~ `feat/pwa-demo-workspace-seam` is pushed to `origin`. **No PR is open** — opening one is still a decision.
3. ~~The architecture report is in the OS temp dir.~~ Both it and this document now live under `calipar_pwa_demo/docs/` and are tracked.

---

## Suggested skills

Invoke in this order.

1. **`/grill-with-docs`** — start here, on candidate 1. Stateful: it creates `CONTEXT.md` and ADRs as terms and decisions settle, which is exactly what this candidate needs since naming the derivations *is* the design work. It will pull in `/domain-modeling` on its own when a term needs sharpening.
2. **`/implement`** — after grilling. Candidate 1 fits one context window, so skip `/to-spec` and `/to-tickets`. `/implement` drives `/tdd` internally and closes by running `/code-review` on the diff before committing.
3. **`/code-review`** — on its own if you want a pass over `c5d1518` before building further. It is a large first commit of a package that has never been reviewed in git.
4. Later, for candidates 2, 4 and 5: `/grill-with-docs` → `/implement` each. Candidate 4 needs `/codebase-design` vocabulary loaded first — the point is an *internal* seam, and it is easy to mistake it for "break up the worker", which would be wrong.

Do **not** reach for `/improve-codebase-architecture` again — it has already run and its output is preserved above. Do **not** reach for `/triage`: these candidates were not raised as incoming reports, so they are not triage input.
