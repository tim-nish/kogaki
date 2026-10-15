<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-12
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1348 was refused at admission with 'no registered check covers the files this cell changes' for corpus/p1329/PROVENANCE.md. The previous session read the cause as the path being gitignored. Reading the matcher showed the ignore status is never consulted: a covers value without a trailing slash matches an exact path only, so the one registry entry meant to cover the whole repository, anchor-resolve with covers '.', admits nothing at all. Any file not named by one of the other 39 entries is refused.

## The learning

When a table of directory values is transcribed into a field that an engine matches by rule, check each value against the rule, not against what the value meant in the table. A bare '.' meant 'everything' to the table's author, but the prefix rule reads only a trailing slash as a directory, so the transcription silently turned the broadest entry into a dead one, and the refusal it caused was blamed on the file instead of the entry.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
