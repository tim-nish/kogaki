<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-19
repo: Kogaki
grain: lesson

## Trigger — what happened

A function resolved a record in two steps: scan an in-memory list to find which round this process spent, then find that round's record on disk. A defect said the match could not tell two rounds of one item apart. The fix made the disk lookup key on the round. Review found the list scan still keyed on the item alone and stopped at the first hit, so the round it handed to the now-precise lookup was decided by list order.

## The learning

A lookup chain is only as precise as its least precise step, and the step that gets fixed is the one the defect report happened to point at. The report named the symptom's site — the store match — and the ambiguity actually entered one call earlier, where a coarse key picked a value that the precise step then used faithfully. So when a report names a match key, trace every step that produces the values that key compares, and fix the earliest one that cannot distinguish the cases. Two tells that the fix stopped short: a fixture that passes only because entries happen to be appended in one order is asserting the order rather than the property, and a comment claiming two test cases exercise different paths is worth checking against the read order, because an early return can make them the same case wearing two names.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
