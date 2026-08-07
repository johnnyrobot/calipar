# Handoff — CALIPAR PWA demo, 2026-08-07

**Repo:** `/Users/laccd/code/calipar` · **Package:** `calipar_pwa_demo/`
**Branch:** `main` at `1c9fa78` · clean · pushed · CI green (both workflows)
**Predecessors:** `calipar_pwa_demo/docs/handoffs/2026-08-06-security-review-and-phase-d-prep.md`
(committed, still accurate) and `calipar-pwa-handoff-2026-08-06.md` in this temp dir.

---

## Read these first

| Artifact | What it holds |
| --- | --- |
| `calipar_pwa_demo/docs/handoffs/2026-08-06-…md` | Prior session: security review, Phase D steps 1–3, the traps. Still current. |
| `git log 2b284d7..1c9fa78` | 6 commits. **Reasoning is in the commit messages** — not repeated here. |
| `calipar_pwa_demo/HANDOFF.md` | Release status and blockers. Unchanged today. |
| `calipar_pwa_demo/docs/architecture-reviews/2026-07-31-deepening-candidates.html` | The **previous** review. Today's is NOT here — see the warning below. |

---

## The architecture review is at `docs/architecture-reviews/2026-08-06-deepening-candidates.html`

An architecture review ran today (`/improve-codebase-architecture`) producing seven
deepening candidates, then a design pass on each producing six interface proposals with
migration orders and honest cases against.

**Read that HTML before doing any deepening work** — it carries the before/after
diagrams, the per-candidate evidence with line numbers, and the recommendation
strengths. Everything below is a summary, not a substitute.

It was written to a temp file first and nearly lost; it is committed now. The design
passes themselves — the proposed interfaces, migration orders, and the arguments that
killed two candidates — exist **only in the conversation transcript and in summary
here**. If a future session needs the full reasoning for a specific candidate, it will
have to be re-derived.

---

## What shipped today

Six defects, all found by the architecture review, none of which needed a refactor.
Detail is in the commit messages; the one-line version:

| Defect | Severity |
| --- | --- |
| A stale tab resurrected a resource request another tab had deleted | **Data loss**, reachable from a wired Delete button |
| Storage failures reached the visitor as raw `DOMException` text | Visitor-visible |
| The "Mission-Bot" activity filter could never match a record | Dead control |
| A 700 ms autosave debounce flooded the activity feed | Feed unusable during editing |
| Socratic asked the model for evidence ids it always discarded | Wasted tokens, invited fabrication |
| A test fixture with zero references that could not have worked | Dead code |

Three carry regression tests **verified to fail without the fix**.

**Deliberately not shipped:** the workspace commit and free-route policy modules. See
"the sequencing argument" below.

---

## The architecture review — outcomes worth preserving

Seven candidates. **Two were killed by their own design passes**, each replaced by a
~15-line fix. That is the deletion test working, and it is the main reason the review
was worth running.

### Killed

- **One SSE codec.** Net −2 lines. `ChatStreamEvent` (`lib/ai/contracts.ts:148`) is a
  correct, complete, **unused** union — both sides hand-roll string literals instead.
  The fix is ~15 type-only lines: generic-constrain `sseEvent<T>` so its payload must
  match its event, add a `never`-check to make `dispatch` exhaustive, and hoist the
  `currentEvent` reset above the early return at `client.ts:170`. Zero bundle delta.
  Sharpest argument: round-trip tests are *weaker* than the current byte-exact
  fixtures — `decode(encode(x))` is symmetric by construction and stays green if both
  sides change to `event:delta` with no space.
- **The task table.** Dies if the three uncalled task shapes are deleted; with only
  `expand` left there is no dispatch to collapse. If kept, the ~15-line fix is an
  explicit `if (task === "socratic")` plus `assertNever(task)` in each of the three
  bare-`return` fallthroughs (`worker/index.ts:327`, `:1045`, `:1216`), plus deriving
  the router's `supported` list. **Trap if anyone builds the table:** use
  `Object.hasOwn`, not `in` — `in` walks the prototype chain, so
  `POST /api/ai/constructor` would route as a task.

### Still open, Strong, interfaces designed

1. **The workspace commit** (`lib/db/repository.ts`) — the two live defects it was
   justified by are now fixed, so it must be re-argued on locality alone.
2. **The demo session** (`worker/index.ts:334-480` → `worker/session.ts`) — 26 of 41
   worker tests round-trip an HTTP mint to get a cookie; `base64Url` is duplicated into
   `limits.ts:29-33`; **expiry is untested and untestable**, and the test at
   `tests/worker/ai-worker.test.ts:574` is named "expired-shaped" while containing no
   expired variant.
3. **The free-route policy** (`worker/index.ts:571-1339` → `worker/policy.ts`) — commit
   `4e67c7f` hardened the zero-cost invariants and the test comment at
   `ai-worker.test.ts:259-271` records that the fix is **not observable through the
   public surface**. Drop `policyDisclosure()`; it is the weak part.
4. **Workspace integrity** (`lib/db/repository.ts`) — the referential rule is stated
   **five** times, and the write and import paths have already drifted: the write path
   fails on `!organization`, the import path never checks the organization exists.

### The sequencing argument — the best thing produced today

