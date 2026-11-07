<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#850 / PR #853. A CI gate refused the branch for two missing consult receipts. The receipts were written into the PR body, which the gate's own output names as a source it read. Rerunning the failed job kept failing, twice, with the receipts sitting in the body the whole time — the job reads the body out of the stored webhook event payload, and a rerun replays that payload rather than re-fetching. Closing and reopening the PR fired a fresh event and the gate passed at once, on an unchanged head.

## The learning

When a check reads an input that lives outside the commit — a pull request's body or title, a label, a linked issue — repairing that input does not arm a rerun, because the rerun replays the event payload the run was started from and the payload holds the old copy. The failure is quiet in the worst way: the check's own report says it read the source, so the evidence on screen says the fix should have counted. Before rerunning, ask which of the check's inputs are in the commit and which are not; for anything not in the commit, the repair needs a new event, and reopening the pull request is the way to get one without a new head. That matters when a new head is expensive — here it would have spent a review round against a bound of two that was already spent — so the cheap act and the safe act are the same one only if you know which input you moved.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
