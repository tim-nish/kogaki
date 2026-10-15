<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1348 was launched without --session on an Issue the owner had marked for the session; admission refused correctly and named the relaunch, but wrote no record of the stop, so the closing steps refused to report how the run ended.

## The learning

When a step is designed to stop a run early, it has to write down that it stopped, in the place the closing step reads. Otherwise the stop is correct but the run cannot be closed: the closing step finds no evidence of any outcome and refuses, and the only honest report is outside the normal close screen.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
