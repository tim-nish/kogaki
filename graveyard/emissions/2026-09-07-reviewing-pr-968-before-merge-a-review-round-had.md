<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

Reviewing PR #968 before merge: a review round had landed a fix commit after the PR body was written, so the body still stated a mutation tally of 54 verified at the earlier head while the merged code read 55. A squash merge would have carried that false statement into the permanent commit message.

## The learning

A pull request body written at one head becomes a false record the moment a review round lands a fix, and under squash merge the body IS the landed commit message — so the staleness is not cosmetic, it is a wrong claim in the permanent history. Correcting the body before merging costs no new head, spends no review round and cannot redden a check, which makes it the cheapest repair available anywhere in the cycle; after the merge the same correction is impossible. So: before merging, re-read the body against the head actually being merged, and treat every number, head sha and 'verified at' claim in it as something the later rounds may have moved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
