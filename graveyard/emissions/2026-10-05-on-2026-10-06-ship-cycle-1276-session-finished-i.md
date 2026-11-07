<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-06, /ship-cycle 1276 --session finished its session pass at b1a21a7 (graded implemented), opened PR #1277, then made one more commit (7d39605) answering review round 1's findings. The push of that commit was allowed, and round 2 reviewed it and the PR merged.

## The learning

The session-cell contract says a commit made after a session pass's finish needs a new finish before it can be pushed, and that finish refuses a cell already finished, which reads as: no post-finish commit can ever leave the machine. In practice the push hook let it through once a pull request was already open for the branch. So answering review findings after finish is possible, but the written contract does not say so, and a session reading it would skip fixing findings it could have fixed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
