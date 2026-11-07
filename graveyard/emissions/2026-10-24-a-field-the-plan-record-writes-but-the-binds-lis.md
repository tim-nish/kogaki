<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1556 added a review item that reads the Keeps line, which comes from the paragraph plan's discharges; the binds list names no such field, so the item could declare no bind and the binds check passed on that silence.

## The learning

When a stage starts writing a new field, add it to the list of fields that readers must declare a hold for in the same change. Otherwise the first reader of that field has nothing to bind it to, and the check that is meant to hold every read passes because it cannot see the field at all.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
