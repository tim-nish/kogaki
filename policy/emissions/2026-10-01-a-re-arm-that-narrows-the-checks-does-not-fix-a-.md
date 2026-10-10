<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1237 in kogaki, 2026-10-01: the cell had stopped twice, on a self-test run and a python3 -c read. The Issue was amended so the worker runs only registered checks, the owner clicked re-arm on that ground, and the third dispatch was refused within four minutes on a node -e script reading lines 1520-1690 of the 3426-line src/draft.mjs, with the branch unmoved across all three dispatches.

## The learning

When a worker stops for a refused command, ask whether the command was verifying the work or reading the code. A change to what the worker may run as checks fixes only the first kind. In a repository with files of several thousand lines, the reads that get refused are the worker's attempts to see a slice of a big file, and those come back under any check route. Before asking the owner whether the cause is fixed, sort the refused commands by kind; if any are reads of large files, the fix is in what the worker may use to read, not in what it may run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
