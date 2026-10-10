<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1251 in kogaki, 2026-10-04: the admitted plan cell named eleven files, among them src/review-draft.mjs (4558 lines) and three others over 2000 lines, with a budget of 260 turns and 207600 context tokens. The implementer worker ran 49 turns over 14 minutes, spent $3.44, and was stopped by Claude Code's autocompact-thrashing breaker (the context refilled to its limit within three turns of a compaction, three times running). It left no implementation commit, only the supervisor's consult-receipt commit.

## The learning

The admission budget counts turns and a context size for the cell, but nothing checks whether reading the cell's own files will fit in the worker's context between compactions. When a single cell spans several very large files, the worker loses its orientation at each compaction and reads the same files again, so it dies before it writes anything, and the death is reported only as a non-zero exit. A cell whose footprint is this large should be split at admission into smaller cells (for example the compose-side schema and validator changes apart from the review-side item), or the worker should be told to read the large files by range, before it is dispatched.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
