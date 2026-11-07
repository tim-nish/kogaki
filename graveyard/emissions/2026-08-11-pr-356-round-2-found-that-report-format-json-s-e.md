<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #356 round 2 found that report-format.json's entries were amended to v6 — a retired_in_v6 key, a levels_note reading 'Two cases at v6' — while the file's own "version" field still said 5 and its changelog still stopped at v5. Two surviving at: pointers in the same file named code that a 240-line move had displaced. The round-1 fix commit had edited exactly that entry set and repaired neither.

## The learning

When you repair the entries of a document that describes itself — a schema with a version field, a grammar with a changelog, a spec with pointers into code — the self-description is part of what you are repairing, and it is the part nothing tests. Entry edits are what the task is about, so attention goes there; the version number and the pointers are bookkeeping, so they survive untouched and now describe a document that no longer exists. A reader holding the file cannot tell which version they have. Before finishing a repair to a described artifact, re-read what the artifact says about itself and check each claim against the thing after the edit, not before.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
