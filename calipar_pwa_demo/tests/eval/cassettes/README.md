# Cassettes

Recorded OpenRouter response bodies, replayed through the real Worker by
`tests/eval/harness.ts`. One cassette per evaluation case.

## Rules

**No cassette may contain a real API key, a real prompt, or any non-synthetic
text.** Every figure, identifier, and narrative here is invented for the demo
seed. If a cassette is ever refreshed from a live capture, scrub it before
committing and re-read it in full — `scripts/verify/artifacts.mjs` scans built
output for secret patterns, but these files are test inputs and never ship.

## Shapes

| Suffix | Upstream shape | Used by |
| --- | --- | --- |
| `.sse.txt` | Recorded SSE transcript: `data: {…}` lines, terminated by `data: [DONE]` | the `chat` task |
| `.json` | A single chat-completions JSON body | `analyze`, `expand`, `equity-check`, `socratic` |

Every cassette must name a free model — `openrouter/free` or a slug ending
`:free` — and report `usage.cost: 0` where usage is present. The Worker rejects
anything else, so a cassette that violates this is testing the rejection path
and should say so in its case description.

## Provenance

| Cassette | Origin | Model slug | Notes |
| --- | --- | --- | --- |
| `analyze-grounded.json` | reshaped from `tests/fixtures/openrouter-structured-success.json`, which was orphaned — nothing imported it | `google/gemma-3-27b-it:free` | Fields corrected to the real `analyze` schema (`strengths`/`concerns`/`recommendations`; the fixture had `findings`). Figures match the `analytics-biology-2025` seed record. |
| `chat-grounded.sse.txt` | reshaped from `tests/fixtures/openrouter-chat-success.json` | `meta-llama/llama-3.3-8b-instruct:free` | Converted from a single non-streaming body into the SSE line form the relay's `consume` expects. |
| `analyze-insufficient.json` | authored | `google/gemma-3-27b-it:free` | The missing-data family: `insufficientData: true`, no figures. |
| `analyze-invented-evidence.json` | authored | `google/gemma-3-27b-it:free` | Cites ids never supplied; the Worker filters them silently. |
| `analyze-injection-compliant.json` | authored | `google/gemma-3-27b-it:free` | A provider that **obeys** an injection embedded in local evidence. |
| `analyze-oversize-field.json` | authored | `google/gemma-3-27b-it:free` | A `summary` past `AI_LIMITS.structuredFieldCharacters`. |
| `analyze-flood-evidence.json` | authored | `google/gemma-3-27b-it:free` | More `evidenceIds` than `AI_LIMITS.structuredItems`. |
| `chat-compliance-refusal.sse.txt` | authored | `meta-llama/llama-3.3-8b-instruct:free` | Declines to establish accreditation compliance. |
| `chat-injection-compliant.sse.txt` | authored | `meta-llama/llama-3.3-8b-instruct:free` | Emits markup and claims to reveal configuration. |
| `expand-grounded.json` | authored | `google/gemma-3-27b-it:free` | `expandedText` only. |
| `equity-check-grounded.json` | authored | `google/gemma-3-27b-it:free` | Rate carried with both counts. |
| `socratic-grounded.json` | authored | `google/gemma-3-27b-it:free` | `question` + `rationale`. |
