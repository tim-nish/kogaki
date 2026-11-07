<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-16
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki#1401 (2026-10-16) admission listed names-tables and section-numbers among the cell's checks; the worker ran only proof-sheet-leg-run, reported green, and the supervisor's suite then failed both checks on the worker's own new comment text.

## The learning

Listing a check on a worker's plan tells the supervisor what to run afterwards; it does not make the worker run it first. Repository-wide text checks (names tables, section numbers) catch edits to comments and headings in the file the work rewrites, so a rewrite of a whole renderer should expect them to fail unless the worker runs them before committing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
