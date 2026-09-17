<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

A record's field was renamed from a two-valued string to a boolean. A second, derived record already carried a field of that new name meaning something narrower, and one shared reader looked for the name on either record, trying the field first and a nested list second. After the rename the reader found the name on the primary record too and stopped there, so it silently began answering the broader question instead of the narrower one it was written for.

## The learning

Renaming a field is not only a search-and-replace: it can collide with a name already in use elsewhere for a narrower fact. The danger is not a crash but a shared reader that resolves names in priority order — it keeps working, keeps returning a value, and quietly answers a different question. Before renaming, look for the new name wherever the code already reads it, and check any reader that tries several places in turn: the order that was safe when only one place carried the name is exactly what breaks when a second one gains it. Where the two facts genuinely differ, make the more specific source win and say in the code why the order is the whole of the function.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
