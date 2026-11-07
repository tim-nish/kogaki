<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-21
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-21 PR #1499 for #1491 was reviewed clean with both review rounds spent, then conflicted with master when #1493 merged a case into the same check file. The successor #1503 was minted and its worker branch was seeded at the dead PR's head on the old master.

## The learning

When a successor exists only because its predecessor's pull request conflicts with master, the session can carry the change itself before dispatching the worker: apply the dead pull request's whole diff to current master on the successor's worker branch, resolve the conflict once, commit, and remove the worktree. The worker then finds the work done and its suite runs against current master, and the new pull request needed one review round. Rebasing commit by commit costs one conflict per commit; applying the whole diff costs one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
