<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

Reviewing the two-Leg Proof Sheet, the owner asked where the deferred-slot mechanism lives. It is computed in src/compose/moves.mjs by deferredSlots(), which reads a Move's description field and each Segment's manner by regex for deferral words (kogaki#1529). One hundred lines above, the same file states that description is human-facing, that no prompt renders it and nothing reads it (kogaki#1412, an explicit owner agreement). The owner had understood description to be consumed by nothing.

## The learning

An agreement that a field is for humans only is broken silently when a later mechanism finds the field convenient to read, and the comment asserting the agreement stays in place and keeps asserting it. The guard is structural, not textual: a human-facing field is excluded from the record view that mechanisms receive, so a later reader cannot reach it without changing the view and meeting the agreement at that point. When a mechanism needs what the human-facing field happens to hold, the fix is an authored field with that meaning, not a regex over prose written for people.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
