<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1283 admission split the work into three plan cells to fit the worker's window, and the worker dispatched for cell 1 implemented all three cells' changes in one pass; the suite then failed on a spec section number the worker wrote into a code comment

## The learning

Splitting an Issue into plan cells sizes what a worker is told to read, but it does not stop the first worker from doing every cell's work, because each cell still closes the same Issue and the worker reads the whole Issue body. A cell boundary only holds if the brief scopes the act, not just the files.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
