---
id: reg-0194
status: pending
observed_at_pr: 748
observed_at_head: 0b3753e
class: in-diff
recorded: 2026-09-01
source_comment:
---
in-diff: PR #748 round 2 — the reconciliation added for [[reg-0193]] rules that
"a sentence naming 'two' is about the guarantee; a sentence naming 'four' is
about the array", and then leaves a third number unbucketed by its own rule.
The sentence the same commit edited still says `tag_listing`'s inventory comes
"with a check that fails on a **fourth** line class". Read against the array —
four members, per the paragraph three lines above — a fourth class is a
*member* and the check does not fail on it. The sentence is true only under the
**guarantee** reading, which the rule assigns to sentences naming "two".

**The shape, which is why this is worth counting rather than only fixing.** A
disambiguating rule that enumerates the values it disambiguates leaves every
other value in the same ambiguity it was written to end — and reads as complete
because the values it *does* name are now correct. `reg-0193`'s repair removed
one half of the divergence and the surviving half is the one the rule does not
reach. A rule keyed on values rather than on the *set being counted* is one
value from failing again.

**Reachability, stated as `specs/SPEC.md` §4 clause 8 asks: NOT reachable.** No
registered check reads spec prose for internal consistency — all 21 pass at
this head — and no input makes it fire. The two-round bound was spent when it
was found, so the floor routes it here rather than to a successor PR whose cost
would reproduce the process for one clause.
