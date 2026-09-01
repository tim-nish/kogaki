---
id: reg-0195
status: pending
observed_at_pr: 748
observed_at_head: 0b3753e
class: in-diff
recorded: 2026-09-01
source_comment:
---
in-diff: PR #748 round 2 — two lines the round-1 fix commit produced break
`specs/spec-terrain/SPEC.md` §6.0.1's own ~78-column wrap: one at 82 characters,
where "six line CLASSES" was substituted in place, and one at 113, where a
clause was joined to its predecessor without re-wrapping the paragraph.

**No registered check reads line width** — all 21 pass at this head — so this is
a diff-shape blemish, visible in `git diff` as the two lines that no longer sit
under the file's uniform fill.

Accretion-class, and the count is the useful signal rather than this instance:
**an in-place substitution preserves a line's meaning and not its measure**, so
a fix applied by editing one token inside a wrapped paragraph reliably leaves
the paragraph unwrapped. Every prose repair made mid-review has this shape, and
nothing observes it.

**Reachability: NOT reachable.** Nothing mechanical reads the width, and the
bound was spent when it was found.
