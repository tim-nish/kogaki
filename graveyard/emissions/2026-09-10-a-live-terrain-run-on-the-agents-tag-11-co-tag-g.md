<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

A live /terrain run on the 'agents' tag (11 co-tag groups) stalled: the PostToolUse advance hook killed the executor at its 480s bound after 8 of 11 per-group judge calls, leaving the run record still reading 'awaiting TAG_SELECTION' with no route forward — the executor is hook-invoked only, and a re-raised gate would restart the per-group loop from group 1 and spend the same bound again.

## The learning

A work loop whose total cost scales with input size must be resumable if the thing that bounds it is fixed. Splitting one big call into many small ones lowers the per-call cost but does not lower the total, so a fixed outer bound still cuts the loop somewhere — and when the completed pieces are on disk but nothing reads them back on re-entry, every retry redoes the same prefix and dies in the same place. Either the loop reuses the pieces it already finished, or the outer bound has to be derived from the input's size rather than declared once.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
