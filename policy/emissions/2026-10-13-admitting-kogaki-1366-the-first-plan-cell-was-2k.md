<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1366, the first plan cell was 2k tokens over the worker's window; splitting off the two schema-description edits made four cells, which admission refuses above three.

## The learning

When a plan cell is just over the window, move edits that no check depends on (descriptions, wording) out of it and into the cell that already edits prose, such as the spec cell. That shrinks the busy cell without adding a fourth cell, which admission would refuse.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
