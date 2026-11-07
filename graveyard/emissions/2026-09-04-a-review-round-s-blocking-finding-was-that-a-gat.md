<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round's blocking finding was that a gate-severity check denied because a required receipt was missing from the branch's commit message. The fix was, by that check's own contract, a commit message and nothing else. The lane engine decides whether an old report still speaks for a new head by hashing the reviewed DIFF, so the empty-tree fix commit left the old report in force, its blocking finding still gating, and the round that would have verified the fix unspawnable.

## The learning

When a check's evidence is not the diff — commit messages, PR bodies, branch metadata — a verification system that establishes report-still-applies by diff identity cannot see the fix, and hands the author back a finding they have already resolved. The two clauses are individually correct: identity-not-recency stops an unchanged diff shedding its review by moving its head, and handing a blocked PR back stops re-review on an unfixed head. Their conjunction is unsatisfiable for this class. The general rule: a staleness test must range over EVERY source the findings it protects can rest on, so the question to ask when writing one is not what did the reviewer look at but what could a finding here possibly be about. A cheap structural tell, checkable before the composition ships: if any check in the suite reads a source the staleness hash does not cover, the pair can deadlock, and the deadlock will present as the author being told to fix something they just fixed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
