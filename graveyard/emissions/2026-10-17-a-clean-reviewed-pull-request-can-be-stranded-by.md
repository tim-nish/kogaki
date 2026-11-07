<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1410: PR 1421 passed its second and last review round with nothing unbuilt, then another pull request merged to master and touched the same file. The pull request became unmergeable on a conflict. The review tool answered done, because its review covers the head commit and the head had not moved, so the review tool's own conflict-resolving rebase, which buys one review round past the limit, never ran. A resolution committed by hand was refused at push because the review limit was spent, and the only way forward was a successor Issue.

## The learning

Whether a pull request still merges is not part of what the review check reads. The check asks whether the head commit was reviewed, not whether the head still applies to the default branch, so a conflict that appears after the last review round is invisible to it: it says done, and the one route built for a conflict-resolving rebase is never reached. A run should read the pull request's mergeable state immediately before the last review round, and again before merging, because a conflict found after the limit is spent costs a whole successor Issue.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
