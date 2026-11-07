<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#650 found .claude/pipeline.json still declaring review_reconciliation: tools/review-sweep.sh --recent, four days after PR #631 deleted tools/review-sweep.sh outright as part of retiring the parallel reviewer stack (#630). The declaration is the pipeline's one non-boolean key: its payload is a command string the orchestrator executes at close, and its presence IS the grant. Nothing in the retirement noticed it, because nothing binds the name to a command that exists.

## The learning

When a config key's value is the NAME of something executable rather than a boolean, deleting the named thing does not revoke the grant — it leaves a grant standing that points at nothing. The two artifacts have opposite lifetimes and no carrier joins them: the command lives in the repository and dies with a commit, while the grant lives in a machine-local, deliberately un-versioned file that no sweep, no grep over the tree, and no reviewer of the deleting PR can see. So the retirement was complete by every check it ran against, and the stale grant survived it.

The failure this produces is quiet in both directions. A run that invokes the missing command gets a failure it is contractually required to report and not gate on, so the run completes and the grant looks merely unlucky rather than dead. A reader auditing the config for what a run may do without asking reads a live delegation to code that cannot execute — the trust surface asserts more authority than exists, which is the opposite of the error people audit for and therefore the one they do not catch.

The general shape: a grant expressed as a name owes a resolution check at the point that reads it, or the deletion of the named thing owes a sweep of the surfaces that name it. Neither is free, and choosing neither is what happened here. Note which is cheaper depends on scope — the reader can check resolvability in one syscall, while the deleter cannot enumerate machine-local files across every clone, which argues the check belongs to the reader.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
