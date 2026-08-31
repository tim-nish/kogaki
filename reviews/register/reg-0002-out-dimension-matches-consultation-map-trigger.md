---
id: reg-0002
status: pending
observed_at_pr: 255
observed_at_head: dec255e
class: out-of-dimension
recorded: 2026-08-08
source_comment: 5223942562
---
out-of-dimension: `check-boundary-receipts.sh` matches consultation-map trigger terms as bare substrings of changed text, so entry 1's term `check` fires on any spec prose containing the ordinary English word.

**Observed on:** PR #255 (head `dec255e`), whose diff touches one spec file and no check, hook or registry entry. Run `31233542082` reported:

```
FAIL: 2 mapped boundary/boundaries matched this branch and NO consult receipt is present — #1 Check/CI infrastructure … (matched on 'check' in changed text); #3 Record disposition … (matched on 'contradiction' in changed text).
```

The entry-1 half matched on `no per-record check can see` in `specs/spec-draft-pipeline/SPEC.md` §6.9.0. The entry-3 half is a true positive and is reported as an uncovered boundary in the review-lane report on #255.

**Class:** mechanical-instrument precision — a per-PR reviewer must re-decide each match by hand, and a false positive that recurs teaches the author to read the whole verdict as noise, costing the true half its force. Not a widening candidate for the lane's dimensions; a candidate against the registered check's own matcher.

Appended per `.claude/skills/review-lane/SKILL.md` widening-trigger rule 1.
