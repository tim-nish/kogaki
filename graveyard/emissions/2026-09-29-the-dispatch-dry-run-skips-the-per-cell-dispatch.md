<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217 on 2026-09-29: after two reaped workers, a spawn-implementer dry run reported 'would spawn' at ordinal 1 under a freshly amended plan, and the live spawn then refused at dispatches_per_cell_max=2

## The learning

The dry run returns before the per-cell dispatch limit is checked, so 'would spawn' says nothing about whether the cell still has a dispatch left; count the dispatch-row comments on the Issue instead. The ordinal it prints resets with every plan amendment, while the limit counts every dispatch the Issue has ever had. The count is also keyed by the issue number a cell closes, so every cell of a multi-cell plan on one Issue draws from the same two dispatches: an Issue planned as two cells cannot finish both under the default even if nothing ever fails.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
