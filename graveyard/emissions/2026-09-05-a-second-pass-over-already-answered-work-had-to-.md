<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A second pass over already-answered work had to discard the first pass's answers for the items it was re-examining. Discarding them on every invocation deleted the second pass's own answers as fast as they were recorded.

## The learning

A process that invalidates prior answers before re-asking must do the invalidation once, when the second round opens, not each time the round is entered. Doing it on entry looks identical in the code and produces a loop: every re-entry wipes what the previous re-entry just collected, so the round never completes. What makes this hard to catch is that the symptom reads as progress — the process keeps presenting the same questions, which looks like work outstanding rather than like work being destroyed. Tie the invalidation to a marker that says the round is open, and let whatever legitimately re-opens the round clear that marker.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
