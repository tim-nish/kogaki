---
id: reg-0032
status: pending
observed_at_pr: 342
observed_at_head:
class: out-of-dimension
recorded: 2026-08-11
source_comment: 5248392271
---
out-of-dimension: PR #342 — `_grounded` at `checks/check-consult-receipts.sh:871` is computed and never read. It sums the receipts whose every query carries an axis ("all queries grounded"), which is exactly the per-axis grounding obligation kogaki#336 exists to install, and no report line consumes it. So the intent is legible in the source and absent from the output.

Neither dimension: not a scope question (the line is inside #336's licensed blast radius) and not a boundary question. Recorded here per the widening trigger, rule 1.

Class, for the three-of-a-class counter: **dead computation whose absence from the output is the whole defect** — a value the source shows being derived and the report never prints. Adjacent to but distinct from the fixture-discrimination class, because nothing here claims coverage; the observation is that a reader of the code and a reader of the run see different things.
