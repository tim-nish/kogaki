<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki PR #1265 review round 1 on 2026-10-05: the engine's own run of tools/run-registered-checks.sh failed with '--timeout: invalid int value: 7200.0', so the round reported mechanisms ok=False

## The learning

The review engine passes its check timeout as a float string and the kogaki check runner only accepts whole numbers, so the engine's own suite run fails on argument parsing before any check runs. The round still graded the change by reading the completed CI run for the same commit. Until the engine sends a whole number, 'mechanisms ok=False' on a kogaki round says nothing about the change; look at the report's D3 section to find what actually grounded the grade.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
