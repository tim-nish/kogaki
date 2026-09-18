<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

Building a guard that undoes a correction (kogaki#1135): the prose correction happened to record the previous passage verbatim, so it could be put back; the figure correction recorded only the record's path and its digest, and the file at that path had already been overwritten by the act being undone. The undo was impossible for one seat and trivial for the other, and nothing in the code said which.

## The learning

If you may ever need to put something back, keep the thing, not a fingerprint of it. A checksum or a hash lets you tell later whether a document is the one you meant; it does not let you produce that document again. The two look interchangeable while you are only ever comparing, so a record that stores a digest of a file it is about to overwrite reads as complete and is complete right up to the first time somebody asks for the old version. The moment to notice is when you write the digest down: ask whether any future act would want the bytes, and if it might, copy them then, while they still exist.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
