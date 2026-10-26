<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1461 cut src/draft.mjs (2,182 lines) into six modules; PR #1471 merged with the suite green and the review finding no miswired import

## The learning

When a large module is cut into several files along its sections, the import and export lists of every new file can be computed instead of written by hand: parse the original file once, assign each top-level statement to a target file by its line range, and for each file collect the names it references that another file declares. Each file then exports exactly what some other file imports, a cycle shows up before any code moves, and no reference can be missed because the lists come from the same parse. What the parse cannot see is paths built from the module's own location, which change when a file moves one directory deeper; those still have to be found and adjusted by hand.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
