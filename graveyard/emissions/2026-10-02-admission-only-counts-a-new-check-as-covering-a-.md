<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1238 admission, 2026-10-02: a cell adding checks/check-no-test-outside-check-root.sh was refused as having no covering check, and a deletion-only cell was refused the same way; each passed only once an existing registered check was added to its files

## The learning

The admission step that asks each plan cell to name a check covering its files recognises a check the cell itself adds only when the new file's name starts with test-. kogaki names its checks check-*.sh, so a cell that adds a new kogaki check never counts it, and a cell that only deletes code has nothing to count at all. The workaround is to put an existing registered check that exercises the touched files into the cell's file list. The same run also showed that the plan's size estimate does not bound wall-clock time: a deletion cell over two large files (about 3,600 and 9,200 lines), estimated at 154 tool calls, ran out the worker's full hour.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
