<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1283 / PR #1291, 2026-10-07: the implement supervisor copied the Issue's consult receipt onto the branch as an empty commit. Before round 1, the review engine rebased the branch onto a moved master, and git dropped that empty commit. boundary-receipts then went red and round 1 called it blocking, although nobody had removed the receipt.

## The learning

When one part of the tooling stores a record on an empty commit and another part rebases the branch, the record vanishes without either part doing anything wrong, because a rebase drops empty commits by default. The earlier lesson that empty commits do not survive was about sessions. Here the supervisor itself chose the empty commit, so every worker branch whose base moves before review loses its receipt. The repair in the run was to carry the receipt line verbatim onto the next real commit. The durable fix is for the supervisor to put the receipt on a commit that changes something, or for the engine's rebase to keep empty commits.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
