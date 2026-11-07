<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1269 reaped suite-failed four times at the same head 94ca1e9. The first failure was real but environmental: two checks with wall-clock bounds (terrain-ownership's 2000ms bound and brief-reader-path-job's case b3) failed under machine load from other sessions' workers, and passed alone. Every later dispatch reaped suite-failed 26 seconds after starting: the toolkit's checks run reuses any stored record for a clean head regardless of its outcome, so the failed record under .git/checks was replayed without a single check executing. The two session records on the Issue read the replay as a second contention failure.

## The learning

When a worker's suite failure repeats at an unchanged head with a reap that takes seconds, the suite did not run: checks run replays the stored per-head record, pass or fail, so a failure caused by load is frozen for that head until the record is cleared. The recovery is to run the registered suite forced from the session when the machine is quiet (the runner writes a full-pass verdict for the head on a green run), move the failed record out of .git/checks, and let one fresh checks run write a green record from the reused verdict; the next dispatch then reaps implemented. Re-dispatching without touching the record spends a failure-bound slot and changes nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
