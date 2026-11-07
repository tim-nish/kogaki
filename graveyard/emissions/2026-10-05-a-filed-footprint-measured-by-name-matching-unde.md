<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1257 was filed with 9 exports reached only by checks; at pickup, counting the import statements found 75, and the module file alone was over the worker window, so admission stopped before any change

## The learning

When an Issue sizes its remedy from a count of how a module is used, take the count from the import statements, not from where the name appears. A name-match count blurs exports used inside the file with exports used from outside, and here it was off by about eight times. A wrong count turns a small approved fix into a large one, and the owner then has to re-decide the scope before any work can start.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
