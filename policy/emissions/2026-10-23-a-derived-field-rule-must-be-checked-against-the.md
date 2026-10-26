<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1532 asked each later Leg to depend only on the Leg before it, and also asked for re-activate on the first later Leg that uses an earlier term, with the production validator run over the whole path.

## The learning

The two rules could not both hold: the production validator lets a Leg re-activate a term only from a Leg it depends on, so a term introduced two Legs back made the path invalid. The derivation had to add the introducing Leg to depends_on. When an Issue states several rules for fields that a validator later reads together, check them against that validator before building, not after the first refused run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
