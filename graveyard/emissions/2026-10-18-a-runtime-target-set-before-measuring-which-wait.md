<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1424 / PR #1429, 2026-10-18: five slow checks were given a short heartbeat passed in by the test, which cut them from 309/242/114/42/32 s to 9.6/4.5/32/0.9/0.8 s and the suite wall from 363 s to 57 s. One check stayed at 32 s against its 20 s target, because the time left was in waits the check itself tests (1 s call limits, a stall bound, deliberately slow fake answers). Both review rounds flagged that the issue's 20 s target and its rule against changing what the checks assert could not both hold.

## The learning

Before you set a time target for a slow test, find out which of its waits are only padding and which are the thing the test checks. Passing a short heartbeat into a test removes padding cheaply, and the real system keeps its real timing. The waits the test checks do not shrink that way, and they set a floor. A target below that floor quietly asks for the assertions to be weakened. So measure the floor first and set the target above it, or say in the issue which assertions may change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
