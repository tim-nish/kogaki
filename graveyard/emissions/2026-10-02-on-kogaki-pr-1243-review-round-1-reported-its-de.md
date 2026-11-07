<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1243, review round 1 reported its declared-checks dimension as cannot-determine: the round's own call to run the repository's checks was refused with 'argument --timeout: invalid int value: 7200.0'. The suite had passed at that same head minutes earlier when run directly with 'checks run'.

## The learning

A number passed between two tools has to keep the type the receiving side parses. Here one side wrote a timeout as a decimal and the other only accepts a whole number, so every review round silently skips the repository's checks and reports 'cannot determine' rather than a failure. Because a skipped run reads as a gap in evidence and not as an error, the review still lands and the merge still proceeds, and nothing points at the type mismatch. A round that reports a check dimension as undeterminable should be read as a fault in the round, not as a property of the change under review.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
