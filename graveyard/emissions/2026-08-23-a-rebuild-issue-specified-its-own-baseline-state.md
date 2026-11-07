<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A rebuild issue specified its own baseline state table, and the table it named omitted two of the four owner waits the shipped flow actually ends at — while the same issue made an acceptance item count waits and writes AGAINST that table.

## The learning

When a specification supplies both a baseline and the instrument that checks conformance to it, the instrument inherits the baseline's omissions and reports success over exactly the material that was dropped: the check is not wrong, it is measuring the wrong denominator, and it reads as coverage. The tell is that the baseline was written from the design's intent while the omitted members exist only in the shipped surface — here, two gates living in skill prose rather than in the target design's own vocabulary. So a baseline destined to become a denominator is derived from the shipped surface and diffed against the intent, never composed from the intent and assumed complete; and the diff is recorded beside the baseline, because a corrected figure with no record of the correction is indistinguishable from one that was right the first time.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
