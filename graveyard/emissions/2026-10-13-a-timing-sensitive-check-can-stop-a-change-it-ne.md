<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-13 a worker on kogaki#1358 added one section to passages/FORMAT.md. The supervisor's suite run failed it on check-brief-reader-path-job, which never reads that file. The same check passed on master and in the worker's own worktree right afterwards (about 95 seconds a run).

## The learning

A check whose result depends on how long things take can fail under load and stop work it has nothing to do with. The run then ends, and the change is sent back for a decision, even though nothing in it was wrong. Before treating such a failure as a real problem with the change, run the same check again on the main branch and on the change; if both pass, the failure belongs to the check, not to the change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
