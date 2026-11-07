<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1147 met preflight fact 3 with one tracked change: a working-tree deletion of runs/README.md that no commit in the tree authored and that an earlier revert had already restored once. The commit-groups gate correctly left it unassigned, since grouping it would have guessed. But the commit-required arm's preflight re-run is bounded at one, so the run closed FAILED at preflight with the emission commit landed and nothing else done; the owner then said to deal with it, the file was restored with git checkout, and the identical second run passed preflight and drove the issue to merge.

## The learning

A gate whose options are all 'which commit does this belong to' has no answer for a change that belongs in no commit because it should not exist. Leaving such a path unassigned is the right classification and the wrong outcome: the caller that dispatched the gate was trying to clear a precondition, and an unassigned path leaves that precondition exactly as it was. Where a plan-approval gate is dispatched to discharge a refusal, the gate's option set has to reach every disposition that discharges it — including reverting the change — or the honest classification guarantees the dispatch fails. The arm's one-shot bound is what converts the gap from a retry into a dead run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
