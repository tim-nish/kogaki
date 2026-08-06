---
name: review-lane
description: Run the PR gate's judgment half. Use when reviewing a pull request or a branch about to become one — reports whether the diff matches what its licensing issue authorizes, and which policy/consultation-map boundaries the diff touched and whether a receipt covers them. Findings only; the lane raises no denial of its own.
---

# Review lane — the PR gate's judgment half

The gate is split by property type (`specs/SPEC.md:56-61`). The mechanical
half runs unconditionally in CI — the registry-driven suite
(`.github/workflows/checks.yml:14`) and the deny-never-warn license
assertion (`.github/workflows/checks.yml:51`). This lane is the other half:
**does the diff match its license; consultation-map boundaries touched.**

**This lane never denies.** Every output is a finding. The deny stays on the
mechanical side, where the property is computable. A finding that names a
scope violation **re-routes the work to an issue**
(`~/.claude/tools/story-sync file-issue`) — that re-route is the remedy, not
a refusal of the PR. If you find yourself writing a list of forbidden items,
stop: an enumerated denial is the accretion shape this design exists to
refuse (`specs/SPEC.md:65-71`).

## Two dimensions, and only two

Deliberately narrow. Anything outside these two is out of scope for the
lane and goes to the widening trigger below rather than into the findings.

### 1. Diff versus license

Read the licensing issue named by the PR (title, body, or commits — the same
`#N` the mechanical half asserts is present). Then read the diff. Report:

- **In scope** — the changed paths and behaviors the issue authorizes.
- **Out of scope** — changed paths or behaviors the issue does not
  authorize. Name the file and what it does, and quote the issue's own
  wording that fails to cover it. Do not infer authorization from adjacency
  or from "it was needed."
- **Unbuilt** — what the issue authorizes that the diff does not do. Stated
  because a partially discharged license is a judgment the reviewer owes,
  not a defect the lane decides.

Out-of-scope work re-routes: file the carved-out work as its own issue and
name it in the finding. The PR is not blocked by this lane.

**Deferred slots are this dimension's twin (kogaki#48).** Where the spec or
story names a `deferred-slot: <name>` the diff fills, check that the
licensing issue carries the fill-time decision record — choice,
alternatives, consult receipt — and that the diff matches it. A design
decision found ONLY in the implementation, with no record on the issue, is
a **finding whatever its quality**: the specimen is the review-sweep timer,
whose transport fork arrived at this lane entrenched and pre-argued, and
whose review evaluated the argument given rather than the fork not taken.
Review the decision where it was made, not where it landed — and treat an
UNNAMED deferral ("left to the implementation" with no slot token) as a
finding against the spec text itself.

### 2. Consultation-map boundaries touched

For each entry in `policy/consultation-map.md`, decide from the diff whether
the branch touched that boundary — the entry's **trigger terms** are the
read, and the entry routes to a judgment rather than carrying a verdict.
Report, per touched entry: the entry, what in the diff touched it, and
whether a receipt covers it.

**Receipts come from the mechanical half's own report, and from nowhere
else.** `checks/check-consult-receipts.sh:68-73` already emits

```
consultations this branch: N (receipt-verified, over <range>)
distinct pins: <repo>@<sha>, …
```

rendering zero as `distinct pins: none — no consultation receipt on this
branch`. Run that check (or read its CI output) and quote its lines. Do not
re-derive counts from `git log`, and **never** read gateway state — no
`~/.tsurezure/`, no access log, no state directory. Kogaki reads its own
receipts and never the mediating component's private state
(`specs/SPEC.md:77-84`; `policy/consultation-map.md` entry 2, whose own
origin miss is exactly this confusion).

**State absence explicitly.** A touched boundary with no covering receipt is
reported as an uncovered boundary, named, in the same discipline the receipt
check applies to a zero count — an absent consultation generates no event,
so making the absence observable is the whole remedy. Silence is never a
pass.

