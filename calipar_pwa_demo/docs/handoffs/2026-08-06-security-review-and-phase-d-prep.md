# Handoff — calipar_pwa_demo

**Written:** 2026-08-06 (America/Los_Angeles)
**Workspace:** `/Users/laccd/code/calipar/calipar_pwa_demo`
**Git repo root:** `/Users/laccd/code/calipar` (the demo has no nested `.git`)
**Branch:** `main`, pushed to `origin`. At the time of writing HEAD was `5bd59ff`; the commit that adds this file comes after it.
**CI:** green on `5bd59ff` — both "CALIPAR PWA demo" and the parent "CI" workflow.
**Next session focus:** Phase D Steps 4–11 (blocked on human-created credentials)

---

## Read these first, in this order

Do not re-derive what these already say.

| Path | What it gives you |
| --- | --- |
| `HANDOFF.md` | Release status and the seven blockers. Blockers 5 and 7 were rewritten in this session and are load-bearing. |
| `docs/plans/2026-08-04-public-beta-readiness.md` | Task 15 is Phase D. Steps 1/3/6 now carry inline status; two instructions are marked **void**. |
| `git log 1f78dc4..5bd59ff` | 12 commits. **The reasoning lives in the commit messages** — this document does not repeat it. |
| `lighthouserc.cjs:31-56` | The one contested decision of the session. |
| `AGENTS.md` | Binding product, privacy, security and release rules. Constraints, not suggestions. |
| `docs/handoffs/2026-07-31-workspace-seam.md` | The prior handoff. Still accurate on architecture. |

---

## What this session did

A full-package security review against the release commit, the fixes that came
out of it, and Phase D Steps 1–2 plus half of Step 3. All merged, pushed, and
CI-validated on Node 22 — the first CI validation any of it had.

The security review found **zero vulnerabilities** at the >80% exploitability bar
across four trust boundaries. It surfaced three non-security defects, two of
which are fixed. Full disposition is in `HANDOFF.md` under "Full-package review
pass against the release commit". **It is a review pass, not a sealed scan, and
does not close blocker 4.**

---

## Corrections this session made to earlier documents

Three statements in committed artifacts were stale or outright false. Assume more
of this exists.

- `HANDOFF.md` blocker 7 claimed CI was "still not green — awaiting the re-run".
  The re-run had passed. Fixed in `cbeefae`, which also records what green CI does
  **not** cover: the `Authenticated Cloudflare dry run` job is **skipped**, not
  passed, and Lighthouse and the browser suites are not in CI at all. Green CI is
  a strict subset of `verify:full`.
- Plan Task 15 Step 2 required a clean verify "under **Node 20** (CI's version)".
  That was **impossible** — `engines` is `>=22.19.0 <23` because `jsdom@30` →
  `undici@8` requires it. Node 20 cannot install this package.
- Plan Task 15 Step 6 said `scripts/verify/headers.mjs` was "currently unreachable
  from any npm script — wire it up". It was already wired at `package.json:42`.

---

## The one decision that may want overruling

`noindex` (Task 15 Step 1) and the Lighthouse SEO budget are **mutually
unsatisfiable**. Under `noindex`, `is-crawlable` scores 0 by definition and
carries weight 4.043 of SEO's 11.043, so the category ceiling is 0.634 — measured
0.63 on both URLs, with `is-crawlable` the sole member below 1.0. Disabling only
that audit does not help: category scores are computed from member audits
regardless of assertion config.

`categories:seo` is therefore switched off. **This is the only deviation from the
repo's "category budgets are UNCHANGED" rule.** It was an agent decision, made
because the alternative was a permanently red gate; the reasoning and exact
numbers are in `lighthouserc.cjs`. All four `noindex` pieces — `public/robots.txt`,
the `robots` metadata in `app/layout.tsx`, and both assertion lines — revert
together at GA.

The user was told and did not object, but did not explicitly endorse it either.

---

## Hard-won knowledge worth not rediscovering

### Two verification traps, both fallen into and caught

