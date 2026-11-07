<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-26
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1203 on 2026-09-26: spawn-implementer stopped the worker as verification-refused after 11 minutes of exploration with no edits; two of the three counted refusals were the Read-size and repeat-Read hooks asking for an offset/limit window, which the worker could simply re-issue

## The learning

A stop rule that counts refusals must tell a hard denial (the act is not allowed) apart from a correction (the act is allowed in a different shape). Counting corrections as denials stops a worker during ordinary exploration of large files, before it has had any chance to commit, and the stop reads as a permissions problem the allow list cannot fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
