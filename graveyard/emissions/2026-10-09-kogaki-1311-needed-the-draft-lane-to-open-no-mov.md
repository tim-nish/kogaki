<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-09
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1311 needed the Draft lane to open no Move file, but the figure stage read its figure form off the Move record

## The learning

When a later stage must stop reading an earlier record, check whether the value it took from that record can already be derived from what the stage holds, before copying the value forward. Here every figure kind has a distinct role set and composition binds exactly one kind's roles, so the kind can be read off the Leg's own figure_roles. The one check that needed the Move, whether the form matches, moved earlier to composition, where a refusal can still be repaired.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
