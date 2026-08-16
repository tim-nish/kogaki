<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A merge was armed to fire automatically as soon as the required checks went green, and it was armed before the first review round ran. The round found several non-blocking defects and dispositioned them with a phrase meaning resolve this in the review rather than carry it forward — a disposition whose whole meaning is that the author will push a correction and a later round will read it. The gate treated the findings as non-blocking, which they were, so the checks went green and the merge fired. The corrections the reviewer had asked for became impossible at the moment their own report was posted.

## The learning

Automatic merge on green and a review vocabulary that distinguishes fix-it-here from carry-it-forward are each correct and cannot both be in force at once. The reviewer's disposition is a statement about the FUTURE of an open change, and arming the merge in advance removes the future it refers to — so the disposition silently degrades into carry-it-forward with no carrier, which is the one option the reviewer explicitly did not choose. Nothing errors, because every part behaved as specified. Two ways out, and the choice should be made rather than defaulted: arm the merge only AFTER a round has reported, so the reviewer's choice still has somewhere to land; or treat fix-it-here as gating, which converts a judgment into a denial and costs what denials cost. What is not available is arming early and keeping the vocabulary, because the vocabulary is then a description of something that cannot happen. The tell to watch for is a report whose findings all read as addressed while the branch it addressed is already unreachable.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
