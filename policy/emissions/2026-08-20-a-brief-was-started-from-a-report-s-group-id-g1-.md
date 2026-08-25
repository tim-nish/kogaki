<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A brief was started from a report's Group id (G1-1) rather than member ids, so the entry step had to translate the selection into LessonDisplayIDs and then find, among many machine-local survey records, the one that could resolve them.

## The learning

A report and the record that resolves its ids are two different things, and only one of them is named in the request. The rendering an owner reads carries the ids and the pin; the run record written when the survey ran is what maps those ids back to material. When a request names the rendering, the pin printed on it is the key that identifies the right record — match the pin, do not guess by recency. And a selection an owner states in the rendering's own grouping vocabulary is a description of how they found the members, not the input itself: expand it to the members before entering.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
