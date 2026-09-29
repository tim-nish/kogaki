<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1186 on 2026-09-28: the implement worker stopped verification-refused, and the four-field close then read FAILED at observe, citing a cross-repository Blocker that had already been discharged

## The learning

When a run ends on a worker failure that writes no stage row of its own, the close screen falls back to the newest row it can find on the issue, even when that row describes an earlier run and a condition that has since ended. The screen then names the wrong cause and the wrong step. Before trusting the close, check its cause against the worker's own final reading.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
