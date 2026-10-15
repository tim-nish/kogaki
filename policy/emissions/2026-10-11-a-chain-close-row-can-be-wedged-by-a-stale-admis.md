<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-11
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1246 on 2026-10-11: the successor carrying the whole remainder had merged, but the pre-approved chain close row (approve-close --binding --close) refused on a stale admission stamp, and re-admission refused because one window of checks/registry.json fills the worker's whole window.

## The learning

When a predecessor's work has already landed through its successor, re-admitting it only to refresh the stamp can be impossible: the window guard sizes a plan cell that will never run, and a file whose single window fills the worker budget cannot be named at all. The discharge close does not read the stamp. It needs only the owner's own discharge click. So once the chain close row refuses on the stamp, go straight to the discharge gate instead of re-admitting.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
