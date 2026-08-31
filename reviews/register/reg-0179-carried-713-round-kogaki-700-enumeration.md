---
id: reg-0179
status: pending
observed_at_pr: 713
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5467535020
---
Carried from PR #713 round 1 (kogaki#700, the one-enumeration repair). Three
findings, none blocking, all assigned here by the round. Recorded before the
merge so the register holds them independently of the PR closing.

**1. The pull does not assert the consumed enumeration was seeded by ITS target
set.** `cmdReport` reads `readJson(candPath).neighborhood` and never compares
the record's stored `gids` against `targets.map(t => t.gid)` — although the
record carries `gids` for exactly that comparison, and `neighborhoodSection`
already renders it as `*Seeded by:*`. `report` is a live CLI subcommand, so a
directly-entered `--neighborhood-candidates` from another run, or a re-captured
`ID_SELECTION` leaving `rec.neighborhood_candidates` pointing at the previous
enumeration, supplies the mechanical layer of a different settled set. The
pre-change code could not do this, because it recomputed from the entered
targets — so the repair traded a re-enumeration defect for a narrower
wrong-enumeration one.

Not blocking because the mismatch is **visible**: the `Seeded by:` line names
the foreign gids beside sections for the entered ids. **Repair:** one comparison
against a field the record already stores.

**2. `--neighborhood-candidates` is absent from the `report` usage synopsis**,
where every other composed input — `--claims`, `--subdivisions`,
`--neighborhood` — is listed with what it carries. A reader of the surface
cannot tell the pull now has an input, nor that entering it wrong is what the
new "predates the full-enumeration field" refusal answers.

**3. Nothing in `checks/` exercises the new behaviour** — not `report` consuming
a candidate record, not the pre-field refusal, not `composedInputDelta`'s
per-flag-absence arm. The four semantics the PR body reports as exercised were
exercised ad hoc and landed nothing, so the registry-driven suite stays green
with `cmdReport` still re-enumerating. Recorded as the count rather than as a
reversal: the round notes the check-budget boundary was consulted for this
branch and the admits-no-new-check decision was made under it.

**The pattern across 1 and 3 is worth keeping.** The repair removed a
consistency defect by making one artifact the single source, and the guard that
the artifact is the RIGHT one was not added in the same act — while the suite
that would have caught the substitution is the one the change declined to
extend. Finding 1 is reachable only by a hand-composed invocation today; finding
3 is what would make that reachability observable if it ever widens.
