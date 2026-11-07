<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Three mutations were run against a new filename guard. Two first reported NOT CAUGHT. Neither was a real gap: one fired an earlier assertion in the same fixture, which aborted the run before the case being grepped for was reached; the other was a mutation that did not express the property at all, appending a write after the guard rather than moving it before. Both had applied cleanly, so the anchor assertion that catches silent edit failures said nothing.

## The learning

A mutation reporting NOT CAUGHT has at least three causes and only one of them is the finding you are hoping for. The edit may not have applied; the mutated code may genuinely be uncaught; or your reading of the result may be wrong, because the suite stopped earlier than the assertion you were watching or because the mutation did not express the property you meant. Asserting the anchor before editing removes only the first. So before recording NOT CAUGHT as evidence that a property is unasserted, read the actual failure output rather than grepping for the message you expected, and re-state the mutation in terms of the property: if you cannot say which line of behaviour it changes, it is not testing anything. The asymmetry is what makes this worth a habit — a false NOT CAUGHT costs you a fix you did not need, while a false CAUGHT ships a check that asserts nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
