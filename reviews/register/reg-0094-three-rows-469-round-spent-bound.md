---
id: reg-0094
status: pending
observed_at_pr: 469
observed_at_head: c94df9c
class:
recorded: 2026-08-15
source_comment: 5300922720
---
## Three rows from PR #469 round 2, at a spent bound

**Row kind: INSTANCE-CLASS** (kogaki#374's second producer), not
`out-of-dimension:`. Their value is the defect each names, not the count — so
**none of them counts toward rule 3's three-of-a-class widening trigger**,
which reads `out-of-dimension:` rows only.

Report: https://github.com/tim-nish/kogaki/pull/469#issuecomment-5300921125
(head `c94df9c`, base `2906664`). Auto-merge was unarmed; the two-round bound
was spent by that report, so no further cycle was reachable and §4 clause 8's
floor sent these here.

1. **`should` — the floor's key was generalised in the spec and left narrow in
   the file the reviewer reads.** `specs/SPEC.md:1892` now heads clause 8's
   floor *"WHERE NO FURTHER CYCLE IS REACHABLE"*;
   `.claude/skills/review-lane/SKILL.md:589` still heads the same rule *"At a
   spent bound…"*, and `:598-600` still says an in-diff finding *"inside the
   bound is still resolved in the review"* — false in the one cell kogaki#433
   moved (inside the bound, auto-merge armed). The correct bullet is directly
   above at `:568-588` and the precedence declaration at `:620` gives clause 8
   the tie-break, which is why it is `should`. Repair: re-key that heading and
   qualify the "inside the bound" clause with the arming cause.

2. **`should` — arm 2's constraint is absent from the surface that reaches the
   reviewer first.** `tools/review-sweep.sh:1528-1551` composes the spawn
   prompt sent verbatim to every review session. It carries clause 8's
   disposition contract in full, including at `:1545` *"in the diff's own text
   means resolve it in the review"*, with no reachability half — neither
   kogaki#374's spent bound nor kogaki#433's arming cause — ~2,200 lines above
   the `cycle_reachable()` the same file now defines. Demonstrated rather than
   supposed: the round-2 session's own prompt carried that sentence and nothing
   about reachability; what stopped it writing the removed disposition was
   `SKILL.md`, loaded separately by the harness. Repair: one sentence in the
   prompt block beside the disposition list.

3. **`nit` — a cross-reference points the wrong way.**
   `tools/review-sweep.sh:4372` says "mutation M11 in the table **below**"; the
   mutation table is above it at `:4227`. The reciprocal pointer at `:4269` is
   correct, so only the one direction is wrong.
