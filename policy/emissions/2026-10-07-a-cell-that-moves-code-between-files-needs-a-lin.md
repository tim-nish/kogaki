<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1296, 2026-10-07: the first cell of the split of the 8,071-line Terrain module was admitted under every size bound, then the worker was stopped as verification-refused when it reached for a line-range delete the toolset did not grant, so nothing past a wip commit landed.

## The learning

Admission sizes a cell by what the worker must read, and that is the only cost a code-moving cell is checked against. A move also needs to cut a block of hundreds of lines out of the source file, and the worker's toolset caps reads at 400 lines and has no tool that removes a line range. So a cell can pass every admission bound and still have no permitted way to do its one act. Before dispatching a cell whose act is moving code, check that the toolset can carry the move, not only the reads.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
