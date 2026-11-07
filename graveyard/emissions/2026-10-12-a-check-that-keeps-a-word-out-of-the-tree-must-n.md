<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1347: the new check that keeps the system's name out of the tracked tree failed the suite because its own built-in test strings spelled the name, so the check found itself.

## The learning

When a check searches the whole tracked tree for a forbidden word, the check's own file is part of that tree. Its self-test examples have to build the word from the term list at run time, never write it out, or the check fails on itself the moment it is committed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
