<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-05 /ship-cycle 1251 recorded a Blocker and the owner chose hold, but record-pass answered that a worker reap had already recorded this run's close, and the close screen showed FAILED at implement with compacted-without-progress, which came from the 2026-10-04 run.

## The learning

When an earlier run's worker reap left a failure row on an issue, a later run's record-pass treats that row as its own close and does not record the new hold. The close screen then reports the old failure. Before trusting the screen, check whether the failure it names happened in this run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
