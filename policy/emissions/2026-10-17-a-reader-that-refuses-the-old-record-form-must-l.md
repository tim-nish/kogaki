<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1413 made the Move reader refuse the retired .md record form by name, while regenerating the 21 committed Moves was split out to kogaki#1415. Every check that read the committed moves/ library went red at once: the live-record arm, the adapter snapshot and the fit fixtures.

## The learning

When a format change makes the reader refuse the old form and the data's regeneration lands later, a check over the live data cannot stay as it was. It either holds the live data to 'loads, or is refused naming the retired form' and moves its snapshot onto a fixture written by the new writer, or it is red until the regeneration lands. A case that reads the committed library to prove the reader works proves nothing while that library is refused. The fixture that replaces it should be written by the production writer, so the writer and the reader are tested against one file.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
