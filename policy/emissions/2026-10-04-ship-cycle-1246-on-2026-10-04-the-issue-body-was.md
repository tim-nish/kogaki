<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1246 on 2026-10-04: the Issue body was amended with a full covers table after two worker budget stops, the run re-admitted it, and spawn-implementer refused at once because the cell had already failed twice.

## The learning

Amending an Issue's body does not reset its per-piece failure count. The count is keyed to the plan, and re-admitting with the same one-line plan text produces the same plan, so the two earlier failures still count and the worker is refused before it starts. To give the amended Issue a fresh try, the plan itself has to change, or the piece has to be moved to a successor Issue. The refusal also writes no record a close can read, so the run cannot render its closing screen and has to be reported in prose.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
