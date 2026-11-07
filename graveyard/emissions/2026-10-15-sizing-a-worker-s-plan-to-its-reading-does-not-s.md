<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1385 on 2026-10-15: the plan cell named every reference file the Design pointed at, with regions, and admission sized the read at 89k of a 94k allowance; the worker (200K window) still compacted with no edit after 23 Reads and 10 Greps and was reaped compacted-without-progress, the same stop #1384 met that morning.

## The learning

Putting the reference files into the plan made admission's size estimate honest but did not bound what the worker actually read. The worker read every planned file twice in a row, read compose.mjs whole rather than at the planned regions, and then read four files outside the plan (candidate-schema.json, leg-schema.json, paragraph-plan.mjs, draft.mjs) because the Acceptance asks it to prove /paragraph-plan and /draft accept the result. An estimate that sits within a few thousand tokens of the allowance leaves no room for any of that, so a plan this close to the limit should be treated as not fitting: split it so the first cell commits a scaffold before the heavy reading, or run it in the session.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
