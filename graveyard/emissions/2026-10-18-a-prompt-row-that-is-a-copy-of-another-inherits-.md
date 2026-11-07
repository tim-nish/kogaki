<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Issue 1417 added a language sentence to the production Brief composer's prompts so that the Proof Sheet's Leg rows, which are derived from them by declared substitutions, would carry it too. One Leg row cuts the production text from a fixed phrase to its end.

## The learning

When one prompt is built as a copy of another with a declared list of edits, a new instruction added to the original reaches the copy only if it sits where no edit removes text. Appending at the end would have been silently dropped by the copy that truncates the tail; placing the sentence at the very start put it outside every edit, so both copies inherited it with no change to the edit list, and a check reading the copy's recorded prompt confirmed it arrived.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
