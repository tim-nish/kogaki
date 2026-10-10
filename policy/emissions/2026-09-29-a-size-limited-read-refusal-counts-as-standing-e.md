<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1225, 2026-09-29: the implement worker for plan cell 1 was stopped verification-refused 51 seconds in, head unmoved, with no edits made

## The learning

The worker tried to read checks/registry.json whole; the read-size hook refused it (621 lines, over 500) and asked for a ranged read. The worker instead found what it needed with grep, but the supervisor graded that refusal as standing rather than recovered, because it only counts a retry of the same tool with a corrected shape as a recovery. One standing refusal with no commit yet stops the worker, so a cell can die in its first minute on a lookup it already answered another way. The file was not even in that cell's footprint. A worker brief that says to read large files by range, or a grader that accepts a same-intent lookup by another tool as recovery, would each prevent it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
