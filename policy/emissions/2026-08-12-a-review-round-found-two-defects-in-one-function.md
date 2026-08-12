<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round found two defects in one function: a duplicate-counting bug in one branch, and a silently dropped case in another. One commit fixed both. The fix for the dropped case added a report inside a loop over seeds, while the fact being reported was a property of the batch — reintroducing the exact duplicate-counting defect the same commit had just removed from the neighbouring branch. The next round caught it. Each of the two new tests covered one property alone, and the live defect was their combination: one test had two seeds and no missing record, the other had a missing record and one seed.

## The learning

Repairing an instance of a defect is the moment you are most likely to write another instance of it, because your attention is on the branch you are fixing and the new code goes somewhere else. Treat any commit that fixes a class of bug as a place to re-check the whole class afterwards, including the lines that commit itself added. The testing half generalises further: two tests that each cover one property in isolation do not cover their composition, and the composition is where a defect hides precisely because each property looks handled. When a fix adds a case beside an existing one, ask what a single case holding both conditions at once would do, and write that one instead of a second isolated case.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
