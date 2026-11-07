<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1349 re-admitted an Issue whose second piece of work had failed its checks, re-planned it so the fix landed in that piece, and the worker stopped on the first piece instead

## The learning

Re-planning a failed Issue does not move the failing commit. The worker reuses the old branch, so the earlier failing commit is still at its head, and the first piece of the new plan is graded against checks it cannot fix inside its own files. A re-plan only helps if the piece that repairs the failure runs first, or if the branch is reset to before the failing commit.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
