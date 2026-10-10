<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1250, review round 1 on PR #1253 wrote its verdict as 'D1 — unbuilt: none.'. record-pass's _UNBUILT_LINE pattern accepts several prefixes but not a leading 'D1 — ', so it reported that no round authored the enumeration and refused a completed close on a merged PR that had a verdict.

## The learning

A reader that checks review reports has to accept every line shape the reviewers actually write, including a dimension-label prefix like 'D1 — '. Otherwise a round that did state its verdict is graded as if it had not, and because the PR is already merged, the only remaining close is a failure. Either the reviewer's line format gets pinned, or the reader accepts the label prefix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
