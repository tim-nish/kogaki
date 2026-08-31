---
id: reg-0126
status: pending
observed_at_pr: 532
observed_at_head: 394b48c9afc24c5b1d1501c07785b962fa4fdd0e
class:
recorded: 2026-08-19
source_comment: 5338260288
---
**Spent-bound carries from PR #532, round 2** (head `394b48c9afc24c5b1d1501c07785b962fa4fdd0e`). Both rows are **instance-class** (kogaki#374) — their value is the defect each names, not a count. Neither counts toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` rows only.

Routed here rather than resolved in the review because round 2 of §4 clause 3's two was the last reachable round; both are latent and non-gating, which is the floor kogaki#374 sets.

1. **`replaceSlot` interprets `$`-patterns in Candidate-authored bodies.** `brief/compose.mjs:189` passes its body to `String.prototype.replace` as a *replacement string*, so `$&`, `` $` ``, `$'` or `$1` inside the body is interpreted rather than inserted literally. PR #532 routes three further prose fields (`reader_start`, `reader_target`, `opening_question`) through that path, widening exposure from two fields to five. A `reader_start` containing `$&` writes corrupted text into the Brief. Pre-existing in the shared writer; #532 adds callers, not a new class. Repairing it is unlicensed under kogaki#521.

2. **`SPEC-draft-pipeline` §5.1.1 carries a transitional clause that #532 falsifies.** `specs/spec-draft-pipeline/SPEC.md:868-870` reads *"Until 1.77 lands, `brief/brief.mjs:95` renders `opening_question` without the defining clause §5.1 now carries."* #532 lands 1.77 and writes that clause into `brief/brief.mjs:95`, so on merge the spec describes a runtime state that no longer exists. Distinct from kogaki#531, which carries the §4.4 `unsupported completion` correction and not this sentence.

Full report: https://github.com/tim-nish/kogaki/pull/532#issuecomment-5338257219
