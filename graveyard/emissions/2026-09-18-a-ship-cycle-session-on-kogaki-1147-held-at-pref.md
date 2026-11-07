<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle session on kogaki#1147 held at preflight, was re-invoked in the SAME session, and drove the issue to merge. record-pass then derived `completed` and run-once-check read the record back as '1 advancing pass; failures by cause: none'. The close screen rendered by next-actions --issue 1147 read 'FAILED at preflight -- infrastructure', grading from the stage row the first invocation's halting preflight wrote. The two readers of one record disagreed, and the screen -- the surface the owner reads and the only one the contract permits -- carried the false one.

## The learning

Recovery by re-invocation and grading from the earliest halt carrier cannot both be right in one record. A command whose stated recovery is 'run it again' will routinely have a halt row and a later completed pass in the same session-keyed record, so the grader needs a rule that says which one the close is about -- latest wins, or the halt row is retired when a pass supersedes it. Absent that rule the design guarantees that every successful second invocation renders a failure. The defect is invisible from either reader alone: the tally is honest and the screen is honest about a different act, and only reading both together shows the record holding two answers.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
