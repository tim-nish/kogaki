<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

the second worker run on kogaki#1395 moved the refusal block into one shared renderer in judge.mjs, and the suite failed only because judge.mjs still exported two names no module outside checks imports any more

## The learning

When a change gathers text that two places built separately into one function, the names the second place used to import stop being used. This repository's ownership check refuses an export that nothing outside the checks folder imports, so the same change has to remove those exports or the commit is refused. An Issue that asks for a shared renderer should say which exports go away.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
