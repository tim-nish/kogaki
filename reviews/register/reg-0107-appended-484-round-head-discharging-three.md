---
id: reg-0107
status: pending
observed_at_pr: 484
observed_at_head: f088487
class:
recorded: 2026-08-16
source_comment: 5307941771
---
Appended from PR #484 round 2 (head `f088487`), discharging three `carried: register`
dispositions. All three are **instance-class** rows under kogaki#374 — spent-bound
latent non-gating in-diff findings, valuable as the defect each names — and **none of
them counts toward rule 3's three-of-a-class widening trigger**, which reads over
`out-of-dimension:` rows only.

The bound: round 2 of two was spent by the report that carries these, so "resolve it in
the review" was unavailable (kogaki#433). Auto-merge was read and not inferred —
`gh pr view 484 --json autoMergeRequest` returned `null`, unarmed — so the spent counter,
not the arming, is the cause here. Reachability is stated for each rather than assumed.

**1. `--briefs-dir` sits outside the refusal shape the same commit adopted.**
`brief/brief.mjs:179` reads the flag through an inline ternary falling back to `"briefs"`,
so a bare `--briefs-dir` silently writes to the default home while a literal
`--briefs-dir true` is honoured — the same omitted-value class the commit closed with
`argString` for `--survey`, `--ids` and `--slug`. *Latent:* the flag is a test seam and is
absent from `.claude/skills/brief/SKILL.md:41`'s command line, so a session following the
skill cannot reach it. Remedy: one comment declaring the default deliberate, or a fourth
guard.

**2. A regex literal where the neighbour needed `new RegExp`.**
`checks/check-brief-entry.sh:40` writes `` /journey cite: `gloss/.test(doc) `` — the
trailing `/` terminates the literal, so the compiled pattern is `` journey cite: `gloss ``,
one character short of line 39's deliberate `` new RegExp("cite: `gloss/") ``. *Latent:*
it parses, runs and discriminates against the committed fixture, so nothing is wrong at
this head; the cost is a reader meeting two adjacent lines where the deliberate form and
the accidental one look equivalent. Remedy: one token.

**3. A new assertion admitted without a mutation row, in the commit that answered a
mutation-evidence finding.** The journey-cite assertion added at
`checks/check-brief-entry.sh:40` is absent from the pass line's MUTATION EVIDENCE
sentence, which enumerates four mutations mapped to the four cases. *Latent:* its
discrimination is real and demonstrable (the pre-fix composer emitted "carries a Journey",
which the pattern rejects) — the evidence exists, the record does not name it. Remedy: one
clause in the same sentence.

Report: https://github.com/tim-nish/kogaki/pull/484#issuecomment-5307939529
