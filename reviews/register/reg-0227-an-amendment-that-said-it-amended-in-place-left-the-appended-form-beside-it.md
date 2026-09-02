---
id: reg-0227
status: pending
observed_at_pr: 790
observed_at_head: 81f5de5
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #790 round 2 — `checks/registry.json`'s `draft-cites` contract now
states the same departure **twice**. The round-1 repair appended a paragraph
("AT kogaki#784 `specs/spec-draft-pipeline/SPEC.md` LEFT the count-anchored
list, and that is a TIGHTENING …"); round 1's third finding was that appending
had left a *contradicting* sentence standing, and the round-2 repair amended
that sentence in place — correctly — **while leaving the appended paragraph
below it**.

**Both statements are true, which is why this is a nit and not a
contradiction.** What is wrong is the method: the repair's own stated move was
*amend rather than append*, and the appended form survived the act that
declared appending the defect.

**The class.** An accretive record grows a stratum per repair. This one now
carries the departure in two strata written eleven minutes apart, and the next
reader auditing the anchor reads the same fact twice and has to decide whether
the second is a correction of the first. That is the accretion shape this
registry's own `efficacy_note` convention already records against the members
it describes, arriving in the record *about* an anchor rather than in the
anchor.

**Not fixed at the head that produced it.** The bound was spent at round 2 and
the report certifies `81f5de5`.
`consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933 topics/claude-code-ops.md:154`
