<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

Rebuilding the Move library from Proof Sheet-reviewed Extraction records (kogaki#1522): Leg 1's five records existed in three runs, and the two newest runs were reuse copies taken before the owner's last edits.

## The learning

When later runs copy an earlier run's records and the owner keeps editing, the newest run is not the reviewed version. Here the source run's files carried every edit (the 10-22 ones the copies also had, plus the 10-23 ones they lacked), while the copies stopped at the moment they were taken. Pick the input by diffing the candidates and reading each run's reuse record, never by run date.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