Coverage is a judgment: a receipt exists on the branch, and you say whether
its pin plausibly answers the boundary the diff touched. Say so when it does
not, and say `cannot determine` when you cannot.

## Output shape

Findings only, one section per dimension, each finding carrying its evidence
(a diff path, an issue quote, or a quoted line from the receipt report).
Close with the widening-trigger line below — including when it is empty.
No verdict, no score, no approve/reject.

## The named widening trigger

A deliberately narrow instrument owes a named trigger that widens or
escalates it, and the trigger **cannot live inside the instrument** —
per-item judgment cannot observe recurrence by construction:

> "A DELIBERATELY NARROW instrument owes a NAMED TRIGGER that widens or
> escalates it, because per-item judgment structurally cannot observe
> recurrence. … the escape trigger must be a DIFFERENT-UNIT observer."
> `consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/knowledge-architecture.md:36`
>
> — quoted here in its v1 form as it was emitted. A receipt written **now**
> carries the v2 continuation lines (`request_id`, `outcome`, one `query:`
> per framing) per `specs/SPEC.md` §4; the grammar is documented in
> `.claude/skills/consult-first/SKILL.md`. Both forms parse: line one is
> unchanged, which is what keeps every receipt already in git history valid.

So the lane does not widen itself, and no sitting of this lane may add a
third dimension. Instead:

1. **Record.** Anything the lane notices that does not type into the two
   dimensions is written as one `out-of-dimension:` line in the findings —
   the observation and the PR it came from — and posted as a comment on
   **kogaki#13**, this lane's own carrier. That issue is the register; the
   lane only ever appends to it.
2. **The reading act is different-unit.** The repo's issue-triage sitting
   reads kogaki#13's register, because it spans issues while this lane spans
   one PR. A trigger bound to an artifact still owes the named recurring act
   that reads it, which is why the reading act is named here rather than
   left to the artifact's existence.
