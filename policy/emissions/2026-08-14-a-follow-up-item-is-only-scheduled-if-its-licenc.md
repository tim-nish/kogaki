<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

A review left a known gap open, and the record said the gap was bounded because a drafted work item would close it. Checking that item showed it was bound to a request that had already been closed by the very change which created the gap. Nothing would ever pick it up. The gap was described as temporary by everyone involved and had no mechanism that would end it.

## The learning

When you justify leaving something unfinished by pointing at planned work, check that the planned work can still be started. Drafted items usually carry a pointer back to whatever authorised them, and closing that authorisation is a routine part of shipping the change that created the gap — so the act of finishing one piece is what silently strands the next, and it happens exactly when the item is still a draft nobody has looked at since. The failure is invisible because everything reads correctly in isolation: the item exists, its content is right, and the record naming it is accurate about everything except whether it can run. Verify the pointer resolves to something live at the moment you rely on it, not at the moment you wrote it down. And treat any sentence of the form "this is bounded because X will happen" as a claim to check rather than a reason to stop looking.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
