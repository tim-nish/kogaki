<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run's preflight measured this session's context at 87,932 tokens against a 200,000 threshold and passed. The run then read source files, a format grammar and a check registry, and roughly ninety minutes later the merge act refused the same session at 209,219 tokens. The gate that stopped the run had already been passed by the run, and what moved it past was the run's own work.

## The learning

A precondition measured once at the start of a job can be moved past the line by the job itself. The check is honest at the moment it runs and stale immediately after, and the gap is not a mistake in how it was written -- it is the difference between a fact about the surroundings, which the job does not change, and a fact about the job's own footprint, which it changes by running. Facts of the second kind bind at the act that spends them, not at the door. The tell that a preflight holds one is that re-running the same check later in the same job can give a different answer: an authentication scope or a branch name will not move because the job read some files, but a measure of how much the job has accumulated will. Where such a fact is also read at the act -- as it was here, so the refusal did arrive -- the cost is only that the work between the two reads is done without knowing it will be refused; where it is read only at the door, the bound is not enforced at all for the run that breaks it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
