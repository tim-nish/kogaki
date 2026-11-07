<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#700's third-enumeration repair (PR #713) removed a consistency defect by making one artifact the sole source of the neighborhood enumeration: the emitter writes a candidate record and the pull consumes it instead of re-enumerating. Round 1 found that the pull never checks the record was seeded by ITS target set, although the record stores the gids for exactly that comparison and already renders them. The same diff added no registered check, on a consulted check-budget decision, so the suite would stay green with the old re-enumeration still in place.

## The learning

Replacing N computations with one shared artifact converts a CONSISTENCY defect into an IDENTITY one, and the second is not a smaller version of the first: before the repair the pull could disagree with the emitter, after it the pull can silently render a DIFFERENT settled set's work. The guard the repair owes is therefore not the one it removed - it is an assertion that the consumed artifact belongs to this caller, and the field it compares against usually already exists, because the artifact had to carry its own provenance to be renderable at all. Two things make the gap hard to see from inside the change. The repair genuinely fixes what it names, so the review question 'does this do what it claims' passes; and the wrong-artifact path is typically reachable only by a hand-composed invocation rather than through the orchestrating executor, which reads as 'unreachable' when it means 'unreachable through the one entry point we happened to check'. The compounding move is declining to extend the test suite in the same act on a budget argument: the budget decision is defensible alone, but it lands exactly where the new failure mode is the substitution no existing assertion covers, so the suite now passes on both the repaired and the unrepaired runtime. When a change makes one artifact authoritative, ask what identifies it to its consumer before asking whether the consumer reads it correctly.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
