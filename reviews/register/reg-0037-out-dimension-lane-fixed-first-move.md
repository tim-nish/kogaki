---
id: reg-0037
status: pending
observed_at_pr: 363
observed_at_head:
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5253832517
---
out-of-dimension: the lane's fixed first move — an unscoped tier-1 `gloss_index` survey — is unperformable from inside a review session. On PR #363 the unscoped call returned ~77 000 characters on a single line, which exceeds the tool-result token limit; the harness saved it to a file whose one long line `Read`'s offset/limit cannot chunk, and the byte-slicing shapes the save note itself suggests (`python3`, `cut -c`) are denied to this lane by design (kogaki#74). So the survey is specified as mandatory and has no granted read path. Recorded as a property of the lane rather than of the PR, per the register clause; the review proceeded and declared `cannot-determine` on the survey.
