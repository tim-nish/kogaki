<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

An automated reviewer is given a permission list naming which commands it may execute. The list is built by derivation from one registry — every registered check — which felt complete because that registry is where runnable things are declared. A change then added a runnable artifact that deliberately does not belong in that registry, because it gates nothing. The reviewer could read the new file and could not run it, so the change's entire fixture and mutation evidence was unverifiable. The review session exited with no report, spending a single-use approval and one of only two permitted rounds.

## The learning

When a permission set is derived from a registry, its coverage is exactly the registry's membership rule — and the failure arrives from artifacts that are deliberately OUTSIDE that rule, never from ones somebody forgot to add. That is what makes it hard to see: the derivation is genuinely not an enumeration, everything inside the registry is covered forever, and the gap is populated only by things whose absence from the registry is correct and reasoned. So the question to ask of any derived grant is not whether the derivation is faithful but what the registry EXCLUDES BY DESIGN, because that set is where the uncovered artifacts will come from. The repair is a second derivation over the other population rather than a name added to a list, and it needs one guard the first one did not: a derived grant over a population that is EMPTY today passes every assertion vacuously, so the mechanism must be asserted from the code that builds it and not only from what it currently produces. State the vacuity out loud when it happens — an empty derivation and a complete one are the same green line otherwise.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
