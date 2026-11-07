<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Moving the Brief from Markdown to a YAML record (kogaki#1328), the acceptance asked that a Packet rendered from the new file carry what the old one did. The old parser was being deleted, so the only reference left was the old code's output, captured once from the real 2026-10-09 Brief.

## The learning

When a file format changes and the old reader is deleted in the same change, capture the old reader's OUTPUT on a real document before deleting it, and compare the new output against it field by field. Compare only the lines the document supplies, not the surrounding template text, so the fixture does not break the next time someone edits the template's wording. The one field the change meant to alter is asserted separately as its new derived value, so a reader can see that exactly one thing moved and that it moved on purpose.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
