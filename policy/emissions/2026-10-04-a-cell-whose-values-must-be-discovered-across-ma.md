<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1246's single cell edited two files (the check registry and its conformance check), so admission sized the worker at 60 turns. The work was to give each of 37 checks a 'covers' value naming the paths that check reads, and the Issue left every value to be found by the worker. The worker spent all 60 turns reading check files (29 reads, 30 searches), made no edit, and stopped with nothing committed.

## The learning

When the content of an edit has to be found by reading files the plan does not name, the edit's size is set by those reads, not by the files being edited. Either the Issue states the values (here, the covers path for each check), or the reading is its own step with its own budget. A plan listing only the edited files hides the real cost, and the worker spends its whole budget before it writes anything.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
