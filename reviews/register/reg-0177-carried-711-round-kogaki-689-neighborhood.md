---
id: reg-0177
status: pending
observed_at_pr: 711
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5466987762
---
Carried from PR #711 round 2 (kogaki#689, the Neighborhood Gloss namespace
widening and the seam-state arm). Two `nit` findings, neither blocking, both
left unfixed because the two-round bound was spent and moving the head would
have voided the present report with no round left to restore it. The round's
third nit — stale line numbers in the PR body — was repaired in place, because a
body edit does not move the head.

**1. `familiesFor` drops an unmapped namespace silently.**
`terrain/terrain.mjs`:

    export function familiesFor(namespaces) {
      return (namespaces || []).map((ns) => NAMESPACE_FAMILY[ns]).filter(Boolean);
    }

Adding a third entry to `NEIGHBORHOOD_GLOSS_NAMESPACES` without a matching
`NAMESPACE_FAMILY` key would fetch that namespace's shards and then render
`NO_SHARD_ADDRESSED` for rows it *did* read — the read-that-never-happened
conflation the four markers exist to prevent, reintroduced by an omission
nothing reports. No live defect: both namespaces in play are mapped. **Repair:**
refuse an unmapped namespace at `resolveHeadlines` rather than filtering it away
— the fetch knows the set it was given, and a namespace it cannot classify is an
input it should not accept.

This is strictly narrower than the round-1 finding it descends from (that one
was a *second declaration* of the set; this needs a *new namespace* to appear),
which is the shape a repair is supposed to leave behind.

**2. A ~190-character comment line** in `checks/check-terrain-composition.sh`
block 5, where the surrounding block wraps near 80 — the fix commit joined its
new sentence onto a retained clause instead of re-wrapping the paragraph.
Cosmetic.

**What the pair says about the sitting's own method, which is the part worth
keeping.** Both are consequences of a repair rather than of the original defect:
#1 is the drift the round-1 fix removed, pushed one level out to a namespace
nobody has added yet, and #2 is an editing artifact of that same fix. A review
round spent on a repair finds the repair's own residue, and the honest place for
residue at a spent bound is here rather than in a third round.
