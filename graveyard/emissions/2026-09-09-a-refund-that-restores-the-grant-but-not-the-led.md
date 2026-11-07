<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run at the merge frontier read `review-lane status` for PR #1034 and saw both rounds orphaned with "refund: grant restored; this round is not counted against the bound". The very next act, `review-lane spawn --pr 1034 --await`, answered park: "the round bound is spent". An identical retry did not clear it. The two answers come from two records: the per-round file carries `refunded: true, restore_ok: true`, while the landing ledger still carries `rounds: [1, 2]`, and the bound is read from the ledger. The run spent three acts and a source read establishing which surface the decision actually consults, then routed to a successor issue against an unreviewed, CI-green pull request.

## The learning

When a resource is spent through one record and returned through another, the refund is only as true as the record the decision reads. Restoring the grant and leaving the ledger untouched produces two surfaces that are each internally correct and jointly contradictory, and the failure is not visible from either one alone: the reporting surface says the cost was returned, the deciding surface says it was not, and nothing is positioned to compare them. The tell is that the refund is written where a person looks and the bound is read where a machine decides. A cost that can be refunded owes its refund at the same record the spend is counted from; where two records are genuinely needed, the reporting one must be derived from the deciding one rather than written beside it, or the operator is told a story the mechanism does not act on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
