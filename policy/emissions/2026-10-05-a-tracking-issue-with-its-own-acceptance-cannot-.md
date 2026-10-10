<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1251 on 2026-10-05: all seven items of #1251 had landed on master through its children (#1255, #1260-#1262), its children were closed, and the run found no route to close the parent.

## The learning

When a parent Issue lists its own Acceptance and its children do all the work, closing the parent is circular. approve-close --discharge refuses until a recorded pass against the parent has advanced it. But a pass only advances an Issue that is already closed, either by a merged pull request that closes it or by a spent discharge click. No pull request closes the parent, because each one closed a child. Re-admitting the parent would send work that has already landed back to an implementer. The same run also rendered its close from an older session's worker-reap row ('compacted-without-progress'), when it should have refused that row as foreign. So the close screen reported a failure this run never had.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
