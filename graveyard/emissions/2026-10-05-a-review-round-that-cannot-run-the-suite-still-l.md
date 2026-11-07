<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki PR #1268 round 1 (2026-10-05): the review engine's own suite call failed with 'checks run: error: argument --timeout: invalid int value: 7200.0', and the round landed present with the suite result recorded as cannot-determine.

## The learning

When the reviewer's suite invocation breaks on an argument-format error, the round still lands and counts as present review, so the merge proceeds on a static read alone. Nothing marks that the suite was never run by the reviewer except one cannot-determine line in the report; a session merging on 'present' should read that line, and the engine should pass the timeout as a whole number.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
