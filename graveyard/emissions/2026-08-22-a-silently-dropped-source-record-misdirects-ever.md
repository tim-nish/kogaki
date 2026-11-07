<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-22
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#613 meant choosing how a citation checker treats a source record it cannot key: keep skipping it, refuse the whole payload, or surface it. The skip was the shipped behavior, and every cite naming a skipped record reported 'resolves nowhere' — sending the author to repair the cite when the defect was the record.

## The learning

When a lookup table is built by silently dropping records that fail to parse, every downstream miss points at the wrong repair site: the query looks wrong while the data was. Surface each dropped record beside the results with the repair site named, and if the data source is optional rather than required, make the surfacing a note instead of a failure — the reader gets the true repair site without the checker inventing a new way to fail.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
