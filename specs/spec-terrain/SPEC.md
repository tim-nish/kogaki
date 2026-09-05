# SPEC-terrain — the survey/selection surface

**Status:** v36 (kogaki#857). This file carries the **current contract only**.
History — superseded behaviour, defect specimens, version ledgers, withdrawn
proposals, ratification quote-trails — lives in git and in the issues.

**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

**The forward rule.** A removed owner-facing behaviour is **gone** — no refusing
stub, and never a prose restatement of what it used to do. A superseded behaviour
kept as a record in an operative carrier is material a later re-cut reads back in,
which is how a removed surface returns.

## What this file is for, and what it is not

**The runtime never reads this file.** It reads three JSON carriers. This prose
exists for LLM sessions at judgment points and delivery, for the owner, and for a
future implementer facing a semantic rule no carrier can hold.

**The precedence map — the carrier wins, per axis:**

| axis | carrier | this file |
|---|---|---|
| rendered form: surfaces, line classes, tokens, limits | `src/report-format.json` | §14.1 states the precedence; the grammar states the form |
| sequencing, waits, write bindings, judgment-point placement, entry-point accounting | `src/workflow.json` | §15.1 states the precedence; the table states the plan |
| the survey record's shape: candidate model, claims, subdivision | `src/survey-schema.json` | §5, §7, §8 state what the shapes *mean* |

Where a carrier speaks, this file stops being the contract. Prose restating a
carrier is a drift surface, and its absence here is deliberate.

**Every section below carries a `necessity:` line** — the one reason it cannot
live in a carrier. A section whose reason cannot be stated is deleted.

Authored here, in the consumer, never ported as hub text.
`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:23`

## 1. Sequencing — the decision this spec was required to make

`specs/SPEC.md` §5's ordering clause is the carrier.
Terrain's displays present selections, so they depend on manifest items **3**
(the proposal contract) and **4** (the gate carrier).

**The refusal is a boundary, not a preference:** a Terrain implementation that
grows its own proposal-rendering or gate-payload affordance has built the refused
alternative under another name.

`necessity:` a prohibition on building something. No carrier can hold the absence
of an affordance.

## 2. The inherited contracts

The manifest's own three, inherited unamended. This spec binds their
**application to Terrain**.

### 2.1 Completeness is a cover counted in placements

Every Strand appears in at least one section; Strands with no relation go in an
**explicit named section**. Nothing is silently dropped.

**The count runs AFTER composition.** A figure computed over the candidate set
rather than the composed placements measures the wrong thing and reads as a pass
while material is missing.

**Every figure names the family it counted.** The served vocabulary is three
terms — Strand (Lesson|Journey), thread-line (Decision|Position), Thesis — and no
umbrella over Strand and thread-line is minted. A bare count is a defect, not a
terse rendering.
`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`

`necessity:` *when* a count is taken and *what it must name* are semantic. A
grammar can check that a family word is present; it cannot check that the number
was computed after composition or over the right population.

### 2.2 Presentation-only grouping

Sections gate nothing. A navigation step carries **no selection authority** —
moving between displays, expanding a section, or changing the grouping axis never
narrows what the owner may choose. Grouping is a view over the candidate set,
never a filter on it.

This governs what grouping may do to a candidate set; it says nothing about what
the set *is*. §5 fixes that separately, and the two are deliberately not merged.

`necessity:` a rule about authority, not about output. Nothing in a rendering
distinguishes a view from a filter.

### 2.3 The second-proposer boundary

A combination becomes a **proposal** exactly when something other than the owner
narrows the candidate set.

- **Navigation** (no proposal): enumerate, sort, filter-by-owner.
- **Proposal** (routes through item 3's contract): rank, trim, hide.

An act in neither list is a **report**, not a choice: Terrain surfaces it as
unclassified with its reason and takes no narrowing action.

**Where the disclosure is owed.** The `Classification:` and `Narrows nothing:`
lines are owed by a surface that **selects** — one whose rendering is a subset of
something larger. A surface that **enumerates its population completely**
discharges the boundary **structurally**: there is no subset to disclose.

**The carrier is the surface's own allowlist, never a per-surface prohibition.**
A complete-enumeration surface declares its line classes under
`non_member_fallback: REFUSE`; the disclosure lines are absent because nothing
undeclared may render, not because they were named and forbidden. An enumerated
prohibition's non-member fallback is admit, which is the shape §9 chose against.
`consulted: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d topics/articles.md:149`

`necessity:` the discharge is an argument about why an absence is sufficient. A
carrier can hold the allowlist; it cannot hold the reason the allowlist is the
right instrument.

## 3. Inputs — served renderings only

Terrain reads through the seam, consumer `kogaki`: `element_survey`,
`gloss_index`, `glossary_entry`, `topic_thread`. The repository-invisible
boundary (`specs/SPEC.md` §2) and the substrate-internals boundary
(`specs/SPEC.md` §4, `policy/consultation-map.md` entry 2) apply in full: Terrain
reads **served renderings**, never the state the gateway keeps to serve them.

**A resolver cites what it read, never what it was asked for.** Where a served
answer's citation and content disagree, the disagreement is surfaced rather than
resolved — a well-formed citation to a file not containing the quoted material
passes every downstream resolve check.
`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:130`

`necessity:` a boundary on what may be read. Reading the wrong thing produces a
well-formed artifact, so no output check can detect it.

## 4. Out of scope, by decision

Any proposal-rendering or gate-payload affordance of Terrain's own — items 3 and
4, and §1's refused alternative. Also out, per `specs/SPEC.md` §5: probe,
harvest, fact sheets, the sources gate, the provenance map/judge, the interview's
mandated asks.

**IN scope by decision: the provenance-neighborhood surface, §13.** Named here
because this is where a reader checks whether a surface is admitted, and a
surface admitted only in its own section is admitted where nobody looks.

**Why it is not the refused affordance.** §2.3 fixes "proposal" to **narrowing**.
A widening view narrows nothing, so it grows no proposal-rendering affordance —
"propose-only" in the neighborhood's vocabulary means *suggests without gating*,
which is this spec's **report**.

`necessity:` an enumeration of what was decided against. Absence of code is not
evidence of a decision.

## 5. The candidate model — Lessons-only rows, Journey marked by absence

**The candidate row is one Lesson.** A Journey is a **mark on its Lesson's row**,
reading by **absence** — a Lesson with no Journey is decorated. Every display
showing candidate rows **states its denominator**, in Lessons.

The load-bearing half is the denominator, not the mark: at high Journey coverage
a presence-mark decorates nearly every row and discriminates between none, and
the stated denominator is what makes the next coverage inversion visible
on screen. The figure is **re-measured every run**, never quoted from here.

The shapes are `src/survey-schema.json`'s (`candidate_family_must_be`,
`journey_mark_key`, `orphan_journey_rationale`).

### 5.1 Declared divergence — pending hub wording

**This section diverges from a ratified served ruling**, which offers display 2 as
all of a topic's Lessons **and Journeys**. Kogaki proceeds on: candidate rows are
Lessons only, the Journey family derived and marked by absence, the denominator
stated.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:25`

**The refresh is OWED, not done.** No hub ruling has been requested; a later
served amendment supersedes this without argument. Until then this is a
**checkable proposal**. A Terrain carrying lessons-only rows *without* this
section is the silent-promotion hazard realized — the absence is the defect,
not the code.

**Scope: item 1 only.** §§6, 7 and 8 rest on ratified ground and diverge from
nothing.

### 5.2 What would falsify §5

The completeness invariant binds **placement**; §5 changes the **candidate set**,
one step upstream of where the invariant watches. That is the honest objection.

**Why the design survives it.** Every Journey has a Lesson of the same slug, so
the family is representable without loss: Lessons plus marks reconstructs the
Strand set exactly. The reduction is a **re-projection, not a drop**.

- **Falsifier 1 — an orphan Journey.** A Journey whose slug matches no Lesson has
  no row to be marked on. Computed every run (`orphan_journeys`); any value above
  zero falsifies this section, and Terrain **refuses the survey**, naming the
  orphan slugs. Carrier: a generation-time refusal, fixture-verified.
- **Falsifier 2 — coverage saturation.** At 100% coverage the marks inform
  nothing and the rationale expires. Reopen at **coverage ≥ 99%**.
  **`instrument: none`** — nothing reads this. It fires by a human noticing a
  percentage, and its failure mode is *fired-and-unread*. It must not later be
  quoted as though the design were mechanically protected against saturation.
  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9`

Both are properties of the **served corpus**, not of Kogaki's code.

`necessity:` §5.1 is a declared divergence pending an external ruling; §5.2 is a
falsification condition with one arm explicitly uninstrumented. A carrier can
hold neither a proposal awaiting ratification nor a disclosed absence.

## 6. Navigation — the co-tag second step

### 6.0 The pre-selection listing RIDES THE FIRST-TAG GATE, and writes nothing

**The CoTagGroups display is the rendering of the co-tag groups** — the surface
§6.3's two-act window operates on, and the one state that writes
`reports/CoTagGroups.md`. The pre-selection tag listing is **not** part of it.

**The channel: the listing is carried in the gate declaration.** `TAG_SELECTION`
is a gate wait. Its declaration carries the `tag_listing` surface over the run's
own survey record, byte-for-byte and under that surface's grammar, and the
session renders those bytes **before** the question. **No invocation is printed
for the owner to run** — the owner types nothing.

**The question is short and the table is not inside it.** Exactly two ways to
answer exist: free-form entry of a tag name, and one standing option standing for
a method other than co-tags, which is routed nowhere because no other method
exists yet. The standing option is the **premise negation** the gate owes: every
option here is generated on the premise that co-tag grouping is the method, and a
free-text escape is not sufficient, because it is the option a hurried operator
skips.
`consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:198`

**Routed nowhere is REFUSED BY NAME, never silently accepted.** Selecting the
standing option records the capture — the answer is evidence — and then refuses
the advance, naming the option and leaving the wait outstanding so the gate can be
re-offered. The routing is declared per gate in `src/gate-registry.json` and rides
into the run declaration, so the executor names no state. Without this the option
id lands where a tag name goes and a later state refuses it as a malformed tag,
which misdescribes what the owner did.

**Why not print it.** In the Claude Code harness a tool call's stdout is
displayed to the model, not reliably to the owner, so a contract binding owner
delivery to printed output is unsatisfiable.
`consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:98`
Nothing relies on stdout reaching the owner, and no session retypes the table,
because the bytes ride an artifact the session renders rather than a stream it
must relay.

**There is no per-tag row view and no co-tag selection display.** The tag listing
rides the gate declaration above, and the CoTagGroups display is reached by
selecting a tag at that gate.

Selecting a tag displays the other tags its members carry, grouped by co-tag,
with counts. Navigation in the full §2.3 sense: deterministic, complete, nothing
hidden, no ranking. **Machine-composed connective prose is admissible**, and the
invariants bind *harder* with a model in the loop — composed prose stays a
permutation and carries no selection authority.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:110`

### 6.1 What the CoTagGroups display SERVES

**Per group:** the **GroupID**, the **GroupClaim** (§7's composed "in common:"
line), and the **member Lesson IDs**. Where §8 binds, members are served as
SubGroups (§6.2). Every figure names its families (§9).

**The display carries no per-Strand Gloss line and no Journey line** — those live
in the Full Report (§12). The cost is real: an owner reading the display sees
Lesson IDs and a composed claim with no per-Strand headline until they open the
report.

The claim renders **beneath the heading, whole** — never clipped — for every
group, subdivided ones included. The line shapes are
`report-format.json`'s `surfaces.cotag_groups`. Where SubGroups render, **only the member list
moves to them; the parent's own Lesson count stays on the heading**, because that
count is one side of `subgroup_members_sum_to_parent`.

**Indentation is not the hierarchy carrier; the GroupID is.** Claim lines are
long prose that wraps at the terminal edge, and a continuation begins at column
0 — so hierarchy would vanish exactly where text is longest. The level lives in
**content**: `G<n>` is a Group, `G<n>-<m>` one of its SubGroups. Every line
renders flush left.

**No flat slug dump.** Every Lesson ID reaches the display inside at least one
Group.

**Purpose clause, because the display is judged against it.** Terrain supports
**beginning** Brief creation; its job is surfacing which combination of Lesson
IDs the owner would enter. **A display with no visible Lesson IDs fails that
purpose regardless of what else it shows.**

### 6.2 SubGroups on the CoTagGroups display, and the threshold

**The threshold is TEN**: a composed group at or above 10 members must serve
SubGroups, and a judged-empty outcome for one is refused at render. Below it,
SubGroups appear where the judge's coherence label and §8's disclosures put them.

**Three grouping rules:**

1. **SubGroup member counts sum to the parent's total, and an unplaced member is
   a refusal naming it.** Every member placed, nothing dropped, nothing swept.
   Enforced at two altitudes — over the placement record before any text
   exists, and over the rendered text by the grammar's own decidable rule.
2. **The display judges its SubGroups; it does not merely render them.** A
   SubGroup the engine composed and stamped with a verdict no judge reached is
   the defect this rule exists against.
3. **A suppressed split is disclosed, never silent.** A group rendering flat
   where a split was possible says so.

### 6.3 The post-tag-selection window — exactly two acts, and no question

**Read §6.0 first.** This governs the window that opens once a tag is selected.
Exactly two acts occur in it, and **a question UI in this window is a defect**.
The fallback is **REFUSE**, not report-only.

**The fork is closed.** A tag named by the owner lands directly at the
CoTagGroups display.

**Scope: this allowlist governs the post-selection window only.** A question
elsewhere in the flow is governed elsewhere.

**What this does not claim.** The clause is advisory at the model's composition
layer; the runtime half is `workflow.json`'s wait placement.

`necessity:` §6 is where the surface's *meaning* lives — what the CoTagGroups
display is, why the channel is the owner's terminal, what it is judged against, and why a
question in the window is a defect. The grammar holds the line classes; none of
it holds these.

## 7. GroupClaim-first rendering, and claim pinning

**A claim composed over a member set is PINNED to that set.** A subset selection
recomposes the claim and re-offers it as a **gate event**, never a silent carry.
The original wording survives only in the per-invocation rendering; a recomposed
claim is a **proposal** the owner may decline in favour of the original, with the
recorded member set unchanged.

**The GroupClaim is composed AT the CoTagGroups display, for every group.**

**The origin travels as an ARGUMENT, and the no-record rider stands.** The caller
supplies the origin; nothing persists a second copy.

- **An absent origin is stated, never fabricated.**
- **A DERIVED origin member set announces itself as derived**, so a reader can
  tell a recorded set from a reconstructed one.

The record shapes are `survey-schema.json`'s `group_claim` and `adopted_claim`.

`necessity:` pinning is a semantic relation between a claim and a set, and the
re-offer is a gate obligation. A schema can require a member pin; it cannot
require that a changed set produce an owner-facing event.

## 8. Semantic subdivision — a judged substrate one level down

**The judgment is ONE COHERENCE LABEL** over three affinity values and a
residual. `other` is **not a fourth affinity**: it is the residual, and the
distinction carries weight — an affinity is a claim about why members belong
together, and the residual is the absence of one.

**The judge duty for `other`, which the harness cannot verify:** a member lands
in the residual because no affinity was found, never because sorting it was
inconvenient.

**Every declared config key is enforced mechanically.** A key declared with no
refusal reading it is a **defect, not a default**. The numbers live in the
**format carrier** — `report-format.json`'s `limits` — never in code and never
here: `subgroup_member_cap`, `min_subgroup_members` (M), `max_residual_members`
(N), and their `_why` siblings.

**M exempts a SubGroup holding the whole parent group**, keyed on a **structural
fact** rather than a size: the SubGroup *is* the group. **M does not bind the
residual**, deliberately — the residual is not a claim about affinity, so a
minimum-coherence floor has nothing to measure there. The asymmetry is stated so
it is not "tidied" later.

**Two disclosures, disjunctive.** A degenerate claim — one true of every member
at the size served — is disclosed, and so is a suppressed split (§6.2).

**The split decision is the engine's at ten or more.** Its ground is arithmetic
rather than taste, and the two carriers holding the threshold are checked against
each other.

The record shape is `survey-schema.json`'s `subdivision`, including `coherence`.

### 8.1 Measurement before offering

Subdivision ships **dogfood-first**, and the ordering ran to completion: the
verdict is **REQUIRE**, not offer.

**The hub-side gate pointer stays NAMED and is not claimed as discharged here.**
Anything reaching the hub is a proposal through its own intake, never an edit
from this side.

**Precedence is declared per axis:** the hub owns the **ordering** axis
(measure-before-offer); the owner owns the **verdict** axis.

`necessity:` §8 holds what the numbers *mean* — why `other` is not an affinity,
why M exempts a whole-group SubGroup and not the residual, and what duty the
judge carries that no check can see. The carrier holds the numbers.

### 8.2 The second-proposer boundary is unchanged by §§6–8

Subdivision groups; it does not narrow. §2.3 is untouched.

## 9. Rendering — headlines, and every figure names its families

**Gloss headlines per Strand.** A candidate row carries its served Gloss
headline, quoted at its pin, never re-composed.

**Every emitted figure names its families**, per §2.1. A bare count is a defect.

**Display 1's tag rows carry a declared ALLOWLIST** — the tag name and the Lesson
count, and nothing else. Its non-member fallback is REFUSE, and this is the shape
§2.3 cites: an enumerated prohibition's fallback is admit, which is what was
chosen against.

**The refusal is generation-time:** constrain generation, then detect what
generation cannot constrain.

**The per-section family split lives in the RECORD**, recomputed rather than
carried forward.

`necessity:` the allowlist is in the carrier; the *reason* it is an allowlist
rather than a prohibition is a design commitment a grammar cannot state about
itself.

## 10. Parked, with grounds — the Lessons-or-Decisions opening gate

**Parked, not decided, and not built.** A two-family entry gate offering Lessons
or Decisions was considered; both joins were declined and **no umbrella over
Strand and thread-line was minted** (§2.1).

**Trigger:** it fires after article creation from Lessons is working, and it
fires **at an act that already happens** — the first composition sitting that
wants a Decisions path — never silently and never on a schedule.

**The standing tension this parking leaves open**, rather than resolving it: §5
narrows candidate rows to Lessons while this gate contemplates a second family.

**What a later unparking owes**, so it is an act rather than a mood: the
address-conjunct's disposition — either a Decisions path that resolves, or a
recorded decline with its ground.

`necessity:` a parked design with a reopen trigger. There is nothing built for a
carrier to hold, and the trigger binds at authoring time.

## 11. Open — carried as questions, never as contract

**THE COMPOSITION PIN AND THE TYPED CLAIMS RECORD.** The skill's hard line
"Compose from `compose-input`, never from the whole survey" is instruction text,
advisory to something whose job is to satisfy instructions. The carrier is a
refusal keyed to the composition input and **bound by CONTENT rather than
presence**: `compose-input` emits a pin — the tag, the survey record's pin, and
the member set served per group — and `cotags --claims` refuses when the claims'
member set is not a subset of it, **naming the members outside**.

**Why content and not presence.** A stamp asserting a bounded read is satisfiable
by asserting it; a subset relation makes composing outside the bounded read
**unproducible** rather than discouraged.

**Scope boundary:** `--subdivisions` has its own typed form for its own reason
(§12.1) and is not folded in here.

**Still open, and carried as questions:**

- **Whether a figure takes a fixed first-position line.** Specced burial is real:
  a contract that sorts output into buckets makes an editorial judgment about
  reader priority, and the bucket names are where it hides. Undecided.
- **Whether "sort" can narrow in practice.** §2.3 places sort under navigation.
  Whether a stable sort over a truncated view narrows the candidate set is
  undecided.

The co-tag group ordering is **not** an open question: the runtime ships a
declared sort — `COTAG_SORT`, "co-tag name ascending, then member id ascending",
deterministic, printed on the display, and navigation under §2.3.

`necessity:` open questions are, by definition, not in any carrier. Carrying them
here is what stops a later sitting re-deciding them silently.

## 12. The Full Report — untruncated material, keyed to what produced it

**What it is.** For a co-tag view, the **untruncated** material: GroupClaim and
per-Strand Gloss, for the entered ID set. Generated **on the owner's ID entry**,
one report per entered set.

**It is a REPORT, and therefore not a choice.** It ranks nothing, narrows
nothing, hides nothing. **It is a RENDERING, and therefore not an address** — not
a citable artifact (§12.2).

**The multi-section form** — what repeats per entered id and what appears once,
aggregated — is the grammar's. **The title names the TAG, never the ids**, so it
stays short and stable across pulls.

**THE SORT IS NUMERIC-AWARE.** `G5-1` sorts before `G10`, not after.

**What the owner gives up, stated rather than discovered:** section order is the
id order, so a reader wanting thematic order re-reads rather than re-sorts.

**The served-lines map is sited once at the report's end and its rows are bare.**

The rendered form is `report-format.json`'s `surfaces.full_report`.

### 12.1 Identity — the quadruple

**(substrate pin, co-tag query, judge pin, neighborhood judgment record).**

- **The co-tag query is the pair (selected tag, entered id set).** Two reports
  are the same report when both match. Group names are composed, so the tag is
  the stable half.
- **The judge pin is the third component, always.** The arity is **uniform**: a
  key whose shape depends on the report's own content is a key nobody can
  compute without the content. Where no judged material exists the pin is the
  typed literal `none` — and **`none` on a co-tag-generated report is
  non-conformant**, because that path always reaches a judgment. `none` and an
  empty SubGroupClaim set are **not synonyms**.
- **The fourth component is the neighborhood judgment record.** The
  discriminator is **who is in the report**, not what it says: the neighborhood
  judgment changes which candidates are displayed at all, because §13.4's fill is
  level-ordered.

**The record carries a digest of the composed inputs, RECORDED and never KEYED**
— for the claims and the subdivisions. The discriminator is again membership: a
claims or subdivisions record changes what a section *says*; the neighborhood
judgment changes *who is in it*.

**The cost is stated rather than discovered.** Re-pulling a set with a better
judgment produces a different report under a different identity, and the earlier
one is not superseded automatically.

**The subdivision input is a typed per-group record**, never a catch-all, and a
judged-empty group's `members` stay populated. Resting the boundary between
"judged empty" and "not judged" on an empty list makes the two indistinguishable.

**A breaking change to a composed input owes an executable conformance fixture**
in the same act.

**The pin is the mismatch check**, with the served surface authoritative. **A
report generated under a superseded pin is never silently refreshed** — it is
disclosed.

### 12.2 Location and naming

**Two artifacts, two rules.**

- **The owner rendering is `reports/FullReport.md`** — a fixed human name,
  overwritten on every pull, exactly one in the tree. Identity and idempotence
  are carried by the **machine record alone**; the rendering is a pure function
  of it.
- **The machine record is identity-named**, and that is what identity-naming is
  *for*. Both report paths join the renderings directory with the literal
  `FullReport.md`, so no identity digest can reach a rendering filename: the
  defect is **unwritable rather than detected**.

**Repo-visible, NOT committed.** `reports/` is `.gitignore`d, so visibility and
publication are decided separately. **Consequence: a Full Report is not a citable
artifact.**

### 12.3 Thesis candidates — the early image, and it binds nothing

**The report carries a fixed Thesis-candidates section**, immediately after the header so the early image is read first.

**What it is for.** It lets the owner form an early image of the Theses this
Strand set could support. **It binds nothing**: the Brief's eventual Thesis is
unconstrained by it. The non-binding line renders **on the surface** and not only
here, because the Brief lane cannot yet select or discard Strands — so the
desired combination must be completable inside Terrain.

**Harness-fixed form, judge-supplied content.** Every rendered line is a declared
grammar class; the LLM controls claim text and strand picks, never the design.

**The bounds are RUNTIME REFUSALS, and the siting is the finding.** The candidate
count, the 2–8 strand arity, and membership of every named display id are
**runtime** refusals, not grammar rules — `full_report`'s `line_class_allowlist`
carries bare placeholders on three body classes, so a class declared for these
would police nothing. **None of these can live in the grammar, and that is why
they are here.**

**The absent input renders the section and says it is empty.** Omitting it makes
*no candidates were composed* and *this section does not exist* the same silence.

`necessity:` §12 holds what identity *means* — why membership discriminates,
why the arity is uniform, why `none` and empty are not synonyms — and the bounds
the grammar provably cannot carry. The rendered form is in the carrier.

## 13. The provenance neighborhood — a widening of the settled Strand set

### 13.0 The defect, and what this section establishes

A settled Strand set can omit material that shares provenance with it. §13
establishes the **surfacing** conjunct and leaves the **quality** conjunct open:
whether a widened set makes better articles is not decided by this section.

### 13.1 What it is under §2 — a report, never a proposal

**The artifact is a section of the Full Report.** It is not a display and has no
display of its own.

**§2's three inherited contracts are untouched, and this is the load-bearing
half.** A widening view narrows nothing, so no divergence is owed and no
proposal-rendering affordance is grown.

**What grammar coverage buys, and what it does not.** Covering the section in the
grammar constrains its *form*; it does not make the suggestions right, and a
reader must not inherit an exemption the coverage never granted.

### 13.2 Input is the SETTLED STRAND SET ALONE; the trigger is the ID ENTRY

**A claim-shaped input is dead input here** — the substrate is provenance, not
claims.

**The trigger is an explicit owner act naming a bounded set**: the report pull's
id entry. **One enumeration per run.** Noise is a property of trigger *timing*,
not of volume: fired too early, a widening is just as noisy.

**Terrain ENDS at Strand exploration.** This is not a third sibling entry point.

**What trigger timing does not cover:** it decides *when* the expansion runs, not
whether its output is good.

### 13.3 The substrate, and the join that does not hold by equality

**ONE substrate.**

**The join does not hold by equality, and it fails silently.** A lesson's origin
id and the batch record's id are not the same key. So the resolver joins through
the batch record's **`members`**, which is family-keyed, and an **unresolvable
seed is marked rather than dropped**.

**The bound is traversal — substrates × depth — and its values are FIXED and
declared**, reviewed once and diffable, so an implementation cannot pick them per
run. **This is a bound, not a filter**: a filter over the rendered set would
change *which* neighbors are surfaced; the bound changes only how far the walk
goes.

### 13.4 The section's shape

**Exploration.** For each Strand of the Group the mechanical layer collects
provenance neighbors. **The judgment layer runs over the mechanical candidates
only** — it cannot introduce a candidate the walk did not find.

**Display: up to ten rows, filled in level order.** The row shape is the
grammar's; three properties of it are not.

- **The named member is the SETTLED one, never the substrate's instance key** —
  the two are different identifiers and only one is a join key (§14.3).
- **The Gloss fetch is bounded by the rows that render**, addressing both
  namespaces, so the corpus-wide prefetch §9 forbids is unreachable from here.
- **Four Gloss states, four renderings** — collapsing any two asserts something
  false about one of them, and **addressability is a property of the ROW**,
  decided first. **The seam state is declared unobservable from this path**, with
  a reopen trigger: the first Gloss caller here that reads softly.

**An unjudged candidate is not a state.** J3 refuses a judgment
record leaving any mechanical candidate uncovered, and `full_report` refuses to
render an unjudged neighborhood. **Both the enumerating compute state and the
judgment point are unconditional** in `workflow.json`.

**J3 refuses three ways:** a judgment key naming no mechanical candidate; a
mechanical candidate no key covers; and a level outside the harness-fixed set.

**The display fills to ten deterministically, in the harness.** The cap no longer
binds as a refusal. **The truncation line is answered by the counts, not by the
sort.**

**§13.0's silent-exclusion duty is discharged on the surface.** The enumerator
marks what it could not resolve, and **the two gap kinds partition, with only one
displacing**: a **seed** gap means no walk happened and displaces the empty form;
a **member** gap means the walk ran and one listed member is not served.

**The empty enumeration keeps its two-line form** where every seed resolved.

### 13.5 The extend-or-discard gate

**The entry condition is two-armed, and the arms are different jobs.** A layer
entering on **misses** is a recall mechanism; one answering the measured defect
is a **precision** mechanism. The distinction is load-bearing, not taxonomy.

**A fired arm records direction; it does not open the gate.**

**The SLOT as a route is closed; the GATE as a condition is not.**

**§13.3's traversal bound is not this gate and must not become it.**

### 13.6 Placement, and the coupling that is refused

**Terrain only.** The Brief's closed-Strand-set invariant is untouched.

**No Move coupling** — a prohibition rather than a scope note.

`necessity:` §13 holds why the join cannot be an equality, why the bound is not a
filter, why the two gap kinds are not one, and what the widening does *not*
claim. The workflow table holds the states; the grammar holds the rows.

## 14. The rendered format's carrier, and the owner-surface display ID

**This section adds no format rule. It moves the rules out of this file.**

### 14.1 The carrier is `src/report-format.json`, and it wins

**One machine-readable grammar is the single carrier of the rendered form.**

**An OWNER SURFACE is any text this runtime prints or writes for the owner to
read.**

**The coverage figure is DERIVED and is not stated in prose, here or anywhere.**
Its rule lives at `workflow.json`'s `owner_surface_coverage` and is **not
restated here**. A restatement beside the prohibition would be the drift surface
this clause exists to close.

**Precedence is declared, not left to the reader.** Where this file's prose and
the grammar disagree about rendered form, **the grammar wins** and the prose is
repaired.

**What precedence does NOT reach.** The grammar governs the rendered *form*. It
does not govern whether the content is right, and a conformant rendering of the
wrong material is not this carrier's failure.

### 14.2 The emitters refuse; they do not report

**The refusal is generation-time**, where §9 already puts it.

**A rule whose token leaves the rendered text leaves the decidable set** rather
than being weakened to keep it. The set itself is `decidable_rules` in the
carrier — `expressible` and `not_expressible`, both enumerated there.

### 14.3 No owner surface renders an element NAME — the display ID does

Displayed output and Full Report alike show **element IDs, never element names**.
The rendered token is the `display_id`, **assigned ONCE in the survey record**.

**Why once rather than per artifact.** The display ID is a **join key**: the
CoTagGroups display, the Full Report and the owner's own entry must all mean the same
row by the same token.

**The accepted cost:** a survey-wide space numbers rows the owner may never see.

### 14.4 Exactly one producer for owner-facing text

**The skill layer never retypes runtime output.** This is a **removal, not a
rule** — the relay stops being a producer at all.

### 14.5 A golden fixture, and what it is for

**One checked-in conformant specimen per surface the grammar covers.** The count
is stated **per covered surface** rather than as a flat number, so covering a new
surface owes a specimen in the same sitting.

**Two assertions per specimen, and the split is REPORTED rather than averaged:**
conformant against the grammar, and byte-equal to the renderer's output over the
committed input. The second runs wherever the check can obtain the surface's
delivered bytes.

**The cost:** one specimen carries two concerns, and a change to either moves it.

### 14.6 How A–E compose

**The neighborhood's id space is disjoint by construction** from the Lesson
display-id space, so a suggestion §13 surfaces can never be mistaken for a
settled member.

`necessity:` §14 is the precedence map itself — the one thing that cannot live in
the carriers, because it says which of them wins. The display-ID rule is a join
constraint across three artifacts, which no single one can state.

## 15. The control plane — a workflow table, and a re-entrant executor

### 15.1 The workflow table is DATA, and its carrier is `src/workflow.json`

**EVOLVABILITY IS THE CONTRACT.** Moving a handoff, adding a wait, or adding an
entry point is a **data** change, licensed by an issue and settled by a dated
owner decision.

The states, waits, write bindings, judgment points, counted baseline and
entry-point accounting are **all in the carrier**. They are not restated here.

### 15.2 The executor is RE-ENTRANT, and no single process owns the run

**ONE entry point, entered once per act.** The executor reads the run record,
performs the act, and returns.

### 15.3 The run record carries CONTROL state, and never a second copy

**It holds no ID→slug map**, and that is a constraint rather than an omission:
§14.3 makes the display ID the join key, and a second map is a second answer.

Lifetime and siting follow §12.2's machine-record precedent: machine-local, never
committed.

### 15.4 A wait is the executor STOPPING; it is never the runtime asking

**§6.3's ruling binds the table.** Nothing runs unattended between the display and
the owner's answer.

Which waits render a gate declaration is `workflow.json`'s
`renders_gate_declaration`, per state.

### 15.5 Write authority — owner artifacts are written only from writing states

**The discriminator is the RESOLVED destination, never a flag.** The authority is
held by the executor and **released on the way out**.

**What this does NOT claim:** the composition remains callable out of order. What
is refused is the *write*, not the computation.

**One writer per artifact, and grammar binds to the STATE, never to the artifact
path.** The artifact **name** does not change; per-state names were the declined
arm.

### 15.6 Judgment points are typed, fenced, and reached only from declared states

### 15.6.1 The claim re-offer is a WAIT beside J1, never part of it

A wait is *the executor stopping* (§15.4); folding the re-offer into the judgment
point would make the judgment ask the question. The declaration and capture stay
**inside** the executor.

### 15.6.2 `subdivide` folds its COMPOSITION into J2, not only its validation

### 15.6.3 A removed entry point is DELETED, and leaves no stub

An entry point that is gone is gone: no refusing case, no pointer, no record of
what it used to do. Where its behaviour **is** a state, a stub would additionally
be a second way to reach that state.

### 15.6.4 A GATE WAIT IS ANSWERED BY A CAPTURE

At a wait whose declaration was written, **the capture is not one way to answer;
it is the way.** `GATE_WORK` carries the carve-out, and `--input` remains
admissible because refusing both would leave the wait unanswerable.

This is a statement about the **runtime**, not about the owner's surface.

### 15.7 `self-test` and `validate` are NON-FLOW utilities

They emit no owner surface, carry no sequencing authority, and are reachable
without a run record. Every other entry point is a state.


### 15.8 What is NOT carried — the honest list

Stated **once, here**, for the whole spec. This section holds the file's only
not-carried list and its only slot declaration; a second copy of either would be
a surface that can disagree with this one.

- **Nothing counts the rendering files.** A rendering arriving under another
  name, hand-copied or written outside the renderings directory, is unobserved.
- **The table's SEMANTIC honesty is not checkable.** That the declared order is
  the right order, that a wait belongs where it sits, and that a judgment point
  is placed where judgment is owed are judgments, and they route to the review
  lane.
- **Falsifier 2 carries `instrument: none`** (§5.2).
- **The judge's duty for `other` is unverifiable** (§8).

`deferred slots:` none.

`necessity:` §15 states only what the table cannot say about itself —
re-entrancy, where write authority lives and when it is released, why the
re-offer is a wait rather than a judgment — plus the honest list of what nothing
enforces, which by construction has no carrier.
