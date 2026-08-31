---
id: reg-0185
status: pending
observed_at_pr: 723
observed_at_head:
class:
recorded: 2026-08-31
source_comment: 5473081682
---
Carried from PR #723 round 2 (kogaki#721, drain pass 1 on #635's closed set).
One `nit`, non-blocking, a preference for later passes rather than a defect.

## An anchor can resolve correctly and still read against its own citation

`checks/fixtures/gate-carrier/**` — nine pointers now carry
`specs/spec-terrain/SPEC.md::no proposal): enumerate, sort, filter-by-owner`,
while the `raised_by` field around them glosses the pointer as *"the owner's
chosen direction"*. The anchor quotes the **Navigation** arm of §2.3's
enumeration — the *no*-proposal arm — so the locator's words cut against the
boundary being cited.

**Nothing is mechanically wrong**: the address resolves, occurs exactly once, is
not a heading, and sits inside the same §2.3 referent the pointer always meant.
Only its address *within* that referent moved.

**How it arose is the transferable part.** The anchor was chosen under two
constraints that are both real and neither about meaning: emphasis-free (round
1's nit — a bolded word in the token dangles on a formatting edit) and
exactly-once (§3.1's binding). The obvious span satisfying the first,
`exactly when something other than the owner`, fails the second: it occurs
twice, once in §2.3 and once at `:1333` where the same boundary is **quoted**.
What survived both filters was a bullet whose words happen to read against the
citation.

**The preference for later #635 passes**: when two spans inside one referent are
equally stable, prefer the one whose text reads *with* the citation. Stability
constraints narrow the candidate set without regard to sense, so the last span
standing is not automatically the one a reader should meet.

**Not promoted**: the pointer is correct, the referent unchanged, and the cost is
a reader's momentary confusion rather than a repoint pass or a wrong resolution.
