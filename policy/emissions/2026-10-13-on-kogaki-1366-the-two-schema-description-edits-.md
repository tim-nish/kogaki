<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1366 the two schema-description edits were folded into the SPEC cell to fit the window; that cell's worker edited the SPEC and left both descriptions untouched, and the run caught it only by grepping the acceptance item before opening the PR.

## The learning

An edit moved into a cell whose act is about another file is easy for the worker to skip. After the last cell, check each acceptance item against the branch before the pull request opens, rather than trusting that every cell finished what its file list named.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
