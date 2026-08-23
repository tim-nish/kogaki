<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-17
repo: Kogaki
grain: lesson

## Trigger — what happened

During a stacked merge train (2026-08-17, kogaki PRs 496-500), each child branch was rebased onto the just-squashed master and force-pushed. The review report on each child named the pre-rebase head, so the merge gate had to recompute the reviewed diff to carry the report forward. Locally that always worked; in CI it failed three times in a row for one PR, reporting the head as unreviewed, because both commits of the reviewed diff had gone dangling on the server once the force-push moved the branch — the CI clone simply could not read them. Re-advertising the two old commits under temporary keep-refs made the same CI check pass unchanged, and the refs were deleted after the merge.

## The learning

A review that is carried across a rebase by recomputing the old diff depends on the old commits staying fetchable, and a force-push is exactly the act that unmoors them. Whoever rebases a reviewed branch should keep the pre-rebase commits reachable — a temporary ref, or merging before pruning — until the carry has been established by every consumer that needs it, including checkers running in fresh clones. The failure otherwise looks like a stale or missing review when it is really an unreadable one, and retrying cannot fix it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
