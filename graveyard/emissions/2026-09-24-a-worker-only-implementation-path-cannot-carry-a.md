<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1187: turning 21 private Corpus Analyses into Moves needed a git-ignored Corpus that worker worktrees cannot read, plus owner rulings taken mid-act (rename 13 model-chosen ids to their slugs, merge one colliding Move). The session ran the command itself in its own worktree, got 21 valid Moves and a green 41/41 suite, and then the push was denied because no engine-spawned worker had ever been dispatched for the Issue.

## The learning

Only the push checks whether the act went through a worker, so work done in the session is refused after it is finished, not before it starts. Before running an act in-session because a worker cannot reach its inputs or its owner questions, raise that fork at admission. Either get the inputs and the rulings into a place the worker can read, or have the Issue name a route that is not the worker path. The alternative is finding out at the push.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
