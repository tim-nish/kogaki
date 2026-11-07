<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A test built to show that a rebuilt input reflects the current state of the surrounding material passed unchanged when the rebuild was removed entirely — because at the point it checked, none of the surrounding material had moved yet.

## The learning

A test that something is regenerated rather than reused can only see the difference where the source has actually changed. Run it at the first opportunity and it passes on the stale version too, because stale and fresh are the same bytes there. The case that binds the property is the second one, after something upstream has moved. Verify this by deleting the regeneration and seeing which cases fail: the ones that stay green are measuring nothing, and the honest thing is to record which case carries the property and state that the earlier one does not.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
