<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-09
repo: Kogaki
grain: lesson

## Trigger — what happened

While building a digest that deliberately renders every empty section rather than omitting it, two sections came out empty against a live source. Both times the fetch had succeeded and the code that pulled values out of the response was wrong: one looked for a list under a key the response does not use, the other matched on text that turns out to be wrapped in punctuation. Reading the code did not reveal either; running it against the real source did, and only because the sections had non-empty neighbours to compare against.

## The learning

Deliberately printing "none found" instead of staying silent is a real improvement, but it moves the failure rather than removing it. An empty section now means one of two very different things — nothing was there, or the reading step is broken — and the output looks identical either way. So a section that can be empty should also say what it searched and how much of it it saw ("none of 32 candidates matched"), because a denominator is what separates a true zero from a broken read. The same argument that justifies printing the zero justifies printing its denominator, and stopping at the zero feels like the whole fix while leaving the confusable half in place.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
