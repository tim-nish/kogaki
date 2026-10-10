<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1270 admission on 2026-10-05: a one-line description fix in src/leg-schema.json was refused twice before it was admitted

## The learning

Admission in kogaki refuses a plan whose changed files no registered check covers, so even a one-file source fix must name a file under checks/ in its footprint. Naming that file crosses the check-infrastructure boundary, which then refuses until a consult receipt is on the Issue. The boundary also matched on the word 'check' in the Issue's prose alone. So a source fix in this repository should do the rules consult and post the receipt before its first verdict, and declare the covering check from the start, instead of discovering both through two refusals.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
