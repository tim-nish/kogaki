<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

On /ship-cycle 1422 the worker for a successor Issue started from the dead pull request's surviving branch, which still sat on the master it was written against. The worker could not bring master in, so the renderer it fixed imported a name only the new master exports, and the suite failed.

## The learning

When a successor Issue exists because its predecessor's pull request conflicts with master, the work cannot be done on the old branch. The branch has to be moved onto the current master before a worker starts, because a worker may not merge or rebase. Otherwise the worker resolves the conflict in the files it is licensed for, and the code it did not touch still comes from the old master, so the change cannot pass.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
