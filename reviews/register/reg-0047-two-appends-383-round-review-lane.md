---
id: reg-0047
status: pending
observed_at_pr: 383
observed_at_head:
class:
recorded: 2026-08-12
source_comment: 5263260804
---
Two appends from PR #383's round-2 review lane, both dispositioned `carried: register` and neither carrying a comment pointer when the report was written — appended here by the merging run so they do not evaporate at merge, which is the failure §4 clause 8 and kogaki#224 name and which PRs #221, #231 and #240 are the specimens of. Report: https://github.com/tim-nish/kogaki/pull/383#issuecomment-5262960742

**1. The per-family join rests on an unasserted key equality.** `terrain/terrain.mjs`'s `neighborhoodOf` keys `population` by whatever keys a batch record's `members` object carries, while a suggestion's `family` is `bySlug.get(slug)?.kind`. The two are joined by an equality no fixture exercises: every AC3 case supplies both sides from the same literal, so the equality is assumed rather than tested.

Round 1 reported this over an arithmetic that could also produce an impossible ratio. The fix commit (`e492275`) narrowed the blast radius rather than closing it — with the numerator now filtered by `pop.has(s.slug)`, a key divergence no longer yields `n of m` with `n > m`, but it still splits one family into two rows (one `suggested: 0` over a real population, one `outside_population: n` rendering "no denominator readable") with nothing marking the split.

Accretion-class and recorded rather than decided: whether the keys actually diverge is a fact about `gloss/ELEMENTS.jsonl`, which is outside this repository's boundary. The value is the count of joins in this lane resting on a cross-boundary key equality nothing asserts, not this instance.

**2. Excluding seeds from the denominator can drop a family key, and the null-denominator row then states a false reason.** Introduced by `e492275` and latent. `population`'s per-family Set is created lazily inside the new `if (!seedSet.has(m))` guard, so a walked batch whose members for a family are ALL seeds contributes no key at all. That family falls to the null-denominator row, whose parenthetical reads `— no denominator readable (no walked batch lists this family)` — and a walked batch *does* list it; it lists only the settled member.

The count stays honest: no denominator was counted, and `of 0` is still correctly refused. The defect is confined to the parenthetical's claim about *why*, on the one screen §13.4 exists to make disclose accurately. Reachable on seeds `["s"]` + `batch {lesson: ["s"]}` + one cross-link of family `lesson`; no fixture covers it, because every AC3 case gives its families a non-seed member.

Remedy is small and is recorded so it is not re-derived: track the family key unconditionally and let the Set be empty, or word the note as "no members outside the settled set". Latent and non-gating at a spent bound, which is why it took `carried: register` under §4 clause 8's reachability floor rather than a successor — the floor amended at kogaki#377 earlier the same day, applied to a finding produced by the run that applied it.
