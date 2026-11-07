<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-05
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1254's Packet-rendering cell compacted twice without progress on src/draft.mjs (130KB, 2172 lines), so the rendering was split into kogaki#1261 with its own failure budget. On 2026-10-05 the first #1261 worker compacted without changing any file after 25 minutes, the same reading as #1254.

## The learning

When a worker compacts without progress because one licensed file is too large to hold, moving the work to a new Issue only resets the failure count; the file is the same size in the new run. The correction has to shrink what the worker must read: name the line ranges or functions to edit in the Issue (so the plan can carry regions), or first split the large file, before dispatching again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
