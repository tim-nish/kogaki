---
id: reg-0154
status: pending
observed_at_pr: 584
observed_at_head: db24029022f018c9eaaa205f2390b2657ce1d126
class:
recorded: 2026-08-20
source_comment: 5359928345
---
**instance-class row** (kogaki#374 — a spent-bound latent non-gating in-diff carry, NOT an
`out-of-dimension:` accretion row; it counts toward no widening under rule 3).

From PR #584 round 2, head `db24029022f018c9eaaa205f2390b2657ce1d126`.

**A consultation receipt's `outcome:` written at column 0 declares nothing, and the check is
green rather than despite it.** Commit `e53395a` (PR #584) carries two `consulted:` lines
followed by `outcome: discriminating` **unindented**.
`checks/check-consult-receipts.sh:146` matches a continuation field as
`^[ \t]+(request_id|outcome|disposition|query|axis):`, so an unindented `outcome:` is not a
continuation of the receipt above it. The two receipts therefore parse as **v1**, the v2
owed-set clause at `:322` ("a v2 receipt still owes request_id, outcome and at least one
query") never fires, and the outcome the author meant to declare is not in the record.

Latent: the pins are real and receipt-verified, so this head's boundary coverage is
unaffected — the harm reaches a later auditor reading the receipt, not any current consumer.
The remedy is one indent and is not reachable on that branch without rewriting the commit and
moving the head, at a spent round bound.

Recorded here rather than minted as an issue per kogaki#374's floor. What would make it
instance-worthy on its own: a second receipt landing in the same shape, which would say the
grammar's silent-degrade-to-v1 is a repeating authoring miss rather than one commit's slip.
