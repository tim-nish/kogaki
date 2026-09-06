<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

Two tripwire cases proved a guard refused forbidden vocabulary on an owner-facing surface. Each planted its bad value in an internal reasoning field, which reached the owner only by being rendered. When the rendering was removed, the planted value reached no owner surface at all - so the guard correctly stayed silent and both cases would have failed against entirely correct code. The tempting readings at that moment are both wrong: that the guard broke, or that the cases are obsolete and should be deleted.

## The learning

A test reaches the thing it asserts through some path, and that path is rarely the thing itself. Injecting a fault upstream and observing it downstream tests the whole chain, which is a strength until a link is deliberately removed - then the test fails while the system is right, and its failure carries no hint of which of the two is wrong. Read that failure as a question about the route, not the property: ask whether what you were asserting is still true and still matters, and if it is, re-plant the fault on the shortest path to the surface that remains. Deleting the case because it went red is how a live guarantee quietly loses its only evidence; and a deleted assertion and a re-pointed one look identical to whoever reads the file next, so whichever you did, say which, in the file.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
