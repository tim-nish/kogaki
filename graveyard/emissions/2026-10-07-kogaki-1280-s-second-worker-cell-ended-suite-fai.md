<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1280's second worker cell ended suite-failed on a registry check; the next ship-cycle run re-dispatched after the engine had moved and the worker fixed it in one commit.

## The learning

A worker re-dispatched after a suite failure only fixes the failure if it can see it. The reap row names just the failing check (failing=registry-conformance), not what the check said, and the worker reads the Issue thread rather than the supervisor's suite log. Posting the check's exact FAIL lines on the Issue thread before re-dispatching gave the worker an observable target, and it repaired the registry entry in one commit with no other change. The re-dispatch was admissible only because the engine hash had moved since the failed run; with every input unchanged it would have been refused.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
