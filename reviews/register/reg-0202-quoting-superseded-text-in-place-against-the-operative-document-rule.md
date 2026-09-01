---
id: reg-0202
status: pending
observed_at_pr: 756
observed_at_head: 51b440e
class: out-of-dimension
recorded: 2026-09-02
source_comment:
---
out-of-dimension: PR #756 — a live collision between a served position and this
spec chain's house style, recorded rather than resolved.

The served line, consulted at boundary #3 during the round-1 repair:

> "An operative document holds only the current contract — a document a later
> implementer reads as law does not distinguish description from prescription,
> so a removed behaviour preserved inside it is a complete specification waiting
> to be rebuilt; removal is complete only when the operative carrier no longer
> contains the superseded behaviour in any form, with history in version control
> and issue threads."

`consulted: product-lab@1006d3f5fb5e49eedf9beac07810ea65a847bda4 LESSONS.md:21`

The house style of the #741/#753/#755/#756 chain is the opposite: every
supersession **quotes the superseded text in place** inside
`specs/spec-terrain/SPEC.md`, on the ground that a reader meeting a rewritten
clause cannot otherwise tell a decision from a drift. Four sections of that spec
now instantiate the style, and the two reviews that shaped the chain both asked
for MORE of it, not less.

Both positions are live and this record decides neither. What is worth carrying
is the shape: the chain's style makes a supersession auditable at the cost of
leaving the superseded contract legible as contract, which is exactly the
failure the served line names. The one place they agree is code — which is why
`top` and `atTop` were DELETED in this PR rather than kept beside their
replacement, after a kept-beside field was read by the caller that should have
moved and rendered one row under a counts line saying three.

The discharging act, if one is ever wanted, is a decision on the chain's own
style with the served line quoted in it — not a sweep of the spec, which would
be executing an undecided position.
