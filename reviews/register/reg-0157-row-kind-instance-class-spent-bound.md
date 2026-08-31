---
id: reg-0157
status: pending
observed_at_pr: 594
observed_at_head: 7495792
class:
recorded: 2026-08-21
source_comment: 5366205436
---
**Row kind: instance-class** — a spent-bound latent non-gating in-diff carry (kogaki#374), not an `out-of-dimension:` observation. It must **not** be counted toward rule 3's three-of-a-class widening trigger, which reads over `out-of-dimension:` rows only.

From PR #594 round 2, head `7495792`, `checks/registry.json:285` (`draft-runtime.efficacy_note`).

`nit` — the mutation table added at this head accounts for two of the three fixtures the diff adds, and omits the third. The diff's added `ok()` cases are `material refuses a foreign strand by driving the command`, `material serves an in-set strand`, and `the artifact names its Brief machine-independently`. The table's MUTATION EVIDENCE half names *the driven material case*, *the order case* and *the template case*; its MUTANT ACCOUNTING half names *the machine-independence case*. `material serves an in-set strand` — the positive control — appears in neither half, so no mutation is recorded as demonstrating that it discriminates, and kogaki#230's "each new or changed fixture appears in it" is unmet for that one row. The two mutations it would take (`cmdMaterial` refusing unconditionally; the in-set membership test inverted) are cheap.

Carried here rather than to an issue or a successor: the review bound is spent at this head (round 2 of two), so "resolve it in the review" is unavailable per kogaki#433, and the finding is latent — an unrecorded mutation row is a coverage-claim gap, not a defect reachable against served state. Minting an issue for a one-clause omission in an `efficacy_note` would cost at least two further review rounds for a row of prose.
