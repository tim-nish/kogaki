<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run consulted the policy substrate three times to decide a genuine fork honestly, then its own preflight refused the run for being over the session context threshold — 217k of a 200k default. The reads that grounded the decision are what spent the budget the gate measures, and the gate sits at the START of the next stage, so the refusal arrived after the decision was made and recorded but before any of it could be built.

## The learning

A gate that measures a resource the run itself spends will fire late and on the run's own good behaviour. Context-threshold gates are the clear case: the careful work — reading the governing ruling, running several framings against the policy surface, reading the precedent implementation rather than guessing at it — is exactly what consumes the budget, so the more responsibly a sitting prepares, the likelier it is refused before it can act. The refusal is correct and the reads were right; what is wrong is the ORDER. Site such a gate where the spend can still be avoided, or make the sitting able to hand off what it has learned. Two consequences worth acting on rather than discovering. First, a decision reached at a gate must be written to a durable surface AT THE MOMENT IT IS REACHED, never held in the session to be written alongside the implementation — here the fork's selection and its three receipts were posted to the issue thread before any code was attempted, so a refusal minutes later cost the implementation and none of the reasoning; had the record waited for the commit, the whole consultation would have died with the session and the next run would have re-litigated a decided fork with no idea it had been decided. Second, a threshold whose only recovery is a command the person must type is not a gate the machine can retry around, so it owes its measurement EARLY and repeatedly rather than once at the head of a stage, or the run discovers it exactly where the work would have started.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
