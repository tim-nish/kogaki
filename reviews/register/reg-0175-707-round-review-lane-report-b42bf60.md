---
id: reg-0175
status: pending
observed_at_pr: 707
observed_at_head:
class:
recorded: 2026-08-29
source_comment: 5464200444
---
From PR #707 round 1 (review-lane report b42bf60, dispositions `carried: register`), two findings on the #683 vocabulary class:

1. (should) Fifth vocabulary survivor batch, noun `leaf split` / `leaf reason`, stated as current: terrain/terrain.mjs:2801, :1773, :1784; specs/spec-terrain/SPEC.md:3365, :3467, :3533; checks/check-terrain-composition.sh:536; terrain/format-guard.mjs:71. Non-operative; suite green at that head.

2. (nit) #683 closes with the class unswept; the chain's own record names the terminal fix — a registered check that greps the vocabulary and fails on an operative survivor — as a mechanical carrier not yet minted. The lane's out-of-dimension line records this is the fifth consecutive round to re-find the class under a noun the prior grep did not contain.
