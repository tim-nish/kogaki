<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1418's acceptance required checks/check-move-ingest.sh to pass with new assertions; while the work was in progress, kogaki#1427 deleted that check (and check-move-roles.sh) on master under the owner's decision that a check stays only if it has blocked a failure.

## The learning

When an Issue names a check by file and that check has since been deleted by an owner decision, do not restore it to satisfy the Issue's wording: that undoes a decision the Issue never weighed. Put the assertions the change owes into a surviving check the Issue also names, and say on the pull request which acceptance line the deletion moved and where its assertions went. Rebase onto the default branch before the first full suite run, so a deletion like this shows up as a conflict early rather than after the work is finished.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
