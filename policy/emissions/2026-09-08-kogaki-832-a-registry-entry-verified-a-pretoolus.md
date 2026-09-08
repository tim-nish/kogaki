<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#832: a registry entry verified a PreToolUse control by grepping the actor's settings file for the hook's filename. The hook system had moved to a single dispatcher that registers no member filenames, so the read printed false and the check rendered [absent] over a control that was installed and in force. The repair moved the read to the dispatcher; review then found the repaired read still binding spelling rather than the property, in four more places.

## The learning

When a registration moves behind a dispatcher, every read that named a member directly becomes a false absence rather than an error, and the failure is silent because the read still exits cleanly with a well-typed answer. What an artifact can tell an observer is fixed by how it is produced, so the read has to move to whatever now produces the fact - here the dispatcher's own table plus its registration - and no cleverness applied to the retired carrier recovers it. The harder half is that moving the read does not by itself stop it binding a proxy. A read that compares a REGEX matcher as a literal alternation list, matches a file by substring rather than resolved path, greps a table's raw text rather than loading it, or captures three fields of a four-field row and never asserts the fourth, each answers a question adjacent to the one asked - and each stays quiet exactly while the current spelling happens to satisfy it. So after relocating such a read, enumerate what its assertion actually establishes against what its capability line claims, and drive the difference: absent carrier, malformed carrier, a same-named carrier elsewhere, and a carrier that routes with the wrong action. Build the specimens as a known-good baseline the arm owns rather than by editing a copy of the live tree, or a tree that already carries the defect makes every arm inherit it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
