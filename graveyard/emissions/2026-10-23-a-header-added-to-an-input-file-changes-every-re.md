<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1535 asked for three header lines at the top of each source Passage file and also said the Leg run reads that file unchanged; the Leg run cuts the whole file into paragraphs, so the header became paragraph 1.

## The learning

When an Issue adds lines to a file that another command already reads, check how that command cuts the file before you agree it needs no change. A reader that splits the whole text will count the new lines as content. Ship a function that strips the new lines beside the writer, and name the reader that still has to call it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
