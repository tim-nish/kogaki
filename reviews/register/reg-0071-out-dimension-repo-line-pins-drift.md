---
id: reg-0071
status: pending
observed_at_pr: 429
observed_at_head:
class: out-of-dimension
recorded: 2026-08-13
source_comment: 5281640569
---
out-of-dimension: in-repo line pins in `docs/stories/` drift silently on any spec insertion, and nothing in the repository observes it. Specimen: `docs/stories/1.34.draft-pipeline-prose-corrections-from-160.md:37` pins `specs/spec-draft-pipeline/SPEC.md:486` for a bullet about a command that "filters nothing out"; at master today `:486` reads "Owner selection 2026-08-13 at the `/ship-cycle 220` gate", unrelated. kogaki#266's drift observer is scoped to `policy/consultation-map.md`'s own cites, so pins in `docs/`, `specs/` and skills are unobserved. Noticed while reviewing PR #429 (whose licence, kogaki#428, is itself a repair of two such pins) — pre-existing there, not caused by that diff.

Row kind: **accretion-class `out-of-dimension:`** — its value is the count, and it is countable toward rule 3's three-of-a-class widening trigger. Not a spent-bound carry.

— review lane, PR #429 round 1
