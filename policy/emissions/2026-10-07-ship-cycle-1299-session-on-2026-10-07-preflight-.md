<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1299 --session on 2026-10-07: preflight passed, then session-cell elect failed seven times because GitHub's addComment mutation returned 'Something went wrong' for #1299 only (reads fine, other issues took comments minutes earlier).

## The learning

A run that halts on an infrastructure failure after preflight but before any admission, worker or Blocker row has no typed carrier for its close: record-pass denies (no outcome observed) and next-actions denies (no row from this session), so the run ends with no rendered close. Since every run carrier on an Issue is a comment, one Issue whose comment writes fail stops every lane on it while every read still succeeds.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
