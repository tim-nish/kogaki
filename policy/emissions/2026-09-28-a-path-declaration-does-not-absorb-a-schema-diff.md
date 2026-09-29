<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

Investigating why spawn-implementer refused kogaki's checks/registry.json for 'carries no tests list' after .claude/checks.json was committed. The owner objected that the declaration file was designed to absorb every difference between repositories and that the naming difference had always worked.

## The learning

The declaration absorbed only the registry's location, never the name of the list inside it; the reader hardcoded the toolkit's own name. And the difference had never been handled before, only skipped: with no registry declared, the reader fell back to a path that did not exist in this repository and returned an empty list with no error, so every earlier dispatch ran without registry-derived rules and nobody saw it. Two lessons. First, when a config file is meant to absorb differences between consumers, list what it absorbs and check the reader for every other literal it still holds, because the first consumer to differ on an undeclared axis is refused. Second, a fallback that returns empty on an absent file makes 'it always worked' unfalsifiable: the feature was never exercised. Fixed in claude-toolkit#1286 by declaring the list key in the same file.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
