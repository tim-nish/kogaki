<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-19
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1157 round 1 found that a new PreToolUse guard, whose docstring committed to failing closed, treated a run marker that existed but did not parse as if no run were in force -- and admitted exactly the dispatch it was written to refuse.

## The learning

When a guard decides from a file someone else writes, 'the file is missing' and 'the file is there and I could not read it' are two different answers, and only the first one means no. A half-written or truncated file is evidence that the thing is happening, not evidence that it is not. Decide which of the two the guard treats as absence before writing it down, and give the other one its own refusal with its own wording, so a reader can tell from the message which case they are in. The tell that this was never decided is a guard whose comment states one polarity while its control flow falls through to the other.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
