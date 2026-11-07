<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A commit-planning command read the working tree once, built a plan naming an exact file count per group, and put that plan to the owner at an approval gate. Between the snapshot and the staging act, another session working in the same repository wrote one more file of exactly the class the plan's third group collected. The staging step used a glob rather than the enumerated list, so it picked the new file up correctly, but the commit message carried the count from the snapshot and was wrong by one at the moment it was written. The mismatch was only visible because the staging step echoed how many paths it had actually staged.

## The learning

A plan approved at a gate is a reading of the tree at snapshot time, not a claim about the tree at execution time, and in a repository where other sessions write concurrently those are different trees. A figure in the plan is the part that goes stale: the grouping rule survives the drift because it is a predicate, while the count is a fact with no review point after the gate closes. Two things follow. Stage by the predicate the group was defined by, not by an enumerated list, so a file that arrives late is grouped by the same rule the owner approved rather than silently dropped. And have the staging act report what it actually staged, then reconcile that against the plan before the message is written — without that echo the drift is invisible and the commit ships a wrong number. When the reconciliation shows a difference, the fix is to state it in the message rather than to quietly correct the figure: the owner approved a plan, and the record should say where execution departed from it and why the departure was within the approved rule.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
