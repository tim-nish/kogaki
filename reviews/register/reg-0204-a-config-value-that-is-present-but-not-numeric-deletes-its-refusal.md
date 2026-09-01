---
id: reg-0204
status: pending
observed_at_pr: 758
observed_at_head: 0166384
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #758 round 2 — `subdivisionLimits()` validates that all five config
keys are PRESENT and never that their values are numeric, and three of the five
refusals disappear silently on a non-numeric value.

`subgroupMemberCap` returns `Number(caps[label])`, so a cap written as `"seven"`
yields `NaN`; `sg.members.length > NaN` is `false`, and the cap refusal simply
stops existing. The same holds for `min_subgroup_members` and
`max_residual_members`: every comparison against `NaN` is false, so each guard
becomes a no-op rather than an error.

**This is the same class the round-1 fix closed one layer up, at the next key
down.** That fix made an absent per-label cap fail loudly, on the ground that
`null` was the design's own signal for "deliberately uncapped" and an owner
deleting a key would silently lose its refusal. A present-but-wrong value is the
same silent loss reached by a different edit, and it is the MORE likely edit in
an owner-editable file — a typo in a value rather than a deleted key.

**Why this is here rather than on an issue.** The repair is small (a
`Number.isFinite` check in the same guard) but it is one instance of a general
question this repository has not decided: whether config carriers get typed
validation at their readers, or a schema, or neither. Recording it rather than
patching this one reader keeps the count visible — a THIRD instance of
"a guard reads a config value and trusts its type" is the trip condition for
filing the general question. **Reachability: REACHABLE** — one hand-edited
character in `report-format.json` reaches it, and nothing reports it.
