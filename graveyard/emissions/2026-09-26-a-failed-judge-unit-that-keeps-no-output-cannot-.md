<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief run's compose_path job refused on one of its three candidate units: the unit exited 0 after writing 533KB, and the only failure evidence kept was the one-line stderr 'no `legs` array'. The unit's output was not saved anywhere, so why the parse failed could not be found after the fact, and the owner's only option was Stop.

## The learning

When a job judges a model's output by parsing it, save the raw output of any unit that fails to parse. A byte count and a one-line parse error say that it failed but not how. Without the text, nobody can tell whether the model got the format wrong, ran out of room, or was cut off, so every retry is a guess.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
