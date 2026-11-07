<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request sat blocked because the merge gate could not parse three finding lines in the reviewer's own landed reports. The thread that recorded the hold named all three as the damage and treated repairing them as one indivisible act it declined to take. Measuring instead of assuming showed that repairing ONE of the three cleared the gate: the other two belonged to a report speaking for a superseded head, which the gate never reads.

## The learning

When a mechanism blocks on evidence it cannot read, find the smallest repair by measuring, not by counting the defects. A defect list and a blocking set are different sets, and the difference is usually large: evidence a gate does not consult cannot be part of what blocks it. This matters most where the repair touches the gate's own evidence, because there the size of the intervention is the whole of what makes it acceptable or not. One line rewritten under an owner's authorization reads differently from three, and the argument for declining the repair altogether was built on the larger number.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
