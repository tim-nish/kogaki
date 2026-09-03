<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#789 set an acceptance target (suite wall time under 2.5s) computed from what a companion issue #787 was expected to deliver, while both issues put the same 42 node invocations out of scope BY NAME. #787 shipped with its own acceptance 1 unmet for exactly that reason, and #789 inherited the unmet figure as a premise. A run reached #789 and measured the base: slowest member 4.6s, so concurrency's wall-time floor alone is 1.85x the target. Both issues were individually reasonable; their composition was unsatisfiable from the moment the exclusion was written into both.

## The learning

When one issue's acceptance number is computed from what another issue is expected to deliver, the second issue is holding a forecast, not a measurement — and nothing re-checks it when the first ships short. The tell is a shared out-of-scope clause: if two issues exclude the same cost by name and one of them sets a target computed net of that cost, the target is unsatisfiable by construction and no per-issue review can see it, because each is locally coherent. So a derived target carries the head it was derived at, and the run that picks the issue up re-measures at the head it will actually build on before doing any work. Where the re-measurement falsifies the target, the honest repair is to delete the target and record the measurement rather than substitute a new number: choosing a replacement is the same act that produced the bad one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
