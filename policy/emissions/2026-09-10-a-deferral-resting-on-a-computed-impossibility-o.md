<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1062 item 4 was deferred because groups x per-call-bound collided with a ratified below-600s check. The product omitted the concurrency term the executor already implemented, so the collision was never real; the deferral stood for a day and the live run that measured the true cost (274s, 57% of the bound) did not disturb it.

## The learning

A decision deferred because the arithmetic said it was impossible needs the arithmetic re-checked, not the decision re-argued. Two things make such a deferral outlive its ground: the number is computed once and then quoted, and the quoting happens in prose that no mechanism reads, so nothing goes red when a term arrives that changes it. When the deferral is recorded, record the inputs it was computed from beside it, so a later reader can tell whether the ground still holds without re-deriving it; and treat the arrival of a capability the deferral's ground assumed absent as an event that owes a new decision rather than as background.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
