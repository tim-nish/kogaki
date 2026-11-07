<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-29
repo: Kogaki
grain: lesson

## Trigger — what happened

claude -p ... | node src/review-draft.mjs outline refused with 'standard input could not be read (EAGAIN)' during the check-only-good-what-given review

## The learning

The review-draft Harness reads standard input immediately and without waiting. When the reply comes straight from a model spawn in the same pipe, nothing has been written yet, and the act refuses with EAGAIN. Capturing the reply in a shell variable first (r=$(claude -p ...); printf '%s\n' "$r" | node src/review-draft.mjs ...) works and writes no reply file under runs/. The skill text says to pipe the spawn's output straight in, which is exactly the form that fails.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
