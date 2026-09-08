<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

Deleting a second schema for information the Brief already carried left four guards joined against a file that no longer existed: a template-vs-Packet leak check, a table-vs-schema field join, a one-level dotted reach into a record field, and a runtime literal for the final claim's key. Each still ran, and each would have gone on reporting healthy while measuring nothing.

## The learning

When a carrier is deleted because a second copy of the same information is the defect, the guards that joined against it do not retire with it — every one of them has a property that survives, and the property must be re-cut onto whatever now holds the information rather than dropped. The tell is that each of these guards still executed after the deletion: a leak check reading a template that was gone would have read an empty file and passed on every Packet block; a field join against an absent schema would have found no disagreement; a dotted path into a flat field resolves to undefined, which renders as an absence rather than as an error. So the deletion's completeness criterion is not that nothing references the old file — a dead pointer at least fails loudly — but that every guard has been re-pointed and each re-pointing states what it now reads, including a refusal when the new source cannot be found. Where the property genuinely cannot survive, because the thing it measured is gone with the schema, it leaves under a recorded decline naming the act that would restore it, and the check's own budget record carries the drop with its cause so a later reader can tell a retirement from an erosion.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
