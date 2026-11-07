<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1314 on 2026-10-09: the worker assigned to change .claude/hooks/gate-terrain-executor.py ended up with that file deleted in its worktree (its wip commit shows 302 deletions). That script is registered as a PreToolUse hook on Bash in the same worktree, so every later Bash call failed with 'can't open file', including its own attempt to restore the file with git checkout, and the worker was stopped as verification-refused with no commit.

## The learning

When a piece of work changes a hook script that the worker's own session runs before each command, any moment the file is missing or broken disables every command the worker could use to repair it. The worker cannot recover by itself. Such work needs the change made in a way the running hook never sees half-done (write the new file whole in one step, never delete-then-recreate), or it needs to run where the hook being edited is not the one guarding the session.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
