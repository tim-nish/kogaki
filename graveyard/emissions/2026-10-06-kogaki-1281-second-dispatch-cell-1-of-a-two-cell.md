<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-06
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1281, second dispatch: cell 1 of a two-cell plan ran 70 turns in 13.6 minutes, implemented the whole Issue (both cells, including src/review.mjs, which only cell 2 named), committed 6a4e1a4 with the brief-compose check passing, and reported success; the supervisor graded it timed-out and did not dispatch cell 2.

## The learning

Splitting an Issue into cells does not stop the first worker from doing the whole Issue: the worker reads the full Issue body, not only its cell, and builds everything the Acceptance names. When that run then crosses the cell budget, the supervisor grades it a failure even though the work is complete and committed. A cell plan therefore needs either the worker to be told which part is its own, or a supervisor reading that recognises a finished, green, committed head as done rather than timed out.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
