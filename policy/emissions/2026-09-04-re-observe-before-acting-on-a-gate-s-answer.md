<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#816 observed its carriers, found PR #844 blocked at a spent review bound, and composed two owner gates from that snapshot. While the gates waited, a concurrent actor performed exactly the recommended act — opened the superseding PR #847, took it through review, merged it, and closed #844 and #825. Both answers arrived against premises that no longer held: the arbitration gate's stated premise ('#825 is the sole open child') was false by the time it was answered, and the merge gate recommended an act already completed and merged.

## The learning

A job that observes the world, then stops to ask a person, is asking about a world that has since moved. The snapshot the question was built from is not re-read when the answer comes back, so the answer gets applied to a state that may no longer exist. This fails quietly: a recommendation that was correct when it was written still reads as correct when it is confirmed, and nothing in the answer says the ground shifted. The wait is exactly where the risk lives, because a human gate is the longest pause a run takes and the one moment the run is doing nothing to notice change. So the remedy sits at the point where the answer re-enters the run, not at the point where the question was composed: re-read the carriers the question depended on before executing the answer, and when a premise has changed, say which one and what the change was instead of carrying out the answer as given. Confirming an act that is already done, and reporting it as work performed, is the observable signature.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
