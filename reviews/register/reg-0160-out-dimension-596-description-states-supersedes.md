---
id: reg-0160
status: pending
observed_at_pr: 596
observed_at_head:
class: out-of-dimension
recorded: 2026-08-21
source_comment: 5366459333
---
out-of-dimension: PR #596's description states "Supersedes PR #592 (spent round bound; record: kogaki#595)" in prose only, not as the literal `supersedes: #592` line `checks/check-review-report.sh`'s clause-11 `SUPERSEDES` regex requires, and carries no `carried:`/`declined:` disposition for #592 round 1's inherited open finding. The check reads this as a PR declaring no supersession at all (reported-never-gated). Neither dimension of review-lane's scope (diff-vs-#589-license; consultation-map) covers this — it's a clause-11 declaration-grammar gap, out of dimension. From PR #596's review, kogaki#596.
