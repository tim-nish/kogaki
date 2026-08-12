<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation table recorded M1 as killed. The next commit deleted the assertion that had killed it — a deliberate, reviewed removal. The table was not updated, so it went on claiming a protection that no longer existed, and the row said killed against a head where the mutation survives.

## The learning

Mutation results are facts about a specific version, not properties of the change, and they go stale the moment you remove the thing that did the killing. This bites hardest on a repair that DELETES a check, because the deletion is usually the right call and feels like simplification rather than like losing coverage — so nothing prompts you to revisit the evidence you already gathered. When a fix removes an assertion, re-run every mutation that assertion was killing and record the new answer beside the old one. A table showing killed-then-survives with the reason is far more useful than a stale row, because it tells the reader exactly what the removal cost.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
