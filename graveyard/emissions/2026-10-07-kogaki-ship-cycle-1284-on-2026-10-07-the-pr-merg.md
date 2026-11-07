<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki /ship-cycle 1284 on 2026-10-07: the PR merged and the Issue closed, but record-pass reported an earlier run's failed-worker row as this run's close and wrote nothing, while next-actions refused that same row as belonging to another session.

## The learning

A re-run that succeeds after an earlier run failed at the worker cannot record its own close: record-pass stops at the newest row if it is a worker failure, without checking which run wrote it, and next-actions only reads rows from the current run. The check in record-pass needs to look at the row's session the way next-actions does.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
