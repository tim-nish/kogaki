<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A gate-declaration carrying outcome: uncovered-after-N-framings was refused three times, and the refusal listed that exact string as one of the accepted values

## The learning

When a refusal prints its accepted vocabulary, a value in that list may be a TEMPLATE rather than a literal. The gate-declaration hook accepts uncovered-after-2-framings and refuses uncovered-after-N-framings, but its refusal renders the schema form verbatim beside the value it rejected -- so the two read as identical and the obvious retry is to re-send the same string. The reading that breaks the loop is to treat a capital placeholder inside an otherwise lowercase token as a slot to fill, and each refusal also consumes the sidecar, so every retry owes a fresh write of it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
