<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Removing spec section numbers from owner-facing refusal strings in src/ turned two registered checks red. Both asserted the literal section number was PRESENT in the refusal, so the checks encoded the very defect the change removed. A third failure came from a line whose text lives in both an emitter and a JSON grammar that validates it, and a fourth from a hand-wrapped notice whose width is bounded by a self-test case.

## The learning

An owner-facing string is rarely held in one place: a check that asserts its content, a grammar that validates it, and a fixture that bounds its width are each a second carrier, and none of them is visible from the string's own definition. So changing such a string is a multi-site edit whose other sites are found by running the suite rather than by reading the code, and a change that only edits the definition passes review and fails the build. The check case has a further edge: an assertion on a literal token silently becomes a REQUIREMENT that the token stay, so a deliberate removal reads as a regression, and the repair is to assert the property the token stood for — legitimate only where the rewritten assertion still fails when the rule is disobeyed, which the member's own mutation evidence is what establishes.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
