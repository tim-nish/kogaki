<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

ship-cycle 1349, plan cell 3: the worker could not run a single check, then stopped on a refused validate-json call

## The learning

A worker that cannot run one check by name has no green to commit against. In the kogaki worker worktree, the toolkit's 'checks run --only <name>' fails on every check, including ones that passed before, because the repository's tools/run-registered-checks.sh has no --only flag. The worker then tried other ways to verify its edit, and the first one the Toolset did not allow (issue-sync validate-json) ended the cell. A cell whose acceptance needs a new check run needs a single-check route the worker is allowed to use, before it is dispatched.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
