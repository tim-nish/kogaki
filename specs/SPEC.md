# Kogaki (小書) — founding spec

status: **draft 2026-08-04**, first commit of the repository. Successor of
`writing-assistant` (archived 2026-08-04, read-only; its address is never
recycled). Kogaki writes development articles from the owner's policy
substrate. Public from the start; written clean.

## 1. Mission

Write articles whose material is the owner's ratified, plain-register
knowledge — Grains, Threads, and the Glossary served by the Gukan substrate —
for self-branding through development writing. Prose the reader trusts
because every grounded claim resolves to a served rendering at a pin.

## 2. The repository-invisible boundary

**A repository is where development happens together with Gukan; it is not a
place Kogaki collects from.** Kogaki reads Grains, Threads, and the Glossary
only, through the gateway seam. A repo path is not an address Kogaki can
resolve — enforced in the gateway client code, not by instruction. When
provenance metadata says a Lesson originated in some project, Kogaki may read
Gukan's *definition* of that project; it never opens the project.

Rationale (served): re-expression happens once, upstream, at a human gate —
material quoted from ratified renderings makes the untranslated-register
defect class unproducible rather than detected
(`topics/knowledge-architecture.md` 2026-08-04; `topics/articles.md`
2026-08-04, the evidence re-scoping).

## 3. The guarantee split

**Kogaki guarantees citation integrity — a quoted claim was quoted, and its
pin resolves. Gukan guarantees the facts.** Kogaki never guarantees that an
interpretation of a served line is valid; a claim widened beyond its quoted
scope is the author's judgment and is attributed as such (scope travels with
the claim). There is no Fact unit, no fact floor, and no provenance map —
the citation resolve check over the draft's own cites is the sole mechanical
instrument on grounding.

**Measurements:** no article class requiring measurement display exists yet
(product-lab#153, held). When one arrives, *Kogaki's* boundary changes — a
declared measurement input for that class — never Gukan's (PolicyPackage
invariant: Gukan guarantees Unit schema, never data schema).

## 4. Compliance mechanism (established before any pipeline code)

