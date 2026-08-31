---
id: reg-0145
status: pending
observed_at_pr: 570
observed_at_head:
class:
recorded: 2026-08-20
source_comment: 5355864064
---
Two observations carried from PR #570 round 2 (`carried: register`), both in
`specs/spec-draft-pipeline/SPEC.md` at v20 and both left unfixed because the
two-round bound was spent by the report that raised them — a further push would
have staled the report with no round available to re-review it.

1. **A counter left behind by the sentence above it.** The item-2 gate table's
   re-assessment note now names four re-assessment heads ("Row 4 was re-assessed
   at v5 and again at v20, and row 2 at v8 and again at v10") while the clause
   that follows still reads "were not re-checked at **either head**", which
   counts two. The mismatch went stale at v10; v20 edited the first line and left
   the counter. One word: "at any of those heads".

2. **A precedence rule that empties its own carve-out.** §5.1.3's new precedence
   paragraph resolves prose-versus-three-fields by siting the bound as "a ceiling
   on the other case — a record-side presentation that surfaces incidentally",
   then closes "the choice is whether the surface is composed for the owner, **and
   it always is**". Read literally the closing sentence leaves that case with no
   members, so the three-field bound governs nothing. Either say that is what is
   happening, or soften the universal ("and in this pipeline it is").

Both are one-word or one-clause repairs and neither gates anything. Recorded here
rather than fixed so they are not lost to the merge.
