<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle cleanup pass over merged PR #924 asked the classifier what to do with the issue's leftover worktree and branch. The classifier returned a pair of rows that cancelled each other: the branch was report-only because 'a live checkout holds it, so git branch -D would refuse', and the worktree was keep because it was 'a clean tree on a branch that is being kept'. Neither row was wrong on its own terms, and together they proposed doing nothing forever.

## The learning

Two cleanup rules that each read the other's target can deadlock, and the deadlock renders as a plan rather than as an error. The branch rule read the worktree's existence; the worktree rule read the branch's disposition; each was individually correct and their composition was a fixed point that never releases either artifact. What breaks it is that the two rows carry different KINDS of refusal, and only one of them is load-bearing: 'might hold unmerged work' is a safety refusal that must never be overridden, while 'the underlying command would refuse in this order' is a sequencing refusal that the plan's own execution order (worktrees before branches) already dissolves. A classifier that renders both as the same bucket loses that distinction, so the reader cannot tell a rule protecting work from a rule reporting an ordering. When a report-only row's stated reason is about command mechanics rather than about unmerged work, re-derive it after the rows above it have run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
