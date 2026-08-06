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
     comparison is over the diff **against the base**, so a base that moved
     yields a different diff and no carry-forward; and an equality that cannot
     be computed — either diff unreadable — is **not** a carry-forward but the
     existing `stale` state, failing toward the reviewed side, on the same
     ground clause 1's head-unknown state already occupies. This is
     per-artifact-decidable at the merge layer, the admissible state clauses 1,
     5 and 6 already occupy, and it adds no judgment clause: whether the diffs
     are equal is a computable fact over two artifacts the check can read.

     `deferred-slot: report-base-resolution`

     — **how the check obtains the base of head A**, which is the one input
     this clause names and does not supply. A report records the head it
     reviewed (`review-lane report: <head sha>`) and **not** the base it was
     diffed against, so "the diff that report reviewed at A" is not yet
     recoverable from the record. Three resolutions, stated without selecting
     among them: **(a)** use the PR's *current* base, which is free and is
     wrong exactly when the base moved — the case the paragraph above relies on
     to refuse a carry-forward; **(b)** use the merge-base at A, which is
     computable from history alone but re-derives a fact rather than reading
     one, and can differ from the base CI actually used; **(c)** record the
     base in the report, which makes it a read rather than a derivation and is
     the only option that survives a rewritten history — at the cost of a new
     report-grammar field and of binding reports written before it ships to
     (a) or (b) anyway.

     The fork is **inside this clause's own weakening**, not beside it: the
     admission of a second instrument is only as strong as its base
     resolution, and (a), (b) and (c) do not merely cost different amounts —
     they make the carry-forward correct in different circumstances. Named
     rather than left to the implementation, per the deferred-slot clause
     below: filling it is a decision act owed on kogaki#96 with its choice,
     alternatives and consult receipt **before** code embeds it. The recorded
     recomputation, the round-counter guarantee and the fail-toward-`stale`
     bound are all implementable without filling it, which is why this clause
     ships with the slot open rather than waiting on it.

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

  **Two clauses bind the review's own conduct**, and belong to the lane
  rather than to the gate: the review opens with an **unscoped tier-1
  `gloss_index` survey** as a fixed first move — where to look is an output
  of the survey rather than a heading the reviewer supplies — and **the seam
  is never asked for a verdict**: the review supplies the claims, the seam
  supplies the positions.

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
     So this spec binds the *emitter* and does not bind the *assigner*:

     `deferred-slot: consult-outcome-token-assignment`

     — who assigns the `outcome` token when the tool emits the receipt: the tool
     mechanically, or the tool emitting the framings and their count with the
     operator supplying the token. Named rather than left to the
     implementation, per the deferred-slot clause above: filling it is a
     decision act owed on kogaki#66 with its choice, alternatives and consult
     receipt **before** code embeds it. Conditions 1 and 2 are implementable
     without filling it, which is why the clause ships with the slot open rather
     than waiting on it.

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