> Fix the defects first, because that **removes the modules' headline justification**,
> and that is the honest test of whether the modules are worth building. If nobody
> wants the refactor afterwards, four commits were saved. If they do, it is being
> bought for locality alone, with eyes open.

This is why the modules are not in `main`. Re-ask now that the defects are gone.

### Not reviewed at all

The **`scripts/` cluster** never got an architecture pass — that exploration agent
never returned. Genuinely uncovered.

---

## Decisions made today (so they are not re-litigated)

- **Chat activity is per thread, not per message.** `addChatThread` writes one record;
  messages write none. A 20-message conversation must not emit 20 feed rows.
- **Keep `analyze` / `equity-check` / `socratic`.** They have zero UI callers but cost
  nothing at runtime and are most of the eval harness's coverage surface.
- **Activity coalescing over suppression.** Consecutive edits inside 5 minutes move the
  existing record's `occurredAt`; only `review.updated` coalesces.

---

## Corrections and process notes

- **I underestimated the deletion scope by an order of magnitude.** Told the user
  "~210 lines of Worker" for deleting the three unused task shapes. It is **134
  references across 16 files**, including the 903-line eval harness (45 tests, 28 case
  references). The user had already said "delete" on the bad number. Re-quantify before
  destructive work, and re-confirm when the estimate moves.
- **I committed with a failing typecheck.** Ran checks and commit in one command
  separated by `;`, so the commit ran despite `typecheck=2` (a real error —
  `amount` vs `amountCents`). Amended. Every later commit gated with `&&` plus an
  explicit `GATE_EXIT` check. **This is the third variant of the same trap this
  project has hit** (`| tail`, trailing `echo`, now `;` before commit): *the last
  command in the list owns the exit code.*
- **Subagents idle without reporting.** Six of six design agents went idle silently at
  least once; three needed two or three nudges. What works: demand **literal tool
  output** — "which files did you open and how many lines", "quote the code with line
  numbers", "give the grep result". Agents that then caveated their reads ("I read
  1–120 and 960–1430; my test claims come from `it()` titles") produced the most useful
  reports. One reported a delivery failure: it had written its report as plain text,
  which the lead cannot see.
- **Two agents corrected the lead on load-bearing facts.** `payload.provider` IS set
  (`worker/index.ts:1241`); and `updateReview`/`submitReview` throw `NOT_FOUND` before
  the revision guard, so the "two vs two" framing of the `existing &&` drift was wrong.
  Verify agent corrections, then accept them.

---

## Open work, ranked

1. **Copy today's architecture review HTML into `docs/architecture-reviews/`** before
   the temp dir clears. Cheapest high-value action available.
2. **Re-ask the four Strong deepening candidates** now their defect justification is
   gone. The demo session (untestable expiry) and the free-route policy (unverifiable
   safety fix) have the strongest remaining cases.
3. **Phase D steps 4–11** — unchanged and still blocked on a human: an OpenRouter key
   minted with credit limit 0, a Turnstile pair, and a Workers Free confirmation. The
   ordering wrinkle is in the 2026-08-06 handoff — first preview establishes the name,
   Turnstile needs that hostname, secrets after, second preview is the promotable one.
4. **Sealed security scan still owed.** Codex Security tool unavailable in two
   consecutive sessions; scan `a68f98b4-…` untouched and unconfirmed.
5. **Two Lighthouse audits** — `unused-javascript`,
   `network-dependency-tree-insight`. Need route-level code splitting. Also
   `largest-contentful-paint` scores 0.40 stably (a warning, not load noise).

Also outstanding, smaller: the `scripts/` architecture pass; the secret-scan coverage
gap in `artifacts.mjs`; six unused dependencies.

**Three merged local branches can be deleted:** `fix/pwa-demo-post-review-fixes`,
`feat/pwa-demo-phase-d-prep`, `fix/pwa-demo-workspace-defects`.

---

## Suggested skills

| Skill | When |
| --- | --- |
| `i-have-adhd` | **Active at session end.** The user invoked it and it is session-scoped — re-invoke if they want the same response shape: lead with the action, number steps, restate state every turn, no preamble or closers. |
| `codebase-design` | Before touching any of the four Strong candidates. Supplies the exact vocabulary the review used — module, interface, depth, seam, adapter, leverage, locality — and the deletion test that killed two candidates. |
| `improve-codebase-architecture` | Only for the unreviewed `scripts/` cluster. Do **not** re-run it over `worker/` or `lib/db/` — that ground is covered and the report exists. |
| `wizard` | Still the best fit for Phase D step 4. Generates something the *user* runs through the OpenRouter, Turnstile and Cloudflare dashboards, keeping secrets out of the agent's hands — which is the binding constraint. |
| `code-review` | Against `2b284d7..1c9fa78` — today's six commits had no independent review. |
| `tdd` | For the deepening work. Every candidate's value is stated in terms of tests that become expressible. |

**Do not** reach for brainstorming or planning skills. The plan exists and is annotated;
the architecture options exist and are argued. What remains is decisions and execution.

---

## Verify the tree still matches

```bash
cd /Users/laccd/code/calipar && git log --oneline -1 && git status --short
# expect: 1c9fa78 Merge: six workspace and Worker defects … and no output
```

No secrets, tokens, cookies, or personal identifiers appear in this document or in the
repository. None have been created. Phase D secrets will live only in Cloudflare secret
bindings or a gitignored `.dev.vars`, which does not exist locally.
