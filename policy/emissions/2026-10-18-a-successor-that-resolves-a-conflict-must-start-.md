<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1422: the worker carrying #1410's change was dispatched on a base older than #1420, the change it was meant to resolve against. It copied #1420's edits by hand, imported a constant its own base did not export, and was stopped when the suite failed. Cherry-picking the same commits onto current master and resolving the two conflicts there passed first time.

## The learning

When a piece of work exists only to settle a conflict with a change that has already merged, the run has to start from a base that already holds that change. Starting from an older base means the worker rebuilds the other change by reading its diff, and the rebuild can never be tested against the code it imitates. The conflict then turns up as a failure in some other place instead of as a conflict.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
