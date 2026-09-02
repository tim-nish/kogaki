<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

Dogfooding terrain: the provenance neighborhood rendered '50 candidates, 0 shown' because the judgment step never ran — the run record shows neighborhood_input and J3_neighborhood skipped as conditional states while full_report rendered anyway

## The learning

When several judgment points share one pattern (mandatory entry, typed input, renderer refuses without it), a new judgment point wired to differ from that pattern in either property — optional entry, or a renderer willing to proceed without it — fails silently in exactly the gap where its siblings cannot. The seam (a typed file between deterministic code and model judgment) was not the defect; the divergence from the uniform contract was. Check a new judgment point against its siblings' two properties before shipping it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
