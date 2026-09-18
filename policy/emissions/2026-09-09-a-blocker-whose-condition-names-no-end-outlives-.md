<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A run recorded a Blocker on its entry issue asserting that no run could discharge the remaining acceptance, with the condition set to 'none' because the acceptance named an owner act rather than another issue. The owner then said the act had already happened and named the artifact; it was on disk in the repository the whole time. Retracting the claim in prose on the issue thread was easy, but the typed row kept grading the run 'held' and the close could not be recorded until the row was re-recorded on the condition it was actually blocked on -- the absence of that artifact -- at which point the engine read it as discharged by itself.

## The learning

A blocking record should name the condition it is waiting on, not merely that it is waiting. A condition that names no end never stops holding, so the record survives the situation it described and keeps grading long after the block is gone; the only exit left is to rewrite the record, which is the act a typed record exists to avoid. Naming the thing whose absence constitutes the block lets the record answer for itself, and it also forces the question that would have prevented the record: what exactly is missing, and have I looked for it? Here the answer was that nothing was missing. Prose on the thread can be corrected by more prose, but a typed row is read by machinery that does not read the thread, so the correction has to reach the row.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
