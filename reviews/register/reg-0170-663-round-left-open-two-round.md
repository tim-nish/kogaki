---
id: reg-0170
status: pending
observed_at_pr: 663
observed_at_head: 5446d2e
class:
recorded: 2026-08-26
source_comment: 5422335839
---
**PR #663 round 2, one `should` left open at the two-round bound.** Merged as `27424d2` (kogaki#661, story 1.92) with this finding undischarged. Recorded here rather than promoted to an issue: promotion to a full-cost carrier is an explicit act, and this chain had already minted two (#659 → #661).

Finding, in the reviewer's own text:

> the FLOOR-read failure path in `check-owner-surface-pins.sh` still exits before the unconditional scope disclosure. Round 1 named three `exit 1` paths at the prior head's lines 68, 72 and 76; the fix converted 72 and 76 to `FAIL=1` and fell them through, and left 68 — `") || { echo "FAIL: could not read case_floor for owner-surface-pins from checks/registry.json"; exit 1; }` at line 66 of the current file. It is the only `exit 1` in the file: every failure that predates this PR sets `FAIL=1` and reaches `exit $FAIL` past the `cat`. It is reachable by ordinary means (the member's entry dropped from the registry raises StopIteration; a missing `case_floor` key or malformed JSON does the same), and on that run story 1.50 AC5's "the disclosure prints on a PASS as well as a failure" does not hold. The record now overclaims to match: the pins `efficacy_note` states "The floor's failures set FAIL=1 and fall through, as every other failure in this member does" — true of two of the three. One-line repair, same shape as the two beside it

**Reachability, stated so the row can be ranked rather than only counted.** The path fires only when `checks/registry.json` cannot be read or does not carry this member's `case_floor` — a state in which `check-registry-conformance.sh` is already failing on the same tree, and in which every other member reading the registry fails too. So the lost disclosure happens on a run that is red for larger reasons. That bounds the severity; it does not make the claim in the `efficacy_note` true, and the false half is the part worth someone's attention, because an admission record asserting what the code does not do is the class kogaki#661 exists to close.

**Two things the repair owes together, since fixing one without the other reproduces the defect:** the `exit 1` becomes `FAIL=1` with a fall-through, *and* the pins `efficacy_note`'s sentence stops claiming all three paths fall through — or, if the exit is kept deliberately, the note says which path exits and why.

Provenance: PR #663 round 2, head `5446d2e`, review-base `3d45e00`. Rounds 1 and 2 both spent; five of round 1's six findings resolved at that head, this one introduced by the round-1 repair itself.
