---
id: reg-0183
status: pending
observed_at_pr: 719
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5470122088
---
Two entries from PR #719 (kogaki#639's final remainder). One is round 1's `nit`;
the second is the reviewing session's own observation about how that PR closes
its issue.

## 1. The widening trigger is advisory, and this is its third recurrence

Round 1, `nit`. `policy/kit/test/install-test.sh`'s section-11 `INSTALLED` array
is enumerated **by hand** beside `install.sh`'s `cp` destinations rather than
derived from them, so its own trailing sentence — "a sixth destination owes a
sixth entry here" — is covered only if someone remembers this list. The
non-member fallback was chosen deliberately and is stated at the site, so this
is the count rather than a defect.

**The count now stands at four, all in one issue's work**, and the shape is
constant — *a population narrower than the class the artifact claims to cover*:

1. #718 r1 — the detector matched one literal string while the fix covered three
   files, so two same-class citations sat live in the files being repaired;
2. #718 r1 — the qualified/bare test was line-scoped, so a line carrying both
   forms escaped;
3. #718 r2 — the enumerated list was one member short of the count its own
   comment gave;
4. #719 r1 — the list is hand-maintained, so its widening trigger cannot fire
   on its own.

Each of the first three was authored by the act that repaired the one before it.
The fourth is what remains after all three repairs: the mechanism is correct and
its currency depends on memory. **What would discharge it** is deriving the list
from `install.sh`'s `cp` destinations rather than mirroring them — which is a
different act from any of the four repairs, and is why counting mattered.

## 2. A closing keyword in a PR BODY is invisible to the pre-push lint

Observed at PR #719 by the merging session, not by the round.

kogaki carries a pre-push lint over **commit messages** that refuses an
unapproved close keyword — it fired earlier in this same session, refusing a
commit that merely quoted `Closes #700` in prose. PR #719's commit messages are
clean and its **body** says `Closes #639.`, which populated
`closingIssuesReferences` and auto-closed the issue at merge.

**The close was correct here** and this is not a report of harm: #639's own
remainder comment named that exact one-line change as what closes it, and the
merging session verified nothing else was outstanding before merging. The
observation is about the **route**, not this instance.

**The route is unguarded because the lint binds the wrong layer.** GitHub parses
close keywords from the PR body on its own rules, at merge time; the lint reads
commit messages at push time. A body is never pushed through it. That is the
same shape the served surface already names — a rule carried at a layer the
violating act does not cross — and this repository has the specimen that earned
the discipline: PR #712's `Closes #700` reached master through squash-merge
concatenation and closed an issue that still had live work.

**Not promoted to an issue**: no defect exists in the tree, the close it produced
was right, and the remedy — if any is wanted — is a decision about where the
close-keyword rule binds, not a repair. Recorded as the count of routes by which
an issue can close without an approved-close row.
