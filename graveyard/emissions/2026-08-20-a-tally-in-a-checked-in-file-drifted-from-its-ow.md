<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A tally in a checked-in file drifted from its own arithmetic twice in consecutive revisions, under a paragraph written specifically to prevent that. The first time the number was incremented without re-counting. The second time it was re-counted correctly — in the commit message and the pull request description — and the file was left unchanged.

## The learning

A maintenance rule that says re-derive rather than increment does not say WHERE the derivation has to land, and the second failure mode is the one nobody writes the rule against: doing the work somewhere the next reader will never look. A commit message and a pull request body are read once, by someone who already knows; the file is read by everyone afterwards. So when a rule protects a durable record, the rule's own discharge belongs in that record and nowhere else, and a note saying you re-derived is worth nothing unless the derivation is beside the number. The general form: when the same guard fails twice by different mechanisms, the guard is naming an act when it should be naming a location.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
