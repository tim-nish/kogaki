<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-16
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1404 changed how the Packet renders an established term; the admission plan named the renderer and its own check, and the worker's commit failed a second check (check-brief-compose.sh case ad) that asserted the old line word for word.

## The learning

When a change alters what a renderer prints, every check that matches that printed text is part of the change, not only the check named after the renderer. Before fixing a plan's file list, search the checks folder for the exact old output string; any check that matches it belongs in the list, or the worker will be stopped on a red suite it is not allowed to fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
