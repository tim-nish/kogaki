<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1269, whose work is to give every check registry entry a list of the source files it reads, was refused because no registered check covered the registry file the work edits: the registry had no such lists yet, so the check that reads the registry could not be matched to it. Adding a check that lives in the vendored kit folder to the work item's files did not count either; only a check under the repository's own check folder cleared it.

## The learning

A fix to the test-selection data is gated by the very gap it fixes, so the work item has to name a check file under the repository's own check root among its files to be admitted at all; a check vendored from a shared kit, even one that reads exactly the edited files, does not count as covering them. Pick a small check under the check root so the reading budget stays within the worker's window.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
