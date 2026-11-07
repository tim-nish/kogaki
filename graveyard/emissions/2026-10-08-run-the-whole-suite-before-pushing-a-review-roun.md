<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1307, PR #1308: the round-1 fix was pushed after running only the checks it touched; it added a code comment naming a spec section number, which a registered check forbids, and round 2 (the last) found the suite red, so the PR could not merge and the work moved to successor #1309.

## The learning

A fix made in answer to a review round is a new change and needs the same full-suite run as the first push. Running only the checks the fix seems to touch misses rules that scan the whole tree, such as a ban on a particular text pattern in comments. When the next round is the last one, a defect it finds cannot be fixed on that pull request at all, so a full-suite run before every review-round push is far cheaper than the successor issue and second review the miss forces.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
