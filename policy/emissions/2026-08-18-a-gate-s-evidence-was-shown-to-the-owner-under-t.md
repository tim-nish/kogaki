<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A gate's evidence was shown to the owner under the code's own field names (thesis_closure and siblings), and the fix had to be ordered: plain labels first, a deny tripwire second.

## The learning

Split the payload into a record and a rendering, and let only the rendering reach a person. The record keeps the internal field names so the run stays reconstructible; the rendering carries one plain label per field and the same prose. A tripwire on the rendering then refuses anything that still reads as internal vocabulary, naming what leaked — and it must refuse rather than rewrite, because a rewrite layer lets the leak keep being written and hides that the labels were never authored. The tripwire is a second guard, never the fix: it reads register only, so it judges nothing about the content it guards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
