<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1292 (for #1281), 2026-10-07: round 1 landed clean, auto-merge was armed, then #1291 merged to master and the PR went DIRTY. review-lane spawn answered 'done — nothing to spawn' because presence was present at the head, so its behind-check never ran; a session rebase was hook-denied; the deny named a fresh commit as the other admitted route.

## The learning

When a peer merge makes a reviewed pull request conflict, the review lane's own rebase is not reachable: spawn stops at 'done' before it checks whether the branch is behind. The admitted route is a merge commit of master into the branch, which moves the head and is reviewed by the next round. Build that merge on the branch's REMOTE head: if the engine rebased the branch earlier, the local copy still holds the pre-rebase commits, and a merge built on them silently undoes the conflict resolution the engine already made and that round 1 reviewed. Also, the push-triggered round starts on its own, so a session spawn right after the push is refused as a re-run of that round; await it instead.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
