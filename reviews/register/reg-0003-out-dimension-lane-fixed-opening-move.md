---
id: reg-0003
status: pending
observed_at_pr: 257
observed_at_head: 02fd12eac233d582249381196ee31d370cb2a313
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5223981537
---
out-of-dimension: the lane's fixed opening move — an unscoped tier-1 `gloss_index()` survey — is unreadable in-band on this machine. The call returned **73,485 characters on a single line**, over the harness's tool-output cap, so the harness spilled it to a file and told the reader that "this file's lines are too long for Read's offset/limit chunking". The seam is reachable and the survey ran; what is missing is a **bounded rendering** of it.

Why this is instrument work rather than per-review work: the only in-band way to read the spill is slicing it by byte range, which `.claude/skills/review-lane/SKILL.md` names explicitly as out of scope for a per-PR review ("Ad-hoc byte slicing of a large transcript … is **out of scope for a per-PR review**"). The same section says a reviewer that finds itself needing a parser has found a gap in the sweep's own instruments — this is that shape, one tool over: the gap is in how the survey is *rendered*, not in what it contains.

The class this belongs to is the lane's own capability surface, which SKILL.md already routes here ("A probe of the lane's own sandbox is register work, not per-review work"): the property is of the lane, not of the PR, so recording it once is the whole remedy and re-discovering it every round is the sink.

Candidate shapes, offered as observation and not as a proposal to admit anything: a headline-count or shard-list mode on tier 1, or a documented default that the lane surveys tier 1 in a form the harness can return whole.

Observed at: PR #257 (`fix/248-indented-pin-quotes-line-number`), round 1, head `02fd12eac233d582249381196ee31d370cb2a313`.
