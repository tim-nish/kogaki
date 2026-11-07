<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1260, 2026-10-05: admission said the cell fit (an estimated 48K of context against a 140K limit), but the worker reached 60 of 60 turns at 166K of context with 146 lines written to src/compose.mjs and nothing committed. The supervisor stopped it on its own as stopped-at-gate, and record-pass and next-actions then both refused, because no halt row existed for the run.

## The learning

Two things. First, the size estimate for a cell that edits a 2,200-line source file plus a 750-line check file under-predicts what the worker really spends: the worker read past its budget before verifying anything. Second, a worker that stops at the turn budget with no progress writes no halt row on the run record, so a ship-cycle run that ends there cannot render its close screen and can only be reported in prose. Before re-dispatching, split the cell (validator refusals separate from fixtures, or one refusal per cell); and the stop at the budget should write the same halt row the other worker failures write.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
