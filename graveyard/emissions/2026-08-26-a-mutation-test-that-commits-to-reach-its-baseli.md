<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

Verifying a new deny needed a baseline commit to compare against, so the mutation script committed the work in progress, mutated, then ran git reset --hard to unwind. The reset removed the mutation and the entire implementation with it — several files of work that existed only in that commit. It was recovered from the reflog, and the recovery then had to separately undo the mutation the commit had captured. The same verification, redone by pointing the check at a committed sha through its own base-resolution environment variable, touched no branch pointer at all.

## The learning

A mutation test perturbs a system and restores it, and the restore is safe exactly while the perturbation and the restore share one scope. A test that needs history as its input breaks that: the commit that establishes the baseline sweeps in whatever else is uncommitted, so the unwind is no longer scoped to the mutation. The restore command is then operating on a scope the test never chose, and it does the job it was asked to do.

The tell is a verification step that WRITES to the same mechanism it reads. Reaching a prior state by creating one is the move to distrust, because the creation is not free — it captures everything in reach, and the symmetry the test relies on is gone before the mutation is even applied. Committing to build a baseline reads as bookkeeping rather than as a mutation of its own, which is why it does not feel like the risky step.

The remedy is that the input should be ADDRESSED rather than manufactured. A check that resolves its baseline from a parameter can be pointed at an existing commit, and the whole test then runs in the working tree where the perturbation and the restore share a scope again. That the parameter exists at all is usually not luck: a check needing historical comparison already needs an override for the environments where history is shallow or absent, so the seam is there before the test wants it.

Two riders. Prefer the restore that cannot overshoot — checking out one path restores one path, where resetting a ref restores everything reachable — and reserve history-moving commands for when the thing being restored IS history. And a recovery is not complete when the files are back: whatever the destroyed state had captured is back too, so the recovery owes its own verification rather than a look at the file list.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
