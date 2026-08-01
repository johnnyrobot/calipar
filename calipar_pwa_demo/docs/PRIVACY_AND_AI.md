# Privacy, local data, and AI

## Reader-facing statement

The demo workspace and chat history are saved in this browser. They are not
written to CALIPAR, Firebase, PostgreSQL, or a Cloudflare application database.
Clearing site data removes the workspace.

When a user invokes an AI feature, the prompt and the explicitly selected
context are sent through the CALIPAR Cloudflare Worker to OpenRouter and an
available model provider. Do not enter student records, confidential
institutional information, credentials, or other regulated data. AI output may
be incomplete or inaccurate and requires human review.

## Data inventory

| Data | Stored where | Leaves browser? |
| --- | --- | --- |
| Synthetic seeded workspace | IndexedDB | No |
| User-created reviews/plans/resources | IndexedDB | Only selected AI context |
| Preferences/onboarding | Browser storage | No |
| Chat messages | IndexedDB | Messages included in an AI request do |
| JSON exports | User-selected local file | Only if the user shares it |
| OpenRouter key | Encrypted Worker secret | Never sent to the browser |
| Turnstile/AI session | Secure short-lived cookie | Sent to same-origin Worker |

Exports are unencrypted. They must not be treated as secure backups for
confidential data.

## Provider policy

The Worker owns and validates every upstream parameter. It requests the
OpenRouter free router, caps all allowable prices at zero, denies provider data
collection, requires zero-data-retention endpoints, and allows provider
fallback only inside that strict free/privacy boundary.

If no compatible endpoint is available, the request fails visibly. The Worker
must not:

- fall back to a paid model
- relax zero-data-retention or data-collection policy
- reveal the provider key
- log prompt or response bodies
- return canned prose as if a provider produced it
- cache AI request or response bodies
- automatically transmit the entire workspace

The dedicated OpenRouter key should also be restricted at the provider account
level to free routing and zero-cost usage. Application checks complement that
guardrail; they do not replace it.

## Logging

Permitted operational fields are request ID, task name, status, selected free
model identifier, duration, and token totals. Logs must not contain:

- prompts, local evidence, or model prose
- cookies, authorization headers, or Turnstile tokens
- raw IP addresses
- browser workspace IDs that can be connected to content
- secret values or full upstream error bodies

Responses use `Cache-Control: no-store`, and service-worker routing treats
`/api/*` as network-only.

## Intended-use boundary

Mission-Bot in this demo is a planning and writing assistant grounded in
synthetic/local workspace facts. It is not authoritative document RAG and must
not claim to establish compliance with accreditation, regulation, policy,
collective bargaining, curriculum, or institutional requirements.

Adding authoritative RAG later requires an approved, redistributable, current
corpus with source version, page/section, URL, checksum, retrieval tests, and
displayed evidence validation. That work is outside this demo release.

## Incident response

If a secret may have entered source, logs, build output, or a browser bundle:

1. Stop deployment or roll back the affected Cloudflare version.
2. Revoke and replace the provider/Cloudflare credential.
3. Remove the value from the current tree and generated artifacts.
4. Run artifact and repository secret scans.
5. Rebuild from a clean dependency install and retest.
6. Preserve an incident note without copying the secret.

Rewriting Git history is a separate destructive operation and requires explicit
approval.
