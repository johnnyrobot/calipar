# Handoff — CALIPAR PWA demo, 2026-08-07 (third)

**Repo:** `/Users/laccd/code/calipar` · **Package:** `calipar_pwa_demo/`
**Branch:** `main` at `8bc046f` · clean · only `main` exists locally
**Predecessors:** `2026-08-07-architecture-review-and-defect-fixes.md` (committed, still
accurate for its own session) and a temp-file addendum that ranked the deepening
candidates 3 → 2 → 4. **This session executed that ranking and then finished the list.**

---

## The headline

`npm run verify:full` exits 0. That is the **first fully green release gate** this
package has had: 99 unit, 95 worker, 6 scripts, 45 eval, 41 e2e, 12 a11y, Lighthouse.

Fourteen commits, `bd187b2..8bc046f`, 21 files, +1163 / −261. **Reasoning is in the
commit messages** and is not repeated here.

---

## What shipped

| # | Commit | What |
| --- | --- | --- |
| 1 | `3e1e8ae` | `worker/policy.ts` — the free-route safety claim, now testable |
| 2 | `33e44a0` | `worker/session.ts` — cookie expiry, now testable |
| 3 | `eca7f0d` | Imports held to the write path's organization rule |
| 4 | `f61ffa7` | Three gaps closed in `scripts/`, and its first tests |
| 5 | `c5bea2c` | Three filed small findings, and a fourth they exposed |
| 6 | `a0dc2d8` | `WorkspaceProvider` scoped — 433 KB off two routes |
| 7 | `8bc046f` | The two red Lighthouse audits bounded |

---

## The deepening arc closed 4-for-4, and only two became modules

This is the most reusable thing the session produced.

- **Candidate 3 (free-route policy) → module.** Built.
- **Candidate 2 (demo session) → module.** Built.
- **Candidate 1 (workspace commit) → closed.** Replaced by a ~40-line property test.
- **Candidate 4 (workspace integrity) → closed.** Replaced by a 10-line rule and a test.

**The predictor is not "how many times is this restated". It is what shape the shared
thing has.**

> A **value transform** — data in, data out, no callbacks — extracts into a module whose
> test needs no fakes. A **control-flow shape** — a transaction frame, a validation
> sequence — extracts into a module that needs callbacks, and the only test it enables
> is "a fake was called with these arguments", which is implementation-coupled by
> construction.

`buildUpstreamBody(payload)` is the first kind. The workspace commit module's
transaction frame is the second. Measured, the commit module did not even pay for
itself in lines: ~56 removed against ~32 of call sites plus a ~35-line module.

**Both closed candidates were replaced by a test, and in both cases the test was
strictly better than the module** — a `commit()` helper never closed the hole it was
sold on, because a new mutator can skip the helper exactly as easily as it can skip the
activity write.

---

## Corrections to the record

Three claims in committed documents were wrong. Each was checked against the code, and
in two cases pinned with a test so the correction cannot silently rot.

1. **Candidate 4's named drift was not real.** The review said "the write path fails on
   `!organization`, the import path never checks the organization exists." Literally
   true, operationally false: the import requires a plan to agree with its review's
   organization, and that review's organization to exist. Transitive, not absent.
   **Pinned** by a test that drifts a plan's and a request's `organizationId` and
   watches both get rejected — which also stops anyone deleting the equality check as
   redundant. A *different* drift was real: import accepted a review on a non-program
   organization, which `createReview` refuses.
2. **`CLAUDE.md` said the CI workflow "has not yet been observed running on GitHub".**
   It has. Both workflows ran green three times on 2026-08-07. Corrected.
3. **`CLAUDE.md` described `app/(demo)/layout.tsx` as providing `AppShell` +
   `WorkspaceProvider`.** It provided `AppShell` alone; the provider was in the **root**
   layout, so the landing page and the offline shell each shipped 433 KB of data layer.
   The doc described the intended design and the code had drifted from it. Fixed the
   code, not the doc.

Also stale and corrected: the release runbook said "under Node 20" (wrong since
2026-08-04) and pointed at `scripts/verify/headers.mjs` (now deleted).

