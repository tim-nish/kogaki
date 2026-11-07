<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

ship-cycle 1358 re-dispatch after a flaky brief-reader-path-job failure at an unchanged worker head

## The learning

When a worker's suite failed only on a flaky check, the saved per-commit result keeps replaying that failure on every later dispatch. Running the suite runner directly to force a fresh green run is now blocked by a hook. What works: confirm the flake by rerunning that one check by hand, move the saved failed result out of the checks directory, and run the checks tool once at the worker's commit; it re-runs the full suite and saves a fresh result, after which the dispatch proceeds normally.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
