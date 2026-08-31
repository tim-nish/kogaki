---
id: reg-0034
status: pending
observed_at_pr: 354
observed_at_head: 1ca1589
class:
recorded: 2026-08-11
source_comment: 5250447272
---
Append from PR #354 review (round 1, head `1ca1589`) — the four findings whose disposition line reads `carried: register`. Recorded here so they survive the merge; the report itself is at https://github.com/tim-nish/kogaki/pull/354#issuecomment-5250442757

1. **A grammar entry declaring coverage nothing implements.** `specs/spec-terrain/report-format.json` v3 moves `group_subgroup_id_grammar` from `not_expressible` into `decidable_rules.expressible`; `terrain/format-guard.mjs:241-256` dispatches expressible rules by id and has no predicate for it, so the rule never fires. The property is nonetheless tested, by heading regexes in `checks/check-terrain-composition.sh`. Class: an artifact's claim about *where* a guarantee lives, diverging from where it actually lives.

2. **Twin line classes amended on one surface and not the other.** `cotag_screen`'s `group_heading_flat` and `subgroup_heading` gained the co-tag / SubGroup name half; `full_report`'s `title` (`# Full Report — <GroupID>`) and `h3_subgroup` (`### <SubGroupID>`) did not, while `renderReportMarkdown` now emits `# Full Report — G2 — …` and `### G2-1 — …`. Same class as item 1, one surface over.

3. **Mutation evidence absent for two changed fixtures.** `checks/fixtures/terrain/format/cotag-screen.txt` and `full-report.md` are rewritten; no mutation table in the PR body, the story, or the three commit messages (`specs/SPEC.md:510-514`). Counting instance — this is the accretion the count is worth more than the instance.

4. **A dead placeholder that would render an undeclared token.** `terrain/terrain.mjs:1357` renders `${parent.gid || "G?"}`; `G?-1` matches neither `tokens.SubGroupID` nor the abnormal-token discipline. Unreachable today (`parent` always comes from `cotagGroups`).

5. **A deferred-slot fill carrying choice and alternatives but no receipt.** `gsg-id-renumbering-across-a-pin-advance`, filled on #317 2026-08-11. Counting instance for the deferred-slot twin.

No `out-of-dimension:` observation on this PR — everything above typed into dimension 1.
