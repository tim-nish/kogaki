<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1258 cut every comment block in src/terrain.mjs to at most twelve lines; the 127-line header held the file's 45-row names table, which cannot fit under the bound, so it was replaced by one pointer line. src/SPEC-REFERENCES.md still says every src/ file carries its own names table, and checks/check-names-tables.sh reads a file with no table as zero rows, so the departure passed every act and was caught only by review (PR #1295 round 2).

## The learning

A size bound on comment blocks and a per-file convention that lives inside a comment block can conflict, and a check that treats an empty table as a vacuous pass will not see it. When a cut removes a convention's carrier from a file, the convention's own statement needs an exemption or an edit in the same change, or the two drift with nothing reading the gap.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
