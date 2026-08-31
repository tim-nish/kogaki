---
id: reg-0055
status: pending
observed_at_pr: 396
observed_at_head: a872ddcf3399a00fcd517d8df49cb341297ff62a
class:
recorded: 2026-08-12
source_comment: 5266797633
---
review-lane register append — from PR #396 (head `a872ddcf3399a00fcd517d8df49cb341297ff62a`)

Two rows, each labelled with its class per kogaki#374, because this ledger has
two producers and rule 3's three-of-a-class widening trigger reads
`out-of-dimension:` lines only.

---

**Row 1 — INSTANCE-CLASS carry (not countable toward rule 3).**

`policy/CAPABILITIES.md` is a SECOND kit-managed derived copy with the same
pending-silent-deletion property kogaki#285 was filed about, and it stays
uncovered after PR #396.

kogaki#285's "Out of scope, declared" section rests on the premise *"`install.sh`
copies exactly one skill file"*. That is true of **skill** files and false of the
class the premise was used to bound. `policy/kit/install.sh:80-86`:

```
CAP="$REPO/policy/CAPABILITIES.md"
if [[ ! -f "$CAP" ]] || grep -q 'tsurezure-client-kit:file' "$CAP"; then
  cp "$KIT_DIR/templates/CAPABILITIES.md" "$CAP"
```

Measured in the PR #396 worktree at that head:

- `policy/CAPABILITIES.md` carries the `tsurezure-client-kit:file` marker (1 match),
  so the `cp` fires **unconditionally** on every install — this is not a
  create-only seed like `consultation-map.md` (line 70) or `source.yaml` (line 92),
  both of which are guarded by `-f` and kept.
- `cmp policy/kit/templates/CAPABILITIES.md policy/CAPABILITIES.md` → identical
  today. So the pair is live, derived, refreshed-on-install and currently in
  agreement, which is exactly the state the skill pair was in immediately after
  PR #284 and immediately before nothing noticed it drift.

PR #396's assertion is deliberately named for the one pair rather than written as
a walk, per the issue's declared scope — that is correct against its license. The
row is here because the *ground* for the scope declaration is falsifiable and has
been falsified, and nothing else in the repository will notice.

Why this is a register row rather than a minted issue: filing through the typed
path (`story-sync file-issue`, policy pins at authoring) is not exercisable from
an unattended review turn without its own consult, and `gh issue list` was refused
in this session so the lane could not even establish whether a carrier already
exists. Recorded here so the instance survives the merge; whoever reads this
register owes the filing judgment, not this lane.

---

**Row 2 — ACCRETION-CLASS (countable toward rule 3).**

`client-kit-install`'s registry `efficacy` field still names only the kit's own
receipt-mode case (`policy/kit/test/install-test.sh::ok: receipt mode refuses …`)
now that the member holds an assertion of its own. The new assertion's
discrimination lives in a one-off manual exercise recorded in `efficacy_note`
prose, so nothing a retention read can resolve corresponds to it.
`check-registry-conformance` passes — the field is single-valued and its cited
case resolves — which is the point: the record has no shape for "this member holds
two assertions and here is the counterfactual for each", and the gap is invisible
to the check that exists to see admission-record completeness.

Class is accretion rather than instance: the value is how often a widened member
leaves its new assertion without a resolvable case, not this one occurrence.

---

Appended by the review lane per `.claude/skills/review-lane/SKILL.md` rule 1.
