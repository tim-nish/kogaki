---
id: reg-0122
status: pending
observed_at_pr: 517
observed_at_head: e87c46f945e6a69ec186496ba7c7821abf6d7664
class:
recorded: 2026-08-18
source_comment: 5326767403
---
Appended from the review lane, PR #517 round 2 (head `e87c46f945e6a69ec186496ba7c7821abf6d7664`). Two rows, each declaring its class. Round 2 of two — the bound is spent and auto-merge is unarmed, so neither row has a later round to be read in (kogaki#374/#433 floor).

**Row 1 — accretion-class.** Repairs of an `efficacy_note` append a stratum rather than replacing one. `checks/registry.json`'s `brief-entry` note now carries kogaki#511's ground, kogaki#515's ground, the FIELDS-row disposition, its first-admission quote and an attribution correction in a single JSON string, and `registry-conformance` reads none of it. Correct per the re-home rule (`product-lab@8906f20 LESSONS.md:15`) and monotonic: a third repair of the same class adds a third stratum with nothing bounding the growth. Counting the class of "record field that only ever grows".

**Row 2 — instance-class** (non-gating in-diff carry at a spent bound). `checks/registry.json` `brief-compose` `efficacy_note` at head `e87c46f`: PR #517's fix commit struck the note's claim *about what the pass line contains*, but the surviving "why" is substantively the sentence `checks/check-brief-compose.sh:318-321` already carries — *"the declined \"placing the Strand places its Journey\" option — failed (h)'s 0-of-1 assertion, which is the direct evidence that option would have made MUST 1 unfalsifiable"*. The same rationale in two artifacts with nothing observing the two is the drift surface kogaki#515 exists to close, one level below where round 1 saw it. Not a defect in that commit — kogaki#515's acceptance item 2 admits "why a mutation was chosen" as a note's content, and the duplication is as much the check file's choice as the note's.
