---
id: reg-0134
status: pending
observed_at_pr: 556
observed_at_head: f8e08c6
class:
recorded: 2026-08-19
source_comment: 5344096977
---
Two rows from PR #556 round 2 (head `f8e08c6`), each labelled by class per kogaki#374 — the widening trigger in rule 3 reads the `out-of-dimension:` row only.

**Row 1 — accretion-class (`out-of-dimension:`, counts toward rule 3's three-of-a-class).**

out-of-dimension: PR #556 — an undefined name in `tools/review-sweep.sh`'s ACT path is caught by no registered check. Round 1's blocking finding 1 was a plain unbound local (`tag`) inside `for pr in prs:`; the file's inline fixture pass exercises functions, never that loop, and none of the 15 registered members is a static-analysis pass. The missed property is MECHANICAL, so rule 4 routes it to the merge carrier — a registered check with its admission record — never to a third dimension in the lane.

**Row 2 — instance-class (spent-bound carry; its value is the defect it names, NOT a count — must not be counted toward any widening).**

From PR #556 round 2, `finding: should open`, disposition `carried: register`. The bound was spent at that report (round 2 of two, `autoMergeRequest` null), so no round could read a fix.

`restore_grant()` (`tools/review-sweep.sh:3394`) matches the record to restore on `(repo, pr, tag in consumed_by)`, but the tag is `f"review-{n}"` — PR-scoped, not pass-scoped. Every round on one PR consumes under the identical string `review-sweep spawn (review-<n>)`, so where the store holds a round-1 grant legitimately consumed and a round-2 grant this pass consumed, both satisfy the match and `sorted(os.listdir(d))` + `break` takes whichever filename sorts first. The docstring at `:3410-3412` claims "a grant consumed by an earlier run — or by another PR's spawn — is never touched"; the second half holds, the first does not.

No round is lost — `grant_lookup()` returns the lowest open round, so a respawn still proceeds — so the harm is in the record: the store afterwards says the round that WAS used is available and the one that was not is spent, and `_grant_log("restore", …)` (`:3447`) names the wrong round to an operator auditing it. The fixture's foreign-tag case (`:5115`) covers a different PR only, which is the half the tag genuinely discriminates.

Remedy is small. Round 1's finding 2 offered two repairs; the one taken re-derives the record from a predicate and carries this ambiguity, the other does not. `PASS_CONSUMES` already holds `(pr, round, tag)` for exactly this pass, so matching the round as well — or carrying the path `consume_grant()` wrote — closes it.
