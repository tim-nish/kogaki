<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1254 on 2026-10-05: the stamp was stale, so the run re-admitted the Issue and admission said admitted and printed the spawn command; the spawn then refused because cell 1254#1 had already failed 2 of 2 times.

## The learning

Admission can stamp an Issue admitted and print its dispatch command while the only cell it plans has already used up its failure bound, so the admitted plan cannot run. Re-admitting does not reset the count, and narrowing the cell's file list did not count as a new cell. Before re-admitting an Issue whose earlier dispatches failed, check the cell's failure count; if it is spent, the cell must be taken out and carried by a successor Issue, which needs the owner.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
