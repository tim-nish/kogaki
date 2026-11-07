<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1423: a session pass stopped at its failure bound with a sound commit on its branch; the next /ship-cycle --session run had to carry that commit

## The learning

When a session pass is re-run in a new run over a branch that already holds the work, start reads the worktree's current head as the base, so starting on top of the commit would grade the pass as no change. What worked: keep the commit on a spare branch, reset the worktree to the default branch tip, run start, cherry-pick the commit (this also rebases it and resolves conflicts with newer work), run the suite once, then finish. The new commit hash also avoids the stored failed suite record the old head carried. Separately, re-running the client kit installer in a worktree rewrote one tracked file (policy/CAPABILITIES.md), which had to be reverted before the suite run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