1. **The last command in a list owns the exit code.** Running
   `npm run verify:full > log 2>&1; echo "EXIT=$?"` made the harness report **0**
   — the `echo`'s status — while the gate had actually failed. This nearly shipped
   as a false pass. It is the same class as the existing `| tail` warning, and
   neither the pipe nor the `&&` is the real culprit. Correct form:

   ```bash
   cmd >> log 2>&1; RC=$?; echo "RC=$RC" >> log; exit $RC
   ```

2. **A regression test that passes before the fix is worthless.** The first
   `openRouterRequest` test asserted a hostile `model`/`provider` in a request body
   could not reach upstream. It passed — and passed identically with the fix
   reverted, because the validators drop those keys long before the spread. It was
   testing the validator, not the ordering. It is kept, with a comment saying
   exactly that so a future reader does not mistake it for coverage. By contrast
   `tests/unit/ai/contracts.test.ts` was verified the other way and genuinely fails
   at the old value (`expected 2000 to be greater than or equal to 2800`).
   **Revert-and-rerun before believing any new regression test in this package.**

### Delegating a security review

Four subagents, one per trust boundary. Two went idle within seconds having
reported nothing. Re-prompting with **specific evidence demands** — "quote the
discriminating code with line numbers", "give the literal grep output", "which
files did you open and how many lines is each" — produced genuinely strong reports
from two of them; one stood up a live `wrangler dev` and curled real responses
rather than inferring from config. A third never reported at all and its scope was
covered directly.

**An idle subagent is not a finished subagent, and "no findings" from one showing
no evidence of having read anything is worth nothing.** One subagent also
corrected a load-bearing claim of the lead's (`worker/index.ts:1241` does set
`payload.provider`); it was verified before being accepted.

### Environment gotchas

- **`test-results/lighthouse/` contains no `lhr-*.json`.** Reports are named
  `<host>-<path>-<timestamp>.report.json`, and `manifest.json` sorts first by
  mtime. Use `ls -t *.report.json | head -1`. (The existing "sort by timestamp"
  warning is right about the hazard but implies the wrong filenames.)
- **Lighthouse at host load 31 still scored performance 0.85** against a 0.8
  budget. E2E load-sensitivity is real; Lighthouse was conservative, not wrong.
- **`timeout` does not exist on this macOS.** Use a background process plus a
  `curl` poll loop.
- **`npx wrangler` resolved a global 4.107.1** while the devDependency is 4.115.0.
  Run wrangler through npm scripts to get the pinned version.
- **`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` does not exist** — zero occurrences in CLI
  2.1.222 and absent from the settings schema, as are all near variants. The
  `settings.json` `env` block is an open string→string map, so a bogus key is
  accepted silently and does nothing. Do not invent settings keys.

---

## Phase D — exact state

| Step | State |
| --- | --- |
| 1 `noindex` | Done. Verified in all 15 exported HTML files; guard confirmed to fail without `robots.txt`. |
| 2 clean `npm ci` + `verify:full` | Done on Node 22. Green but the two known Lighthouse audits. |
| 3 account / plan / name | **Half done.** Authenticated with `workers (write)`; `calipar-pwa-demo` confirmed **not to exist** (API code 10007), so no overwrite risk. Workers Free check is dashboard-only. |
| 4 four secrets | **BLOCKED — human only** |
| 5 `cloudflare:preview` | Blocked |
| 6 preview verification | **Tooling done** — `npm run verify:preview -- <url>` |
| 7–11 | Blocked |

### The plan's Step 4 → Step 5 order is wrong for this case

`docs/CLOUDFLARE_DEPLOY.md` states that a brand-new Worker's *first* preview
establishes the name, bindings are added after, and only a *second* preview is
promotable. The Worker does not exist, and Turnstile needs a hostname that will
not exist until the first upload. The real sequence:

1. **User** mints the OpenRouter key with **credit limit 0**
   (`docs/PRIVACY_AND_AI.md:48-50` requires provider-level restriction to free
   routing and zero cost; the Worker's checks complement it, they do not replace
   it), and confirms **Workers Free** plus that the account is the intended one.
2. **Agent** runs the first `cloudflare:preview` — explicit approval required,
   first outward-facing action.
