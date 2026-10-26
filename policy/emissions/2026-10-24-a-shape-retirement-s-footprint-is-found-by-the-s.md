<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1568 retired the Obligation row's kind/text/term; the plan named every file that read the helper functions, but two checks (draft-packet, review-draft) built old-shape rows inline and failed, so the plan had to be widened by a body amendment mid-pass.

## The learning

When a record's shape changes, list every place that writes a literal of the old shape (a grep for the old keys next to the record's other keys), not just the places that call the functions you are renaming. Fixtures built inline are invisible to a search for function names, and each one missed costs a re-admission.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
