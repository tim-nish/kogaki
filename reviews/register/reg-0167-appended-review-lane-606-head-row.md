---
id: reg-0167
status: pending
observed_at_pr: 606
observed_at_head: 38dcccd
class:
recorded: 2026-08-21
source_comment: 5373663761
---
Appended by the review lane from PR #606 (head `38dcccd`). Row kinds declared per rule 1.

**accretion-class** (counts toward rule 3's three-of-a-class trigger):

out-of-dimension: PR #606 — `policy/kit/bin/consult.mjs`'s `degradedStatement()` hand-composed receipt template (the `outcome` / `disposition` / `query` block it prints on the degraded path) still carries no `axis:` continuation key, although story 1.84 (#604) landed `axis:` emission from the transport and #606 now closes the axis value set. An operator forced onto the degraded path composes a receipt with no axis line at all, so the degraded exception rate and the axis record are coupled in a way neither story states. Outside #606's licensed artifact; recorded rather than raised as a finding against this diff.

out-of-dimension: PR #606 — the kogaki#230 mutation-table obligation was absent from the PR record again, behind a green `62/62` self-test line. This is the count row: the obligation is prose-plus-visible-absence with no gate by design (specs/SPEC.md §4), and its miss rate is the only thing that can argue for a different carrier.

**instance-class** (its value is the defect it names; NOT counted toward rule 3):

carried from PR #606, finding 2 — `specs/SPEC.md` §4's axis clause still reads as though the value set is unfilled: it names `deferred slot: the subject | conduct value set`, narrates "any value passes", "Unknown values are **reported and denied nowhere**", and calls the ambiguity "the price of not minting" with the reopen trigger "the hub ratifying it". product-lab#172 closed 2026-08-21 and #606 fills the slot in `consult.mjs`, so the spec now misdescribes the shipped kit for the first reader of the kit contract — and the kit is the artifact a second consumer installs. Repair: discharge the deferred-slot marker and re-cut the shape-only narration to say what stays shape-only (`checks/check-consult-receipts.sh`, deliberately) versus what no longer does (the entry point).

carried from PR #606, finding 3 — the ratified pair reaches `RATIFIED_AXES` from a **closed hub issue body** (product-lab#172) rather than from a served rendering at a pin. The branch's two receipts pin `gloss/lessons/claude-code-ops.md` and `gloss/lessons/testing.md` at `product-lab@c2f4650`; neither carries the axis value set, and `c2f4650`'s served corpus predates #172's closure. The code comment says the set is "QUOTED … never minted here", but a quotation whose source is an issue rather than a pinned served line is exactly the thing kogaki cannot re-check at pickup. Repair: pin the set to a served line once the hub serves it, or state in the comment that the source is the issue and that no served pin exists yet.
