<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A two-round review approved its own repairs and wrote the approval as 'finding: should [resolved] ...'. The reader expects the word 'resolved' in a fixed slot; in brackets it fell into the free-text part, the slot stayed empty, and an empty slot means 'not yet answered' by design. The approval itself became the thing holding the work back, and no round remained to say it again correctly.

## The learning

When a system decides something by reading text that a person or a model writes, the reader's strictness has a blast radius nobody sizes at the time: it is set by WHICH STEP tends to contain the slip. A strict reader is usually right — an unrecognized token should mean 'not answered', because silently accepting a near-miss would let real objections vanish, and a stuck job is visible while a false approval is not. But the same strictness read a different way says: the LAST step in a bounded process must never be the one whose form cannot be corrected, because correcting a malformed statement means producing another statement, and by then there is no budget left to produce one. Two things follow. Check the form where it can still be fixed — at the moment of writing, not only at the moment of reading. And when you set a limit on attempts, ask which attempt is the one that most often carries the closing summary, because that attempt needs either an exemption or a validator, or the whole run can be lost to a pair of brackets.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
