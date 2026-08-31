---
id: reg-0039
status: pending
observed_at_pr: 365
observed_at_head:
class:
recorded: 2026-08-11
source_comment: 5255259941
---
## PR #365 round 2 — three findings, and one of them is a signal about the instrument

Two rounds spent, none blocking, merged. Each remedy is one clause, stated so the disposition stays arguable.

### B — the marker rule's THIRD formulation, still wrong (`should`)

`specs/spec-terrain/SPEC.md:3506-3508` now reads:

> Inside it, the QUOTED and BULLETED material is v13's unless a paragraph is headed as v15's (`Read under v15.`, `Survives:`, `Withdrawn:`, `Consequently`, and this marker).

The `Read under v15.` paragraph at `:3592-3604` is headed as v15's and contains **three quotations that are verbatim v13's**, lifted from a few lines above. Under the rule they read as v15's; the paragraph's own first sentence says *"That paragraph is v13's"*. Rule and prose disagree about **which words are v13's** — the single question the marker exists to answer — and the disagreement is invisible to a reader who trusts the rule.

Remedy as the review states it: exempt quotations a v15 paragraph makes *of* the region's own v13 text, which is what the prose already does by hand.

**The accretion signal, which is why this is here rather than only in a fix.** This clause has now been written three times and been wrong three times, each time in a different direction:

1. *"what is verbatim is marked verbatim"* — read as every verbatim passage carrying a marker; false of its own region.
2. *"everything not marked as v15's is v13's"* — falsified by v15's own connective prose, one instance of which the fix itself created.
3. *"the QUOTED and BULLETED material is v13's unless headed as v15's"* — misattributes v13 quotations inside v15 paragraphs.

Three narrowings of one global rule, each correct about the case that prompted it and wrong about a case it did not see. **The next attempt should consider whether the rule is the wrong instrument** rather than narrowing it a fourth time: the prose already marks each paragraph correctly by hand, and a per-paragraph label needs no global rule to be true. A rule that must enumerate its own exceptions to stay true is doing less work than the labels it sits above.

### A — two live frames for the same count (`nit`)

`tools/review-sweep.sh:903-904` still says *"a fourth copy of the number could return here and nothing would fail"*, three lines above `:907-908`, added by the same commit: *"Adding a copy here again would make TWO … The sentence used to say 'three', which counted nothing this file can point at."* A returning copy cannot be both the second and the fourth. "Fourth" is traceable — it is kogaki#305 item 10's own wording — but it counts the pre-remedy state, and the sentence below now disavows that count. Nothing tells a reader which frame is live.

### C — the enumerated token does not match the head it enumerates (`nit`)

`:3507` lists `Read under v15.` with a full stop; the paragraph at `:3568` is headed `Read under v15:` with a colon. Nothing breaks — that paragraph is prose, which the narrowed rule no longer classifies — but the parenthetical is offered as the vocabulary a reader scans for, and a reader scanning finds two of three.

### Why all three are here rather than on a carrier

Two rounds are spent at `935e86a` (§4 clause 3), so a further commit would move the head past the reviewed sha with no third round to clear it. All three are one-clause internal-consistency defects in the diff's own prose; none violates a ratified position, breaks a check, or is unlicensed scope. Merged on that basis 2026-08-12.
