<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-25
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1593 added one case to checks/check-proof-sheet-leg-run.sh, which then stood at 1508 lines against a 1500-line limit; the case's setup was squeezed onto one long line to fit, and the reviewer flagged that line as the hardest part of the case to read.

## The learning

When a test file is already near its line limit, the limit gets met by squeezing new code together rather than by splitting the file, and the setup a new case depends on becomes the hardest part to read. Before adding a case to a file within a few lines of its limit, plan the split as part of the work, rather than finding out from the size check after the case is written.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
