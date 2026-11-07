<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A commit plan was proposed, approved at its single gate, and committed to the default branch; the check suite was run afterwards and one registered member refused. The plan committed a working-tree deletion of `runs/README.md` that an earlier sitting had made, and `check-runs-retention.sh` asserts that file is tracked. Nothing in the plan surface — the file list, the intent grouping, the diff stat — could have shown it, and neither the proposer nor the approver had a reason to look.

## The learning

Approving a commit plan is not the same act as approving the state the commit produces, and a plan surface cannot close the gap by being more detailed. What the gate shows is which changes are grouped and how they are described; what the suite answers is whether the resulting tree still satisfies its own declared invariants, and a deletion of a file some check asserts the existence of is invisible in the first and obvious in the second. This bites hardest on deletions the sitting did not author: work already sitting in the tree arrives with no record of why, so the approver is being asked to ratify an intent nobody present holds. The cheap remedy is ordering — run the suite over the proposed tree before rendering the plan, so the gate shows what breaks rather than only what moves — and where that is too expensive, at minimum run it before the push, because a red default branch costs every concurrent lane a review round.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
