---
id: reg-0046
status: pending
observed_at_pr: 379
observed_at_head:
class: out-of-dimension
recorded: 2026-08-12
source_comment: 5262757795
---
out-of-dimension: PR #379 — the mechanical `boundary-receipts` check flagged consultation-map entry 1 (Check/CI infrastructure) as touched, matching the keyword "check" in the PR body's test-plan prose ("All 11 `checks/check-*.sh` pass on the branch"). The diff itself only edits `docs/stories/1.45.provenance-neighborhood-flow-and-conformance.md` — no check, hook, or registry file is created, renamed, or modified. Reviewer judgment: entry 1 was not actually touched; the trigger-term matcher fires on prose that merely *mentions* existing checks passing, not on any act in entry 1's class. Recorded as an accretion-class observation about the matcher's precision on generic trigger terms like "check".
