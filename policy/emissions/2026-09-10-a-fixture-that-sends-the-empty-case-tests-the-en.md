<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1067: every judge stub in the Terrain check suite answered the cheapest conformant record, an empty list. The reader's own validator checked the wrapper — that a flag was set and that a list was a list — and nothing inside the entries. So the code that reads a filled entry was never run by any test, and it read two field names that the example the producer was bound to never writes. Two acceptances stayed green for a day while every live run stopped at the first real record.

## The learning

An empty collection is usually the cheapest value that satisfies a shape, which is exactly why a fixture reaches for it and exactly why it proves so little: it exercises the envelope and leaves the reader of the contents unrun. The suite is then green about the wrapper and silent about the work, and the silence is indistinguishable from coverage, because the path was reached and its guard was simply never true of any fixture datum. A text-shaped guard beside it does not close the gap — a check asserting that two copies of a shape still agree can pass while nothing has ever carried that shape through the code. The remedy is to add the behavioural case rather than widen the text one, and to DERIVE the fixture's payload from the declaration it is meant to bind, so the declaration and the reader cannot drift again without the fixture going red; a hand-written payload is a further copy of the shape, free to drift exactly as the reader did. And a fixture is worth what its negative proves: revert each half of the fix alone, and keep only the halves that make it fail.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
