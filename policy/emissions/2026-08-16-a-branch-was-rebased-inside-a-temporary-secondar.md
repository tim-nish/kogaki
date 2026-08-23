<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A branch was rebased inside a temporary secondary checkout because the main checkout held another live session's uncommitted work. The rebase silently dropped a commit that contained no file changes -- it existed only to carry consultation receipts in its message -- and the drop was noticed only because a later gate demanded the receipts.

## The learning

A commit whose whole value is its MESSAGE -- a receipt, an attestation, a decision record -- is invisible to tools that reason about commits by their diffs, and a rebase is such a tool: it may drop an empty commit without a word. When a workflow deliberately mints message-only commits, every history rewrite must be followed by a count of them, or the workflow should attach the message to a real artifact instead, because a record that survives only while nobody replays history is a record with an undeclared lifetime.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
