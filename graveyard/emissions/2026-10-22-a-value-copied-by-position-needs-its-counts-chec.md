<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1510 copied each Segment's manner onto the Paragraph Waypoint at the same position; review round 2 on PR #1515 found that only a model judge checked that the two lists were the same length

## The learning

When a program copies a value from item N of one list onto item N of another, it is relying on the two lists lining up. If the only thing that checks they line up is a model's judgment, then on the day the model lets a short or long list through, the value lands silently on the wrong item and nothing fails. The copy and the count check belong together in code: refuse, or copy nothing, when the lengths differ.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
