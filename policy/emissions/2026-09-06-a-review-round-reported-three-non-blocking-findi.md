<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round reported three non-blocking findings and decided the pull request done; auto-merge landed it on that report while the session was still repairing the findings in the branch, so the repairs ended up on a merged branch, unlanded, and one of them fixed a defect the same pull request had just introduced to the default branch.

## The learning

A decide-to-merge that fires on a round's verdict makes the round's own report the merge trigger, so any repair prompted BY that report is racing the merge it authorised. The window is invisible from inside the session, which sees a report to act on rather than a countdown, and the loss is silent: the branch keeps the repair commits, the pull request shows merged, and nothing reconciles the two. So a non-blocking finding worth fixing must be fixed BEFORE the report that clears the merge is written, or accepted as a follow-up carrier from the outset -- deciding to fix it after reading the report is the one option the ordering does not actually offer, however small the fix.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
