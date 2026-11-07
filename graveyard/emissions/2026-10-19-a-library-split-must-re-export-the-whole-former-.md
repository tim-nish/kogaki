<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

Splitting src/compose.mjs into ten modules (kogaki#1465, PR #1475): five checks import the library as a namespace (import * as compose) and read names off it, and two load it by a path built at run time, so no list of named imports says which names they need.

## The learning

When a shared library is cut into modules behind an entry file, have the entry re-export every name the old file exported, not just the names that appear in named imports. A namespace import or a dynamically built import path uses names that no import line spells, so a re-export list computed from import lines would silently drop some, and the break shows up only when that check runs. Re-exporting the whole old surface costs nothing and keeps every importer unchanged. Compare the code lines of the old file and the new modules (ignoring comments, import lines and export keywords) to prove only the cut moved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
