<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1262 on 2026-10-05 re-admitted the amended Issue, dispatched a clean worker, opened PR #1267, reviewed and merged it; at close, record-pass answered that the worker reap had already recorded this run's close (dispatch 1's suite-failed held row, written by session 891b6819) and wrote nothing, while next-actions refused that same row as belonging to a different session and told the run to call record-pass.

## The learning

The two close acts read the same reap row with different ownership rules: record-pass treats any reap row as the current run's close and stops, next-actions checks the row's session and refuses it as foreign. When an earlier dispatch failed in another session and a later run succeeds, the later run can neither record its merged outcome nor render its close screen, and the Issue's run record keeps reporting a failure for work that landed. record-pass's short-circuit needs the same session check next-actions already makes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
