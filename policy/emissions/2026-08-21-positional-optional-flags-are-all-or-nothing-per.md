<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#601 (story 1.84) meant carrying an optional per-item field across a positional command-line pairing: --axis pairs with --claim by position, but the receipt grammar makes the key optional per query.

## The learning

A positional list flag cannot express a gap. When an optional per-item value rides a repeated command-line flag paired by position, a partial list is ambiguous — it silently covers a prefix nobody chose. The resolution is layered: the wire refuses partial lists (all-or-nothing, with the count delta), while the composer underneath stays per-item optional, so richer callers that hold items as records keep the expressiveness the flat flag surface cannot carry. The refusal lives where the ambiguity is created, not where it is consumed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
