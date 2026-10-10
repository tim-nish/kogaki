<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-06
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1257 --session on 2026-10-06: the Issue body was amended on the owner's choice after the 2026-10-05 session pass stopped before any edit, re-admission passed, and session-cell start then refused the cell as already spent

## The learning

A session pass that stops before any edit still uses up the cell's one pass. The bound is keyed on the Issue and cell number, not on the plan, so amending the Issue and re-admitting it does not give the session another try. The election also cannot be re-made, and the worker route is closed for a cell the owner routed to the session. So an Issue whose first session pass stopped to ask the owner something has no way back into implementation once the owner answers. Stopping to ask should not spend the only pass, or re-admission on a changed body should open a new one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
