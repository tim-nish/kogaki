---
id: reg-0161
status: pending
observed_at_pr: 599
observed_at_head: 518e345fbe1713ec725bbc12039958bf6464b573
class:
recorded: 2026-08-21
source_comment: 5367103402
---
**Append from PR #599 review round 1** (head `518e345fbe1713ec725bbc12039958bf6464b573`) — three `carried: register` dispositions. Row class is stated per row, per the two-producer rule: rule 3's three-of-a-class widening trigger reads `out-of-dimension:` lines only and none of these is one.

1. **instance-class.** `specs/spec-gate-carrier/SPEC.md` v3 asserts the named cross-repo carrier's state (`#402` closed, the hook "now REFUSES", "observed enforcing … the same day") while the same clause keeps `instrument: none` and states no reopen condition. v2's form — carrier named, state never asserted — was chosen precisely against this rot; the discharge re-commits it in the past tense.
2. **instance-class.** §3.1 carries a latent contradiction after v3: SPEC.md:148 "binds with no exception in force" against the untouched SPEC.md:123-129 "a second, narrower exception … which this clause carries … independently of the mandated block below" — a pointer that now names a paragraph saying the mandate is lifted.
3. **accretion-class.** Heading-version drift after an in-place amendment: `### 3.1 What the question screen carries (v2, kogaki#569)` left at v2 while the file status moved to v3, against this repository's own convention of carrying amendment history in the heading (`specs/spec-draft-pipeline/SPEC.md:798`, `:1459`).

Full report: https://github.com/tim-nish/kogaki/pull/599#issuecomment-5367099254
