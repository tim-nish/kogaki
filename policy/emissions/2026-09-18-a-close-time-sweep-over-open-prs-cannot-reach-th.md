<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1135 merged its only pull request, then ran the declared review_reconciliation command at close. That command sweeps OPEN pull requests, so it answered 'no open PRs' and did nothing. The five finding rows round one had carried to the register were still unlanded, and only a per-PR disposition pass named with the merged number landed them.

## The learning

A reconciliation pass scoped to open work cannot reach the work the same run has just closed. Where a run both produces and finishes a unit of work, a close-time sweep defined over the still-open set is empty by construction exactly when that run is the one that needed it — the sweep is written for OTHER runs' leftovers, and reads as a completed reconciliation rather than a skipped one. A pass that must cover the run's own output has to be addressed at that output by name, not discovered by a query whose population the run itself just emptied.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
