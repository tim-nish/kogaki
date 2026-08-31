---
id: reg-0067
status: pending
observed_at_pr: 422
observed_at_head: 5ed423f
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5279467417
---
out-of-dimension: a review finding about an auto-close keyword cannot be verified by reading the PR body. GitHub's closing-keyword parser is not sentence-aware — it matches `close #N` under a negation — so an occurrence count over the body can report 0 on a PR that still closes the issue. The falsifiable instrument is `gh pr view <n> --json closingIssuesReferences`, and this lane should reach for it wherever a finding turns on what a merge will close.

Specimen: PR #422. Round 1 finding 1 named `Closes #187` as retiring the carrier the PR's own escalation names. The author fixed the body, verified by occurrence count ("`gh pr view 422` now reports 0 occurrences"), and the replacement sentence — "**Does NOT close #187**" — still carries the literal `close #187`. `closingIssuesReferences` returned #187 at round 2's head `5ed423f`, so the link never broke.

Row class: **accretion-class** (rule 1 / rule 3 — counts toward the three-of-a-class widening trigger). Not a spent-bound carry.
