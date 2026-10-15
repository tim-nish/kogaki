<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Three review-lane rounds on kogaki PRs 1342 and 1344 reported registry-conformance red while the same head passed in the worker worktree, a fresh worktree, a fresh clone and CI. Two sessions guessed a time bound under load and made it injectable. The actual cause: the review lane deletes .claude/settings.json from the worktree it checks, and a registry entry declared that file under covers, which the check resolved by on-disk existence.

## The learning

When a check fails in exactly one runner and passes everywhere else, enumerate what that runner does to its checkout before guessing at timing. Reproduce by applying the same setup steps to a fresh checkout. A check that reads the tree should resolve paths against the index as well as the working copy, because a runner may strip tracked files for its own reasons.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
