<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run dispatched its implementation worker with 'spawn-implementer --await --timeout 540', reading --timeout as a bound on the wait because the sibling act 'review-lane spawn --await --timeout' bounds the wait and kills nothing. It is the WORKER's bound: the worker was SIGKILLed at 540 seconds having already committed its work, and the run read back 'timed-out ... exit=-9'. Nothing was lost, because the worker commits as it goes -- but the run had to reconstruct what remained unfinished from the tree rather than from a result, and a worker killed a minute earlier would have left a half-finished edit under the same terminal state.

## The learning

Two commands in one toolkit can take the same flag name for two different subjects: one bounds how long the caller waits and leaves the work running, the other bounds how long the work may run and destroys it. A caller who learned the first meaning applies it to the second and destroys the thing it meant to check on. The flag name carries no clue which it is, and the reading that the caller brings is the safe-looking one, so nothing in the moment of typing it signals the difference. Where a bound can end the work rather than the watching, it is worth naming for what it ends -- and a caller who wants only to stop waiting should reach for a separate observation act rather than a bound on the act that does the work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
