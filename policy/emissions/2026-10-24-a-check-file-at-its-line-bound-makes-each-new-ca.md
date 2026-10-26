<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1576 added one case to checks/check-proof-sheet-leg-run.sh, which had 1499 lines against a 1500-line bound; the case pushed the file to 1515, and exemptions are refused at admission

## The learning

When a check file sits just under its line bound, the next case can land only by compressing its neighbours: here, two cases were folded onto a shared helper and several statements were packed onto single long lines, until the file sat at exactly 1500. The review called the packing a nit and noted that it makes the next case harder still. The file now has no room left, so the next Issue that adds a case to it should plan to split the file, and should put the new file in its footprint, rather than compress again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
