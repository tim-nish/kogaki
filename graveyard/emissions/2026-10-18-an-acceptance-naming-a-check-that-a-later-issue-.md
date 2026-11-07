<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1416's Acceptance named checks/check-move-ingest.sh, which kogaki#1423 had deleted the same day; the pass put its assertions in check-proof-sheet-extract.sh and said so in the commit and PR, and the review graded that bullet discharged.

## The learning

When an Issue's Acceptance names a test file that has since been deleted, do not recreate it. Put the assertions in the registered check that still runs the same code, and say in both the commit message and the PR body that the named file is gone and where the assertions went. Reviewers then read the substitution as a stated change rather than missing work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
