# Derivations read the workspace once, they do not query it

Derived values used to be produced two ways: some pages computed them from a
whole-workspace read, while the dashboard totals came from a *second*, separate
read transaction over the same tables. Numbers from the two reads were displayed
added together, so a write landing between them produced a figure that was never
true. Every derivation is now a pure function of one workspace reading — the
repository reads and writes, and computes nothing.

## Consequences

- This is only safe because the workspace is small and local. It is bounded by
  one visitor's own session, held in one browser, with no shared or historical
  data. **Do not carry this pattern into the parent CALIPAR app**, where the
  same records live in Postgres and belong to a whole institution; there,
  aggregates must be queried.
- Derived values are recomputed on every published change, including each
  autosave while someone is typing. That is free at demo scale and would not be
  at institutional scale — see above.
- Key spaces that derivations index by must be closed. Organisations and
  strategic initiatives have no creating mutator, so keying by their ids is
  bounded. Reviews, action plans and resource requests are created freely during
  a session, so their collections grow and must not be used as map keys.
