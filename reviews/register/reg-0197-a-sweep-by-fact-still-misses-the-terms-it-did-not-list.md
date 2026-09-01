---
id: reg-0197
status: pending
observed_at_pr: 755
observed_at_head: 2748ab0
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #755 round 2 — `specs/spec-terrain/SPEC.md` §13.4:1772 still reads
**"An UNJUDGED candidate is its own state, counted and named"**, while §13.2:1521
— added by the round-1 fix in the same PR — retires that quantity as *"a quantity
that no longer exists, since `full_report` refuses an unjudged neighborhood
rather than counting one"*. The section asserts the unjudged-candidate state in
two directions.

**The shape, and it is the fourth occurrence of one class in one issue.** The
round-1 fix was made by sweeping the document for the superseded **fact** rather
than the superseded clause — the repair for occurrences one to three. That sweep
carried the terms `unjudged candidates` and `all-unjudged`, and missed the
singular **`An UNJUDGED candidate`**. So a sweep by fact is still a sweep by
*term list*, and every fact the list does not spell survives exactly as a sweep by
clause let every sentence survive. **The list is the new clause.** The residue
moves one term further out each time rather than being closed.

**Why this is not the round-1 blocker's shape**, stated because the distinction is
the useful half: an implementer here meets a **stale sentence**, not two
unsatisfiable grammars. §13.2's retirement, §13.4's *"the all-unjudged and
over-cap arms no longer exist"* and #741's acceptance clause *"there is no path to
an unjudged neighborhood rendering"* all point one way, so the direction is
decided in the diff itself.

**A live remainder rides with it, and it is not this record's to fix.** Neither
the refusal as stated nor J3's three declared refusals (§13.4:1808) refuses a
judgment record that judges **some** candidates, so the partial arm is not closed
by construction. `report-format.json`'s `neighborhood_unjudged` form — a
per-candidate remainder distinct from the all-unjudged `neighborhood_none_judged`
— is inside **#754**'s inventory and its fate is stated there. What is owed here
is one clause at §13.4:1772.

**Reachability, as `specs/SPEC.md` §4 clause 8 asks: NOT reachable.** No
registered check reads spec prose for internal consistency; all 21 pass at this
head. The two-round bound was spent when it was found, and #755 is itself the
successor to a PR that parked on this same class — a third submission for one
clause is the exit whose cost reproduces the process.
