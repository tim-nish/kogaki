---
id: reg-0148
status: pending
observed_at_pr: 576
observed_at_head: 185d500
class:
recorded: 2026-08-20
source_comment: 5357289491
---
**Appended by the review lane** — PR #576, round 2, head `185d500`. Four rows, **all instance-class** (kogaki#374: spent-bound latent non-gating in-diff carries). **None is an `out-of-dimension:` row**, so none counts toward rule 3's three-of-a-class widening trigger — that trigger reads `out-of-dimension:` lines only. PR #576's report carried `out-of-dimension: none` at both rounds.

The bound is spent (round 2 of two) and auto-merge is unarmed (`autoMergeRequest: null`), so "resolve it in the review" was unavailable for all four; each is latent — not reachable against currently served state — so the kogaki#374 floor routes them here rather than minting an issue or a successor.

Row 1 — carried forward from round 1, re-declared at round 2 rather than dropped. **Accretion-class**, the one exception among these four: `checks/check-brief-compose.sh:227-233` asserts an effect-stating payload label by positive string match on a composer literal (`/Reader Path/`, `/Brief's sequence/`), which pins wording rather than the property. The author's decline is recorded at `185d500` and is reasonable — §2.2 sites the sufficiency half in the review lane, so replacing the literal with the floor would drop the states-ONCE property kogaki#568 is about. The value here is **how many literal-frame assertions this suite accumulates**, which is why it is a count rather than an instance. This is its second observation.

Row 2 — instance-class. `brief/assemble.mjs:315-321`: the `§2.2 IS SATISFIED RATHER THAN WAIVED` comment offers `assembleSelection`'s Candidate dedup as construction-proof for the floor clause "not identical to another option's label". That clause is **record-label-versus-option-label** (`checks/check-proposal-contract.sh:140-142`), not option-versus-option, so the dedup does not bear on it. What actually keeps it true is that the payload label is a fixed composer literal no reader experience would equal, which nothing asserts. Round 1's finding 2 shared the misreading and repaired the key it named; `185d500` reinforced the claim rather than repairing it.

Row 3 — instance-class. `brief/assemble.mjs:269-271`: the reader-experience presence guard is exact (`=== ""`) while the dedup key three lines later is `.trim().toLowerCase()`. A whitespace-only experience passes the guard and, since kogaki#568 made the option label the raw prose, renders as a **blank option label**. Same class as round 1's finding 2, one field over — the retired `Adopt <id> — …` prefix carried non-blankness whatever the prose did, and the two guards that replaced that property were normalised one and not the other.

Row 4 — instance-class. `checks/check-brief-compose.sh:495-503`: the new case-variant distinctness assertion is filed under `(j)` (the plain-register rendering case) and sited ~290 lines from its exact-duplicate twin at `(e)`:213, where the property lives. The siting is scope-driven and fine; the failure text's case label is what a later reader auditing case coverage greps by, and it splits `(e)`'s duplicate-reader-experience property across two cases with no pointer between them.

Report: https://github.com/tim-nish/kogaki/pull/576#issuecomment-5357280465
