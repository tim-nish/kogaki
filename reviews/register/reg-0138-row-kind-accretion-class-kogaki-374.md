---
id: reg-0138
status: pending
observed_at_pr: 560
observed_at_head:
class:
recorded: 2026-08-19
source_comment: 5344617491
---
**Row kind: `out-of-dimension:` — accretion-class** (kogaki#374's split; counts toward rule 3's three-of-a-class trigger).

out-of-dimension: `gh run view` was refused on its second invocation and became terminal, costing the CI-member dimension of the review — although `.claude/skills/review-lane/SKILL.md`'s tool table and kogaki#65 both list `gh run` as granted precisely so a reviewer reads CI rather than re-running it. The first invocation (`gh run view <id> --log-failed | head`) ran. The second (`gh run view <id> --log-failed | grep -E 'FAIL:|fail$|\tfail'`) was refused naming the `grep -E` member, and the whole `gh run view` shape was terminal thereafter. That is the documented "a denial label naming a piped command names its LEADING command" hazard reading in the other direction: a refusal earned by a *downstream* pipe member burned the *leading* granted command for the rest of the round. The lane's own advice — "Read tool output through bounded, purpose-shaped commands: `gh run view <id> --log-failed | grep -E '== |FAIL:'`" — is the shape that triggers it.

Observed: PR #560, review round 1, 2026-08-20. Reported in that round as `cannot-determine: which registered check is red in CI`.
