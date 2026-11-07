<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1425 split the Terrain fixture pass into 16 parts, one per core, and declared the pass under 5 s. Measured one part at a time on 2026-10-18: the two parts that run the real issue-sync lint-question command cost 6 to 7.5 s each on their own, while most other parts cost 2 s and one part with 30 cases costs 2 s. The whole check measured 7.1 to 8.6 s at low load, above the 5 s bound and above the 6200 ms figure it declared.

## The learning

When a test pass is cut into parallel pieces, its wall time is the slowest piece, not the total divided by the core count. Before declaring a bound for a sharded pass, time each piece alone and look at the slowest one: a piece that starts a slow external program several times in sequence (here about 0.85 s per real lint-question round trip, eight in one piece) sets a floor that adding cores or rebalancing the other pieces cannot lower. The fix for such a floor is to cut that piece so its sequential external starts land in different pieces, or to assert the rule with fewer real starts; and a bound should be declared from the slowest-piece measurement, not from a median of whole-pass runs on a quiet machine.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
