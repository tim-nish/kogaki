<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1257's session pass at ded1326 failed when check-terrain-ownership.sh read 2050 ms against its own 2000 ms bound under eight-way suite contention (720-800 ms when run alone). The pass was re-run over the same commit by resetting the base. The finish re-read the check record already stored for that head, ran nothing, graded suite-failed again, and spent the cell's second and last failure (failures_per_cell_max=2).

## The learning

A session-cell finish grades from the check record stored for the head, so re-running it at the same head re-reads the cached verdict and never re-runs the suite. A red that is only load therefore cannot be cleared by retrying the pass; the retry spends a failure for nothing. Before retrying, move the head with a real commit, or confirm the failing member under the conditions it was graded in. Separately, terrain-ownership's 2000 ms self-bound has roughly 2.5x headroom over its standalone time and can still be crossed under full contention.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
