<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A repair was applied by a script that edited two files in one block. It rewrote the first file's text in memory, then asserted on an anchor in the second file, and the anchor did not match. The assertion threw before either write. A later block edited the second file successfully, so half the repair landed and half vanished. The commit message described all of it, because it was written from the intent rather than from the result, and a reviewer found the missing half two rounds later — by which point a second file was forward-referencing a correction that did not exist.

## The learning

A script that edits several files in one pass has a window between mutating its data and writing it out, and anything that throws inside that window discards the edits silently while leaving earlier successful writes in place. What makes this expensive is not the partial write but the report: a commit message is composed from what the author meant to do, and there is no step between meaning and message where the file is consulted. So the record confidently describes changes the diff does not contain, and every later reader — including the author — treats the description as evidence. Two habits close it. Write each file as soon as its own edit is complete, so a later failure cannot unmake an earlier success. And verify claims against the artifact being shipped rather than the change you composed: grep the head you are about to push, not the diff you intended. The tell that you are exposed is a commit message enumerating edits across more than one file, written before anything re-read them.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
