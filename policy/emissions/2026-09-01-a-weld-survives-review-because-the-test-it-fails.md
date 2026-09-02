<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

Triaging an issue that carried two owner rulings, I judged them one closable act because both regenerate the same fixture file and so cannot land in separate pull requests without the second conflicting. That reasoning is about file overlap. The standing rule is about closability, and asks a different question: for each deliverable, would this still be worth merging if the other were dropped? Both answers were yes, so it was two units. The correct rule was found later, incidentally, while discharging an unrelated review finding — not while making the decision it governs.

## The learning

Two deliverables that touch the same files feel like one unit, and the feeling supplies its own justification: they cannot land separately without conflicting, which is true and is not the question. File overlap is a scheduling fact — it says these changes must be ordered, and ordering already has a cheap answer in stacking one branch on another. Closability is a different property: whether each half is worth having on its own. A pair can be inseparable in the schedule and entirely separable in value.\n\nThe reason the wrong test wins is that it is the one the work puts in front of you. Overlap is discovered by doing the work — you see the same file in both lists. Closability has to be asked deliberately, from the description alone, before any of that exists. So the available evidence argues for welding and the governing rule has to be remembered.\n\nTwo things follow. Where a rule exists for a decision, apply it at the moment the decision is made rather than trusting it to surface later — here it surfaced only by accident, and by then the wrong classification was written down and had been acted on. And when an argument for merging two units rests on a mechanical obstacle rather than on their value, treat the obstacle as a scheduling problem and ask the value question separately; the obstacle almost always has a cheaper answer than welding.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
