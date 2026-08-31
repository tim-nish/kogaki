---
id: reg-0176
status: pending
observed_at_pr: 710
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5466743712
---
Carried from PR #710 round 2 (kogaki#685, the Terrain carrier re-cut). Two
`should` findings, both about the version-tag sweep that PR performed, neither
blocking and both left unfixed because the two-round bound was spent and moving
the head would have voided the present report with no round left to restore it.

**1. A dangling section pointer this PR introduced.**
`specs/spec-terrain/workflow.json:71` reads

    "governing": "§7, §7 (the origin travels as an argument), §7.1 (a derived origin member set announces itself), §15.4"

`§7.1` does not exist — SPEC.md's §7 runs to §8 with no `###` subsection. The
sweep's rule was "section pointers keep their numbers and drop their version
tags", and the regex `§(\d+(?:\.\d+)*) v\d+` matched `§7 v5` inside `§7 v5.1`
and left the trailing `.1` fused onto the section number, converting a
stale-but-resolvable pointer into a dangling one. The same line now cites `§7`
twice. **Repair:** the whole clause is §7's, so the value is
`"§7, §15.4"`.

**2. Four `§12.2 v11` tags survived the same sweep** in
`specs/spec-terrain/report-format.json` — `medium` (:237) and `stream` (:239) on
the `full_report` object whose `governing_prose` (:238) had its `v11` stripped in
the same diff, and two copies inside `abnormal_display_id`'s `form` strings
(:125, :207). A sibling key left byte-identical beside a swept one is the residue
test round 1 applied. The re-cut SPEC.md now carries no `v11`/`v12` vocabulary at
all, so these name a version the contract no longer has. **Repair:** drop the
tags on `medium` and `stream`; the two inside `form` strings are owner-emitted
text the golden fixture is byte-equal to, so changing them is a deliberate act
that regenerates the specimen rather than a sweep.

**What this pair says about the instrument, which is the part worth keeping.**
The re-cut's completeness check ran over the *identifiers the contract binds* and
over the *keys the carriers hold*, in both directions, and it caught real
omissions. Neither of these is in either set: a section pointer is a cross-file
reference whose target is a heading, and nothing in this repository resolves
`§N` pointers. Both findings are in the class the green suite is structurally
blind to, and the reviewer said so of each. An instrument that resolves `§N`
pointers across the tree against SPEC headings would catch this class, and is
named here rather than built.
