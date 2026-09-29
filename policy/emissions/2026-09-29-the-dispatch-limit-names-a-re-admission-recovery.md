<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1217 on 2026-09-29 was refused a third dispatch after two reaped workers and two corrections; the owner asked why other issues had resumed after repeated failures and this one could not

## The learning

The per-cell dispatch limit went live in the installed engine at 00:46Z on 2026-09-29, from claude-toolkit issue 1266, so every earlier case of an issue resuming after several failed dispatches ran with no such limit, including the 1243 run that motivated it. The limit counts every dispatch row the issue thread has ever carried, with no filter by time, admission, correction or commit, so nothing re-arms it. Its refusal and the issue that designed it both say the correction is re-admitting the cell on the issue, but re-admission does not change the count, so the named recovery is unreachable. And because a cell is keyed by the issue number it closes, all cells of a multi-cell plan share one count. A structural fix has to define what re-arms the count, for example counting only the dispatches since the latest admission record that postdates the last reap.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
