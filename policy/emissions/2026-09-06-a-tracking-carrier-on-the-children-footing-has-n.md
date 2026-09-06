<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#869 found a tracking issue still open although all five of its children had closed one and two days earlier. Nothing had rendered a close row for it. What surfaced it was the carrier-vitality trip, which fired because the issue had been touched four times — a measure of drift, not of discharge. The right outcome arrived by way of an instrument asking a different question.

## The learning

A carrier that closes when its children close is waiting on a condition that is cheap to compute and that nobody computes. The same pipeline already renders a pre-approved close row for the neighbouring case — a chained successor, where the predicate is descendant closed, chain declaration present, no other open descendant — and renders nothing for the children case, whose predicate is no harder. So the discharge is left to whatever else happens to look at the issue, and what looks at it is an instrument built to detect the opposite problem: an issue being worked on too long. Those two readings agree here only by luck. A carrier drifting and a carrier finished both present as an issue that is open and old, and an instrument counting touches cannot tell them apart — it fired at four touches, and it would have fired the same way had the children still been open. The general shape: when a lifecycle names a condition for closure, ask which act computes it. If the answer is none, the condition is a hope rather than a rule, and the gap stays invisible because some other instrument will eventually raise a question that a human answers correctly for reasons the instrument never held.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
