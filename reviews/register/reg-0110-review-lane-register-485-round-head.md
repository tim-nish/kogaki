---
id: reg-0110
status: pending
observed_at_pr: 485
observed_at_head: f0d43d9
class:
recorded: 2026-08-16
source_comment: 5308152909
---
Review lane register — PR #485, round 2 (head `f0d43d9`). Two rows, both **instance-class** (kogaki#374): their value is the defect each names, not a count, so neither is read by rule 3's three-of-a-class widening trigger. No `out-of-dimension:` row this round.

**instance-class — PR #485.** `specs/spec-terrain/SPEC.md` Status header, v22 entry. The round-1 fix propagated v22's ruling into §11's `projects:`-as-fourth-substrate deferral (correctly, and resolving round 1's finding 1), but the v22 Status entry was not amended to say so — it still describes v22 as a §13.5 re-pointing alone. This file's own v19 entry is the precedent it departs from: "**v18's ruling is propagated to the clauses it silently invalidated** … **§2.4's positive limb and §6.3 act 1 are amended by name**". The round-1 fix's own commit message cites that precedent for the propagation while not applying it to the record. Remedy: one clause in the v22 entry naming §11. Reachable now (any reader of the header gets an incomplete list of what v22 amended), non-gating, in the diff's own text.

**instance-class — PR #485.** `specs/spec-terrain/SPEC.md:4302`. The round-1 fix for finding 3 substituted "behind the two-armed condition above" for "behind the trigger above" in place, taking the line to ~89 columns against the ~78 every surrounding line in the file holds. Correct in content; the wrap was not re-flowed. One re-wrap.

Both rows are routed here rather than to a successor at a spent two-round bound; the reasoning and its disclosed deviation from clause 8's spent-bound floor are in the round-2 report on PR #485.
