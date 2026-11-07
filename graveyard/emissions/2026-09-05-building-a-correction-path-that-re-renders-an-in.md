<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

Building a correction path that re-renders an input artifact: the re-render made a stored checksum in a record disagree with the thing it named, and the existing guard's refusal — which was correct — told the reader to redo the very work they were in the middle of.

## The learning

When a repair step regenerates an input that some record has already checksummed, the record and the input disagree from the moment the regeneration happens until the repair is recorded. An existing consistency guard will fire there, truthfully, and its advice will be wrong: it says the artifact was not produced from this input, and the repair it recommends — regenerate the whole artifact — throws away the half-finished repair. The fix is not to weaken the guard, which is right in general. It is to record that the work is mid-repair when it opens, and report that state by name for as long as it is open, so the reader meets a description of where they are instead of a true statement whose remedy is destructive.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
