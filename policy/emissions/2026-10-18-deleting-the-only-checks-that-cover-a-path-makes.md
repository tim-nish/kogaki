<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1415 --session on 2026-10-18: admission refused a cell editing only moves/ because no registered check covers moves/, after #1423 deleted anchor-resolve and move-ingest the same day.

## The learning

Admission requires every file a plan changes to be covered by some registered check. Deleting checks for never having blocked a failure can therefore remove the last check covering a data directory, and from then on no Issue that only edits that data can be admitted. The refusal's own recovery, adding a check, contradicts the ruling that removed it. Before deleting checks, list which paths lose all coverage; a data-only path needs either a kept check or an admission rule that admits it without one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
