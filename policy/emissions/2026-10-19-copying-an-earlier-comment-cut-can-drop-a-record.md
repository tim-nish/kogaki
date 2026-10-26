<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1462 cut src/assemble.mjs's long comment blocks the way kogaki#1258 had cut src/terrain.mjs, and so it replaced the file's spec-names table with one blanket sentence. Review round 1 on PR #1472 found that src/SPEC-REFERENCES.md still requires every file to keep its own names table and the six-line pointer wording. The check that once guarded the table is no longer in the tree, so nothing mechanical noticed.

## The learning

When you cut comments to fit a line bound, the reason for deleting text is that some other record already holds it. That is not true of a per-file list that a written convention makes the file itself the only home of. Before copying an earlier cut, check every convention document that names the file. The earlier cut is a precedent for what kind of thing to remove, not proof that each removal was allowed. When the list doesn't fit under the bound, put it in its own short block rather than dropping it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
