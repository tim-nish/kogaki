---
id: reg-0033
status: pending
observed_at_pr: 341
observed_at_head:
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5248392910
---
out-of-dimension: PR #341 — the implementing sitting authored three `boundary:` lines in a commit message (`5a8211b`, "carry the boundary receipts in git-resident text"), declaring entries 1, 2 and 3 all `covered`. The declared shape is the review lane's own report record (kogaki#258), and story 1.41 (kogaki#262) mines it: a second, author-side writer of the same token means the mined corpus can carry rows no reviewer produced. Nothing collides today — `checks/check-review-report.sh` parses PR comments, not commit messages — and the round-1 review of that head reached a different verdict on two of the three entries (entry 1 `uncovered`, entry 2 `cannot-determine`), which is what makes the divergence visible at all. Recorded, not raised as a finding in either dimension.
