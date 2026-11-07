<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1261, 2026-10-05: a worker dispatched by session 2f828695 reaped compacted-without-progress at 05:56. A later /ship-cycle 1261 --session run (session 7ae9218c) re-admitted the Issue, finished its own session pass, merged PR #1266 and closed the Issue. record-pass then refused with 'the worker reap already recorded this run's close -- pass held [failure: stage-refused]', and next-actions refused with 'the newest pass or held row on this record belongs to session 2f828695'.

## The learning

record-pass decides that a close already exists without checking which session wrote it, while next-actions only accepts a close from the current session. After a failed worker run on an Issue, a later session that completes that Issue therefore cannot record its pass or render its close screen, even though the Issue is closed by a merged pull request. The outcome has to be reported in prose until record-pass checks the session the way next-actions does.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
