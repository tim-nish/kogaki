<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

Cutting src/review-draft.mjs into eight modules (kogaki#1458, PR #1467): the script that computed cross-module imports matched each moved name with a regex that refused a preceding dot, to skip property accesses, and so skipped every call written behind a spread (...evidenceLines(row)). Two cross-module calls shipped without an import, the one registered check imports one function and never reaches them, and review round 1 found both as ReferenceErrors.

## The learning

When a file is cut into modules by script, the scan that decides which names each module imports must treat the spread operator as a word boundary, not as a property access, and must be re-run after the cut over every moved name. A check that imports one function from the entry does not assert the wiring of the rest; a static scan over the set of names that moved is the cheap assertion, because those are the only names that can become unresolved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
