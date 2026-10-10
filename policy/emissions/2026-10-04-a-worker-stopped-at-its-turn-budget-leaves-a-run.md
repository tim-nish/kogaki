<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1246 on 2026-10-04: the implementer worker used all 60 of its turns twice without editing or committing anything and ended as stopped-at-gate; record-pass then refused to record a pass because no worker halt row existed, and next-actions had nothing to read.

## The learning

When a worker ends because it ran out of turns, the end is not written down anywhere that the close step reads. The run is clearly over, but the tool that writes the run's ending refuses, because it only accepts a merged pull request, a recorded blocker, or a halt note written by the worker step, and this kind of stop writes none of those. So a run that failed this way has no proper close, and the only available workaround (recording a blocker that names nothing) would block every later attempt on the same issue. Separately, a single cell asking a worker to fill in a field on 36 registry entries by reading each check's script did not fit a 60-turn budget: the worker spent its whole budget reading and never started editing. A plan cell like this needs either a larger budget or the reading done ahead of time and written into the issue.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
