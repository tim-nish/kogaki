<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1395: the second live Leg run of 2026-10-15 stopped at paragraph 2 after three attempts. Each attempt was refused for a different single field (a number written as a string, a key nested one level down, an empty trailing entry), the validator reported only the first failing field it met, and the retry prompt carried only the latest refusal. The bound of three was spent without the model failing the same field twice.

## The learning

An attempt bound counts repeated failure only when every attempt can see everything refused so far. A validator that stops at the first failing field shows one slip per attempt, and a retry that carries only the last refusal lets earlier corrections drop out of view, so independent small slips spend the bound one at a time. Report every failing field of an answer at once, carry the whole refusal history into each retry, and show the record shape as a filled example rather than a description, so type slips are constrained before they are caught.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
