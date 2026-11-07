<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#739, I wrote two checks over the same rendered line: first that a subdivided group heading carries its Lesson count, then that it carries no member list. The first was written with an anchored end-of-line test. Running the member-list mutation, the anchored test failed first and reported the line as MISSING ITS COUNT — a true failure with a false cause — and the second check could never run at all. Reading the code did not show this; running the mutation did.

## The learning

When two checks read the same value in order, the stricter one absorbs the other's failures and reports them under its own name. The second check is then dead: it can never be the one that fires, so it is never the one whose message a reader sees, and nothing distinguishes it from a check that was never written. The damage is worse than a missing check, because the surviving message names the wrong cause and sends the next reader to the wrong place. Two things follow. Each check should test only its own property, as narrowly as it can, so that a failure in one direction cannot satisfy the test for another. And the ordering has to be exercised, not reasoned about: run a mutation for every direction the checks claim to cover, and confirm that the one you expected is the one that fired, by its message and not merely by the run going red.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
