<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A consult was run, its receipts written onto the issue body, and the pin-recheck then refused: the served surface had moved between the consult and the write, so every receipt named a commit that was no longer served. Re-running the consult at the new pin showed the same positions at the same line numbers — the content had not changed at all.

## The learning

A citation pinned to a moving surface expires between reading it and writing it down, and the gap only has to be minutes. The refusal that follows says the pin is stale, which reads like the content moved when usually nothing did. Do the lookup and record its receipt in the same act, and when a recheck refuses, re-read at the new pin before assuming the position changed — the cheap outcome is that you confirm the same lines and update the commit, not that you redo the reasoning.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