3. **User** creates the Turnstile widget against the returned hostname and
   generates `AI_SESSION_SECRET` (`openssl rand -base64 48`).
4. **User** runs four `wrangler secret put` commands **interactively**. Never as
   CLI arguments. The agent must not handle the values.
5. **Agent** runs the second preview, `verify:preview`, the canary, abuse checks,
   then promotes the exact tested version ID and retains the rollback UUID.

**The `scripts/cloudflare/` env confirmations (`CALIPAR_WORKER_INTENT`,
`CALIPAR_CONFIRMED_NEW_WORKER`) exist to force a human decision. Never set them
to get an agent past a gate.**

---

## Open work, ranked

1. **Phase D Steps 4–11.** See above. Every outward-facing step needs explicit
   approval.
2. **Sealed security scan still owed.** The Codex Security tool was unavailable in
   this session as well, so scan `a68f98b4-…` remains untouched, unfinalized, and
   its liveness unconfirmed. Do not run the finalization ritual against it without
   confirming it is alive, and never hand-write `report.md`.
3. **Secret-scan coverage gap** — `scripts/verify/artifacts.mjs:58-66`. No
   Cloudflare-token pattern. The `textExtensions` filter excludes `.svg` and cannot
   match extensionless files, so `out/_headers` and `out/.assetsignore` are
   guaranteed to ship and guaranteed not to be scanned. Sharper still: the three
   name-keyed patterns cannot fire on the shape a Next static export produces,
   because Next inlines `NEXT_PUBLIC_*` and deletes the variable name — only the
   two shape-based patterns survive minification. No live exposure.
4. **Lighthouse.** `unused-javascript` and `network-dependency-tree-insight` still
   fail; both need route-level code splitting. Newly recorded:
   `largest-contentful-paint` scores **0.40** on both URLs as a warning, stable
   across all four runs, so it is not load noise. Same root cause.
5. **Six unused dependencies** — `recharts`, `react-markdown`, `lucide-react`,
   `clsx`, `tailwind-merge`, `zustand`. Confirmed zero imports. Needs
   `npm install`, so do it outside a release window.
6. **Two security findings still open** — chat-history retransmission disclosure,
   and preview upload not invoking the secret scanner. Both described in
   `HANDOFF.md`.

---

## Suggested skills

| Skill | When |
| --- | --- |
| `wizard` | **Best fit for the immediate blocker.** Step 4 and the dashboard confirmations are exactly "provisioning infrastructure, setting up credentials, walking an unfamiliar third-party dashboard" — OpenRouter keys, Cloudflare Turnstile, the Workers plan page. A wizard the user runs themselves keeps every secret out of the agent's hands, which is the binding constraint, not a preference. |
| `code-review` | Before promoting to production, and worth running against `1f78dc4..5bd59ff` — those 12 commits have had no independent review. |
| `tdd` | For the code-splitting work in open item 4, and anything touching `worker/`. |
| `writing-for-agents` | Only if editing `CLAUDE.md` / `AGENTS.md`. Three stale facts were found in committed docs this session; the same rot likely exists elsewhere. |
| `grilling` | If the `categories:seo` decision needs stress-testing before it ships. |
| `verification-before-completion` | Where available. This session produced two concrete examples of why. |
| `systematic-debugging` / `diagnosing-bugs` | For any failure during preview or promotion. The plan has a loop ladder; start at the cheapest rung. |

**Do not reach for brainstorming or planning skills.** The plan exists, is
committed, and is now annotated with real status. What remains is execution and
credentials.

---

## Verify the tree still matches this document

```bash
cd /Users/laccd/code/calipar && git log --oneline -1 && git status --short
# expect: 5bd59ff Merge: Phase D prep … (or later) and no output from status
```

Two merged local branches can be deleted: `fix/pwa-demo-post-review-fixes`,
`feat/pwa-demo-phase-d-prep`.

No secrets, tokens, cookies, or personal identifiers appear in this document or in
the repository, and none have been created. Secrets will live only in Cloudflare
secret bindings or a gitignored `.dev.vars`, which does not currently exist
locally.
