<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-06
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1281: admission sized the one plan cell at fits=140000 of a 200000 window (four files, two of them 2439 and 1274 lines), and the Sonnet worker ran 30 minutes, compacted, and was stopped with no file changed (compacted-without-progress, exit -9).

## The learning

A plan cell that admission says fits the context window can still end with a worker that spends its whole context reading and changes no file. The size estimate counts the lines of the files the cell names, but not the reading the worker does to understand them, such as tracing a 2400-line module and a 1300-line check script end to end. A cell that edits a large generator and its large check together should be split before dispatch, or should name the regions it touches, so the worker can start writing before its context fills.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
