<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

Cell 2 of kogaki#1359 made the Draft's realization entry refuse a Brief waypoint that carries no bound paragraph Move. The cell's footprint named the check that tests that refusal, and the suite went red on a different member, check-draft-fresh-call, whose own fixture Brief passes through the same entry and had never needed a Move. The cell failed its first pass, the Issue body was amended to name the member, admission was re-run, and the second pass landed.

## The learning

When a change adds a refusal at an entry many paths pass through, such as the reader that opens every Brief, the files it touches are not only the ones that test the new refusal. Every fixture that walks through that entry now has to satisfy the new condition, so before admitting the cell, search the check suite for fixtures that build the record the entry reads and name each of them in the footprint. Finding them after the suite goes red costs a failed pass, a body amendment and a second admission; finding them first costs one grep.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
