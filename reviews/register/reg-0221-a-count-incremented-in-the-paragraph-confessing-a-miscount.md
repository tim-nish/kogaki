---
id: reg-0221
status: pending
observed_at_pr: 782
observed_at_head: 825bd68
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #782 round 2 — the referrer count is **wrong on master in three
places**. `specs/spec-brief-draft-design/DESIGN.md`, the SPEC v25 status block
and §4.14.2 all say **twenty-one**. The true count is **twenty**.

**Verified mechanically, not argued:** `git grep -o -i "style.contract"` over
the seven files at the pre-merge base returns exactly 20, and the enumeration in
the paragraph itself still sums to 20 — `specs/SPEC.md` ×2 + `spec-draft-pipeline`
×11 + `spec-draft-command` ×2 + `gates/registry.json` + `src/brief.mjs` ×2 +
`src/draft.mjs` + the record.

**The reasoning error is exact.** `gates/registry.json` was always **inside** the
twenty. Round 1's defect was that it had been *counted and not repointed*, so
repointing it makes the sweep count and the repointed count **agree at twenty**
— it raises neither. I read "one more file repointed" as "one more referrer" and
incremented.

**And the site is what makes it worth a register entry.** The number was
incremented **in the paragraph whose entire subject is an earlier miscount** —
the confession about writing a count from the sweep rather than from the diff,
written one commit before, in the same paragraph. The correction and the
recurrence are adjacent lines.

**This is the increment-without-re-derivation class**, which
`checks/check-brief-compose.sh`'s own mutation-evidence note already records
**three times** against itself, each time installing a paragraph against it. The
fourth instance is here, in a different file, by the same motion: a headline
number is changed and the enumeration under it is not re-read.

**The rule the instances converge on:** a count that has an enumeration beside it
is never edited — it is **re-derived from the enumeration**, and where the two
disagree the enumeration wins, because the enumeration is the evidence and the
headline is a summary of it.

**Not fixed at the head that produced it.** The two-round bound was spent and the
round-2 report certified `825bd68`, which the Review presence condition requires
— `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`. Routed here rather than to kogaki#749, which
**closed at this merge** and could not carry it.

Fifteenth instance in this sitting of that composition; see reg-0206 to reg-0220.
