---
id: reg-0153
status: pending
observed_at_pr: 585
observed_at_head: 50ba74d
class:
recorded: 2026-08-20
source_comment: 5359890814
---
Two rows from PR #585 round 2 (head `50ba74d`). Typed per kogaki#374, since this ledger has two producers and their rows read differently.

---

**Row 1 — accretion-class** (`out-of-dimension:`, counts toward rule 3's three-of-a-class trigger)

out-of-dimension: a commit message on PR #585 (`64cefcc`) asserted an edit whose patch silently no-opped; the assertion was true of the intent and false of the tree, and it took a successor commit (`50ba74d`) to notice and land it. Self-disclosed and repaired at the head. The class: "a failed patch and an applied one are indistinguishable in a commit that also carries a succeeding hunk" is a property of the authoring instruments, and it types into neither review dimension.

---

**Row 2 — instance-class** (spent-bound latent non-gating in-diff carry; its value is the defect it names, NOT a count, and it must not be counted toward a widening it says nothing about)

`carried: register` from PR #585 round 2, finding 3, `nit open`:

> The *Separately rendered* bullet's first paragraph still carries the release condition as live, three lines above the record that it fired. `specs/spec-draft-pipeline/SPEC.md:1489-1492` reads "Placement in the body rather than the label **was** a try-one-first instruction, not a settled placement: **if it reads badly in use, it moves to the label**, and that move needs no amendment here." The tense of the framing verb moved to `was`, but the conditional it frames did not, so the sentence a reader quotes on its own still says the move is available rather than taken. Mitigation is adjacency: `:1507` answers it in bold immediately below. remedy: one clause, if ever taken — "if it read badly in use it would move to the label", or a parenthetical `(it did — see below)`.

Routed here rather than to the review because two rounds were spent with that report (§4 clause 3) and `autoMergeRequest` read `null` — the bound simply is spent — and the finding is in-diff and latent, reachable by no served state or input (kogaki#374's floor).

Report: https://github.com/tim-nish/kogaki/pull/585#issuecomment-5359887802
