<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1385: the Proof Sheet composes a Brief of one original Leg and validates it with the production validateLegs, as the Issue asked.

## The learning

The production Leg validator checks two things about where a Leg sits among other Legs: the first Leg must open a Section, and exactly one Leg, never the first, must be marked as reaching the Reader target. A Brief that holds only one Leg can satisfy neither, by construction, so reusing the validator unchanged refuses every such Brief. The Proof Sheet admits exactly the Section refusal on a Leg that opens no Section, never marks the target, and runs by hand the one later rule that can still bind a single Leg (at most one 'nearest' term). Whoever reuses a whole-path validator on a smaller unit should list which rules are about position among siblings and say which ones the smaller unit cannot meet, rather than filling in fake values to get past them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
