<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A gate showed the owner one sentence and the record kept a different one. The producer had always stored a shortened version of what it displayed, so the stored text was a prefix of the displayed text; a later fix, made to stop two options recording the same string, gave one option stored text the display never contained. Nothing failed, and the test suite had just been extended for that exact area.

## The learning

When a producer displays one thing and records a shorter version of it, the shortening is usually a prefix relation, and that relation is an invariant nobody writes down because it holds for free at first. It stops holding the moment someone edits either side for an unrelated reason, and it fails silently in the worst direction: a durable record acquires a commitment the person who approved it never saw. If your design has a display half and a record half, write the containment down as an assertion the moment the two are separate fields — the record's text is contained in what was displayed. One line, and it catches the class rather than the instance.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
