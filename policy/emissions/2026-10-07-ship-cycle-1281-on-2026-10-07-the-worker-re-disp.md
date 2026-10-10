<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1281 on 2026-10-07: the worker re-dispatch for a one-cell Issue was refused at the per-cell failure bound (two failed workers), while the second worker had left two commits (215 lines) on its branch

## The learning

When an Issue has only one piece of work and that piece fails twice, the suggested way forward (rewrite the plan without that piece) leaves nothing, so the only real route is a successor Issue that carries all of the work. The commits the second worker left on its branch are not looked at by anything on that route. Check the branch for usable commits before writing the successor, so they are carried forward rather than redone.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
