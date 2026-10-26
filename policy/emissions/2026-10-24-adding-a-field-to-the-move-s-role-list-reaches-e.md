<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1557 added the optional obligation role to moves/ROLES.json; the plan sized the work from the Move validator, the Extractor and the ingest, and the footprint had to be widened twice before the first commit: the schema-binds check reads the Move's field set from ROLES.json, so every workflow row reading the Move, a fixture row and a generated file all had to name the new field. The review round then found that the new anticipation rule (some word of the item appears in the after state) cannot be met by an Extraction whose terms are its own subject nouns, because rule 7 forbids those words in every reader state.

## The learning

When a change adds a field to a record type whose field list a check reads from a declaration, the footprint is every place that check enumerates, not just the code that reads the field. Find the checks that read the declaration and run them before sizing the plan. And when a new rule ties one field's words to another field's words, check it against the rules already constraining the second field: a rule written against the example that prompted it can be unsatisfiable for the general case.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
