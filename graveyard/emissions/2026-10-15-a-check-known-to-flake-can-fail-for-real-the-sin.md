<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki #1395 (2026-10-15) the worker was reaped suite-failed with terrain-ownership as the only red member, a check recorded three days earlier as a runner-side flake. Re-running that one check at the reaped head failed again with a real cause: the worker's last commit moved the detached-job supervisor onto a shared refusal renderer, leaving two constants exported from judge.mjs with no reader outside it, which the ownership check refuses by design. The fix was one commit making both constants module-local; the carry then went through a session pass and PR #1399 merged.

## The learning

A check's history of flaking is not evidence about this failure. Before treating a red check as a flake, re-run that one check alone at the failed head and read its message; the flake and the real failure print different text. A real failure of this shape is common after a refactor that moves one module onto another's shared helper: the names the moved module used to import stay exported with no reader left, and an ownership check that refuses orphan exports catches exactly that. Fix it in the carrying session with one commit rather than re-dispatching a worker.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
