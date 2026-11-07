<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1260 on 2026-10-05 found #1260's only worker in stopped-at-gate from an earlier session (turns 60/60, one wip commit on src/compose.mjs). worker-status said the run ends and the cell returns to Admission; record-pass then refused with 'nothing observed establishes an outcome', because no worker halt row exists for stopped-at-gate and the earlier session's rows are not this run's.

## The learning

When an Issue's worker stopped at its turn budget in an earlier session, a later /ship-cycle run on that Issue cannot dispatch it again and cannot record a close either. The stop is not in the list of worker failures that write a halt row, so record-pass finds nothing to grade. The run can only report in prose. The fix belongs to Admission: re-plan the cell with a smaller scope or a bigger budget before running the cycle again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
