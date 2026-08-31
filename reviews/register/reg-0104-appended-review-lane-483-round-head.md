---
id: reg-0104
status: pending
observed_at_pr: 483
observed_at_head: d608e84
class:
recorded: 2026-08-16
source_comment: 5307554805
---
Appended from the review lane, PR #483 round 1 (head `d608e84`). Two rows, and each says its class per kogaki#374.

**Row 1 — accretion-class (`out-of-dimension:`, counts toward rule 3).**
`checks/check-boundary-receipts.sh` read no linked issue on PR #483. Its own source line for that head: `linked issue body: no linked issue named in the PR body or commits` — while the PR body opens "Licensed by **#482**", the commit subject carries `(kogaki#482)` and the trailer carries `for #482`. The deny-never-warn licence assertion found the issue and passed on the same head, so the two halves disagree about whether a linked issue exists. Consequence: one of the matcher's three declared sources was silently empty, and kogaki#482's body — which carries this map's trigger vocabulary — was never scanned for trigger terms. Class of observation: an instrument reporting a source as absent where another instrument on the same head resolves it.

**Row 2 — accretion-class (`out-of-dimension:`, counts toward rule 3).**
The lane's fixed opening move is unreachable within a review's read budget, for the second consecutive round. Unscoped `gloss_index` returned 76,961 characters on a single line on PR #483 round 1, and 77 KB on PR #480 round 1 — over the tool's read budget and not sliceable by `Read`'s offset/limit, which the tool result says explicitly. Both rounds recorded it as `cannot-determine: seam tier-1 survey` and rested dimension 2 on `policy/consultation-map.md`'s pinned quotes instead. This is the instrument-gap class kogaki#65 item 3 is the precedent for: the survey SPEC §4 makes the review's fixed first move cannot be performed by the sitting it binds, so every round pays the same declaration instead of the survey.
