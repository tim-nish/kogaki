---
id: reg-0139
status: pending
observed_at_pr: 560
observed_at_head:
class:
recorded: 2026-08-19
source_comment: 5344762807
---
**Row kind: `out-of-dimension:` — accretion-class** (kogaki#374: counted toward rule 3's three-of-a-class trigger; not a spent-bound carry).

out-of-dimension: PR #560, round 2. Round 1 of the same PR recorded `Bash(gh run view)` as refused-and-terminal and paid a `cannot-determine:` on the CI dimension for it. In round 2, at a different head but the same allowlist, `gh run view <id> --log-failed | grep '<simple pattern>'` ran **three** times unrefused and supplied both the per-member verdict (`FAIL: review-report`, nine members `outcome=pass`) and the `check-consult-receipts.sh` report lines this lane is required to quote. The grant was never absent — `gh run` is granted as `Bash(gh run:*)` per kogaki#65 — so this is the first-three-words label naming a pipe's LEADING command, and the discriminator is very likely the `grep -E` member the round-1 pipe carried, which `.claude/skills/review-lane/SKILL.md`'s own measured probe table already predicts. Same class as the round-1 row above it; the count is the point.

Bearing on the lane, stated once and not re-diagnosed: a reviewer that reads a degradation label as "this capability is ungranted" spends the dimension it could have had. The cheap prophylactic is the one the tool table already gives — pipe `gh run view` into a *simple* `grep`, never `grep -E` — and it is recorded here rather than added to the skill, because one PR is not a widening.
