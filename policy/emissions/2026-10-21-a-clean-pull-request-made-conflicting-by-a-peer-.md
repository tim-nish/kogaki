<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-21
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-21 PR #1501 (kogaki#1493) was reviewed clean in round 1, then a peer merge of #1492 touching the same check file made it conflicting. The review engine answered 'done — nothing to spawn' and a session rebase was refused by the hook.

## The learning

When a reviewed-clean pull request becomes conflicting because another merge landed, and the review bound still has a round left, the way through is a fresh commit: start a new session pass, merge the default branch into the branch and resolve, finish the pass so its record names the new head, and push. The push starts the next review round on its own, so wait on that round rather than spawning another. A rebase is refused because it rewrites a head under review; a merge commit is not.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
