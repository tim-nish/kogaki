<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A validated data table was edited by loading it, adding keys, and writing it back out. The round trip preserved the content and destroyed the file's hand-formatting — compact single-line objects expanded, blank section separators dropped — producing a 400-line diff for a 150-line addition.

## The learning

Editing a structured data file by parsing and re-serializing it discards every formatting choice the file's authors made, and those choices are usually load-bearing for reading: grouped entries, one-line records that are meant to be scanned as a row, blank lines that separate sections. The diff then buries the actual change in reformatting, and a reviewer cannot see what was added. Prefer a textual insertion at a located anchor, and verify by the diff's own size: if the number of changed lines is much larger than what you added, you reformatted rather than edited. Round-tripping is fine only where the file has no formatting anyone reads.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