---

## Method notes worth keeping

- **Every extraction was proved red on substance first.** `worker/policy.ts` was first
  written with the *pre-`4e67c7f`* spread ordering and the test failed with
  `model: "openai/gpt-4o"`. `worker/session.ts` was first written as a verbatim move
  that accepts an injected clock and ignores it, and the test failed with an expired
  token accepted. A module-not-found red proves nothing; these do.
- **Non-vacuity was checked whenever a test could pass for the wrong reason.** The
  activity property test was confirmed to fail (and name the mutator) when
  `activities.add` is deleted from `addChatThread`. The route-level expiry test was
  confirmed to stop 401-ing when minted against a current clock. The `/api/ai/status`
  drift test was confirmed to fail when the module and the disclosure disagree.
- **The `; vs &&` trap struck again, in a new form.** A background run reported
  *"exit code 0"* while `VERIFY_EXIT=1`, because the wrapper's exit code came from
  `tee`, not from `npm`. The explicit `VERIFY_EXIT=` capture is the only reason the
  failure was seen. **This is the fourth variant this project has hit.**
- **The gate caught what typecheck and the unit suites did not** — three dead constants
  left in `worker/index.ts` after the session extraction, failing only on
  `eslint --max-warnings=0`. Run `verify`, not just the tests you think you touched.
- **One inconclusive experiment, recorded as such.** An attempt to demonstrate the new
  `unused-javascript` bound by tightening it to 1 produced an inconsistent Lighthouse
  run (best-practices 0.57). It was abandoned rather than chased. The bound's
  count-sensitivity is instead evidenced by the earlier clean run: at the preset's 0 it
  failed reporting `found: 1` and `found: 2`, and it passes at 2.

---

## State of the ranked list

**Done:** candidates 3, 2, 4, 1 (two built, two closed); the `scripts/` architecture
pass; the three filed small findings; Lighthouse/code splitting; the CI-runs-on-GitHub
unknown.

**Open, ranked:**

1. **Phase D steps 4–11 — blocked on a human.** Unchanged. Needs an OpenRouter key
   minted with credit limit 0, a Turnstile pair, and a Workers Free confirmation.
   Ordering wrinkle is in the 2026-08-06 handoff. `wizard` is still the right tool.
   **Local half is now done:** `.dev.vars` exists (gitignored, mode 600) with a
   generated `AI_SESSION_SECRET` and Cloudflare's published Turnstile test keys; only
   `OPENROUTER_API_KEY` is a placeholder awaiting a paste.
2. **Sealed security scan — still owed.** Codex Security tool unavailable in three
   consecutive sessions now. Scan `a68f98b4-…` untouched.
3. **`artifacts.mjs` / `check-free-limits.mjs` are two diverged implementations.**
   Finding B of the `scripts/` pass, deliberately not fixed. Symlink refusal,
   `.key`/`.pem`, and `.env.*` prefixes exist only in the second; the secret scan and
   manifest digest only in the first. **The union holds only because they run back to
   back in that order** — the same trap `required-exports.mjs` was written to end, which
   unified the path list and stopped there. Nothing is currently unenforced.
4. **Six unused dependencies.** Confirmed for two of them: `recharts` and
   `react-markdown` are imported nowhere. They are not bundle weight (nothing imports
   them) but they are install weight and audit surface.
5. **`legacy-javascript` and `inspector-issues`** remain `off` with 2026-08-04
   justifications. Both say to revisit on the next Next.js major.

---

## Verify the tree

```bash
cd /Users/laccd/code/calipar && git log --oneline -1 && git branch && git status --short
# expect: 8bc046f Merge: bound the two red Lighthouse audits …
#         * main   (and nothing else)
#         (no status output)
```

`main` is **8 commits ahead of `origin/main`** — the last push was at `eca7f0d`.
Push when ready; CI is now known to run.

No secrets, tokens, or personal identifiers appear in this document or in the
repository. `.dev.vars` is gitignored and was verified with `git check-ignore`; its
generated session secret was never printed to a terminal or a transcript.
