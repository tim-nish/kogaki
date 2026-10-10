<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1225, 2026-09-30: the cell-1 worker had been reaped verification-refused over a grader defect fixed the same day (claude-toolkit#1307), the re-dispatch was refused on unchanged inputs because the guard compares no tool revision for that reading (claude-toolkit#1311, open), and the owner asked for the cell to be carried forward without waiting.

## The learning

When a worker has been reaped and its record is terminal, the dispatch guard that denies in-session implementation admits a landing from the session, because what it discriminates on is the absence of a worker record, not how the worker ended. A session can then implement in the worker's surviving worktree, commit with the consult receipt, push and open the PR, and the review lane still runs. This is a recovery route with a cost the guard was built to remove: the orchestrating session pays the implementation's context itself. Use it only when the owner has asked and the re-dispatch route is closed by a tool defect rather than by the plan or the lane; a plan or lane cause is corrected on the Issue and re-dispatched. Two of the three plan cells here were disjoint by file but ordered by import: the cell that stops calling a function and the cell whose footprint holds the file that deletes it must land in that order, so the second is stacked on the first rather than branched from master.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
