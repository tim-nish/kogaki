<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-20
repo: Kogaki
grain: lesson

## Trigger — what happened

On kogaki PR #1490 the Leg sheet gained a review block that repeats the refused attempts from the ParagraphPlan card. The first version read only the judge's verdicts. Round 1 found that an unreadable judge answer, or a refusal recorded only by the job, left no row, so the block said 'no attempt was refused'. The card itself showed both states.

## The learning

When one page repeats another part's information so a reader can review it in one place, the copy has to keep the checks the original runs, not just its main data. If it drops them, a state the original flags as a problem shows up in the copy as a clean result. The fix is to read the same second record the original reads, and to show the all-clear line only when both records agree.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
