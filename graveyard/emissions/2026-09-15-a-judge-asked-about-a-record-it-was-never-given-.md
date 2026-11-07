<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run on the agents G1-2 set composed three Reader Paths whose Steps all bound Move ids that do not exist in moves/. The composing judge's input carries the Brief and the Strand ids and no Move library, so it invented plausible hyphenated ids. The later specialization judge, whose whole job is to compare each Step's before/after states against the requires and effect its bound Move DECLARES, was handed only the Steps -- no Move records -- and returned 'consistent' for all six with reasoning that begins 'The move requires...', describing contracts it had invented. Both owner gates and three judge calls were spent before the write state refused because moves/frame-the-construction.md does not exist.

## The learning

When a judging step is asked to compare something against a record it is not given, it will not report that the record is missing; it will supply a plausible version of the record and judge against that, and the verdict is indistinguishable from a real one. The absence is invisible precisely because the output is well formed and confident. Two repairs, and both are needed: hand the judge the record it is told to judge against, so its input contains the thing it is comparing to; and check the reference resolves at the moment it is composed, not at the far end of the flow, because a reference validated only where it is finally used spends every gate and every judge call in between before anyone learns it was never real.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
