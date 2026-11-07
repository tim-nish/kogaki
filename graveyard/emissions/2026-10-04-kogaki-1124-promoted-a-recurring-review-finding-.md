<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1124 promoted a recurring review finding (a check grew cases while its recorded runtime note went unread) and its remedy keyed the new check on the case-count floor moving; both review rounds on PR #1252 found the merged check could not see the very instance that made the class, nor the PR's own instance, because those checks declare no floor.

## The learning

A check built to catch a recurring finding should be tested against the rows that promoted it before it is built. Here the trigger chosen (the declared floor moving) misses every check that declares no floor, which included one of the three promoting rows and the check being edited, so the class looked discharged while still recurring. Name, at admission, which promoting rows the chosen trigger reaches.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
