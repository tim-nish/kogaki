---
id: reg-0208
status: pending
observed_at_pr: 768
observed_at_head: b9ebce4
class: pre-existing
recorded: 2026-09-02
source_comment:
---
pre-existing: PR #768 round 2 — `src/terrain.mjs:1069-1073`. `renderCotagSelection`
classifies a tag name as unbreakable by `wrapTagName(n, COL_MAX).length === 1`,
i.e. against the constant 38. A name whose only hyphen or space sits past column
38 — a 60-character name breaking at column 45 — is therefore judged unbreakable
and widens the column to its full 60, rather than wrapping at the break point it
actually has.

The comment two lines above states the bound exists "so a single pathological
name does not push the counts off the screen", and for that family of names it no
longer does.

**Behaviour unchanged from the pre-fix head rather than introduced by it.** The
round-1 repair fixed the ordering defect it was reported for (the wrap decision is
now taken against the rendered column) and this is a second, narrower reading of
the same constant that the repair did not reach.

**Block (4b)'s three directions do not cover it**, and that is the part worth
acting on: its `unbreak` fixture has no break point at all, so the case
distinguishes "no break point anywhere" from "breaks inside the column" and never
exercises "breaks past the column". A fourth direction with a name breaking at
column 45 is what would fail on the current behaviour.

Not fixed at the head that produced it: the two-round bound was spent — see
reg-0206 and reg-0207, both recorded the same day for the same composition.
