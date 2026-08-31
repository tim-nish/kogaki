---
id: reg-0144
status: pending
observed_at_pr: 570
observed_at_head: 14ea562
class:
recorded: 2026-08-20
source_comment: 5355843136
---
Append from PR #570, round 2 (head `14ea562`). **Two rows, both INSTANCE-CLASS** — spent-bound non-gating in-diff carries under kogaki#374, not `out-of-dimension:` lines. Neither counts toward rule 3's three-of-a-class widening trigger.

Round 2 is the second of §4 clause 3's two rounds, so no later round can read these; auto-merge is unarmed (`autoMergeRequest: null`) but the counter is the binding half. Both defects live in the diff's own text and are non-gating, which is exactly the cell kogaki#374 routes here.

**instance-class** — `specs/spec-draft-pipeline/SPEC.md:253`. The item-2 gate table's re-assessment note now names four re-assessment heads ("Row 4 was re-assessed at v5 and again at v20, and row 2 at v8 and again at v10") while the clause immediately after still says rows 1 and 3 "were not re-checked at **either head**", which counts two. Went stale at v10; PR #570's fix commit edited that sentence's first line and left the counter behind it. Remedy: one word — "at any of those heads".

**instance-class** — `specs/spec-draft-pipeline/SPEC.md` §5.1.3, the precedence paragraph added by `14ea562`. It resolves round 1's ambiguity between "every owner-facing rendering is ordinary prose" and the three-field bound by ranking them, then ends "the choice is whether the surface is composed for the owner, **and it always is**." Read literally that empties the case the same paragraph carves out: if every surface this pipeline emits is composed for the owner, "a record-side presentation that surfaces incidentally" has no members and the three-field bound governs nothing. A repair that makes one of two rules vacuous without saying so is a smaller, different defect from the one it fixed. Remedy: state the vacuity, or soften the universal ("and in this pipeline it is").

Source: https://github.com/tim-nish/kogaki/pull/570#issuecomment-5355838207
