<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1355 (per-call limit and attempt count for the Brief jobs) on 2026-10-13: the one-cell plan read 208k tokens against a 94k worker window, and narrowing to touched lines still left about 174k.

## The learning

The worker's read budget counts whole 400-line windows, so narrowing a file to the lines a change touches stops helping once those lines are spread across the file, and a small file such as a 291-line JSON table costs its full size whatever is touched. Splitting into cells only works when each cell can leave the test suite passing on its own, because a red suite ends the worker at its first reading. When one test file checks every behaviour the change alters, the cells cannot be cut so each is green, and the change belongs to an in-session launch rather than a worker split.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
