<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1459 cut a 3,028-line test file into one file per named section. The Issue placed one boundary at a section heading, but the cases just after that heading reused a working directory built a few lines before it, inside the same grouped run, so the cut had to move to the group's edge.

## The learning

When you split a large file at its own section headings, the headings show where the topics change, not where the code's dependencies end. Before choosing the cut lines, list what each piece reads that another piece creates; a heading in the middle of one grouped run of code is not a safe cut. Also, splitting work that used to run in many small parallel slices into a few whole files makes the slowest file set the total time, so measure and record the new time when you make the split.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
