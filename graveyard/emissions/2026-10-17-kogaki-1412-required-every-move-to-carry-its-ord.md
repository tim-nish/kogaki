<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-17
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1412 required every Move to carry its ordered steps (segments) at every read, including the ingest's admission screen, but the owner-authored Moves file is parsed by a small line grammar that has no way to write a list of step records.

## The learning

A rule that a record must carry a structured field cannot be enforced at a reader whose input grammar cannot express that field: there it refuses every record, which is a disabled path rather than a checked one. Enforce the rule at the writer every path reaches (the save) and at the readers that can carry the field, and say plainly which reader is left out and why, so the gap is a recorded decision rather than a silent hole.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
