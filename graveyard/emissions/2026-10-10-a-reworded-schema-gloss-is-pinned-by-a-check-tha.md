<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1323's worker reworded the three Journey uses glosses in src/leg-schema.json; its two named checks passed, but check-brief-compose case (am) quotes the old contrast gloss verbatim, so the suite failed and the cell, which did not list that check file, could not fix it.

## The learning

Text that one file defines and another renders is often asserted word for word by a check named after the renderer, not the definer. Before admitting a wording change, search the check root for the exact old sentence and list every check that quotes it in the plan cell, or the worker meets a red suite it is not allowed to touch.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
