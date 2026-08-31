---
id: reg-0057
status: pending
observed_at_pr: 397
observed_at_head: 4e33c551aeff452dcba386f8edc215fa1135e735
class:
recorded: 2026-08-12
source_comment: 5267518108
---
**Row kind: INSTANCE-CLASS** (kogaki#374 spent-bound carry). Its value is the defect it names, not a count — this row is **not** an `out-of-dimension:` line and must **not** be counted toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` lines only.

**From:** PR #397 round 2, head `4e33c551aeff452dcba386f8edc215fa1135e735`, disposition `carried: register` on the report's one open finding.

**The finding.** `.claude/skills/review-lane/SKILL.md:845-852` carries a ragged wrap left by PR #397's round-2 repair commit `4e33c55`. Line 848 is `restating them. What that means for you: a head is ONE` — 53 characters mid-paragraph, where the surrounding file wraps near 76 and the pre-edit line filled its width; line 849 is short for the same reason. The cause is visible in the hunk: `it`→`them` twice lengthened line 847 and the overflow was pushed onto 848 without re-flowing the rest of the paragraph.

**Reachability, and why it is here rather than in an issue or the review.** The defect lives in the diff's own text, which normally means resolve it in the review. PR #397's round 2 is the second of the two-round bound (§4 clause 3), so no round remained to resolve it in, and nothing reaches it without a third round — an owner decision rather than a reviewer's. kogaki#374's spent-bound default therefore applies: an in-diff latent non-gating finding lands here rather than minting an issue or a successor, each of which would cost at least two further review rounds for a formatting nit.

**Remedy if anyone picks it up:** re-flow `SKILL.md:845-852` to the file's own width. Nothing computes over the prose and it renders identically, so the harm is confined to a noisier next diff of that paragraph. Precedent that this repository treats paragraph flow as real work: `cd087ee`, "re-flow §13.5's bound paragraph to its blank-line boundaries".
