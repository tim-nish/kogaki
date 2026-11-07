<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1255 on 2026-10-05 found PR #1256 already open with a clean review round and green CI, merged it and closed the issue, but record-pass refused to record the pass because an earlier worker reap had already written a held stage-refused (suite-failed) close for the issue, and next-actions rendered FAILED at implement for a run that merged.

## The learning

A worker reap's terminal failure row is read as the issue's close even after the work it judged a failure reached the default branch through a pull request with a passing suite. The row said a commit the suite refused is never opened as a PR, yet a PR for that branch existed and was green. So a close graded from the record can say FAILED while GitHub says merged and closed. A run entering an issue whose earlier reap recorded a failure should compare that row against the merged closing pull request before trusting the close screen, and the grader needs a way for a later merged close to supersede an earlier reap's failure.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