- **Consultation map** (`policy/consultation-map.md`): the occasions file —
  boundaries at which policy consultation is required, grown only by miss,
  entries as pinned quotes + trigger terms, never paraphrased rules. Ships
  with one seed entry (check-infrastructure changes). An entry additionally
  declares a **read prescription** — the act class, and the served gloss
  shard(s) to survey headline-first *before* acting — because `policy_lookup`
  answers only questions the consumer thought to ask, while a standing
  headline read surfaces lines nobody asked about. The prescription sits on
  the permitted side of the finding-aid carve-out: it pre-computes *where to
  ask*, never *what is true* (`topics/knowledge-architecture.md` 2026-08-02).
  An entry added on a miss also records that miss's **postmortem** — the
  violating artifact, the boundary terms that would have triggered, and the
  question **verbatim** that would have found the served line — so the
  accumulated questions become the situation-specific keys for reaching a
  particular ruling. The map still triggers consultation and never carries a
  verdict; a paraphrase in any of these fields is the conformance-copy defect
  the pinned-quote rule exists to refuse (kogaki#24).
- **Check registry** (`checks/registry.json`): the suite runs **only
  registered checks**, and registration requires an admission record — the
  named defect it caught or the contract it uniquely carries, plus the
  licensing issue. An unregistered check file is dead code found by one meta
  check. Admission also declares the check's **removal signal** at birth.
  That signal owes a typed **observing instrument** at admission too — the
  field naming what in this repository would notice the signal's condition,
  or why nothing can. Its grammar is carried once, in
  `checks/registry.json`'s own note, and is pointed at rather than restated
  here; `checks/check-registry-conformance.sh` refuses an admission whose
  instrument is missing or malformed (kogaki#113).
- **External-dependency registry** (`deps/registry.json`): the capabilities
  this repository **needs but cannot install** — a spawned session's tool
  grants, a repository setting, a user-level hook's install state — declared
  rather than assumed. Each entry names the acts that break without it, **the
  read that decides presence** where one is decidable (and a typed
  `none: <why>` where none is), and **the signature its absence leaves
  behind** — the field that converts an unexplained stall into a recognised
  one. An unmet dependency is **reported, never gated**: the check fails on a
  malformed entry, never on a world that currently fails to satisfy one. A
  capability outside the enumeration is surfaced **report-only with its
  reason** — the non-member fallback is the load-bearing half, because
  dependency N+1 escapes any enumeration and only its escaping *silently* is
  avoidable. Contract at `specs/spec-external-deps/SPEC.md`, machine-readable
  shape at `specs/spec-external-deps/deps-schema.json` (kogaki#55).
- **PR gate, split by property type:** the mechanical half (change licensed
  by a named issue; new checks carry admission records; registry
  conformance; **a touched consultation-map boundary has a receipt**) runs
  unconditionally in CI/hooks; the judgment half (does the diff match its
  license; consultation-map boundaries touched) runs in the review lane. A
  checker appearing in a PR without a license is refused, and the work
  re-routes to an issue.

  **The judgment half runs in a session that did not author the work under
  review, and that isolation is a requirement rather than a convenience**
  (kogaki#34). An authoring session cannot review its own work for the class
  of defect that consists of not having applied what it already held: the
  specimen is kogaki#32, where a coined token set shipped while the ratified
  vocabulary sat unused in the authoring session's own context, and an
  independent review caught it in one pass. So **every PR receives a
  review-lane report authored outside the authoring session before merge**.

  **The property is CONVERGED OR ESCALATED, not reviewed-once** (kogaki#34,
  amended 2026-08-05). A report that lands findings and is never answered
  leaves the PR reviewed and unimproved, so the lane and the author **rally**:
  findings return as PR comments or as correction instructions, the author
  applies them, and the reviewer re-reads — **up to two rounds**, after which
  the disagreement is a **parked owner decision, never a third round**. The
  bound is the same discipline the failure rule already carries: a
  disagreement surviving its machine-machine retry is a decision a human owns.

  Four clauses keep this inside the two-layer split rather than moving
  judgment into the merge layer:

  1. **The lane stays findings-only and emits a typed findings record** —
     severity-marked, primary capture, attached to the PR. The mechanical
     half reads **report present ∧ no open blocking findings**. Whether a
     finding *is* blocking is the reviewer's judgment; whether the PR
     *contains* an open blocking one is a computable fact over a declared
     record, which is the split's own test — "whether a work item LICENSES a
     check is a judgment … whether a PR CONTAINS an unlicensed check is a
     computable fact carried at the merge layer"
     (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:36`).
  2. **The reviewer never pushes to the branch.** Corrections are comments or
     instructions; the author applies them. A reviewer that authors a fix
     stops being a control arm, and round two would have no isolated reviewer
     left.
  3. **Two rounds, then a parked owner decision.** Never a third.
  4. **Every round leaves its record** — report, correction instruction,
     round count — so the postmortem hand-off can mine rally residue: a
     finding that took two rounds to land is evidence about the map or about
     author-side prescriptions, harvested without anyone remembering to.
  5. **A report DECLARES ITS SCOPE — `full` or `delta`** (kogaki#70). A
     round-2 review is a delta review by default: its subject is round 1's
     findings × the fix commits, and it re-reviews the whole diff only where
     the fix touched files outside those findings. That is the right economics
     — the measured rally spent 43 of its 92 turns re-deriving round 1 — but
     it changes what the report *attests to*, and **clause 1's mechanical half
     cannot tell the two apart**: it reads presence and open-blocking findings
     identically whatever the round. An undeclared delta review is therefore a
     narrower assurance wearing a full review's clothes, and the merge layer
     would be trusting a claim nobody made.
     So the scope is stated **in the record** rather than inferred from the
     round number. A report carrying no scope declaration is read as `full`,
     because the pre-kogaki#70 reports are all full reviews and a default that
     silently narrowed them would rewrite history at the gate.
     This adds no computable obligation to the merge layer — the split's own
     test is unchanged, and whether a *delta* scope was appropriate stays the
     reviewer's judgment, which is the half that belongs in the lane.
     **This clause is deliberately CARRIER-LESS, with a reopen trigger**, on
     the same admissibility rule the "no open blocking findings" half below is
     admitted under — carrier-less *by omission* is the defect, and a stated
     policy may be carrier-less only when it says so and names what would
     reopen it. Nothing mechanically verifies that a declared `delta` scope
     was the honest one: a reviewer that declares `delta` and reads nothing is
     indistinguishable at the gate from one that read the fix commits, which
     is the same attestation problem clause 1's carrier-less half already
     records one level down. A detector is declined here because the property
     is *whether the declared scope matches the review actually performed*,
     which is judgment rather than a computable fact over the record.
     **Reopen trigger:** one PR whose round-2 report declared `delta` and
     missed a defect that lay inside the fix commits it claimed to cover.
  6. **A report DECLARES ITS COMPLETENESS, and a fragment counts as nothing**
     (kogaki#74). The report grammar carries a terminal
     `report-complete: <N> findings`, and clause 1's mechanical half counts a
     segment **only** when that line is present and `N` equals the segment's
     own finding lines. A partial report turns nothing green; a split report
     holds the gate red until its last part lands.
     **The specimen is a merge that should not have happened.** On PR #71 the
     reviewer was denied the grants that let it post in one act, so it split
     its report: the first part — resolving the previous round — landed at
     15:50:40, the re-check fired, armed auto-merge completed at 15:51:09, and
     the **complete** report carrying a new open blocking finding arrived at
     15:53:37 on an already-merged PR. Nothing distinguished a complete report
     from the first fragment of one, so the gate read a fragment as the verdict.
     **The served surface names this defect class exactly**, and the clause is
     its instance rather than a local invention:

     > A rule that names a source can be satisfied by a partial projection of
     > it — name what a complete read includes, or every partial view counts as
     > compliance

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:31`

     Clause 1 named the source ("a typed findings record") and never named what
     a complete one includes, so the first fragment counted as compliance. The
     token is the missing half of that naming.
     **Both halves are mechanical**, which is why this belongs at the merge
     layer where clauses 1 and 5 already live: token presence and count
     equality are computable facts over a declared record, exactly the split's
     own test. It is the **per-artifact-decidable** admissible state rather
     than a detector or a carrier-less mark — decidable from the single
     artifact an existing check already inspects
     (`product-lab@f918c515 topics/knowledge-architecture.md:52`), which is
     also why clause 5's carrier-less mark does not travel to it: completeness
     is a *fact* the record carries, where scope-honesty is a judgment. Clause 5's scope declaration and this clause's completeness
     token are **one grammar over one segmenter** — they are specified together
     and implemented in a single pass, because two sequential passes over the
     report parser is how the use-vs-mention defect (kogaki#41) was introduced
     the first time.
     **Compatibility, stated rather than left to discovery:** a report with no
     `report-complete:` line is read as complete, on the same ground clause 5's
     absent-scope default rests on — every report already in this repository's
     history was posted whole, and a default that retroactively voided them
     would empty the gate rather than tighten it. The token binds reports
     written after it ships.
  7. **A report CARRIES FORWARD to a new head when the content it reviewed is
     provably unchanged** (kogaki#96). The head sha is part of presence
     (`checks/check-review-report.sh:44` — "THE HEAD SHA IS PART OF PRESENCE,
     not decoration"), and that binding composes with the toolkit's mandated
     post-squash rebase (`~/work/claude-toolkit/commands/implement-story.md:250`,
     restated at `:418` — "after a squash merge use `git rebase --onto <default>
     <old elder branch>` so the elder's pre-squash commits are dropped rather
     than replayed") into a state with **no legal exit**: the rebase necessarily
     produces a new head, the report is invalidated against it, and clause 3's
     bound forbids the third round that would replace it. Observed 2026-08-06 on
     PR #89, whose only exit was an owner `--admin` merge bypassing branch
     protection — and whose rebase changed **no reviewed content at all**, the
     pre- and post-rebase diffs hashing identically to
     `cf756413139e7a46069343c0517099c8d2de087b`. The park it produced counted
     against the kogaki#72 budget while being caused by the pipeline's own
     mandated step.

     So the pin's SUBJECT is the content and the sha is its INSTRUMENT, and a
     second instrument is admitted for the same pin: **a report naming head A is
     present for head B when the PR's diff against its base at B is
     byte-identical to the diff that report reviewed at A.** The round counter
     is untouched — a carry-forward is not a round and consumes none.

     **The equality is recomputed and RECORDED, never assumed.** A carry-forward
     is a gate EVENT: the check computes both diffs at gate time, compares them,
     and writes the pair it compared into its own output, so a later reader can
     re-run the comparison rather than trust it. A carry-forward that leaves no
     record is the silent re-derivation the served position forbids:

     > the hub's own `gloss_sha:` discipline settles the record:
     > `specs/gloss.md` §2.2 pins a rendering to the sha of the content it was
     > made from, and a mismatch **re-surfaces the gate rather than silently
     > re-rendering**. That mechanism's content is not about lessons — it is
     > that a derived expression's truth is relative to the set it was derived
     > from, so the derivation carries that set and a change to the set is a
     > GATE EVENT rather than a refresh.

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

     Read against this defect the line discriminates in both directions at once:
     it endorses pinning a derived judgment to the content it was made from —
     which is what admits the carry-forward, since unchanged content is an
     unchanged member set — and it refuses the *silent* refresh, which is what
     makes the recorded recomputation load-bearing rather than decorative.

     **The weakening is stated rather than argued away.** A sha is
     self-evidencing; a recomputed equality is only as good as its
     recomputation and its base resolution. Two bounds keep it honest: the
     comparison is over the diff **against the base**, so a base that moved is
     VISIBLE in the comparison and yields no carry-forward whenever it changed
     the diff; and an equality that cannot
     be computed — either diff unreadable — is **not** a carry-forward but the
     existing `stale` state, failing toward the reviewed side, on the same
     ground clause 1's head-unknown state already occupies. This is
     per-artifact-decidable at the merge layer, the admissible state clauses 1,
     5 and 6 already occupy, and it adds no judgment clause: whether the diffs
     are equal is a computable fact over two artifacts the check can read.

     **`deferred-slot: report-base-resolution` is FILLED** (owner decision
     2026-08-06, kogaki#96): **(c) — the base is RECORDED IN THE REPORT.** The
     report grammar gains a base field, so the base of head A becomes a **read
     rather than a derivation**.

     The slot asked **how the check obtains the base of head A**, the one input
     this clause names and does not supply: a report recorded the head it
     reviewed (`review-lane report: <head sha>`) and **not** the base it was
     diffed against, so "the diff that report reviewed at A" was not
     recoverable from the record. It is recorded now, on the adjacent-line
     grammar stated below.

     The ground for (c) is this clause's own weakening: the admission of a
     second instrument is only as strong as its base resolution, and (c) is the
     one resolution that makes the base a **recorded fact** rather than a
     reconstruction. It is also the only one that survives a rewritten history
     — a force-push, a re-based base branch or a squashed elder each destroy
     the history (a) and (b) read, and neither notices that it has.

     The alternatives, recorded because a decision without them is an
     assertion. *(a) — use the PR's CURRENT base.* Free, no machinery, no
     grammar change. Declined as **wrong exactly where this clause needs it
     right**: it is wrong when the base moved, which is the case the weakening
     paragraph above relies on to *refuse* a carry-forward. A round-2 review
     demonstrated the inversion on this repository's own artifact — story
     1.26's AC 6 names a **moved-base no-carry-forward** fixture, and under (a)
     that fixture inverts, because both diffs are taken against the same
     current base and the base move becomes invisible. An option under which
     this clause's own counter-example cannot be written down is not a cheaper
     (c); it is a different rule. *(b) — use the merge-base at A.* Computable
     from history alone, no grammar change. Declined as **re-deriving a fact
     rather than reading one**: it reconstructs the base from history instead
     of reading what the reviewing act held, and can differ from the base CI
     actually used — in which case the check compares a diff nobody reviewed
     against a diff nobody produced. It is nonetheless sound in *direction*, a
     moved base does move the merge-base, which is why it survives below as the
     transitional fallback rather than being discarded outright.

     The discriminating served position, quoted verbatim at its pin:

     > ask first whether the thing is a fact or a judgment: a fact gets a
     > mechanical carrier at the moment it is decidable, and a judgment rides a
     > gate that already exists

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:58`

     The base of a reviewed diff **is a fact, and it is decidable exactly
     once** — at the moment the reviewing act runs. Afterwards nothing recovers
     it: (a) and (b) do not read that fact, they reconstruct a candidate for
     it, which is the substitution the fact/judgment split exists to route
     away from. This clause had already classified the subject correctly — "the
     pin's SUBJECT is the content and the sha is its INSTRUMENT" — and the base
     is the other half of what makes a diff the content it is. And the layer
     rule sites the carrier:

     > when that layer belongs to another system, the carrier goes at the last
     > boundary you control

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

     The history a base lives in belongs to git and to whoever force-pushes it.
     The last boundary this repository controls is the report the reviewing act
     writes, which is where the fact is therefore carried.

     **THE GRAMMAR CHANGE, grounded in the parser that must read it.** The base
     rides an **adjacent line beside the report token**, never a widening of
     it:

     ```
     review-lane report: <head sha>
     review-base: <base sha>
     review-scope: full | delta          — absent is read as `full`
     finding: ...
     report-complete: <N> findings       — absent is read as complete
     ```

     `review-base:` is anchored WHOLE exactly as its two siblings are, takes
     the same 7–40 hex sha the report token takes, is read in the **same single
     pass** over the **same segmenter**, and the **first declaration wins** — a
     second is a malformed report, not a correction, on clauses 5 and 6's
     established rule. Its value is the commit the reviewing act **actually
     diffed against**, read as a value in that same act under the
     never-reconstruct-a-sha rule kogaki#91 imposes on the head; a base sha
     assembled from a prefix is the same defect one field over. **Absent means
     no recorded base** — the transitional case below — and never a default
     sha.

     The adjacent form is not a preference. Widening the token to
     `review-lane report: <sha> <base>` is the shape that was **exercised and
     failed** for the scope declaration (story 1.17, through
     `tools/review-sweep.sh`'s embedded fixture pass): with the token's regex
     not widened in lockstep, a declared report segmented to **nothing** and
     was read as *absent*. That regex lives in two files —
     `checks/check-review-report.sh:188` and `tools/review-sweep.sh:628` — and
     an adjacent line leaves **both untouched**, which is precisely why clauses
     5 and 6 already have this shape. A third declaration on the established
     pattern is the change whose failure mode does not exist.

     **The cost, stated rather than absorbed. Reports written before the field
     ships carry no base at all**, and the carry-forward cannot read one from
     them. Those reports fall back to **(b), the merge-base at A** — and
     deliberately **not** to (a), because (a) is the option this fill just
     declined for making a base move invisible, and a fallback that fails open
     on this clause's own counter-example is worse than no carry-forward at
     all. (b) fails toward the reviewed side: where the merge-base it
     reconstructs is not the base CI used, the diffs differ and the result is
     the existing `stale` state, which is the safe one.

     **That fallback is TRANSITIONAL, not a second permanent instrument**, and
     it carries an end condition rather than an intention: it applies only to a
     report carrying no `review-base:` line, so it expires when the last such
     report is no longer live on an open PR — no flag, no configuration, and
     nothing to remove but the branch of the check that reads it. A permanent
     second base resolution would reintroduce one layer down the fork this slot
     just closed, and would be indistinguishable from having selected (b).

     **What (c) does NOT make true, recorded so the next reader does not
     over-read it.** A recorded base makes a base move *visible*; it does not
     make every base move a refusal. A base that moved and left the diff
     **byte-identical** still carries forward — and that is this clause's
     subject/instrument rule operating correctly rather than a leak, because
     the pin's subject is the content and the content is what was compared.
     What (a) loses is not the refusal but the *visibility*: it cannot tell the
     two cases apart at all.

  **The "no open blocking findings" half is CARRIER-LESS, and is marked
  rather than omitted.** An empty findings record satisfies it, and nothing
  distinguishes a thorough review that found nothing from one that looked at
  nothing — the check rests on the reviewer's self-report about its own
  process, where a rationale is an attestation rather than evidence. A stated
  policy is admissible as per-artifact-decidable, as detector-designed-in, or
  as deliberately carrier-less **with a reopen trigger**; carrier-less *by
  omission* is the defect
  (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:52`).
  **Reopen trigger:** one PR that passed this gate with an empty findings
  record and later needed correction.

  **Blocking is a budget, not a severity feeling** (kogaki#72, owner ruling
  2026-08-06). The lane is a policy check and a critical-issue filter; the
  single-pass merge is the norm and a park is a measured pipeline defect
  against a ~1-in-100 budget. Three classes may block — ratified-position
  violation the merge would propagate, pipeline breakage, unlicensed scope —
  and a blocking finding carries its one-line justification in the record
  (`[policy: <pin>]` or `[harm: …]`). The mechanical half reads the
  justification's PRESENCE only: an unjustified blocking does not gate and is
  downgraded to `should` by name, failing toward merge; its ADEQUACY stays
  the lane's judgment. Every park posts its postmortem stub (what blocked,
  which class, rounds spent) where the park is announced, and the park count
  is the number the budget is measured against.

  **Three clauses bind the review's own conduct**, and belong to the lane
  rather than to the gate: the review opens with an **unscoped tier-1
  `gloss_index` survey** as a fixed first move — where to look is an output
  of the survey rather than a heading the reviewer supplies; **the seam
  is never asked for a verdict** — the review supplies the claims, the seam
  supplies the positions; and **a refusal is terminal for that command**
  (kogaki#100).

  **A refusal is terminal, and the blocked dimension is REPORTED rather than
  retried.** When a reviewer composes a command its grants do not admit, the
  refusal ends that command: the session records it, states the blocked
  dimension in the report as a `cannot-determine`, and finishes the review. A
  second attempt at a refused command — in any rephrasing — is itself refused.
  A single missing grant then costs one capability rather than the whole
  review.

  **This is a RELOCATION, not a new rule.** The rule already shipped as prose,
  in the `COMPOSITION` prompt kogaki#74 added — `tools/review-sweep.sh:759`
  ("never re-attempt a refused command in another form") and `:775` ("Do not
  spend turns probing for a form that gets through") — and was measured failing
  on the very next PR. On PR #98 the post-kogaki#74 prompt was present in the
  second spawn's own context while that spawn spent its last four turns
  rephrasing one refused command; the first spawn issued nine denials of one
  intent and re-issued an identical `git worktree add` with
  `dangerouslyDisableSandbox: true`. Both ended `error_max_turns` and neither
  posted a report. The served position names why prose was never going to hold
  it:

  > A rule is enforced only at the layer where it can be broken — a prohibition
  > needs a mechanical gate at the tool boundary because prose is advisory to a
  > system whose job is to satisfy instructions; an obligation cannot be gated
  > at all and needs its absence made visible … and when that layer belongs to
  > another system, the carrier goes at the last boundary you control, with any
  > gate upstream of it counting as ergonomics rather than control.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

  The permission boundary belongs to the harness, so **the carrier goes at the
  last boundary Kogaki controls** — the spawn wrapper in the lane-command
  layer, where the orchestration property below already lives — and the report
  grammar gains the `cannot-determine` line that gives the reviewer somewhere
  to put the blocked dimension, so a refused capability degrades a dimension
  instead of deleting a report. The prompt text stays and is reclassified as
  **ergonomics rather than control**, which is the served line's own word for
  a gate upstream of the violation layer.

  **kogaki#74's resolution is what makes this the designed steady state rather
  than an edge case**: by refusing three proposed grants and naming granted
  alternatives instead, it decided that a reviewer meeting a refusal and
  routing around it is normal operation, not an accident. A designed steady
  state whose only carrier is a prompt sentence — one already observed not to
  hold — is carrier-less by omission.

  **`deferred-slot: refusal-signal-source` is FILLED** (owner decision
  2026-08-06, kogaki#100): **the EVENT is primary and the TERMINAL FIELD is
  the backstop.** The wrapper keys prevention on the in-session
  `{"type":"system","subtype":"permission_denied"}` stream event, and keeps the
  terminal `permission_denials` field of the `{"type":"result"}` record as the
  guaranteed measurement path. Prevention when the CLI supplies the event;
  honest measurement always.

  The slot asked **which signal the wrapper keys the terminal refusal on** — an
  in-session permission-denial signal, or the after-the-fact
  `permission_denials` field. **This was decided on measurement rather than on
  argument, and the measurement is recorded here because it is the evidence.**

  - **The field is TERMINAL-ONLY, so the fork as originally framed was
    mis-stated.** Across the real route logs in `~/.kogaki/reviews/` the key
    `permission_denials` appears on **zero** non-`result` objects; every
    occurrence is on the `{"type":"result"}` line, always the last line of its
    spawn. There is no "in-session field" to choose. At the decision the count
    was **33 logs carrying 282 denials**; re-counted at the close of the same
    run it is **33 of 35 logs carrying 294 denials** — the totals moved because
    the run kept reviewing, and the zero did not.
  - **An in-session EVENT does exist, under a different name.** It is emitted
    at the moment of the denial, one per denial, before the corresponding
    `tool_result`:
    `{"type":"system","subtype":"permission_denied","tool_name":…,`
    `"tool_use_id":…,"decision_reason_type":…,"message":…}`. Coverage against
    the terminal field is **exact and 1:1 by `tool_use_id` — no misses, no
    extras — WITHIN every log that carries events**, and the unit is **events**:
    **26** at the decision, **40** at the re-count. **State the share, because
    "no misses" is otherwise read as covering the corpus:** those are 26 of the
    282 denials then and 40 of the 294 now — the event-carrying logs are the
    7 logs from the 2.1.223 boundary onward, and the ~86% remainder are
    2.1.222 logs that carry the terminal field and **no** events at all. The
    1:1 claim is about the logs where the capability exists; it is not evidence
    about the ones where it does not, and it is the same fact as the version
    premise below seen from the other side.
  - **It arrives with real lead time**, which is the whole point: PR #102's
    first denial event is at log line 33 of 189, with ~156 stream lines still
    unspent. On PR #98 — the specimen this clause was written from — the first
    event is at line 52 of 546.
  - **It is CLI-VERSION-SCOPED, and the boundary is inside this very run.**
    `pr-90-round-2.log` (CLI **2.1.222**, 09:55) carries 12 denials and **zero**
    events. Every log from 11:03 onward is **2.1.223** and carries full
    coverage. The capability appeared mid-run and can leave the same way.

  **PREMISE 1 — the version dependence is STATED, not assumed, and the carrier
  degrades to the backstop rather than to nothing.** This clause's prevention
  half holds **on the premise that the harness emits the
  `permission_denied` system event** — observed on Claude Code CLI 2.1.223 and
  observed *absent* on 2.1.222. The premise is written down in the shape this
  repository already uses for one, because the alternative has a measured
  failure mode: an automation policy that ran for months "on the unstated
  premise that every open PR was the owner's own" was falsified by an
  environment nobody had related to the flag —

  > the conjunction must also include ENVIRONMENTAL properties … which no
  > consumer of the flag evaluates, so the environment changes out from under
  > every consumer with no carrier noticing

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:31`

  and the served surface requires the scope be **named** rather than left as a
  claim about the world:

  > when the failing layer sits outside the repository, the violation layer is
  > the HARNESS, and *no carrier is possible* is admissible only as *no carrier
  > is possible in configuration X*, with X named — because the sentence's whole
  > function is to stop people looking

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:37`

  X is named: **CLI ≥ 2.1.223**. The premise is a **report, never a gate** —
  the same disposition `claude-toolkit`'s merge-eligibility spec reached for its
  own environment precondition (§"Why the environment precondition is a report,
  not a gate") — because a version preflight would be one more check per
  incident and would withhold the lane on exactly the environments that still
  have a working backstop.

  **How the absence is made observable, since an obligation cannot be gated.**
  "The event did not arrive" produces no event to hook, so the remedy is a
  signal, not a check:

  > an obligation cannot be gated at all and needs its absence made visible

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

  > prohibitions get mechanical carriers, obligations get prose plus a
  > visible-absence signal … the act stays behavioral, its absence made
  > observable rather than discovered late

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:177`

  So the wrapper **reconciles the two signals at the end of every spawn** and
  states the result in the run log: the count of events it observed in-session
  against the count in the terminal `permission_denials` field. An absent event
  path then reads as **"prevention unavailable this run — N denials measured,
  0 prevented"**, and never as "no denials". This is the second conjunct of
  reachability the served surface names — a path whose guard is constant-false
  is indistinguishable from a deliberately-disabled one, "leaving a declared
  observable over a real run as the only thing carrying the intent"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:38`).
  **The measurement half never degrades**: AC 5's count comes from the terminal
  field, which is present on every spawn at every version observed.

  **PREMISE 2 — refused is cleanly separable from FAILED, and NOT from
  REPHRASE-ABLE.** The counter this slot was named with — "refused, will never
  work" and "failed, worth retrying" are not always decidable from the error
  alone — **is discharged for the failed/refused axis and stands for the
  rephrase-able axis.**

  *Discharged.* Of the `is_error: true` tool results in the same logs, the
  denials are **disjoint from the ordinary failures**: at the decision, 282 of
  296 were permission denials and 14 were ordinary failures
  (`jq: command not found`, `File does not exist`, a token-limit refusal,
  `ENOTDIR`); at the close-of-run re-count, 294 of 310 and 16. **None** of the
  ordinary failures carries a denial event or appears in the terminal field. A
  carrier keyed on the **event** — never on `is_error` — therefore cannot read
  a transient failure as terminal. A carrier keyed on `is_error` would, which
  is why the key is named here rather than left to the implementation.

  *Standing, and it must not be papered over.* **The log does not distinguish a
  rephrase-able denial from a dead-end one.** 13 of the 26 events at the
  decision (22 of 40 at the re-count) carry
  `decision_reason_type: subcommandResults`, naming one offending sub-part of a
  compound command — *"This Bash command contains multiple operations. The
  following part requires approval: git fetch …"* — which is precisely the
  class kogaki#74's exercise found had **granted alternatives**. And
  `decision_reason_type` was **absent on 6 of 26** (8 of 40), so it is a weak
  hint at best, never a discriminator. Against that, PR #98's log shows the same
  command denied on a **byte-identical retry**, so "terminal for that command"
  is right about the *command*; what it does not settle is whether the *intent*
  had a reachable form. The implementer must not read "terminal" as "the
  reviewer had nothing else to try": the route to AC 1's `cannot-determine` is
  the correct exit, and naming a granted alternative stays the `COMPOSITION`
  prompt's static job (kogaki#74), not something this signal can compute.

  **Shape facts the implementer needs, so they are not re-derived from the
  logs.** The event carries `tool_name`, `tool_use_id`, `message` and
  `decision_reason_type` — and **not `tool_input`**. The command text that
  `denied_tools()` renders as its `Bash(<first three words>)` label lives only
  in the preceding `assistant` tool_use block, joinable by `tool_use_id`, and in
  the terminal field. A live reader wanting the same label must **join
  backwards**; it cannot read it off the event.

  **UNPROVEN, recorded as unproven rather than assumed.** All 26 observed events
  (40 at the re-count) carried `tool_name: "Bash"`. **MCP-tool, `Write` and
  `Edit` denials are unproven on the event path.** They do reach the terminal
  field — older logs carry *"Claude requested permissions to use
  `mcp__tsurezure__gloss_index`"* and *"…to edit /home/tomoya/.claude/…"* — so
  the backstop covers them and the prevention half is **not** known to. The
  clause must not be implemented as though event coverage is universal. Per the
  served rule that a criterion stated as a future observation "binds only if a
  named mechanism performs the observation and reopens on failure"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:40`),
  the named mechanism is the same end-of-spawn reconciliation above: a terminal
  denial with **no matching event** is what a non-Bash denial looks like, and
  the reconciliation line is where it becomes visible.

  **The alternatives, recorded because a decision without them is an
  assertion.** *(1) — the terminal field alone.* Reliable, already parsed,
  version-independent, and the only measurement path. **Declined as unable to
  prevent anything**: it is the last line of the spawn, so every turn the burn
  costs is already spent when it arrives. It survives, undiminished, as the
  backstop half. *(2) — the event alone.* The smaller change, one signal, no
  reconciliation. **Declined because it degrades to nothing**: on a CLI without
  the event the review would silently report zero denials, which is the
  measured-absence defect this whole clause exists to end, and the version
  boundary is inside this run rather than hypothetical. *(3) — key on
  `is_error: true` and classify.* Needs no new signal at all. **Declined on the
  measurement**: 16 of 310 error results are ordinary failures and the
  classification would be a string match on error prose, which is the transient-
  read-as-terminal failure the slot's own counter names. The event makes the
  distinction a **read** rather than a guess, and that is the discriminating
  fact/judgment split — "a fact gets a mechanical carrier at the moment it is
  decidable" — the position this section already quotes at its pin under the
  `consult-outcome-token-assignment` fill (`LESSONS.md:58`), applied here rather
  than re-consulted.

  **What this fill does NOT decide.** Where the prevention lives inside the
  wrapper, whether the terminal set is keyed on the command string or on a
  normalized form, and whether AC 5's count belongs in the report as well as the
  run log, are story 1.28's to settle; none of them is a named slot and none of
  them is this decision. The report-grammar half and the prompt
  reclassification were always implementable without the fill.

  **Ownership, so the layers are not re-derived per sitting:** the property
  lives here; presence-and-findings enforcement at the merge layer; judgment
  in the review-lane skill; **orchestration** — spawn on PR-open, rally
  rounds, author-session messaging — in the lane-command layer, with the
  transport pluggable and degraded environments falling back to
  correction-comments on the PR.

  **A deferred design slot is filled at a decision gate, never silently
  inside implementation** (kogaki#48, 2026-08-05). Any spec or story text
  that leaves a choice "to the implementation" NAMES the slot with the
  fixed token `deferred-slot: <name>`; an unnamed deferral is the defect,
  because gates bind to decision documents and an unnamed slot's decision
  escapes every one of them. Filling a named slot is a DECISION act:
  before code embeds the choice, the filling sitting consults the seam on
  the fork and records the decision — choice, alternatives, consult
  receipt — on the licensing issue. The review lane then reviews the
  decision where it was made, not the argument where it landed: a design
  decision found only in the implementation, with no record on the issue,
  is a finding whatever its quality. The specimen is the review-sweep
  timer: "transport pluggable" deferred the trigger fork past the
  issue-stage policy check (which ran on a body containing no transport
  decision), the fork was decided inside the implementing sitting where
  only consult-by-initiative covered it, and the PR review met it
  entrenched and pre-argued — while both discriminating served lines
  predated the design. This clause is check-policy-at-decision-not-
  execution applied to the deferral mechanism itself
  (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:9`,
  `topics/archive/articles.md:29` — the two lines a fill-time consult
  would have surfaced).

  The **boundary-receipt binding** is what converts the map from advice an
  agent may remember into a carrier that binds on every PR. It computes two
  sets per branch — the mapped boundaries whose trigger terms match the diff
  paths, changed text, or linked issue body, and the receipts present — and
  a matched boundary with zero receipts fails. It is a **presence check over
  two declared enumerations** and adds no judgment clause: a receipt whose
  outcome is `miss` **satisfies** it, because the obligation is to ask and
  never to have found. Whether the *right* question was asked stays in the
  review lane, where judgment already lives. Siting it at the merge layer is
  the typed loop's mechanical half — an obligation generates no event to
  hook, but a PR is an event, so receipt-absence over a diff is a computable
  fact rather than an absence with nothing to observe (kogaki#25).

  **The match surface stays as declared, and the decision now rests on a
  measured instance rather than an anticipation** (kogaki#126). The three
  sources above are the whole surface, and `changed text` among them is a
  **compound** — commit messages and the PR body, matched together and
  reported under one label. A trigger term appearing incidentally in any of
  them binds the boundary and the remedy is the ordinary one: record a
  receipt, `uncovered-after-N-framings` being a conforming answer. That was
  ratified at story 1.11 against an anticipated cost; kogaki#126 supplies the
  first measured one (PR #123 / `da638af`, diff `terrain/terrain.mjs` only,
  matched on the PR body, discharged with one genuine consultation), and the
  measurement is recorded in `checks/check-boundary-receipts.sh`'s header
  beside the decline it tests, not restated here. Two candidate narrowings
  were declined **on this text**: weighting the sources so a path-signal match
  binds while a changed-text-only match reports is the judgment clause the
  sentence above forecloses, and per-term source scoping adds a per-term field
  to the entry schema contracted in this section's consultation-map bullet.
  The ground is the map's accretion polarity — a member that turns out not to
  apply costs a consultation rather than a false verdict
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:35`)
  — which prices a spurious match at exactly one consultation on purpose, and
  one consultation is the entire cost measured so far.
- **Review altitude is a declared property of the diff, and the instrument's
  own diff is its own class** (kogaki#99). The tier that decides a spawned
  review's model and turn cap was until now an invariant carried only in code —
  the table at `tools/review-sweep.sh:549-554`, resolved by `resolve_tier()` at
  `tools/review-sweep.sh:804` — with no clause here, so the first thing this
  does is write it down. The declared classes are `careful` and `ordinary`; any
  careful path carries the whole diff and is never averaged down; an unmatched
  path falls to the careful side, which is the fail-safe. The served ground for
  declaring it at all rather than re-judging per sweep:

  > A check's runtime is paid once per iteration of the loop it gates, so its
  > position in the loop is a multiplier on its cost and assertion ALTITUDE is
  > a latency decision rather than only a coverage one … the remedy is a
  > declared tier carried by the check file rather than a judgment re-made per
  > sweep.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:40`

  **A third class is declared above both and is resolved FIRST: a diff that
  touches the reviewing instrument itself.** It carries the careful tier's
  model and cap. The shipped table classes `tools/**` and `.claude/skills/**`
  as `ordinary`, which puts `tools/review-sweep.sh` and
  `.claude/skills/review-lane/**` — the review machinery — in the cheap tier,
  so the classifier calls its own instrument cheap. Measured on PR #98: two
  consecutive spawned reviewers, both `error_max_turns` at 25 turns against a
  cap of 24, ~$2 spent, no report posted, the PR left unreviewed. Resolving the
  reflexive class before the careful/ordinary axis is what stops a diff that
  also matches something cheaper from averaging it away.

  **It is a class with its own trigger rather than two paths appended to an
  existing list**, because the served design rule is exactly that:

  > A check inherits the trigger of the gate it is sited in, and can be
  > ANTI-CORRELATED with its own need … A check anti-correlated with its need
  > is worse than no check, because its silence reads as a clean result.
  > Design rule: **site a check at a trigger that is its own subject, or give
  > it its own trigger.**

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/claude-code-ops.md:24`

  and because a deliberately narrow instrument owes a **named** trigger that
  widens or escalates it — the hub ruling only that one is owed and expressly
  declining to select among the candidate forms, which is a consumer decision
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:51`).
  Appending two paths to the careful list would fix this instance and leave the
  class unnamed, so instance N+1 is uncovered by default.

  **The cost counter is carried, not dismissed.** kogaki#70 shipped the tier
  table to REDUCE review cost, and every widening spends that. This one is
  bounded by construction — its members are the review machinery's own paths, a
  small and self-limiting set — and the careful/ordinary table is **unchanged**,
  so nothing else in the repository moves tier. The membership is declared
  beside the other two tables and carries the same operator override they do:
  one place to read, one place to change.
- **Issue checkpoints:** issues carry policy pins; checked at creation and
  at pickup against the current served surface
  (`topics/claude-code-ops.md` 2026-08-04). Where an issue body matches a
  mapped boundary's trigger terms, the same authoring layer requires either
  an attached consult receipt or an explicit `consult: deferred-to-pickup`
  marker that the pickup recheck then enforces. The occasion thus fires at
  the two checkpoints the lifecycle **already owns** — authoring and pickup —
  with no new ceremony and no third gate (kogaki#25).
- **Typed improvement loop:** a missed **mechanical** property strengthens
  the merge carrier; a missed **judgment** improves what the judgment gate
  is told — which served lines are quoted at the gate — and never becomes a
  new enumerated denial, the accretion shape that took six cycles to
  falsify in the predecessor. Responsibility on a leak attaches to the
  layer whose property leaked, and the merge gate refuses deny-never-warn
  (`topics/knowledge-architecture.md` 2026-08-04; kogaki#2).
- **Public-quote register rider:** quoted governing material on public
  surfaces uses the plain-register renderings and pointers, never raw
  internal decision text (product-lab#156 §3 rider 2; kogaki#2). The kit's
  verbatim-at-pin rule is the citation half; this clause is the register
  half.
- **Consult evidence is sided.** The substrate's access log is the
  **server's** canonical record; Kogaki's own `consulted:` receipts are the
  **consumer's**. Logging lives with whichever component mediates access
  (`topics/archive/knowledge-architecture.md` 2026-07-16; kogaki#7), so
  Kogaki reads its own receipts and never the mediating component's private
  state. This extends §2's boundary from repositories to the substrate's
  internals: the seam is a read of *served renderings*, not of the state
  the gateway keeps to serve them.

  A receipt carries the gateway's **`request_id`**, an **outcome token**, and
  **its queries verbatim**, in this shape (kogaki#28):

  ```
  consulted: <repo>@<sha> <file:line[,line][, file:line…]>
    request_id: <id>
    outcome: discriminating | covered-after-reframing | uncovered-after-N-framings
    query: <framing 1, verbatim>
    query: <framing 2, verbatim>
  ```

  **What the hub ratifies here is the property, not this format.** The served
  requirement is a receipt at the point of use with a **fixed token and a
  fixed position** —

  > A consultation owes a RECEIPT AT THE POINT OF USE — fixed token, fixed
  > position — because the act produces no artifact the consumer can see and
  > a consultation that never happens generates no event to hook.

  `consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:18`

  — and the block above is Kogaki's own instantiation of it, chosen here and
  amendable here. Recorded that way deliberately: treating a format as
  ratified when what was ratified is the property it instantiates is the
  defect kogaki#32 cost a spec correction, and the distinction is what keeps
  a later reader from quoting this block as though the hub had served it.

  Two consequences follow from the shape rather than from taste. **Line one
  is unchanged from v1**, so every receipt already in git history stays
  parseable and the `PIN` anchor at `checks/check-consult-receipts.sh:47`
  needs no change; and **each re-framing gets its own `query:` line**, which
  is what makes "record the queries verbatim" checkable rather than
  aspirational when a consult took more than one framing.

  The request id is a join key, not a read: it lets
  the consumer's receipt (the question) be paired with the server's
  access-log row (the answer) **without either side reading the other's
  state**, so the sidedness above is preserved rather than weakened — the
  pair becomes readable to whoever holds both, and to no one who holds one.

  The outcome token is the hub's ratified triple, quoted rather than coined:
  **`discriminating`** | **`covered-after-reframing`** |
  **`uncovered-after-N-framings`**. The middle value is the load-bearing one
  and a bare `miss` is inadmissible in its place, because an empty result
  cannot by itself distinguish a surface that lacks the position from a query
  that failed to reach it —

  > a consult miss is a distill bug OR a query defect, and re-framing at a
  > different axis is the discriminator that must run before "uncovered" is
  > recordable

  `consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:59`

  — which is why **recording the queries verbatim is part of the same
  requirement and not a separate nicety**: the token states which of the two
  causes was found, and only the queries let a later reader check that the
  re-framing actually varied the axis. Both halves are what make
  miss-harvesting a grep rather than an interpretation, feeding the map's
  postmortem field above (kogaki#25, corrected kogaki#32).

  **The receipt is EMITTED BY THE TOOL THAT PERFORMED THE CONSULT; a
  hand-composed receipt is a MARKED EXCEPTION** (kogaki#66). Everything above
  specifies the artifact and leaves its *producer* unnamed, and that silence is
  what the shipped defects were made of: a receipt transcribed by hand from a
  gateway answer minted an outcome vocabulary the hub had never served, while
  the ratified triple sat unread in the transcribing session's own context
  (kogaki#32), and a `request_id` was later copied across two receipts with the
  outcome reversed (kogaki#75). Both are transcription defects, and neither is
  reachable when the transport that made the call composes the block itself: it
  holds the real `request_id`, it holds the framings it actually ran, and it has
  nothing to remember.

  The served ground is that the emission must ride the act:

  > The emission must ride the ACT rather than a later check, because an
  > obligation cannot be blocked at all — an absence produces nothing to deny
  > or fail — so the only available mechanism is that the act writes its own
  > record in a shape whose absence is greppable.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:18`

  That line is quoted here for the *producer* rather than for the position: an
  act that writes its own record is one whose writer is the act. This is
  constrain-what-can-be-produced rather than detect-what-was-produced, so
  `checks/check-consult-receipts.sh` is **unchanged** — it validates shape, and
  shape does not move when the producer does. Moving the producer makes the
  kogaki#32 class *unproducible*; the check keeps catching it for the exception
  path below, which is exactly the division the typed improvement loop asks for.

  Three conditions bound the clause:

  1. **The emitting tool is the one that made the call** — the kit's own
     transport (`policy/kit/bin/gateway-query.mjs`, which today contains no
     receipt-composition code at all: verified, `writeThenExit` at
     `policy/kit/bin/gateway-query.mjs:41` prints the tool result and exits).
     A tool that did not perform the consult may not emit its receipt, because
     then it is transcribing.
  2. **A hand-composed receipt stays admissible and is MARKED as the
     exception.** An operator consulting through a surface the kit does not
     mediate — the MCP tools called directly, a degraded environment where the
     transport is unreachable — still owes a receipt, and refusing one there
     would convert an obligation into a silence. The exception is *marked*
     rather than tolerated: it is the one path where the shape check is the only
     control, and its rate is the signal that says how much of the seam the
     transport does not yet cover.
  3. **What the tool may assert is bounded by what it observed.** The
     `request_id` and the `query:` lines are facts the transport holds; the
     `outcome` token is a *reading* of whether the answer discriminated. The
     served surface declines interpretation-at-consult-time on the **hub** side
     and draws the boundary at pre-ratified renderings — "what is declined is
     *interpretation performed at consult time* — serving richer **pre-ratified**
     artifacts is the adopted answer"
     (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:307`)
     — which permits consumer-side reading and settles nothing about who
     performs it. A tool assigning `uncovered-after-N-framings` mechanically may
     assign it wrongly, and that is the precise failure the re-framing
     discriminator exists to prevent
     (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:59`).
     So this spec binds the *emitter* and does not bind the *assigner*.

     **`deferred-slot: consult-outcome-token-assignment` is FILLED** (owner
     decision 2026-08-06, kogaki#66): **the operator supplies the token.** The
     transport emits only what it observed as fact — the `request_id`, every
     `query:` line, and the framing count — and takes the `outcome` token from
     its caller, **failing rather than guessing** when none is supplied.

     The alternatives, recorded because a decision without them is an assertion.
     *A1 — the tool assigns mechanically*, deriving the token from the return it
     saw. Declined: the token is a reading, and a tool assigning
     `uncovered-after-N-framings` mechanically may assign it wrongly, which is
     the precise failure the re-framing discriminator exists to prevent.
     *A3 — split by decidability*, the tool assigning only tokens decidable from
     transport facts (`degraded`, and an unreachable gateway) and requiring the
     caller for the rest. Declined as the more complex shape for no gain here:
     the split's own boundary is a judgment about which tokens are decidable,
     so it reintroduces at the schema level the reading it removes at the call
     — and the degraded case already has its own carrier in condition 2's
     marked exception.

     The discriminating served position, quoted verbatim at its pin:

     > ask first whether the thing is a fact or a judgment: a fact gets a
     > mechanical carrier at the moment it is decidable, and a judgment rides a
     > gate that already exists

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:58`

     supported by the carrier rule, on where a pending human reading is carried:

     > a pending human verdict needs its carrier at the render layer, because
     > the human acts on what they see and not on what the authoritative file
     > contains

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

     Condition 3 above had already classified the token on the judgment side —
     "the `outcome` token is a *reading* of whether the answer discriminated" —
     so the fill applies the fact/judgment split this spec had already made and
     stopped one step short of executing. `request_id` and the `query:` lines
     are facts the transport holds and it emits them; the reading rides the
     gate the caller already is.

     **The ordering is disclosed rather than presented as clean.** PR #101
     (story 1.20, open at the time of this decision) already ships `--outcome`
     as a required argument with no inference. Its author framed that as story
     1.20 AC 4's **refusal** — "the emitter does not silently choose an
     assignment strategy … **This criterion is a refusal, not a fill**" — rather
     than as a fill, and the refusal happens to coincide with A2. That is
     fortunate, not procedural: **the code was written before this record
     existed, and this record ratifies it rather than following it.** Had the
     owner selected A1, PR #101 would have needed to change. The deferred-slot
     clause asks for the decision *before* code embeds the choice, and on this
     slot the sequence ran the other way round; recorded here so the next
     reader does not mistake the agreement for compliance.

## 5. Port manifest (anything unnamed is dropped by decision)

Admitted from writing-assistant, each with its contract; ported one
subsystem per PR through the gate above:

1. **Terrain** — the survey/selection surface; completeness as a cover
   counted in placements; presentation-only grouping; the second-proposer
   boundary.
2. **The Brief and its four gates** (thesis, journey incorporation,
   structure composed from the Brief's own state, plain register with
   round-trip concessions) — the design/realization boundary test.
3. **The owner-facing proposal contract** (Where/Why/effect-stating labels;
   machine-proposed options plus free text; payload capture).
4. **The gate carrier** (declared gate registry, AskUserQuestion evidence,
   payload/answer capture) — with rendering through the question UI as
   contract, not discretion.
5. **Run-record/workspace machinery** (checkpoints, resume, block mode as
   opt-in dev control, durable Brief home).
6. **The style contract and plain-register commitment**, consumed at
   generation.
7. **Review** — findings-only, one dimension: conformance to the named
   contract, citing the clause; plus the citation resolve check.

**The list is a manifest, not an order — except where a member's contract
depends on another's** (kogaki#14, 2026-08-05). Terrain's screens present
selections, so item 1 is sequenced **after** items 3 and 4: the owner-facing
proposal contract and the gate carrier port first, each as its own PR with
its own contract. The alternative — folding a "minimal form" of 3 and 4 into
the Terrain port — is refused, because admitting a subsystem without its
contract is the manifest's own named failure mode:

> "the PORT MANIFEST is the load-bearing artifact: a subsystem is admitted
> with its contract, or its defect class returns. … A rebuild's failure mode
> is never that it fails but that it succeeds at everything except the
> subsystems nobody remembered were carrying a contract"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:27`

No other member is sequenced here. A later port declaring its own precondition
amends this clause rather than inventing a second ordering carrier.

Explicitly **not** ported: probe, harvest and fact sheets, the sources
gate, the provenance map/judge, the interview's depth and audience mandated
asks (their questions re-site to the Brief or to platform-profile
onboarding), and the 170-member check suite (checks re-earn admission
individually).

## 6. Non-goals

Prose generation from repositories; measurement storage or transport;
writing to the Gukan substrate (proposal-only contribute-back stays the
sole path); a second knowledge store of any kind.
