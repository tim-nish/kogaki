<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A review found that a template renderer substituted article text before checking for unfilled slots, so prose quoting a slot was rewritten or produced a false refusal. The fixture written to prove the fix failed first on a DIFFERENT function with the identical ordering, which the finding had not named and which predated the change.

## The learning

A test written for one instance of a defect will often fail on a second instance the report never mentioned, because the fixture exercises a path rather than a line. When that happens, the honest reading is that the finding under-named its own scope, not that the fixture is wrong. Fixing only the site that was named ships a test that avoids the defect it just demonstrated — the case has to be weakened or routed around the other site, and the weakening is invisible afterwards. Fix both, and say in the change that the second was found by the first one's test, so a reader can tell a widened repair from scope creep.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
