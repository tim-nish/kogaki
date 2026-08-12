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

**Fixture discrimination is this dimension's other twin (kogaki#230).** Where
the diff **adds or changes a fixture**, check that the PR record carries its
**mutation evidence** — the mutation table, naming each mutation and which
fixtures fail it. `specs/SPEC.md` §4 carries the obligation; this reads for it.

**Presence, not truth, and never a gate.** Read that the table is there and
that each new or changed fixture appears in it. Whether a mutation was the
*right* one, and whether the table is honest, is judgment and stays yours — a
finding, at the kogaki#72 budget's severity, never a deny. Nothing here turns
a merge red.

The specimen is kogaki#209: three of kogaki#203's four regression fixtures
passed **with the defect present**, behind a green `38/38` line claiming
protection that did not exist. A fixture whose only demonstrated failure mode
is total absence of the code has not been shown to discriminate, and a diff
that adds one is adding a coverage claim rather than coverage.

**Why this lands here as well as in the spec, rather than only here:** a skill
binds only the sittings that invoke it, and an **authoring** sitting never
invokes this one. The spec is what binds the author; this is what makes the
absence visible.

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
whether a receipt covers it — **on the declared `boundary:` line shape**
below (kogaki#258), never in prose. A record emitted as prose is read once by
a human and is then gone, and this is the one place in the repository where a
**per-boundary** touched-and-uncovered judgment exists at all.

**Receipts come from the mechanical half's own report, and from nowhere
else.** `checks/check-consult-receipts.sh:68-73` already emits

```
consultations this branch: N (receipt-verified, over <range>)
distinct pins: <repo>@<sha>, …
```

rendering zero as `distinct pins: none — no consultation receipt on this
branch`. **Read those lines out of CI's run log** where a completed run exists
for the head, and run the check locally only where one does not — the ordering
is fixed below under *What a review reads*, not a free choice. Quote the lines
whichever source produced them. Do not
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
   **kogaki#246**, this lane's **register**.
   **The register has a SECOND producer, and its rows read differently**
   (kogaki#374). A spent-bound latent non-gating in-diff carry lands there too,
   and it is **instance-class**: its value is the defect it names, not a count.
   An `out-of-dimension:` line is the opposite — accretion-class, valuable as a
   count. Both live in one ledger, so **say which a row is when appending**:
   rule 3's three-of-a-class trigger reads over `out-of-dimension:` lines only,
   and a spent-bound carry must not be counted toward a widening it says
   nothing about. The lane only ever appends to
   it. **The register is a ledger, not a deliverable**: it has no definition
   of done, it is never completed, and it ends only by supersession or by
   this lane's retirement.
2. **The reading act is different-unit, and it binds by name.** The repo's
   issue-triage sitting reads the register at **kogaki#246**, because it
   spans issues while this lane spans one PR. A trigger bound to an artifact
   still owes the named recurring act that reads it, which is why the
   reading act is named here rather than left to the artifact's existence.
   **The reader binds by that declared identity and never by enumerating
   open issues**, and the liveness half is part of the reading act: **a
   CLOSED register met by the reader is itself a finding, never a skip.**
   A reader that enumerates open issues loses the ledger exactly when its
   writers most need it read.
3. **Widening fires at three of a class.** Three `out-of-dimension:`
   observations of the same class on kogaki#246 — **that row kind only, never a
   spent-bound carry** (rule 1) — widen the lane by a third dimension — filed as its own story through `story-sync file-issue`, never
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
5. **The register's lifecycle, and where it is enforced.** kogaki#246 is
   **open while this lane exists**; its being open asserts no pending
   deliverable. **Closing it REQUIRES a successor pointer in the closing
   comment** — a close naming no successor is a defect, not a completion —
   and **an append to a closed register is refused**, redirecting to that
   successor. Both halves are **declared here and enforced nowhere in this
   repository**: the typed append act and the cleanup lane's ledger
   exemption are actor-wide claude-toolkit components, held at
   `instrument: cross-repo(tim-nish/claude-toolkit#279)`. Until that lands
   these two clauses are advisory, and this file says so rather than reading
   as covered — a rule requiring someone to remember it is advisory, and its
   apparent coverage is an enumeration of the places somebody happened to
   act.

> **Why the register has its own carrier** (kogaki#191). It used to share
> kogaki#13 with a finite deliverable — "the judgment half gets its carrier",
> shipped 2026-08-05. That deliverable's close was CORRECT and applied a
> deliverable's terminal state to a ledger sharing its carrier: 40 appends
> were then written to a closed register, and the reader above — which then
> enumerated open issues — stopped seeing it, producing a 21-unread pile-up
> with nobody erring. kogaki#13 remains the **deliverable** record and is not
> this lane's register.

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
fixed position, and which **declares its base, its scope and its completeness**
on three further fixed lines (`specs/SPEC.md` §4 clauses 5, 6 and 7), its
**boundary-vs-receipt record** on a `boundary:` line per touched entry
(kogaki#258), and the **disposition** of a non-gating finding it leaves open on
a `carried:` / `declined:` line adjacent to that finding (§4 clause 8):

```
review-lane report: <head sha>
review-base: <base sha>
review-scope: <full|delta>
boundary: <entry N> <covered|uncovered|cannot-determine> [receipt: <pin>]  <what in the diff touched it>
boundary: none  <why no map entry was touched>
finding: <blocking|should|nit> <open|resolved> [policy: <pin> | harm: <one line>]  <the finding>
carried: #<N> | register
declined: <reason>
…
cannot-determine: <dimension> — <why>
report-complete: <N> findings
```

- **A PR comment, not a commit or a file on the branch** — deliberately. The
  reviewer must not author the branch, and committing to it would make them a
  contributor to the very work under review.
- **The head sha is part of the report, not a courtesy.** A report reviewed
  the code it names; a later push is unreviewed, and the check reports a
  report naming an older head as **stale** rather than counting it.
- **READ THE SHA AS A VALUE. NEVER RECONSTRUCT ONE (kogaki#91).** The sha you
  write comes from one read — `gh pr view <n> --json headRefOid` — copied
  whole. Do **not** assemble a full sha from a short prefix you saw in `git
  log --oneline`, a CI line, an earlier comment, or your own previous report,
  and do not extend a 7- or 12-char prefix to 40 characters by any means. On
  PR #67 a reviewer took the real prefix `5586353629bb` and invented the tail,
  posting `5586353629bb0995463037856b76dc59721ce3a0` — **a sha that does not
  exist**. It shares twelve characters with the true head
  `5586353629bbd35af93f1032349af113774871ba`, which is exactly why nothing
  about it looked wrong.

  A shorter sha is always safe and an invented one never is: if you hold only
  a prefix, **write the prefix**. The grammar accepts 7–40 characters and the
  matcher compares prefixes either way, so a 12-char report is counted
  identically to a 40-char one. Padding buys nothing and risks everything.

  **Verify before you post.** `git cat-file -e <sha>^{commit}` in your
  worktree must succeed for the sha you are about to write. If it does not,
  the report is unfounded — a claim computed over a commit that does not
  exist — and it must be repaired at composition rather than posted and
  refused downstream:

  > A mechanism must ESTABLISH ITS SUBSTRATE before reporting a result over
  > it … The failing version is not wrong but **unfounded**, and presents as a
  > normal result because nothing distinguishes "computed over nothing" from
  > "computed and found nothing."

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:183`

  And do not re-post to correct it. A refused report followed by a corrected
  one leaves **two** segments on the PR, which is the round-count inflation
  half of the same defect — `tools/review-sweep.sh` now discounts the
  unresolvable segment, but the cheap fix is not to create it.
- **The declarations are separate adjacent lines, and the report token is
  never widened.** `review-lane report: <sha> delta` is *not* the grammar.
  That form was exercised through `tools/review-sweep.sh`'s embedded fixture
  pass before this was written: with the token's regex not widened in
  lockstep, a declared report segmented to **nothing** and read as *absent*.
  The regex lives in two files; the adjacent form is the one whose failure
  mode does not exist. Same use-vs-mention class kogaki#41 fixed once.
- The check reads **only** these declared lines. What the findings say is
  judgment and stays here. `carried:` / `declined:` are read by neither the
  merge check nor the sweep's state machine as a gate — clause 8 declares
  `checks/check-review-report.sh` untouched — and `boundary:` is parsed and
  printed there but never gated.

### `boundary:` — the per-entry boundary-vs-receipt record (kogaki#258)

Dimension 2's three prescribed facts, one line per **touched** map entry, on
the same adjacent-line pattern clauses 5, 6 and 7 use:

```
boundary: <entry N> <covered|uncovered|cannot-determine> [receipt: <pin>]  <what in the diff touched it>
```

- **`<entry N>` is the map's own heading number** — `1`, `2`, `3` — and the
  prose half **names the entry's title as well**, so a renumbering of
  `policy/consultation-map.md` is visible in the record instead of silently
  re-pointing it at a different boundary.
- **The verdict token is typed and is the whole of the machine-read judgment.**
  `covered` — a receipt on this branch plausibly answers this boundary.
  `uncovered` — the boundary was touched and no receipt covers it.
  `cannot-determine` — you could not decide, which the prose says why.
- **`[receipt: <pin>]` is REQUIRED for `covered`, and a `covered` without one
  is read as `cannot-determine`.** A coverage claim naming no receipt is not
  falsifiable, and the downgrade fails toward the honest side: an unnamed
  receipt becomes "I could not establish it" rather than "there is one." This
  is kogaki#72's unjustified-`blocking` downgrade one field over.
- **Untouched entries produce no line, and a diff that touched none declares
  `boundary: none`.** The zero is written rather than left to silence, in the
  same discipline `check-consult-receipts.sh` renders `distinct pins: none`:
  an **absent** record and a **declared-empty** record are different facts, and
  only the second says the lane looked. A report carrying neither is
  **undeclared** — that is what story 1.41's AC1a exists to say out loud.
- **Every line is kept, not the first.** Several boundaries can be touched, and
  a first-declaration-wins rule here would silently drop the second and third —
  the same reasoning `cannot-determine:` already carries.
- **Anchored whole.** `boundary:` inside a finding's prose is a mention and
  declares nothing (the use-vs-mention rule kogaki#41 fixed once).
- **Reported, never gated.** `checks/check-review-report.sh` parses these lines
  and prints them; it is not a finding, does not count toward
  `report-complete:`, and never turns the gate red. Whether the *judgment* was
  right stays here — the parse establishes only that a record exists and what
  it says.

**Why a declared shape rather than better prose.** The property is an
obligation, and an obligation is violated by an absence:

> a prohibition needs a mechanical gate at the tool boundary … an obligation
> cannot be gated at all and **needs its absence made visible**

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:95`
(`carry-a-rule-at-its-violation-layer`)

A token whose absence is greppable is that visibility; free prose is not, and
"a consultation reported in whatever phrasing the sitting reaches for is prose
that sometimes mentions a consultation and is invisible to any audit looking
for one" is the same class one surface over.

**Who reads it.** The merge check prints it today. **Story 1.41** (kogaki#262)
mines it: an `uncovered` row naming no existing map entry proposes the
consultation occasion that was missing — the half the map's miss loop
structurally cannot see, because a consultation that never happened leaves no
receipt to harvest. That story's AC1 was unimplementable while this record was
prose; this shape is its precondition and nothing more of it is built here.

### `review-base:` — the base you actually diffed against (§4 clause 7, kogaki#96)

Write the commit your review was diffed against, from one read —
`gh pr view <n> --json baseRefOid` — copied whole. **The same
read-the-sha-as-a-value rule the head carries applies here** (kogaki#91): a
base sha assembled from a prefix is the invented-sha defect one field over, and
a short prefix is always safe where an invented tail never is.

- **This is what lets your report survive a rebase that changed nothing.** The
  head sha is the *instrument*; the content you reviewed is the *subject*. When
  the pipeline's own mandated post-squash rebase produces a new head, the merge
  check recomputes both diffs and carries your report forward if they are
  byte-identical — but only if it can tell which base yours was taken against.
  On PR #89 it could not, and the only exit was an owner `--admin` merge.
- **A base MOVE is not by itself a refusal.** A base that moved and left the
  diff byte-identical still carries forward; that is the subject/instrument rule
  working, not a leak. What the recorded base buys is the *visibility* to tell
  the two cases apart at all.
- **Omitting the line means NO RECORDED BASE — never a default.** Such a report
  falls back to the merge-base at your head, which is transitional and fails
  toward the reviewed side: where the derived base is not the one you used, the
  diffs differ and the report reads `stale`. Write the line.
- **First declaration wins, and a second is simply ignored** — the same rule
  `review-scope:` and `report-complete:` already follow. A duplicate does not
  invalidate the report, but write it once anyway.

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

### `cannot-determine:` — a refusal is terminal, and the blocked dimension is reported (§4's third conduct clause, kogaki#100)

**When a command you compose is refused, that command is over.** Do not rephrase
it, pipe it, redirect it, or look for a form that gets through. Write the
dimension you could not cover as `cannot-determine: <dimension> — <why>` and
**finish the review**.

- **This is enforced, not requested.** The spawn installs a `PreToolUse` gate:
  once a command is denied, every rephrasing of it is refused by the gate
  itself, and the refusal message points you back here. The prose in your
  composition constraint is **ergonomics**; the gate is the control. On PR #98
  a reviewer with that prose in its context spent its **last four turns**
  rephrasing one refused command and posted no report at all.
- **A refused capability costs ONE dimension, not the report.** That is the
  whole point of the line: a review missing the CI dimension is worth far more
  than no review.
- **It is REPORTED and never gated.** A `cannot-determine:` line is not a
  finding, does not count toward `report-complete:`, and never turns the gate
  red. Whether a blocked dimension should have been obtained is judgment — the
  same side of the split `review-scope:` sits on.
- **Name the dimension, not the command.** "CI status — `gh run view` is not
  granted" tells the operator what is missing from the review *and* what grant
  would fix it. "could not run a command" tells them neither.
- **Terminal is about the COMMAND, not about your intent.** A denial often names
  one offending sub-part of a compound command, and a granted alternative may
  well exist — your composition constraint names one per refused shape. Reach
  for the *named alternative*; do not go hunting for a form that slips through.

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
- **All three lines are anchored whole.** Mentioning `report-complete:`,
  `review-scope:` or `review-base:` inside a finding's prose declares nothing —
  it is a mention, not a declaration.

### `carried:` / `declined:` — the disposition of a non-gating finding (§4 clause 8, kogaki#224)

A `should` or `nit` you leave **open** at `done` carries a stated disposition
on the line immediately after it. These are the lines you type:

```
finding: should open  <the finding>
carried: #<N> | register            — a named carrier
declined: <reason>                  — an explicit decline, reason required
```

- **`carried: register` names kogaki#246**, this lane's register — the carrier
  kogaki#191 split out. kogaki#13 is the lane's *deliverable* record and is not
  its register, so a disposition routed there routes to a retired carrier.
- **The register is an admissible carrier and this clause mints no issue per
  nit.** It is the right home for an accretion-class finding — a mechanical
  observation whose value is the count rather than the instance, the class the
  `out-of-dimension:` line already routes there.
- **Which carrier a disposition names is decided by where the defect lives**,
  never by severity: in the diff's own text → resolve it in the review;
  downstream work the diff merely licenses → its own carrier.
- **At a spent bound, a LATENT NON-GATING in-diff finding defaults to
  `carried: register`** (kogaki#374, owner approval 2026-08-12; SPEC §4
  clause 8 carries the rule and this line cites it). With no round left, "resolve it in the review" cannot be
  done — so an in-diff finding nothing can currently reach lands in the register
  rather than minting an issue or a successor, each of which costs at least two
  further review rounds. Minting one anyway needs **stated reachability** — the
  inputs or served state under which the finding fires — or an explicit owner
  promotion, written into the disposition's reason. It is a claim you make and a
  reader can argue with; nothing checks it.
  **One cell moves.** A *reachable* finding at a spent bound still takes the
  successor lane; an in-diff finding *inside* the bound is still resolved in the
  review; a finding still **gating at the merge layer**, and the two-round
  bound, are untouched. Read "gating" at the merge layer rather than off the
  token: a `blocking open` downgraded to `should` for want of a justification is
  non-gating by clause 8's own membership rule, so a latent in-diff one *is* in
  scope. And a latent finding is not a wrong finding — the floor changes where
  an unreachable defect waits, never whether it is recorded.
- **Presence is read, adequacy never is.** `declined: not worth it` satisfies
  the clause. It is a record somebody can argue with, which is what five
  findings living only in a comment nobody re-reads were not.
- Where the sweep reaches `done`, it lists every open non-gating finding on the
  current head that carries **no** disposition line. It exits 0 and turns
  nothing red.

**This is a POINTER, not a second copy of the clause — and the precedence is
declared.** The grammar block above is reproduced here because it is the
literal text a reviewer types and cannot compose from a description. The
**five sub-rules that govern it** — binding to the immediately preceding
`finding:` line, first-declaration-wins, anchored-whole, the required non-empty
reason, and a disposition on a `resolved` finding being unread — are **at
`specs/SPEC.md` §4 clause 8 and are deliberately not restated here.** **On any
divergence between this section and clause 8, clause 8 wins**, and this section
is repaired.

The declaration is not ceremony. A local restatement of a governing record is a
conformance copy, and the served position states the condition on which one is
admissible at all:

> A tool's config may hold copies of facts whose authority lives elsewhere only
> under a declared precedence rule (which side wins on mismatch) plus a
> mechanical mismatch check; a copy with declared, checkable subordination is
> conformance — **a copy without one is a second authority growing in the
> dark.**

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:122`
(`conformance-copy-needs-declared-precedence`)

> the re-expression must happen once at the source and be ratified there,
> because **a reader who restates the record locally serves a rendering nobody
> approved and the error hides behind an exact quotation**

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:91`
(`a-derived-view-inherits-its-substrates-register`)

**The mismatch check is the half this section does NOT have, and it is marked
rather than implied.** Nothing mechanically compares this grammar block against
clause 8's, so the second condition of the served rule is unmet and the
precedence declaration above is carrying the whole weight. That is stated here
so the gap is a known one rather than an assumption; the reopen trigger is one
divergence between the two blocks reaching a reviewer.

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

## What a review reads, and what it refuses to re-derive (kogaki#70, story 1.18)

A review's turns are for judgment. Every turn spent re-deriving a fact the
repository has already produced is a turn the two dimensions did not get, and
the cost is measured rather than supposed: on PR #67 round 1 ran
`check-consult-receipts.sh` twice, and round 2 ran the **entire registered
suite in a for-loop** plus individual checks — while that same suite had
already run in CI against the same head.

**Read CI; do not re-run it.** Where a completed CI run exists for the PR's
current head and you need a registered check's result, read that run and do not
run the check locally. `Bash(gh pr checks:*)` and `Bash(gh run:*)` are both
granted (kogaki#65) precisely so this is the cheap path. Where CI has **not**
completed for the current head, running the check locally is permitted — and
where the wait is bounded, waiting for CI is preferred over duplicating it,
because a local pass on a machine CI has not yet judged is not the fact the
gate will use.

**Both reads are needed, and the split is measured, not reasoned.** Run
`31029590605` (PR #89, head `5faedf3`) is this repository's partially-red
specimen — the registry-driven suite red, the license assertion green — and it
was read both ways:

| command | what it discriminates |
|---|---|
| `gh pr checks <n>` | **jobs only.** Two rows: `Run every registered check (registry-driven) fail`, `Change licensed by a named issue (deny-never-warn) pass`. Nine registered checks ran inside that one red job and it names none of them. |
| `gh run view <id> --log-failed` | **members.** Each check's own `== <id>` marker and its `ok:` / `FAIL:` lines with the failure text verbatim, and a terminal roll-up `FAIL: boundary-receipts, review-report` naming exactly which members failed. |

So **criterion: the run log, not the summary.** `gh pr checks` tells you the
suite is red; only the run log tells you *which* check is red, and only the run
log carries the receipt report's own lines this lane is required to quote.
Reading the summary alone and calling a red suite a red dimension-2 is the
error this section exists to stop — every other member may be green.

### The tools you actually have (kogaki#310, 2026-08-09)

Stated because a reviewer that guesses wrong here **loses its whole round** —
the failure is not a warning, it is a session that exits with no report while
its owner grant and one of §4 clause 3's two rounds are already spent.

| you have | notes |
|---|---|
| `Read`, `Grep`, `Glob` | `Grep` is the bounded search over repository files |
| `Write` **and `Edit`** | `Edit` was ungranted until 2026-08-09 and its absence killed PR #313's round 1; it is granted now |
| **shell `grep`** | **SOMETIMES.** Simple patterns run; a regex carrying an alternation or a quantifier may be refused. Never rely on it — see below |
| `gh pr view/diff/checks/list`, `gh issue view`, `gh {pr,issue} comment`, `gh run` | the `:*` forms |
| `git log`, `git diff`, `git show` | reads only |
| `bash checks/<file>` | per registered check |
| the `mcp__tsurezure__*` seam tools | the consultation surface |

**Shell `grep` is UNRELIABLE, and that is measured rather than assumed — do
not plan a turn around it.** Two runs wrote two confident claims here and both
were falsified; this is the third and it is deliberately weaker, because what
the measurements support is weaker.

| probe (same allowlist, fresh session, no gate installed) | result |
|---|---|
| `grep -n 'h2' cm.md` | **ran** |
| `grep -n '#' cm.md` | **ran** |
| `grep -c beta sample.txt` | **ran** |
| `<granted command> \| grep -c .` | **ran** |
| `grep -nE '^#{1,3} \|text' cm.md` | **REFUSED** |
| `grep -nE '^t{1,3} \|text' cm.md` | **REFUSED** |

So a leading `grep` with a **simple pattern** is admitted and one carrying an
**`-E` regex with an alternation and a quantifier** is refused, under an
identical allowlist. **The `#` is not the discriminator** — the last row
contains none. A `grep` **downstream of a granted command in a pipe** ran in
every case observed.

**What is NOT the cause, ruled out rather than assumed:**

- **Not the missing `Bash(grep…)` member.** kogaki#310 was filed on that
  premise and four probes falsified it — simple `grep` runs without any member.
- **Not the terminal-key gate.** Its store is **per-spawn**
  (`log_path + ".denials.json"`), so it starts empty at every round; and the
  refusals above reproduce in sessions with **no gate installed at all**. A
  2026-08-09 reviewer ran `grep -n '…'` successfully and was refused
  `grep -nE '…'` *in the same session*, which no session-scoped terminal state
  can explain.

**What the cause IS remains `cannot-determine` from inside a review**, and is
recorded as such rather than guessed: the rule lives in the harness's own
command parser, which this repository cannot read. kogaki#324 carries it.

**The terminal-key caveat, stated at the width the gate actually implements.**
The sweep installs a `PreToolUse` gate that makes a refused command key
terminal, and the key is the command's **first three words**
(`terminal_key()`): a refused `grep -c beta` is terminal under
`Bash(grep -c beta)`, so a later `grep -n foo file` keys `Bash(grep -n foo)`
and is **not** matched. **Only a later `grep` sharing its first three words is
refused** — the wider reading (the leading word alone) is the shape that gate
was explicitly built to refuse, because it would make a granted `git log`
terminal off a denied `git fetch`.

**If your `grep` is refused, do not retry a variant sharing its first three
words.** That is the retry the terminal key absorbs — and it is the only retry
this section can tell you cannot succeed. **A differently-keyed retry is not
covered by that argument**: the table above shows `grep -n '<simple>'` running
where `grep -nE '<regex>'` was refused, so a reviewer refused the second may
well be admitted for the first, and this section rules out the terminal key as
the cause of those refusals anyway. Two grounds, two scopes, kept apart on
purpose — conflating them is how the previous two versions of this paragraph
came to over-claim in opposite directions.

**The practical advice is unchanged and does not depend on which ground
applies:** use the `Grep` tool — granted, bounded and reliable — and if the
search genuinely cannot be expressed there, record a `cannot-determine:` line
rather than spending the round hunting a shape the parser will accept.

**What you do NOT have, and must not spend a turn discovering:** removing files
(`rm`) — including inside your own worktree, which the sweep tears down for you.

**A denial label naming a piped command names its LEADING command**, not the
member that was refused — `denied_tools()` takes the first three words. Three
of eight labels harvested that way have named *allowed* shapes. If a pipe is
refused, the culprit may be any member of it.

**Read tool output through bounded, purpose-shaped commands.** Ask the log the
question you have: `gh run view <id> --log-failed | grep -E '== |FAIL:'` returns
the per-member verdict in one turn. Ad-hoc byte slicing of a large transcript —
round 2 read a 70 KB transcript in three `cut -c` slices — is **out of scope for
a per-PR review**. A reviewer that finds itself needing a parser has found a gap
in the sweep's own instruments, not a task for this turn: kogaki#65 item 3 gave
the sweep a denial extractor for exactly that reason. **File for the instrument
on the register, kogaki#246** as an `out-of-dimension:` line and move on.
Improvised byte
arithmetic re-derives once per round something that belongs once in the tool.

**A probe of the lane's own sandbox is register work, not per-review work.**
Round 2 of PR #67 spent ~8 turns establishing what its own grants and sandbox
permitted. That knowledge is real and worth having — the kogaki#65
grant-escape finding is the specimen, genuinely valuable — but it is a property
of the lane, not of the PR under review, so it is **recorded once on the
register, kogaki#246, and never re-probed each round**. A reviewer that wants to
know what it may run reads this file and `tools/review-sweep.sh`'s grant
commentary; a reviewer that discovers something new about the grants appends it
to the register. Paying for the same discovery on every round is the sink.

**This clause is a register PRODUCER, and it lives outside rules 1–4** — it is
the lane's second writing clause and is physically separated from them, which is
exactly how a re-pointing pass leaves a straggler behind. It binds to kogaki#246
under the same rule 5 lifecycle as rule 1: appends refuse a dead carrier, and a
close requires a successor.

**And when neither source yields the result, say so by name.** If CI has no
completed run for the head and the local run is unavailable or refused, the
report says it **cannot determine** that check's result and **names which
source failed** — "no completed CI run for `<sha>`", or the denial the local
attempt returned. This is the dimension-2 discipline already stated above,
unchanged and applied here: an absent result is reported as absent. Silence is
never a pass, and a check nobody could read is never a check that passed.

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

Rounds are counted in **cycles grouped by head** — `rally_cycles()` in
`tools/review-sweep.sh` is the one place the count is computed, and this file
points at it rather than restating it. What that means for you: a head is ONE
round however many reviewers report against it, unattested
`review-round-unverified:` marks count separately and are subsumed by a
performed report at the same head, and **every round still leaves its record**
without a separate ledger (§4 clause 4).

**A fragment is not a report for any of these states** (§4 clause 6). A segment
whose `report-complete:` count does not match its own finding lines produces
neither `done` nor `author-owes`: the head is simply unreviewed, and the sweep
says so by name rather than reporting "no report" for a report that plainly
arrived. The round it spent is still counted as spent — the cost was paid
whether or not the artifact arrived whole — so a reviewer that fragments at
**two heads** parks the PR. Twice at ONE head is one round, not two:
fragment-ness is `counted()` while cycle membership is `performed()`, and
`performed()`'s own docstring declares the split ("Deliberately NOT folded into
`counted()`"), so a fragment is a performed segment and two of them at one head
collapse into a single cycle. Its own open blocking findings still gate,
because a fragment turns nothing *green* and incompleteness must never be a way
to hide one.

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
