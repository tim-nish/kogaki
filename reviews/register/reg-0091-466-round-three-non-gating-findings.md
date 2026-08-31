---
id: reg-0091
status: pending
observed_at_pr: 466
observed_at_head:
class:
recorded: 2026-08-15
source_comment: 5300353857
---
## PR #466 round 2 — three non-gating findings at a spent bound (kogaki#461, §4 clause 13)

Round 2 of 2; the §4 clause 3 bound is spent, so these take the kogaki#374
spent-bound disposition rather than a successor PR. All three are latent and
in-diff. Recorded here rather than left in the PR thread, because an
undischarged disposition evaporates at merge — the failure §4 clause 8 names on
PR #221, #231 and #240.

**1. (should) The implementation reads a wider surface than its clause states.**
`specs/SPEC.md` §4 clause 13 says the declaration lives in "the **closing
comment** of the issue being closed". `_issue_closing_comment()`
(`checks/check-review-report.sh`) returns the issue body joined with **every**
comment, so a well-formed `successor: #N  <scope>` line anywhere on the issue —
a proposal comment, a review reply demonstrating the grammar with a real number,
a body that pre-declares its own split — declares the relation. The docstring's
defence is wrong for this class: anchoring guards a *line* against prose
containing the word (claude-toolkit#386's defect), and says nothing about a
well-formed line sitting in a comment that is not a close. This is the
use-vs-mention hazard kogaki#41 fixed one surface over, and this same file
carries the shape at `:1633-1636`.
*Reachability:* fires only where an issue a merge closes carries a well-formed
declaration outside its close — latent, not live. Non-gating: the read is
report-only and a false match costs one spurious informational line.
*Remedy when taken:* read the closing comment (the last comment, or the one
carrying the close event) rather than the concatenation — **or** amend the
clause to say the whole issue is the surface. The divergence is the finding, not
the choice.

**2. (should) Two of four mutants are replicas, and the shipped pass line says
they are not.** Mutants 8c (`_ds_state_blind`) and 8d (`_ds_scope_blind`)
hand-write a comprehension over `successor_decls()` instead of running
`discharged_survivors()` under a mutation, and each hardcodes the literal
`"#{c} is open and …"` into its own output — so `"#403 is open" in _m3_state`
is satisfied by the replica's own format string, and cases 2 and 4 stay unbound
to the shipped state filter and the shipped closed-set scoping. This is round 1
finding 2's exact class arriving on the mutants written to close round 1
finding 3.
**What makes it a finding rather than an accepted limit:** the pass line this
check prints now reads *"FOUR MUTANTS, each of the SHIPPED read rather than of a
replica"* — a green line claiming a property two of its four members lack, which
is kogaki#209's specimen one file over.
*A shipped-code mutation was available for both and is recorded so the next
sitting does not re-derive it:* `discharged_survivors()` reaches its inputs only
through `sorted(closed_issues)`, `closing_comments.get()` and
`issue_state.get()`, so a mapping whose `get` always returns `'open'` mutates
the state filter, and a set-like yielding every declaring parent mutates the
closed-set scoping — both exercise the shipped function.
*Priority note:* this is the one of the three whose cost is a FALSE CLAIM in
shipped output rather than a latent behaviour, so it is the one to take first.

**3. (nit) The explicit zero counts only the readable issues.**
`_report_discharged_survivors()` builds `comments` from the issues it could read
and calls `discharged_survivors(set(comments), …)`, so where every closed issue
is unreadable the zero reads "the 0 issue(s) this merge closes", which is false
of the merge. The adjacent `cannot-determine:` line names the unreadable set, so
nothing is hidden — but the docstring's "never folded into the zero" is true of
the ROWS and not of the count in the zero's own sentence.
*Remedy:* one token — count the closed set rather than the readable subset.

**Provenance:** https://github.com/tim-nish/kogaki/pull/466 round 2, head
`c2559aa`. Licensing issue kogaki#461.
