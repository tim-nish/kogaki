<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-24
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1188 on 2026-09-24 was refused at Preflight facts 12 and 14 (no suite_runner declared), and #1188 is the issue that declares it.

## The learning

When a new Preflight gate fact lands before the repository change that satisfies it, the run that would make that change is refused by the fact itself. Preflight has no bypass and the fact is not on the repair list, so the fix has to land outside the orchestrator. Ship the consumer half before, or together with, the gate that requires it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
