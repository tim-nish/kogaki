---
id: reg-0043
status: pending
observed_at_pr: 367
observed_at_head:
class:
recorded: 2026-08-12
source_comment: 5260845286
---
**A fixture restates a pinned fact as a local literal.** PR #367 round 2, `nit`, accretion-class.

`checks/check-terrain-composition.sh` asserts that the neighborhood's `N<n>` suggestion ids are disjoint from the survey's `L<n>` display ids, and holds the `L` space as `new Set(["L1","L2","L3"])`. The space it names is minted at `terrain/terrain.mjs:378` and pinned by `specs/spec-terrain/survey-schema.json:34` as `"candidate_display_id_pattern": "^L[0-9]+$"`. The literal is a copy with no mismatch check, so if that pattern widens — a second family with its own prefix, a scheme change — the case keeps passing while the disjointness it asserts has stopped being true.

Sound today, because the schema really is `L`-only. Recorded because the value is the **count of fixtures that restate a pinned fact locally**, not this instance: the class is a check that reads one side of a comparison from a literal, and its coverage silently expires when the literal's source moves.

Adjacent, from the same PR and the same class of cause: two fixtures each covered a property in isolation and their **composition** was the live defect (kogaki#369). Both are cases of a check being locally correct and globally uninformative.

Source: PR #367 round-2 report, dispositioned `carried: register` by the reviewer.
