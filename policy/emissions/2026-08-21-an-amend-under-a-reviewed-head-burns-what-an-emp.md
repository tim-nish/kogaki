<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

Adding a consult receipt by amending a commit message under a reviewed pull request discarded the reviewed sha, made the report's carry-forward uncomputable in CI, and spent the round bound without any round running — the repair was then refused and the content had to re-land on a fresh branch

## The learning

Under a head that carries a review, a message-only amend is never free: it mints a new sha, the old one becomes unreadable after the force-push, and any equality check that wants to prove the diff unchanged has nothing to read. The cheap way to add record-only material to a reviewed branch is an empty commit on top of the reviewed sha — the diff stays byte-identical and the old head stays an ancestor, so the carried review still verifies. And a permission granted against a bounded budget counts against the budget whether or not it is used, so asking for a round you might not need can spend the last one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
