<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1255: the 2026-10-04 amendment named the retired-vocabulary check the suite failed on, but listed only the three files to edit; the re-dispatched worker could run only brief-review, saw it pass, and ended in 8 turns at the same head, suite-failed again.

## The learning

When a re-dispatch is meant to fix a red check, telling the worker about the check is not enough. The worker's allow list is built from the plan's file list, so a check that is not on that list cannot be run, and the worker cannot see the failure it was sent to fix. It reruns the checks it is allowed to run, sees them pass, and reports the work as done. The amendment has to add the failing check to the plan's files so the worker can run it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
