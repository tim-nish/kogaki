<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1530 added a ParagraphPlan judge axis in a session worktree; the bench wrote its run directory under the worktree's ignored runs/ tree, and the axis's justified_by names that path.

## The learning

A record that names evidence by a path in an ignored directory points at nothing once the checkout that holds it is removed. Before removing a worktree, copy any run directory a committed record names into the main tree, or the committed record cites evidence no one can open. Separately, while a new axis has no justified_by, the stage refuses to start, so every check that drives a real job fails until the bench has run; run the bench before reading those failures as regressions.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
