<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1237: dispatch 1 stopped on 'node src/draft.mjs --self-test'; the owner added that rule, and dispatch 2 stopped 2.5 minutes in on a 'python3 -c' read of a JSON file, with the branch head unmoved across both dispatches

## The learning

When a worker stops after a single refused command, adding a rule for exactly that command only reveals the next one the worker reaches for, because the worker picks its own shell shapes. Before re-dispatching, list the command shapes the Issue's own work needs (its fixture runs and the reads its files call for) and settle the lane declaration for all of them at once, or give the worker a sanctioned read route so it has no reason to compose one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
