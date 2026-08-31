---
id: reg-0090
status: pending
observed_at_pr: 465
observed_at_head: c6f938e84458b334f4f7e6b15c707a33e96ebeab
class:
recorded: 2026-08-15
source_comment: 5300027595
---
**Row kind: instance-class** (not `out-of-dimension:`) — these are non-gating in-diff findings routed here by a `carried: register` disposition on PR #465's review report. Their value is the defect each names, **not** the count, so per rule 1 they must **not** be counted toward rule 3's three-of-a-class widening trigger.

From `review-lane report: c6f938e84458b334f4f7e6b15c707a33e96ebeab` (PR #465):

- **An unmutated discrimination claim.** `checks/check-terrain-composition.sh:4342-4346` closes with four claimed discriminations; only two are mutated. "so an accumulating name fails" and "so a write-once implementation fails" have no mutant — a `if (!existsSync(path)) writeFileSync(...)` implementation passes the mutant that actually runs. The kogaki#209 shape: a coverage claim rather than demonstrated coverage. Remedy: a third mutant guarding the write with `existsSync`, asserted to fail the second-render-material read.
- **A touched-and-uncovered consultation boundary.** `policy/consultation-map.md` entry 1 (*Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry*) was touched by a 152-line addition to a registered check, whose prescription is a survey *before the check is written*. The branch's four receipts all pin `product-lab@8906f20` at `topics/archive/claude-code-ops.md:25` and `topics/knowledge-architecture.md:105`; entry 1's own pinned lines (`topics/claude-code-ops.md:41@dec0d568`, `:43@dec0d568`) are unreached. The occasion already exists in the map, so no map-entry candidate is owed — the miss is the consult, not the entry.
