<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1269 re-dispatched an Issue whose last stop was suite-failed on two load-sensitive checks; the dispatcher started from the already-implemented first cell, the worker made no commit, and the suite failed again on the same two members at the same head, both of which pass alone.

## The learning

When a worker's only failure is a check that fails under load and passes alone, dispatching the same plan again does not retry anything useful: the head does not move, so the second run is the same suite under the same contention, and it spends a failure-bound slot. The correction has to change something first - the cell's declared checks, or the timing bound of the flaky check - before the next dispatch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
