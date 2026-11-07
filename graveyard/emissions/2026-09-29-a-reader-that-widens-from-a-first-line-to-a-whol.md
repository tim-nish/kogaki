<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1224 made briefSection return a whole Brief section instead of its first line; review round 1 on PR #1226 found the italic caption each section ends with, written for the Brief's reader, now reached the writer's Packet under Thesis and Opening question at column zero.

## The learning

When a reader is widened from reading the first line of a section to reading the whole section, everything the section carries for a different audience comes with it. The fix is to strip exactly the part the writer put there for that other audience, anchored where the writer puts it (here, the section's last line), and to apply it to every section read the same way, not only the ones that made the widening necessary. A filter that drops every line of that shape anywhere over-reaches and deletes content.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
