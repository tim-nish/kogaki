---
id: reg-0187
status: pending
observed_at_pr: 731
observed_at_head: 9e7d2f2
class: out-of-dimension
recorded: 2026-09-01
source_comment:
---
out-of-dimension: PR #731 — the PR body stated its verification as
`checks/check-*.sh`, the glob suite shape that predates kogaki#724. Since
#724 moved four seam checks into `policy/kit/`, that glob reaches 16 of the
20 registered members, and in particular **cannot reach the kit-sited file the
diff edited** — so the body claimed a verification against a suite that
structurally excluded the change under review.

Accretion-class rather than a defect in #731: the diff was correct and the
registry-driven suite (`bash tools/run-registered-checks.sh`) did run in CI
and pass. What accretes is the *body convention* — every PR body written from
the pre-#724 muscle memory states a verification narrower than the one that
actually ran, and nothing gates a PR body's verification prose.

Raised at PR #731 round 1 and declared `carried: register`. It reaches the
register only now, because until `specs/SPEC.md` §21 §"The write path"
(kogaki#735) landed, recording it required minting the licensing issue the
register exists to avoid — which is the mechanism defect #735 was filed for,
with this finding as one of its two exhibits.
