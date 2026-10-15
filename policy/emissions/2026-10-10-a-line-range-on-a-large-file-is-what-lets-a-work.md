<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1321 was refused because the files in its one work item, read whole, came to 178,000 tokens, past the worker's 94,000-token reading budget; adding line ranges for the two large files cut the read to 70,000 and the same item was admitted unsplit.

## The learning

The admission step sizes a work item by the parts of each file the worker will be pointed at: a file with no declared line range counts in full, a file with ranges counts only the 400-line windows that hold them. Line ranges are described as hints that never refuse, which makes them look irrelevant to the size check, but they are exactly what keeps a change touching one section of a very large file from being refused or split along file lines.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
