<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-21
repo: Kogaki
grain: lesson

## Trigger — what happened

The #1172 implementer returned worker-result: failed exit=1 with head unchanged. The cause was the 200-turn cap, not the work: the worktree held the complete change set across all five licensed files plus one check, 489 insertions, and the registered suite read 38 of 39 green against it. A second dispatch into the same worktree with the cap lifted finished the remaining check and committed in 102 turns.

## The learning

A worker that stops at a turn or time cap reports the same terminal token as one that could not do the work, and that token is a claim about the dispatch rather than about the change. Read the tree before believing it. The distinguishing evidence is cheap and sits one command away: git status in the worker tree, and the suite run against what is there. A cap-stopped worker usually leaves work that is nearly finished, because the cap falls wherever the work happened to be, so the recovery is another dispatch into the same tree rather than a fresh start that re-pays everything already on disk. What makes the misreading expensive is that nothing is committed: the change set is real but has no carrier, so a run that takes the failure token at its word and cleans up destroys finished work that no record names.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
