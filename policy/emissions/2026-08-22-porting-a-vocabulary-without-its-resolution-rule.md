<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-22
repo: Kogaki
grain: lesson

## Trigger — what happened

A merge deny ported kogaki's review-presence vocabulary (present/stale/absent) into a generic engine, but not the head-resolution rules that decide it: kogaki's sweep resolves a moved head with an identical diff as reviewed (carry-forward), while the engine's presence read, given only the head sha and comment text, classified the same state stale. The deny sided with the instrument that had less information, and an identical-diff receipt commit cost a redundant paid review round.

## The learning

A state vocabulary is not portable without the reads that decide its values. Porting the value set while leaving the resolution rules behind produces a consumer that emits the same words with different meanings — and wherever the ported copy is the one wired to an enforcement point, the stricter misreading silently becomes the effective rule. When two instruments disagree on the same state, check which one the gate actually reads before trusting either, and port resolution rules together with the vocabulary they decide.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
