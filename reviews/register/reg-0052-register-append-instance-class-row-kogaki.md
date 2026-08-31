---
id: reg-0052
status: pending
observed_at_pr: 394
observed_at_head: c667c79
class:
recorded: 2026-08-12
source_comment: 5265717263
---
**Register append — instance-class row** (kogaki#374 rule 1: this is *not* an `out-of-dimension:` line and must not be counted toward rule 3's three-of-a-class widening trigger).

From PR #394 round 1, head `c667c79`, dispositioned `carried: register`:

- **nit** — the PR body and commit message both state "four emissions are already tracked" in `policy/emissions/`. The base tree (`86f8546:policy/emissions/`) carries **three** emission files plus `README.md`. The supporting count is off by one; the disposition argument it supports is unaffected. Left open at merge, carried here rather than minted as an issue.
