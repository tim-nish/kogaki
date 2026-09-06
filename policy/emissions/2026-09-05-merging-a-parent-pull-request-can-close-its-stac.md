<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #921 was based on PR #920's branch. Merging #920 deleted that branch, which closed #921 automatically. The platform then refused to reopen it — the base ref was gone, and restoring the ref did not help because the head had also been force-pushed past the head commit the pull request recorded. The child's review round, its findings and its comment thread stayed readable but the pull request itself could not be continued, so the work re-rolled as a fresh submission on the corrected base.

## The learning

Merging a pull request that another open pull request is based on does not merely leave the child needing a rebase — deleting the base branch in the same act can close the child outright, and closing is not reliably reversible. Reopening needs both the base branch and the recorded head commit to still exist, and the ordinary next steps after a parent merge (delete the merged branch; rebase the child and force-push it) each destroy one of those. So the two conditions are usually met together, by exactly the tidying the merge invites. Two consequences worth separating. The reversible-looking act is the trap: nothing warns at merge time, and the child looks recoverable right up to the moment two independent refusals say otherwise. And the loss is smaller than it appears, because the review record is a comment thread that survives — what is actually lost is the pull request as a continuable object, which matters because the round count and the merge path live on it. The cheap protection is ordering rather than a rule about deletion: retarget every open child to the new base BEFORE merging the parent, while both refs still exist, and only then delete the branch. Doing it afterwards is a race the tidying usually wins.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
