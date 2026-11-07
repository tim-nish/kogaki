<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1284 re-admission on 2026-10-07: adding checks/registry.json to the one plan cell was refused as too large for a worker's window, and each split cell was then refused until it named a registered check file covering it.

## The learning

When an admission needs to edit a very large shared file such as the check registry, give that edit its own plan cell, narrow it with a line range, and list the check that covers that file in the same cell. Every cell must name the check script that covers its files, not just the files it edits, or admission refuses it as uncovered.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
