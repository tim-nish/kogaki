<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-03
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1247 admission: the Move-key retirement (strip two required keys from 21 records and refuse them at ingest) estimated 224 tool calls against a 200 ceiling, and the live-record check made the strip and the ingest change look inseparable

## The learning

When a change both retires a required field and refuses it, and a check validates the live records against the schema, the two halves cannot be split as-is: either half alone turns the check red. Split it as a staged migration instead. First make the field optional and strip it from the records, which leaves a green, closable state. Then turn the optional field into a named refusal. Each stage fits its own budget, and no stage depends on a later one to pass.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
