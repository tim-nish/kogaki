<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1311 removed the Move-resolving half of Brief adoption (the 'resolved' local) but adoptCandidate's return still read resolved.checked; the first live adoption after merge crashed with ReferenceError at the Candidate selection gate, after a ~15-minute compose and review job.

## The learning

When a change deletes a step, every later read of that step's result has to go too — including the summary fields in the return value and the log line that prints them. A suite that never runs the success path end to end will stay green over this, so the first real run is where it surfaces, and in a long pipeline that is after the expensive work has already been spent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
