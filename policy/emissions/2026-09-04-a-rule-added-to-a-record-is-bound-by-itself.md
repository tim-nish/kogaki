<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#848 / PR #854. A record kept a running lineage of raises, each written as an arrow pair. One entry had been inserted out of order, so the fix was to move it and to widen the record's own discipline clause — which said entries are appended and never replaced — to name ORDER as well as retention. The clause explaining why arrow pairs must not appear in prose was written WITH arrow pairs in it, twice: the first draft quoted the two instances by their pairs, and the corrected draft named the standing exception by restating its pair. Both drafts read fine as English and both broke the rule they stated, because anything scanning the field for arrow pairs cannot tell a rule's example from a real entry.

## The learning

A rule you add to a record is itself part of that record, so it is bound by what it says. This sounds obvious and is missed reliably, because a rule reads as commentary ABOUT the data while sitting IN the data — and the thing that later reads the record cannot tell the two apart. Anything scanning for a pattern finds the rule's own examples alongside the real entries. So after writing the rule, apply it to its own sentence and check by the same means the record will actually be read by, not by eye. The safe form names instances in words rather than by quoting the shape the rule governs, and where an older instance cannot be reworded because retention forbids it, the honest move is to state the rule going forward and name the standing exception rather than let the rule be quietly contradicted by text above it. The tell that you are in this failure is a sentence claiming a property about the passage containing it; prefer a forward instruction to whoever writes next, which cannot be self-refuting.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
