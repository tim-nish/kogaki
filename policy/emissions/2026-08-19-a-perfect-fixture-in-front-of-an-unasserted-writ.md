<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A change added a predicate that decides whether an action is safe, and a writer that performs it. The predicate got eight fixture cases and four mutations; the writer got none. Review found two defects, both blocking, and both lived in the writer: it was called with an unbound name, and it resolved its record through a reader that filters out exactly the records it needed, so it returned false on every input while its issue read as closed.

## The learning

The fixture was not weak — it was aimed at the half that was easy to test. A pure predicate takes a record and returns a boolean, so it invites cases; a writer touches a store, so it needs a scratch directory and stubs and gets skipped. That asymmetry is systematic, and the suite's green reports the tested half while a reader takes it for the whole change. Two habits follow. Enumerate the functions a change adds and name which run covers each, so an untested one is visible as a gap rather than as an absence nobody counted. And assert the writer's PROPERTY rather than its return value: after the restore, the reader a later caller uses must see the state as restored. Checking only that the function returned true would have passed for a function that wrote nothing, which is close to what the defect actually was.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
