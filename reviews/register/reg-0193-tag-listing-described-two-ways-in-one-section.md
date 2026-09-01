---
id: reg-0193
status: promoted
observed_at_pr: 746
observed_at_head: 8f89013
class: in-diff
recorded: 2026-09-01
source_comment:
---
in-diff: PR #746 round 2 — `specs/spec-terrain/SPEC.md` §6.0.1 describes
`tag_listing` two ways within one section. The class-list paragraph added by
round 1's finding-2 fix says it "carries `header`, `tag_row`,
`navigation_hint`, `blank`" — four classes, correct against
`report-format.json` — while the "Why this is a surface of its own" paragraph
four paragraphs later still calls it "a two-class allowlist … with a check that
fails on a fourth line class". A reader deriving the new surface's class model
meets `tag_listing` as both two-class and four-class on one screen.

**Both sentences quote real sources, which is what makes this worth counting
rather than simply fixing.** The "two-class" phrasing paraphrases
`terrain/terrain.mjs:900-912`, whose own completeness inventory says *"the
surface declares only `header` and `tag_row` under a REFUSE
non_member_fallback, so a fourth line class fails at emit time."* That comment
is about §9's **content**-class guarantee; the carrier's `line_classes` array is
the **declared** list and holds four. Two true readings of one phrase, and the
ambiguity originates in the code comment rather than in this diff. The
transferable shape: **a count is only unambiguous beside the set it counts**,
and a paraphrase that drops the qualifier inherits the ambiguity without
inheriting the context that resolved it.

**PROMOTED 2026-09-01 — it became a spec change.** The spec half was repaired in
PR #748 (merged `da51786`), which added the clause naming which set each count
is over: `tag_listing`'s **declared** `line_classes` array holds four, its
**content**-class guarantee is two, and the bare "two-class allowlist" phrasing
is gone from the comparison sentence. That repair was available because #748
edited the same section under a live cycle and #737's licence — not because
anything detected the divergence, which is why the reachability claim below
stands exactly as written.

**THE CODE HALF REMAINS, and naming it is what keeps this promotion honest.**
`terrain/terrain.mjs:900-912`'s completeness inventory — *"declares only
`header` and `tag_row` … so a fourth line class fails at emit time"* — is the
**origin** of the ambiguity and is inside **#745's** licence, not #737's. It is
carried there, not here. A promoted record whose remainder is unnamed would
assert a discharge it does not have.

**Why it was recorded here in the first place, kept as the record of that
state.** The two-round bound of PR #746 was spent when it was found, so
`specs/SPEC.md` §4 clause 8's reachability floor applied. **Reachability, stated as the claim clause 8 asks
for: NOT reachable.** No check reads spec prose for internal consistency, no
input makes it fire, and the normative class list for `cotag_selection` itself
is unambiguous — nothing downstream is blocked. A successor PR and two further
review rounds for one reconciling clause is the exit whose cost reproduces the
process.

The review routed it `carried: #745`. It is recorded here instead because it
**spans two licences**: the clean repair touches `terrain/terrain.mjs`'s
inventory comment, which is inside #745's licence, *and*
`specs/spec-terrain/SPEC.md` §6.0.1, which is not — #745's declared artifacts
are the carrier, the emitter, the check and the skill. A finding whose repair
crosses a licence boundary is not carried by either side of it.
