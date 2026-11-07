<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217 dispatched an implementation worker for a pointer-migration issue whose Acceptance item 1 is the output of checks/check-anchor-resolve.sh; the worker was stopped as verification-refused after 30 seconds and four refused attempts to run that script, with no commit.

## The learning

A worker's permission to run a check comes from the admission plan's file list, not from the Issue's Acceptance. When an Issue's Acceptance is measured by a script the work does not edit, the worker still needs that script in its licensed footprint (or the lane's allow list must cover it), or it cannot even take the first reading it needs to find its work. Admission should add every Acceptance-named check to the plan cell's files before dispatch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
