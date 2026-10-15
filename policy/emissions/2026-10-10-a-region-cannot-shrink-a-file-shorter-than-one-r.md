<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

Admitting kogaki#1327, one plan cell over nine files was refused as too large for a worker's window even after line ranges were declared on every large file.

## The learning

Line ranges shrink what a worker is sized to read only for files longer than one read window (400 lines). A short file with very long lines, such as a 280-line JSON table of 53KB, is read whole whatever range is declared, and each range in a long file costs a full window. When ranges are not enough, the work splits into several plan cells under the same Issue, each closing it and each sized alone; no child Issue is needed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
