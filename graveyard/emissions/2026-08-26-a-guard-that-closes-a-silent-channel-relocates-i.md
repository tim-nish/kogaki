<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A sitting added a case-count floor so a check could no longer vouch for a fixture pass that had stopped asserting anything. The floor was proposed as a field in the external contract carrier, which fixed the original hole: deleting cases would now go red. The owner refused the design as drafted, on the ground that lowering the floor was itself an ungated edit — so the same commit that deleted cases could decrement the floor beside them and stay green. The remedy was not a stronger floor but a review path on the floor's own decrement, at the same strictness as admitting a new member.

## The learning

When a guard is a declared VALUE rather than a fixed predicate, the value becomes a second surface with the same failure mode as the first, and adding the guard does not remove the channel — it relocates it one hop, to a place that looks like configuration rather than like evidence. The relocation is easy to miss precisely because the guard is doing real work: the original defect is genuinely caught, a test demonstrates it, and the demonstration is honest. What the demonstration cannot show is the path that goes around the value instead of through it.

The diagnostic question is cheap and belongs in the design, not the review: for each new guard, ask what the smallest edit is that removes the defect's symptom without removing the defect. If that edit is 'change the number', the number needs the same gate as the thing it guards. If the answer is 'there isn't one', the guard is a predicate rather than a value and nothing further is owed.

Two riders keep the remedy from over-reaching. The gate belongs on the DIRECTION that loses coverage and not on the value: an increment tightens the guard and should cost nothing, while a decrement loosens it and owes its justification, so a symmetric gate would tax exactly the edits worth encouraging. And the paired justification must name a SPECIFIC thing removed rather than assert a general reason, because a free-text field admitting 'no longer needed' reproduces the channel a third time with a sentence in front of it.

The general shape is that a defense expressed as a threshold inherits the threat model of its own editability, and a design that states what the guard catches without stating who may lower it has specified half a mechanism.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
