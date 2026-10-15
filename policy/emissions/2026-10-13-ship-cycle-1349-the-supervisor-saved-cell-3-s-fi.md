<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

ship-cycle 1349: the supervisor saved cell 3's finished work as a 'wip: stopped by verification-refused' commit on the shared worker branch; the next dispatch of cell 2 read those files as outside its licence, tried 'git rm' on them, was refused, and the issue reaped verification-refused a second time with all three cells' work complete on disk

## The learning

When several cells share one branch, a stop that saves another cell's finished work in a commit named 'wip' hands the next worker a tree it reads as a footprint violation: it sees files its licence does not cover and spends its refusal budget trying to remove them, so an issue whose work is finished fails twice more. A saved stop should commit under the cell's own name, or the next dispatch should be told the extra files are a finished sibling cell. On resume, a reader who finds a 'wip' commit should diff it against the plan before re-dispatching anything: if it covers a cell, the remaining act is a commit message and a suite run, not another worker.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
