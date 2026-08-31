---
id: reg-0070
status: pending
observed_at_pr: 427
observed_at_head: c89f04ca190eaa7b996ff773926e862c46e2db49
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5281268611
---
out-of-dimension: PR #427 (head c89f04ca190eaa7b996ff773926e862c46e2db49) — the lane's fixed opening move, an unscoped tier-1 `gloss_index` survey, is not readable inside a review turn at the current served size. It returned 76,961 characters on a single line, over the tool-result cap; the spilled file's lines are too long for `Read`'s offset/limit chunking, and the documented fallback (`python3`, byte slicing) is denied to this lane by design. The survey is prescribed as the review's first act and there is currently no granted instrument that reads its output. Recorded as a lane property, not a property of the PR under review; the round carried both dimensions from repository records and the branch receipt instead, and declared a `cannot-determine:` line for the survey.

Row kind: **accretion-class `out-of-dimension:`** — counts toward SKILL.md rule 3's three-of-a-class widening trigger. Not a spent-bound carry.
