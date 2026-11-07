<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1282 cell 2 reaped suite-failed on 2026-10-07: it renamed Packet headings that src/review-items.json names, but that file was licensed only to cell 3

## The learning

When an admission plan splits one change across cells, a cell that renames something another file refers to must carry that file and the check that reads it. Otherwise the cell can never be green: the suite runs after each cell, so the check fails before the later cell that would fix the reference is ever dispatched. Cut cells along what the checks read, not along which files are edited.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
