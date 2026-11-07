<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#942: a check's length floor stood one below the count its own derivation yielded, so a field could drop out of the derived list in silence; the repair replaced the floor with a per-item presence assertion

## The learning

A guard that a derivation is still working, expressed as a floor on how many items the derivation yields, cannot tell a legitimate removal from a silent failure to match — and if the floor sits below the live count, it cannot even tell that one item stopped matching. Raising the floor to the live count does not fix it: the guard then goes red every time the source legitimately drops an item, which is a false alarm on correct behaviour. What separates the two cases is the item itself, not the total. So split the predicate in two: one test for whether the source line still LOOKS like the kind of thing the derivation collects, and a second, stricter test for whether it was actually collected. An item that looks collectible and was not collected is named; an item that has disappeared entirely moves the count freely. The count was standing in for a property it could not see, and the repair is to read the property directly.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
