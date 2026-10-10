<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1282 on 2026-10-07: both cells went green, PR #1294 merged and #1282 closed, but record-pass refused because the worker reap had already recorded this run's close as held stage-refused suite-failed, and the closing screen rendered FAILED at implement

## The learning

A worker reap that records a failure close for an Issue can outrank a later success in the same run. Once a reap writes its held row, record-pass treats the run as already closed and will not record the merged outcome, so the close screen reports a failure for an Issue whose pull request merged. The success has no typed route onto the record; it can only be stated in prose beside the screen.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
