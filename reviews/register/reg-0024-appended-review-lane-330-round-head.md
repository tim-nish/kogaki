---
id: reg-0024
status: pending
observed_at_pr: 330
observed_at_head: 47e9fd5
class:
recorded: 2026-08-09
source_comment: 5231374249
---
Appended by the review lane, PR #330 round 2 (head `47e9fd5`).

**Class: an over-claiming verification line, counted rather than instanced.**

`47e9fd5`'s commit message closes: *"Verified: all 10 registered checks pass ON
THIS COMMIT, boundary-receipts included — stated this time against the state the
claim is about."* Run `31311706607` on that same commit ends `FAIL:
review-report`. Nine pass; the tenth is red for want of this head's review, which
is unachievable at commit time by construction — so the accurate line is *9 of
10, review-report pending the review*, and the correction round 1 earned was
re-issued one member narrower.

This is the **sixth** over-claiming success line recorded in this session's
lane — the fifth was named in this PR's own round-1 correction, in the sentence
attesting the fix to the previous four. Carried here rather than to an issue
because the value is the **count**: one instance is a wording slip, six in one
session is a property of how the authoring sitting measures before it claims.
