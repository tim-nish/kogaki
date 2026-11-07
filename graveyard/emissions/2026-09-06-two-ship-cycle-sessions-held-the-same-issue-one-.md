<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Two /ship-cycle sessions held the same issue. One merged PR #946 at head 86d10676; two and a half minutes later the other pushed 7d03c11 to that PR's branch — a complete, suite-passing fix for the three findings the merged round had carried. The push succeeded, the PR was already closed, and the commit was reachable from no open pull request. Nothing errored on either side: the merging session's presence read, eligibility read and merge all returned ok, and the pushing session's commit and push both returned ok.

## The learning

A branch outlives the pull request that gave it a route, so a push to it keeps succeeding after the only thing that could land it is gone — and both sessions read success. The losing work is not detectable from either side's own surface: the merger sees a clean merge of the head it read, the pusher sees a clean push to the branch it holds, and only a third read comparing the branch tip against the merge commit shows a commit that can no longer reach the default branch. What made it recoverable here was ordinary curiosity at cleanup — noticing the worktree's HEAD did not match the head that was merged — which is not a mechanism. Before deleting a branch whose PR merged, compare its tip to what actually landed and treat any excess commit as unlanded work rather than as debris; and where sessions share a repository, a claim taken before branch work is what makes the other session's work visible at all, since a claim-list read is the only surface that shows a peer holding the same issue.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
