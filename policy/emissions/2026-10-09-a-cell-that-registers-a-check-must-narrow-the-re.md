<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1317 on 2026-10-09: the plan cell listed checks/registry.json whole, and admission refused it because the file (about 300KB, two worker read windows) left no room in the worker's window for anything else.

## The learning

In kogaki the check registry has grown large enough that a work item which adds a check cannot name the registry as a whole file. The admission step sizes how much a worker must read, and the full registry alone uses more than a worker's reading budget. Naming only the region where the new entry goes (the last entry near the end of the file) fits comfortably, and the region is a hint that never refuses. So every cell that registers a check should name a region of the registry from the start.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
