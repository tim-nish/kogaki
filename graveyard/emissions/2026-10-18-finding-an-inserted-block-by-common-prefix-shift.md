<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1437: the Proof Sheet showed a retry's refusal block starting mid-marker ('YOUR PREVIOUS ANSWER WAS REFUSED ----- ... -----') because the refusal marker and the input marker both open with '----- ', so the longest common prefix ran into the inserted block.

## The learning

When you find what was inserted into a text by comparing it with the original (longest shared start, longest shared end), the cut is ambiguous wherever the inserted piece begins the same way as the text right after it. Shift the cut back to a natural boundary such as a line start. A test that cuts the expected block the same way inherits the same error, so derive the expected block from the markers that bound it instead.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
