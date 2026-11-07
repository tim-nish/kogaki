<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1346 moved the policy tool folder out of Kogaki into its own private repository and gitignored the installed copy. CI got an install step and passed, but the review round's own fresh checkout ran 8 of 39 checks red with no message saying the copy was missing, and the installer rewrites two tracked files every time it runs.

## The learning

When a dependency stops being tracked and is installed instead, every place that checks out the repository needs the install step too: CI, review worktrees, fresh clones and linked worktrees. Without it, the checks fail with messages that look like real defects. And an installer that rewrites tracked files leaves a dirty tree after every install, which the next run's clean-tree gate refuses. Make the missing install a named failure, and keep the installer from rewriting tracked files.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
