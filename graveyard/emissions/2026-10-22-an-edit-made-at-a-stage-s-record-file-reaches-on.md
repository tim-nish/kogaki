<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-22
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1512 let a Leg run reuse an earlier run's Extraction so the owner could edit a Segment and watch the Draft change. The Moves are re-ingested from the Extraction record file, but the Leg Brief composer reads each paragraph's answer.json, the Extractor's own output, so the owner's edit reached the Moves, the plan and the Draft and not the Brief.

## The learning

When a stage writes the same content twice — a raw answer and a record built from it — and the owner is told to edit one of them, check every downstream reader before promising the edit reaches the end. A reader of the other copy silently keeps the old content, and the result mixes edited and unedited inputs with nothing on the output saying so.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
