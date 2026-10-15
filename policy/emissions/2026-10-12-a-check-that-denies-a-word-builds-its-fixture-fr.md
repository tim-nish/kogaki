<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1347's first run: the new check that keeps the system's name out of the tracked tree failed its own suite, because its fixture lines spelled the name literally and the live scan found them in the check file itself.

## The learning

When a check forbids a term across the tree, the check file is part of that tree. Its test cases must build their sample strings from the term the check reads out of its configured list, and any registry prose describing the check must name the ground without quoting an address that carries the word, or the check fails on itself and the count the Issue promises is wrong. Verify by grepping the term over the tracked tree after the commit and expecting only the deny list and the quoted addresses.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
