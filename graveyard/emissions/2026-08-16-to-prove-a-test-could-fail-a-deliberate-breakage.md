<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-16
repo: Kogaki
grain: lesson

## Trigger — what happened

To prove a test could fail, a deliberate breakage was applied to a file that also carried the sitting's real, uncommitted fixes. The breakage was then reverted by restoring the whole file from the last commit, which silently discarded the real fixes along with it. The loss was noticed only because the next run printed the old version's output.

## The learning

When you deliberately break something to prove a check can fail, undo the breakage by applying the inverse of the exact edit you made, never by restoring the file wholesale -- a wholesale restore removes everything that is not yet saved, and the deliberate breakage is usually made at exactly the moment the file is full of unsaved work, because proving the check is the last step before saving. If you must restore wholesale, save the real work first, even as a throwaway snapshot; the cost of one extra save is nothing against re-doing edits whose exact wording carried review-facing decisions.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
