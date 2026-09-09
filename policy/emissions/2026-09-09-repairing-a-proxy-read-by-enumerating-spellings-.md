<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A registry read repaired at kogaki#832 to stop treating a hook matcher as a literal alternation was repaired again at kogaki#1020 for two further match-all spellings and for a raw-text table match; the round-1 review of that repair immediately named three MORE spellings the new read misses (an annotated FAMILY binding, a table assembled by concatenation, and a null matcher), so the same defect class survived two repairs aimed at it.

## The learning

A read that asserts a property by matching the carrier's current spelling cannot be repaired by adding the spellings you noticed: each repair is true of the shapes in front of it and false one shape out, and the enumeration reads as coverage because it visibly works on what it matches. The decisive question is what happens to what the matcher does not name, and the fallback there must be chosen rather than inherited — a caught parse error that returns false converts every unanticipated spelling into a confident absence, which is worse than raising, because a read that did not complete is at least typed as not having completed. Where the property has a direct read, bind it; where it does not, the repair that ends the recurrence is not another enumeration but a fixture that pins the enumerated shapes, since the mutation run that proved the repair is otherwise produced and discarded and the next edit reopens the class with nothing standing to catch it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