3. **Widening fires at three of a class.** Three `out-of-dimension:`
   observations of the same class on kogaki#13 widen the lane by a third
   dimension — filed as its own story through `story-sync file-issue`, never
   edited into this file during a review sitting. Three is the recurrence
   threshold the served line names ("the class visible only at
   three-in-a-row"), and one is chosen rather than left implicit so the
   trigger is falsifiable.
4. **Escalation is immediate and typed.** One observation is enough when the
   missed property is **mechanical** — it routes to the merge carrier (a
   registered check with its admission record), not here. A missed
   **judgment** property improves this file's **inputs**: which served lines
   the lane quotes at its gate. Neither path ever produces a new enumerated
   denial (`specs/SPEC.md:65-71`).

## Why this lane carries no registry entry

`checks/registry.json` governs the **mechanical** suite: registered checks
run unconditionally and their failures deny. Admitting a judgment act there
would put a human judgment behind the registry's mechanical-check contract
and give this lane a deny it must not have. The lane is a harness skill and
is invoked at review, in the same shape as `.claude/skills/consult-first/`.

## Isolation — a requirement, not a courtesy (kogaki#34, story 1.12)

**This lane runs in a session that did not author the work under review.**

The ground is not preference. An authoring session cannot review its own work
for the class of defect that consists of **not having applied what it already
held** — and this repository has the specimen. PR #31 shipped a coined
outcome-token set while the ratified vocabulary sat unused in the authoring
session's own context; one pass from a non-authoring session caught it
(kogaki#32). The served position is `isolation-checks-are-control-arms`: some
checks work precisely because they know less, so giving them more context is
contamination rather than improvement.

**And it is advice, not enforcement — stated plainly because the alternative
is believing otherwise.** Session identity appears in neither git nor GitHub
metadata: on PR #43 the PR author, every commit author and the comment author
are one login. `checks/check-review-report.sh` therefore asserts that a report
*exists*, never that its author was independent. A rule whose only carrier is
a document someone must read is advice
(`a-rule-reproduces-only-through-a-default-carrier`), and this section is that
document. Its removal signal is recorded with the check: a carrier that makes
independence observable.

## The report's shape

A report is a **pull-request comment** whose first line is a fixed token at a
fixed position, and which **declares its scope and its completeness** on two
further fixed lines (`specs/SPEC.md` §4 clauses 5 and 6):

```
review-lane report: <head sha>
review-scope: <full|delta>
finding: <blocking|should|nit> <open|resolved> [policy: <pin> | harm: <one line>]  <the finding>
…
report-complete: <N> findings
```

- **A PR comment, not a commit or a file on the branch** — deliberately. The
  reviewer must not author the branch, and committing to it would make them a
  contributor to the very work under review.
- **The head sha is part of the report, not a courtesy.** A report reviewed
  the code it names; a later push is unreviewed, and the check reports a
  report naming an older head as **stale** rather than counting it.
- **The declarations are separate adjacent lines, and the report token is
  never widened.** `review-lane report: <sha> delta` is *not* the grammar.
  That form was exercised through `tools/review-sweep.sh`'s embedded fixture
  pass before this was written: with the token's regex not widened in
  lockstep, a declared report segmented to **nothing** and read as *absent*.
  The regex lives in two files; the adjacent form is the one whose failure
  mode does not exist. Same use-vs-mention class kogaki#41 fixed once.
- The check reads **only** these declared lines. What the findings say is
  judgment and stays here.

### `review-scope:` — what the report attests to (§4 clause 5, kogaki#70)

`full` reviewed the whole diff. `delta` reviewed the previous round's findings
× the fix commits: each finding checked resolved, and only the diff the fix
introduced re-read.

- **A round-2 review is `delta` by default.** That is the right economics — the
  measured rally (PR #67) spent 43 of its 92 turns re-deriving round 1's own
  observations: the PR view, the issue view, the full diff, the registry diff,
  the receipts check, all again.
- **`delta` is a default, never a ceiling.** If the fix touched files **outside
  the ones round 1's findings named**, escalate to `full` for the diff and
  declare `full`. New code nobody has reviewed is not covered by a report about
  old findings.
- **Round 2 reads round 1's report as its input.** The round-1 report is
  segment-bound to its head and is on the PR; read it rather than
  reconstructing its observations from the PR from scratch. That reconstruction
  is the cost clause 5 exists to stop paying.
- **Omitting the line declares `full`.** The default is the compatibility
  direction — every report already in this repository's history is a full
  review — so *never* omit it to mean "I did not decide". Write the one you
  performed.
- **Nothing verifies your declaration, and that is stated rather than hidden.**
  A reviewer that declares `delta` and reads nothing is indistinguishable at
  the gate from one that read the fix commits. Clause 5 is deliberately
  carrier-less with a named reopen trigger — one PR whose round-2 report
  declared `delta` and missed a defect lying inside the fix commits it claimed
  to cover. The honesty of the declaration is yours to supply.

### `report-complete:` — and a fragment counts as nothing (§4 clause 6, kogaki#74)

End the report with `report-complete: <N> findings`, where **N is exactly the
number of `finding:` lines above it**. The merge check counts your segment
**only** when that line is present and the count matches.

- **A partial report turns nothing green.** A split report holds the gate red
  until its last part lands.
- **The specimen is a merge that should not have happened.** On PR #71 the
  reviewer was denied the grants that let it post in one act, so it split its
  report: the first part — resolving the previous round — landed at 15:50:40,
  the re-check fired, armed auto-merge completed at 15:51:09, and the
  **complete** report carrying a new open blocking finding arrived at 15:53:37
  on an already-merged PR. Nothing distinguished a complete report from the
  first fragment of one, so the gate read a fragment as the verdict.
- **Write the terminal line last, and write it once.** The first
  `report-complete:` in a segment is the one that counts, and any `finding:`
  line written after it still counts toward N — so a report that keeps writing
  past its own terminal token fails count equality and is read as a fragment.
- **An absent line is read as complete.** The token binds reports written after
  it ships; voiding this repository's history would empty the gate rather than
  tighten it. That is compatibility, not permission to omit it.
- **Both lines are anchored whole.** Mentioning `report-complete:` inside a
  finding's prose declares nothing — it is a mention, not a declaration.

## The postmortem hand-off (kogaki#24 shape)

When a finding is one a consultation would have prevented, the lane's closing
section emits a **map-entry candidate** in the consultation map's postmortem
shape — the violating artifact, the trigger terms that would have fired, and
the question **verbatim** that would have found the served line.

**Proposal only.** The lane writes no entry to `policy/consultation-map.md`.
Admission is a human act, per the founding two-layer split: what is mechanized
is the *proposal*, never the judgment. A candidate whose question was
composed at the filing rather than actually run says so, in the question's own
prose — the map's provenance rule, which applies to a candidate exactly as it
applies to an entry.

## The typed findings record (kogaki#34 clause 1)

Findings are emitted as declared fields, one line each, in the same PR comment
as the report:

```
finding: <blocking|should|nit> <open|resolved> [policy: <pin> | harm: <one line>]  <the finding>
```

The `[policy:|harm:]` justification is REQUIRED for a `blocking` to gate
(kogaki#72) and carried on no other severity.

- **The merge check reads the two fields and never the prose.** Whether a
  finding *is* blocking is your judgment; whether the PR *contains* an open
  blocking one is a fact over the record. That is the two-layer split's own
  test, not an exception to it.
- **`blocking` gates; `should` and `nit` do not.** Marking something blocking
  is a decision to stop a merge — make it deliberately.
- Prose describing a finding as blocking, without the field, does **not**
  gate. The field is the record; the prose is for the reader.

**Blocking is a budget, not a severity feeling (kogaki#72, owner ruling
2026-08-06).** This lane is a policy check and a critical-issue filter, not a
perfection machine: the single-pass merge is the norm, a second loop is
exceptional, and a park is a measured pipeline defect against a ~1-in-100
budget. Exactly three classes may block, and nothing else:

1. the merge would **violate or propagate a ratified position** where
   post-merge repair is costly — a spec clause consumers are born on, a
   served-vocabulary divergence, a security boundary, gate integrity
   (`[policy: <pin>]` names the position);
2. the diff **breaks the pipeline's own checks** (`[harm: …]` names the
   breakage);
3. **unlicensed scope** — work no named issue authorizes.

Everything else — quality, design preference, latent contradictions, missing
niceties, one-token conformance gaps whose omission harms nobody before a
follow-up lands — is `should` or `nit`, non-gating, with a follow-up filed
where one is owed. An unjustified `blocking` does not gate: the merge check
downgrades it to `should` by name, failing toward merge. **If you are unsure
whether a finding is blocking, it is not.** Where the total blocking remedy is
mechanical and tiny, say so in the finding ("remedy: one token") so the fix
round is as small as the defect.

**The gate this feeds is carrier-less on one half, and you should know it:**
an empty findings record passes. Nothing distinguishes a thorough review that
found nothing from one that looked at nothing, because the check rests on this
lane's own self-report. That is marked in `specs/SPEC.md` §4 with its reopen
trigger rather than left implied — but it means the honesty of an empty record
is yours to supply, not the gate's to verify.

## The rally — converged or escalated (kogaki#34 clauses 2–4)

A report that lands findings and is never answered leaves the PR reviewed and
unimproved, so the property is **converged or escalated**, not reviewed-once.

- **Never push to the branch.** Corrections are comments or instructions; the
  author applies them. A reviewer that authors a fix stops being a control
  arm — and round two would have no isolated reviewer left.
- **At most two rounds.** A disagreement that survives them is a **parked
  owner decision**, never a third round.
- **Every round leaves its record** — report, correction instruction, round
  count — so a finding that took two rounds to land becomes evidence about the
  map or about author-side prescriptions, harvested without anyone
  remembering to.

## How a review opens, and what it may ask the seam

- **Fixed first move: an unscoped tier-1 `gloss_index` survey.** Where to look
  is an *output* of the survey, not a heading you supply — a scoped query can
  only return lines about something you already thought to name.
- **The seam is never asked for a verdict.** The review supplies the claims;
  the seam supplies the positions. Asking it to judge would make a live answer
  authoritative and unpinnable, which the seam's own contract refuses.

## What fires this lane (kogaki#34 item 2, story 1.13; re-sited by kogaki#47)

**An event, never a timer.** The project hook
(`.claude/hooks/review-trigger.py`, wired in `.claude/settings.json`) fires
at `gh pr create` and `git push` — the acts that change the review
substrate — and invokes `tools/review-sweep.sh` in single-target mode,
detached, so the authoring session never waits and review starts within
seconds of the PR existing. The timer this section originally recommended
is **rejected** (owner ruling 2026-08-05: a forced wait is an incorrect
design however internally consistent; a trigger binds to an act that
already happens, never a periodic reader). The full sweep survives as
manual reconciliation only. After a report lands,
`.github/workflows/review-recheck.yml` re-fires the failed checks run
mechanically — a landed report leaves the PR green without human touch.

**Run where the seam is** — not a GitHub Action, and the reason is not
preference:

- the repository holds **no Actions secret**, so no CI-hosted agent can
  authenticate;
- the gateway's location is **machine-local configuration and "never a
  committed path"** (kogaki#9), so a runner cannot be given one;
- and §4 makes an **unscoped tier-1 survey the review's fixed opening move**,
  which a reviewer that cannot reach the seam fails on *every* run.

An Actions-hosted lane would therefore be structurally degraded rather than
occasionally so. **A spawned session satisfies the isolation requirement by
construction** — a fresh reviewer holds none of the author's context — which
is what makes the mechanical trigger the right carrier rather than a
convenient one.

**The sweep's state machine**, which is also where clauses 3 and 4 live:

| state | when | what happens |
|---|---|---|
| `spawn-round-N` | no report for the current head, rounds remain | a fresh session reviews |
| `author-owes` | a current-head report carries open blocking findings | nothing spawns — the ball is with the author, and re-reviewing unchanged code is not a round |
| `park` | two rounds spent, head still unreviewed | **an owner decision, never a third round** (§4 clause 3) |
| `done` | current-head report, nothing blocking open | — |

Rounds are counted from the report segments themselves, so **every round
leaves its record** without a separate ledger (§4 clause 4).

**A fragment is not a report for any of these states** (§4 clause 6). A segment
whose `report-complete:` count does not match its own finding lines produces
neither `done` nor `author-owes`: the head is simply unreviewed, and the sweep
says so by name rather than reporting "no report" for a report that plainly
arrived. The round it spent is still counted as spent — the cost was paid
whether or not the artifact arrived whole — so a reviewer that fragments twice
parks the PR. Its own open blocking findings still gate, because a fragment
turns nothing *green* and incompleteness must never be a way to hide one.

**Two honest limits, stated rather than discovered:**

- **The hook binds sessions that load this project's settings.** A PR
  created outside a hooked session (another machine, a bare terminal)
  spawns nothing — the manual sweep is the reconciliation for those, and
  the presence check is the loud backstop either way: an unreviewed PR
  cannot merge, which converts a missed trigger into a visible red check
  rather than a silent gap.
- **The spawned session's permissions are machine policy.** `claude -p
  "/review-lane <n>"` posts its report through `gh`; a machine whose
  permission config blocks that will show the spawn in
  `~/.kogaki/review-trigger.log` and a PR that stays report-less — same
  backstop, same visibility.

Spawning is **opt-in** (`--spawn`, which the hook passes); `--dry-run` is
the default for manual invocations, because spawning a session is an
outward act rather than a flag someone forgets is on.
