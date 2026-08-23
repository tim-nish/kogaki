<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-22
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #611 round 1 (2026-08-22): a review found that a detector token removed to fix a false positive had never matched the line blamed for it — the false positive came from a different token, and the removal was pure coverage loss

## The learning

Before removing a guard's pattern to fix a false positive, reproduce which pattern actually fired. A failure has a specific matching clause, and attributing it to the wrong one buys nothing at the site of the fix while silently dropping real coverage somewhere else. The tell: after the removal, the original failing case still needs a second change to pass. Reproduce the match (run the guard's own pattern over the specimen and read which alternation hit), then remove or narrow only the clause that fired — and keep a specimen for every clause that stays, so the next removal has to show its work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
