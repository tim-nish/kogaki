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
