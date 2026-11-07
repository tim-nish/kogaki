<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217 re-dispatched on 2026-09-29 after the anchor-resolve script was added to the plan files; the worker ran that script fine, then was reaped verification-refused on its fourth command, a git diff against the empty tree piped through grep, sed and tail into a file under /tmp

## The learning

Issue 1217's Acceptance says each anchor is taken from the target file as it read at the pointer's blame commit, which means reading about 25 old file versions. The worker lane allows git diff and git log but not git show, so the worker rebuilt an old file by diffing it against the empty tree and redirected the result into /tmp, outside its worktree, and that redirect was the refused part. Fixing the plan's file list does not reach this, because the method an Issue prescribes can need a read command no file list names. Before dispatching an issue whose method reads history, check that the lane allows the plain read, git show sha:path, so the worker has no reason to compose one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
