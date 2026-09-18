<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-12
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1113 renamed a record field across a schema, a validator, two templates, the review tables and the check registry. The registry file holds live admission contracts AND dated lineage notes narrating what past changes asserted, under its own rule that lineage entries are appended and never replaced. A mechanical rename touched both halves in one pass, so entries describing a 2026-09-05 live run were restated under a name that run never used, and nothing in the file recorded which reading had been taken.

## The learning

When one file carries both a description of how things are now and a record of how they got that way, a rename crosses a boundary the file's own rules draw. Both readings are defensible: leaving the history alone keeps the record true to the day it was written, and updating it keeps a later reader from hunting for a name nothing carries. What is not defensible is doing either one silently, because the two are indistinguishable at the diff. Decide which reading applies before the rename runs, and write the decision into the file at the point it was applied rather than only into the commit message, which nobody reads beside the line they are puzzled by.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
