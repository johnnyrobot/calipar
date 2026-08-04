# Derived values fill the existing workspace slot

Workspace state already carried a derived-values slot alongside the raw records,
and pages mixed the two — a dashboard tile added a count from the slot to a count
it filtered itself, because the slot did not carry what it needed. Rather than
change how pages reach the workspace, we filled the slot: anything a page needs
that is not a stored record is a named field on it, and no page filters records
to produce a number.

## Considered options

Purpose-built hooks per page, and narrowing workspace access so raw records are
only reachable through an explicit escape hatch, were both rejected for this
change. Hooks make the good path convenient without closing the raw one, and add
a shallow module per derivation. Narrowing is the stronger idea, but while pages
still need raw records for joins the escape hatch is common enough to degrade
back into unrestricted access. Once the slot has emptied the pages, narrowing
becomes worth revisiting.

## Consequences

The slot is the one place this can go wrong, so: **a field exists on it because
it is a fact about the domain, never because one page's markup wanted that
shape.** A count of complete sections belongs there. A completion percentage does
not. A bar width never does.
