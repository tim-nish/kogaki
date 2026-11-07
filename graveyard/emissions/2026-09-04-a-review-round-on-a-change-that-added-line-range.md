<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round on a change that added line-range pointers to an artifact's frontmatter found that the pointer resolved into a directory the repository ignores and periodically prunes, while the sha beside it was durable — and nothing in the artifact said which half was which.

## The learning

When a record carries two pointers to the same thing, check whether they have the same lifetime. A content hash survives anything; a path survives only as long as the tree it names is kept. Putting them side by side in one entry reads as one fact of one durability, and the reader has no way to tell that half of it can silently stop resolving. Either say which half is perishable, or do not pair a durable identifier with a perishable locator.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
