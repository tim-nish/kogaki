---
id: reg-0069
status: pending
observed_at_pr: 423
observed_at_head:
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5279785055
---
out-of-dimension: a bare line-number pointer inside a durable comment block is a known-decaying citation, and the count is FOUR (PR #423 round 2, merged 7595783). Instances: checks/check-boundary-receipts.sh cites '(:532, :536)' for the two `git log --format='%B'` reads — correct when round 1 measured them at 80e8880, stale at 5e11ab4 because the same commit that quoted them inserted 22 lines above them; and :131-134 already cite '(:327-330)', '(:342)' and '(:454-456)' for term_pattern's word bound, match_boundaries' break, and the source order, all three stale at the base commit and pointing at scratch-fixture code. The shape is that the pointer decays fastest in exactly the artifact that grows — a comment block whose purpose is to accumulate a record — and it decays silently, since a wrong ordinal resolves to real code and reads as precise. Remedy named by the reviewer: cite the construct (`git log --format='%B'`, `term_pattern`, `match_boundaries`) rather than the ordinal. Non-gating; both rounds were spent when it was found, so it was carried rather than merged unreviewed. Accretion-class: the countable property is how many bare ordinals this repository's durable blocks carry and how many still resolve. Sibling of the 148-broken-file:line measurement the corpus already holds (product-lab@8906f20 topics/knowledge-architecture.md:69) — same decay, one altitude down, inside a single file rather than across a corpus.
