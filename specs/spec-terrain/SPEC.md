# SPEC-terrain — the survey/selection surface

**Status:** v2, amended 2026-08-06 (kogaki#26 + kogaki#27, the coupled
Terrain-v2 cluster). v1 authored 2026-08-05 (kogaki#14).
**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

**What v2 adds:** the candidate model (§5), the co-tag second navigation step
(§6), GroupClaim-first rendering with claim pinning (§7), semantic
subdivision (§8), the rendering obligations that make a survey browsable
(§9), and one parked future item with its grounds (§10). `specs/SPEC.md` §5's
manifest entry is **not** amended and needs no amendment: it admits Terrain
with its three contracts, and §§5–9 bind their *application* rather than
adding a fourth or introducing a new sequencing precondition. Sections 1–4
below are v1 text and are unchanged except where §2.2 is explicitly amended.

Authored **here**, in the consumer, never ported as hub text:

> "Terrain is a consumer product and its design spec is consumer-side"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:23`

That line is the 2026-08-04 boundary correction, and it is recorded here
because the misdiagnosis it corrects is declared likely to recur: the
proposal it overturned conflated "hub-ratified vocabulary needs a hub
carrier" (true) with "needs a hub spec" (false).

## 1. Sequencing — the decision this spec was required to make

`specs/SPEC.md` §5's ordering clause is the carrier; this section states the
decision it records. Terrain's screens present selections, so they depend on
manifest items **3** (the owner-facing proposal contract) and **4** (the gate
carrier). Both port **first, as their own PRs, with their own contracts**.

The alternative considered and refused was folding a minimal form of 3 and 4
into this port. It is refused on the served ground quoted at
`specs/SPEC.md` §5 — admitting a subsystem without its contract is the
manifest's own named failure mode. **The refusal is a boundary, not a
preference:** a Terrain implementation that grows its own proposal-rendering
or gate-payload affordance has committed the refused alternative under a
different name, and §5's clause is what it is measured against.

A third alternative was considered and not taken: cutting the port at the
navigation/proposal line and shipping a navigation-only Terrain first, which
would need neither 3 nor 4. It is admissible and was declined at the
2026-08-05 gate; it is recorded because the cut line it proposed is the same
line §2.3 below makes load-bearing, and a later sitting reopening the
sequencing should reopen it rather than re-derive it.

## 2. The inherited contracts

These three are the manifest's own, inherited unamended. This spec binds
their **application to Terrain**; it does not restate them as new invariants.

### 2.1 Completeness is a cover counted in placements

Every Strand appears in at least one section. Strands with no relation go in
an **explicit named section** rather than being dropped. Nothing is silently
dropped.

**The count runs AFTER composition**, not before. A completeness figure
computed over the candidate set rather than over the composed placements
measures the wrong thing and will read as a pass while material is missing.

**A figure names which family it counted.** The served vocabulary is three
terms — Strand (Lesson|Journey), thread-line (Decision|Position), and Thesis
— and **no umbrella over Strand and thread-line was minted, deliberately**:

> "a covering word is what let the 2026-07-28 '132 of 246 Strands' figure be
> measured over Lessons ∪ Decisions (journeys excluded) and quoted into
> decisions made under the ratified Lesson-or-Journey definition, so every
> figure must name which family it counted"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`

So every completeness figure Terrain emits states its denominator's family.
A bare count is a defect, not a terse rendering.

### 2.2 Presentation-only grouping

Sections gate nothing. A navigation step carries **no selection authority** —
moving between screens, expanding a section, or changing the grouping axis
never narrows what the owner may choose. Screen 1's axis is the **served tag
vocabulary**; grouping is a view over the candidate set, never a filter on it.

**Amended by v2 (candidate-family scoping).** This clause governs what
grouping may do to a candidate set; it says nothing about what the candidate
set *is*. §5 fixes that separately, and the two are deliberately not merged —
the distinction between narrowing a set and constituting one is exactly what
§5's declared divergence turns on.

### 2.3 The second-proposer boundary

A combination becomes a **proposal** exactly when something other than the
owner narrows the candidate set.

- **Navigation** (no proposal): enumerate, sort, filter-by-owner.
- **Proposal** (routes through item 3's contract): rank, trim, hide.

This is the line §1's declined alternative would have cut the port at, which
is why it is stated as an enumeration with both sides named rather than as a
principle. **An act not in either list is a report, not a choice** — Terrain
surfaces it as unclassified with its reason and takes no narrowing action.

## 3. Inputs — served renderings only

Terrain reads through the seam, consumer `kogaki`: `element_survey`,
`gloss_index`, `glossary_entry`, `topic_thread`. All four are served today
and were verified reachable at authoring (`product-lab@924cce3`).

The repository-invisible boundary applies in full (`specs/SPEC.md` §2), and
so does the substrate-internals boundary (`specs/SPEC.md` §4's sided-evidence
clause and `policy/consultation-map.md` entry 2): Terrain reads **served
renderings**, never the state the gateway keeps to serve them.

**A resolver cites what it read, never what it was asked for.** Terrain
quotes a served rendering at the pin the seam returned, and where a served
answer's citation and content disagree the disagreement is surfaced rather
than resolved — a well-formed citation to a file that does not contain the
quoted material passes every downstream resolve check
(`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:130`).

## 4. Out of scope, by decision

Any proposal-rendering or gate-payload affordance of Terrain's own — those
are items 3 and 4, and building them here is §1's refused alternative. Also
out: probe, harvest, fact sheets, the sources gate, the provenance map/judge,
and the interview's mandated asks, all dropped by `specs/SPEC.md` §5.

## 5. The candidate model — Lessons-only rows, Journey marked by absence

**The candidate row is one Lesson.** A Journey is not a row of its own; it is
a **mark on its Lesson's row**, and the mark reads by **absence** — a Lesson
with no Journey is decorated, a Lesson with one is not. Every screen that
shows candidate rows **states its denominator**, in Lessons.

The design's load-bearing half is the denominator rather than the mark. At
high Journey coverage a presence-mark decorates nearly every row and
discriminates between none; the thin Lessons are the actionable set, and the
stated denominator is what makes the **next coverage inversion visible
on-screen** rather than inferable only by someone who already suspected it.

**Measured at this amendment's pin**, through the seam, by
`terrain/terrain.mjs survey`: 274 candidates — **144 Lessons, 130 Journeys**;
**every Journey has a Lesson of the same slug (130 of 130, zero orphans)**;
coverage **130/144 = 90.3%**; **14 thin Lessons**. Within `agents`, the tag
whose bare `115` prompted kogaki#26: 59 Lessons + 56 Journeys.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/ELEMENTS.jsonl:2-3,7,12,14-15,17,24,31,35-36,38-39,45,50,52-54,59,64-65,67-69,71-72,74-77,79,84,86-87,90-92,95-96,99,105-106,111,113,117-119,121-122,124,127,129-130,134-136,138,140-141`

The figure is a **measurement, not the claim** — it is what makes §5.2's
falsifier computable, and it is re-measured at every run rather than quoted
from here.

### 5.1 Declared divergence — pending hub wording, stated rather than assumed

**This section diverges from a ratified served ruling. The divergence is
declared here rather than smuggled, and the hub's line still wins.**

The served line diverged from:

> "Screen 1 offers Topic selection …; **screen 2 shows all of that Topic's
> Lessons and Journeys** in semantically related sections whose first line is
> a derived title. The invariants that distinguish this from the abandoned
> unit, both mechanically checkable: **completeness** — sectioning is a
> permutation, every element appears exactly once, count-in equals count-out
> … and **presentation-only**"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:25`

  request_id: c80871ca-c15b-4a64-bae6-2ed05d93cae4
  outcome: discriminating
  query: Terrain screen 2 ruling: what does the second screen show — one member's complete material, every element appears exactly once, count-in equals count-out completeness invariant?
  query: Lessons-only candidate rows with Journey derived and marked by absence; excluding decision material from the entry surface refused as a discovery failure not an honest scope

**The reading Kogaki proceeds on:** candidate rows are Lessons only, with the
Journey family derived and marked by absence and the denominator stated. The
owner directed it on 2026-08-05 against WA's own 2026-07-30 amendment
(wa#933/#934), which is **consumer-side and not hub-ratified** — a consult
along two framings found no served line adopting it, and found instead the
line quoted above, which discriminates *against* it. So this is a divergence
from a position the surface holds, not a gap in the surface.

**The refresh is OWED, not done.** No hub ruling has been requested and none
is assumed; a later served amendment supersedes this section without
argument, and until then this text is a **checkable proposal** rather than a
settled shape.

The discipline that makes this admissible, and that is the discharge:

> "**A consumer that ships ahead of the hub wording DECLARES its divergence
> in the artifact, with a source-qualified pin** — the first clean discharge
> of the shipped-ahead gap in this corpus. … naming the diverged line
> converts an unratified shape into a CHECKABLE PROPOSAL"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:119`

  request_id: 1982ed22-9da6-4faa-b701-29bc0bbb88e9
  outcome: discriminating
  query: May a consumer ship ahead of a served ruling if it declares the divergence with a source-qualified pin? What is the shipped-ahead discipline and does a shipped-ahead implementation ratify its shape?

The hazard that discipline names is **silent promotion** — the shape that
produced the first write becomes the shape
([[a-shipped-ahead-implementation-does-not-ratify-its-shape]],
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:80`).
A Terrain implementation that carries lessons-only rows **without** this
section present is that hazard realized, and the absence of this section is
the defect rather than the code.

**Scope of the divergence: item 1 only.** §§6, 7 and 8 each rest on a
ratified served ground and diverge from nothing.

### 5.2 The risk this design carries, and what would falsify it

**The counter-argument, stated rather than assumed away.** The completeness
invariant is what lessons-only rows most plausibly strain, and the strain is
not where a casual reading puts it.

The invariant was corrected for multi-valued substrates:

> "a **COVER counted in PLACEMENTS**, not a partition — every Strand in at
> least one section, no-relation Strands in an explicit named section,
> nothing silently dropped. … Where a substrate is single-valued,
> exactly-once still holds as the stronger check."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:80`

That rule binds the **placement** of candidates. §5 changes the **candidate
set itself**, one step upstream of where the invariant watches — so a design
that never drops a placement can still have shrunk **count-in**, and the
placement check would pass while it did. This is
[[grouping-upstream-of-selection-is-a-gate]] read at the constitution of the
set rather than at its sectioning, and it is the honest objection to §5.

**Why the design survives the objection at this pin, and only there.** Every
Journey has a Lesson of the same slug (130 of 130 measured above), so the
Journey family is **representable without loss** as a per-Lesson mark:
Lessons plus marks reconstructs the Strand set exactly, count-out over
Lessons plus the marks equals count-in over Strands, and no Strand becomes
unreachable. The reduction is a **re-projection, not a drop** — which is
precisely the property the served ruling's "count-in equals count-out" exists
to demand, met by a different mechanism than the one it names.

**Falsifier 1 — an orphan Journey.** A Journey whose slug matches no Lesson
has no row to be marked on and is silently dropped. The count is computable
at every run (`orphan_journeys`), it is **zero today**, and any value above
zero **falsifies this section**. Terrain **refuses the survey** in that case
rather than rendering it — a generation-time refusal, per §2.1's rule that
nothing is silently dropped, not a rendering-time warning. The refusal names
the orphan slugs.

**Falsifier 2 — coverage saturation.** Marking by absence discriminates only
while some Lessons lack Journeys. At 100% coverage the marks decorate
everything and inform nothing, and the design's own rationale expires. The
reversal trigger is stated in advance rather than discovered: **coverage
≥ 99% (thin Lessons ≤ 1 of the served denominator)** reopens §5 as a design
question. It is 90.3% today.

**Falsifier 2 has NO READING ACT, and the two falsifiers are not equally
sited.** This is stated plainly because the pair otherwise reads as
symmetrical and is not:

| | Falsifier 1 (orphan Journey) | Falsifier 2 (coverage ≥ 99%) |
|---|---|---|
| Computed | yes, every survey run | yes, every survey run |
| **Read** | **yes** — refuses the write | **no — nothing reads it** |
| Carrier | generation-time refusal; an acceptance criterion in story 1.22, fixture-verified | none |
| Fires by | the code stopping | a human noticing a percentage |

Falsifier 1 has a carrier at its violation layer: the value is computed and
the survey **refuses**, so the trigger cannot fire unobserved. Falsifier 2 is
computed and then **printed** — its firing depends on a person reading a
number in survey output and recognizing what it means. **No check observes
it, story 1.22 explicitly disclaims it, and this spec declares no periodic
reader** (a periodic reader is refused deliberately: it would convert a
demand trigger into a schedule).

**The cost of that, stated rather than absorbed.** A held item whose trigger
nothing reads can fire and go unnoticed — the failure mode is
*fired-and-unread*, and it presents as nothing happening. So Falsifier 2 is
honestly a **weaker instrument than Falsifier 1**: it is a stated reopen
condition on a rendered number, not a guarantee, and it should not be quoted
later as though the design were mechanically protected against saturation.
What would earn it a real carrier is the ratified form — a held item names an
act that ALREADY HAPPENS and observes the quantity its trigger fires on, or
declares `instrument: none`. This section chooses the second and says so:

> **instrument: none** — for Falsifier 2. Declared at authoring, per the rule
> that the declaration binds at authoring time and never as a periodic
> reader.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9`

The candidate act, named so a later sitting does not re-derive it: the survey
run already computes both halves, so the coverage figure could ride the
survey's own emitted output as a declared threshold row rather than a bare
percentage. That is a **carrier proposal, not a decision** — building it is
not licensed here, and it is not smuggled in as one.

Both falsifiers are **properties of the served corpus, not of Kogaki's
code**, which is why they are stated as triggers on a measurement Terrain
already takes rather than as tests over an implementation. That is the
reason for their shape; it is not a reason Falsifier 2 needs no carrier, and
the paragraph above is not to be read as supplying one.

## 6. Navigation — the co-tag second step

Selecting a tag displays **the other tags its members carry, grouped by
co-tag, with counts** (`agents × architecture (3)`). This is the second
navigation step, and it is navigation in the full §2.3 sense: deterministic,
complete, nothing hidden, no ranking. Selecting a co-tag group narrows
nothing — the full candidate set stays reachable, and free text still reaches
every Strand at the gate.

Served ground, and its adoption:

> "The remedy, when one is eventually needed, is a **SECOND NAVIGATION STEP**
> — not a cap and not a re-tag. … Elements already carry their other tags on
> the served surface, so offering those as a sub-selection is *navigation*:
> deterministic, complete, nothing hidden, no ranking."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:17`

Held in 2026-07-27 on a watch trigger; the 2026-07-31 subdivision ruling
records the line as **spent on the co-tag step**, which is the adoption:

> "The 2026-07-27 'second navigation step, not a cap' line is ALREADY SPENT
> on the co-tag step and is not this mechanism's authority."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:66`

**Machine-composed connective prose at render time is admissible** and is
ruled so separately — the no-model-in-the-render-loop choice was made on cost
alone and the owner withdrew that ground. It arrives with the invariants
binding *harder*, not softer:

> "The ratified invariants bind **harder** with a model in the loop —
> composed section prose stays a permutation … and carries no selection
> authority; a composer able to omit or merge a Strand is
> [[grouping-upstream-of-selection-is-a-gate]] arriving again, wearing prose."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:110`

## 7. GroupClaim-first rendering, and claim pinning

Selecting a co-tag group shows **the GroupClaim first**, then the member
Lessons. The claim is the composed "in common:" line — the plain-register
statement of what the members share.

**A claim composed over a member set is PINNED to that set.** A subset
selection **recomposes** the claim and **re-offers** it as a **gate event**,
never a silent refresh; the brief records the **adopted claim together with
the members it was composed from**.

> "A claim composed over a member set is PINNED to that set: a subset
> selection recomposes and re-offers it, and the brief records the adopted
> claim together with the members it was composed from. Keeping a group claim
> over a changed subset asserts commonality over absent members — a
> provenance lie — while discarding it throws away the only thing in the
> interaction the machine did not supply. … a derived expression's truth is
> relative to the set it was derived from, so the derivation carries that set
> and a change to the set is a GATE EVENT rather than a refresh."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

  request_id: a084f10b-b6e3-450c-a27e-407edba6839b
  outcome: discriminating
  query: GroupClaim composed over a member set is pinned to that set; subset selection recomposes and re-offers the claim as a gate event, never a silent refresh; the brief records the adopted claim with its members

Two riders travel with it, quoted at the same pin: the full-group claim
**survives only in the per-invocation rendering**, and a recomposed claim is
a **proposal** — the owner may keep the original wording, with the recorded
member set making the mismatch **legible rather than forbidden**.

The re-offer is a gate and therefore routes through the gate carrier
(manifest item 4), not through an affordance of Terrain's own — §4 is
unchanged and §1's refusal still binds.

## 8. Semantic subdivision — a judged substrate one level down

**This section replaces v1 §5's open slot.** v1 carried "Whether Kogaki's
Terrain ports it is not decided by this spec." It is decided here: **Kogaki's
Terrain ports it.** The slot is closed rather than deleted, and this sentence
is the record of the closure.

GroupClaim first, then **LLM-classified SubGroups each carrying its own
composed claim**, then the Lessons per SubGroup. It is **placement plus
title-derivation, hiding none** — the two acts the presentation-only
invariant already permits — and it is **not a cap**:

> "Subdivision is a **JUDGED SUBSTRATE APPLIED ONE LEVEL DOWN, not a cap**: a
> cap decides WHICH members appear, subdivision decides WHERE each appears
> and hides none."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:66`

**The leaf condition is CONJUNCTIVE.** A subgroup is a leaf when its claim
**composes honestly AND is tighter than its parent's**. Failing the first
means split further; failing the second means the split bought nothing —
stated conjunctively because a stop condition checking only degeneration
emits subgroups that merely restate the parent
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:70`).

**Two disclosures, disjunctive.** The **degenerate-claim** disclosure fires
when a claim trails into enumeration. It does **not** detect the reported
condition on its own, which is why the second half exists: the claim is
honest but **UNDISCRIMINATING at the size served** — "an honest summary true
of every member discriminates between none"
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:67`).

**Three instruments, three quantities, none a threshold.** 20% of placements
(relative share), the screen budget (rendering destination), and at-a-glance
legibility (absolute). The owner's "above ~4 members" is **calibration
evidence for where the undiscriminating-claim condition binds, never a
member-count threshold** — a count is a proxy for evidence, and the 20% cap
not firing on the reported group was evidence that it measures something
else, never that the group was fine
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:68`).
Terrain implements no member-count threshold. A number appearing in its code
as one is a defect against this paragraph.

**That prohibition is UNCARRIED, and this is its declaration rather than its
enforcement.** The sentence above is prose one layer up from where it can be
broken. `checks/check-terrain-composition.sh` declares three figure codes —
`FIGURE_NOT_OVER_PLACEMENTS`, `FIGURE_FAMILY_UNNAMED`, `FIGURE_MISMATCH` —
and **none of them observes a member-count threshold**. Nothing in this
repository detects one. So the rule as written is **advisory**, and calling
it a defect does not make it detectable: a prohibition stated in prose is
advisory to a system whose job is to satisfy instructions, and a rule is
enforced only at the layer where it can be broken.

**Why it is declared uncarried rather than given a check here.** The
governing rule admits exactly three states, and the third is this one:

> "A stated policy is admissible in exactly three states — decidable from the
> artifact an existing check inspects, shipped with a detector whose unit
> matches the property's unit, or **deliberately carrier-less and marked with
> a reopen trigger** — and the unit is derived from how the policy is
> violated, never inherited from the neighbouring gates."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:24`

State one fails: the figure codes inspect a survey record, and a threshold
lives in subdivision code, not in the record — the unit does not match, and
re-pointing a figure check at it would be inheriting the unit from the
neighbouring gate, which that same line forbids. State two is not taken here
because admitting a check is its own act with its own admission record
(contract, license, tier, measured runtime, removal signal) and this sitting
is not licensed to write one. So: **state three, declared.**

**Reopen trigger:** the first subdivision implementation that reaches review
carrying a numeric constant in its split or stop logic. At that point the
property has a violating artifact, its unit is known from how it was
violated, and a detector can be specified against a real specimen rather than
against an imagined one. Until then the carrier is the **review lane**, which
reads the judgment half — and a review lane is a reader, not a gate, which is
exactly the weakness being declared.

This is the shape kogaki#100 is this repository's live specimen of, named
here so v2 is not read as having closed it.

### 8.1 Measurement before offering — the rider that binds this section

**Subdivision ships dogfood-first. It is not offered until the owner has
verdicted its output.** The ordering is inherited, not invented here:
implemented → dogfooded → owner-verdicted → offered, the journey-similarity
precedent. **Co-tags stay the default for a run naming no substrate.**

> "Shipping a judged substrate ARRIVES at its offering gate rather than
> discharging it: merged code evidences existence, never the gate's standing.
> … shipping answers *does it run?*, the gate asks *does its output serve the
> owner better than what it replaces?* … the build half being done makes the
> gate DUE"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:53`

  request_id: 54ee141b-5343-467c-99e0-78626921ac69
  outcome: discriminating
  query: Subdivision leaf condition: claim composes honestly and is tighter than the parent; degenerate claim and undiscriminating claim disclosures; 20% of placements screen budget at-a-glance legibility instruments; offering measurement due

The hub-side offering gate is **undischarged**
(`product-lab:q_a/staging/2026-07-31-subdivision-offering-measurement-due.md`),
and Kogaki's reimplementation inherits the ordering rather than the
discharge. **Merging Kogaki's subdivision code does not discharge it either**
— that is the same lesson one repository over.

### 8.2 The second-proposer boundary is unchanged by §§6–8

Grouping, claims and subdivision are **presentation** — placement plus
title-derivation. **Rank, trim and hide still route through manifest item
3's proposal contract**, and the >3-option trim guard at the selection gate
stands (`terrain/terrain.mjs` `MAX_STRAND_OPTIONS`). §2.3 is not weakened by
anything in §§5–9; a subdivision that ranked, trimmed or hid would have
committed §1's refused alternative under a new name.

## 9. Rendering — headlines, and every figure names its families

**This section folds kogaki#26.** Its defect specimen is live and reproduces
at this amendment's pin: the survey prints `agents (115)`, a bare count over
two families, which the owner read on 2026-08-05 as "WA showed ~50". The 115
is 59 Lessons + 56 Journeys.

**Gloss headlines per Strand.** A candidate row carries its **served Gloss
headline** — the plain-register one-liner — because a row of slug + family +
tags + cite is a navigation skeleton with no material, and the survey is
browsable only when the owner who cannot yet name a story can read what each
Strand *says*. Constraints that ride it, none of them new:

- **Served renderings only**, quoted at the pin the seam returned, never
  re-parsed from anywhere else (§3; the ELEMENTS manifest rule that consumers
  selecting over elements read the manifest and never re-parse the index).
- **Tag-scoped and bounded** — one shard pair per viewed tag
  (`gloss_index("lessons/<t>")`, and `journeys/<t>` where the mark needs it),
  addressed `<kind>/<tag>` and never `<tag>` alone. No fan-out, no
  whole-corpus prefetch.
- **Navigation semantics unchanged** — the enriched view still narrows
  nothing.
- **A missing Gloss rendering is an ABNORMAL condition, marked and never
  substituted.** It is a fault to clear, not a known gap to tolerate
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:111`).

**Every emitted figure names its families.** §2.1's rule — "A bare count is a
defect, not a terse rendering" — is not scoped to the completeness figure. It
binds **every figure Terrain emits**: section counts, view footers, co-tag
group counts, subgroup counts. `agents (115)` becomes
`agents (115 — 59 lessons + 56 journeys)`. Under §5 the candidate denominator
is Lessons, so a candidate-row figure names **Lessons** and the Journey half
appears as the coverage mark's own count; a figure spanning both families
names both. The mixed-family bare count is the "132 of 246" casualty shape
§2.1 quotes, and kogaki#26 is its live specimen.

**Where the recomputation lives.** `terrain/terrain.mjs` already recomputes
`by_family` from the placements the figure claims to be counted over, and
refuses to write a record whose stored figure disagrees
(`FIGURE_MISMATCH`, `terrain/terrain.mjs:206-209,278,292`). Extending that
recomputation to section-level figures is the mechanism, and the refusal
stays **generation-time**: constrain generation, then detect what generation
cannot promise.

`deferred-slot: terrain-family-split-carrier`

**Whether the per-section family split belongs in the survey RECORD or only
in the RENDERING is NOT decided here, and it is named as a slot rather than
left to the implementation.** v2's first draft called it "an implementation
choice, declared as one here rather than left silent"; that was the defect
`specs/SPEC.md` §4's kogaki#48 clause names, and declaring a deferral is not
an exemption from naming it — an unnamed slot's decision escapes every gate
that binds to a decision document, which is precisely what "declared as an
implementation choice" would have let happen.

**The alternatives, stated, neither chosen:**

- **(a) In the RECORD** — `survey-schema.json` gains a per-section
  `by_family`, the section figure is recomputed from placements and refused
  on mismatch exactly as `completeness.by_family` already is, and the check
  inherits it. Buys mechanical enforcement at the same layer the existing
  figure guarantee lives; costs a served-record shape change, which is a
  schema version and a conformance surface.
- **(b) In the RENDERING only** — sections carry no new field and the split
  is computed at print time from candidates already in the record. Buys no
  schema change; costs the generation-time refusal, because there is no
  stored figure to disagree with placements, so §2.1's "constrain generation,
  then detect" degrades to detection for section figures.

**Filling this slot is a DECISION act, owed on kogaki#26/#27 before code
embeds it** — the filling sitting consults the seam on the fork and records
choice, alternatives and receipt on the licensing issue. Not filled here, and
deliberately not consulted here: a fill-time consult performed by the sitting
that named the slot would decide it inside the naming sitting, which is the
same escape one step earlier.

**Story 1.22's dependent acceptance criterion is BLOCKED on this slot** and
says so in its own text.

Independent of which alternative is taken: **if the record changes,
`specs/spec-terrain/survey-schema.json` is the single carrier** — the check
reads those lists rather than restating them — and
`checks/check-terrain-composition.sh` inherits the extension without a second
copy. That clause binds alternative (a) and is vacuous under (b); it is not
a partial fill.

## 10. Parked, with grounds — the Lessons-or-Decisions opening gate

**Parked, not decided, and not built.** A two-family entry gate offering
Lessons or Decisions at the opening screen is **new design owed its own spec
decision**. Its grounds are recorded here so a later sitting reopens them
rather than re-deriving them.

The hub **refused ratifying the exclusion** of decision material from the
entry surface:

> "Ratifying the exclusion is REFUSED: an entry screen structurally omitting
> 54% of served material is a **discovery failure, not an honest scope**. …
> the decision shards have addresses and screen 1 discloses nothing about
> them, so ratifying the exclusion would record a discovery failure as a
> design."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:94`

  request_id: ef6835eb-a6ff-4054-b2d6-22b7e42cd3be
  outcome: discriminating
  query: Lessons-only candidate rows with Journey derived and marked by absence; excluding decision material from the entry surface refused as a discovery failure not an honest scope

**And declined both joins, and minted no umbrella** over Strand and
thread-line — deliberately, because a covering word is what let the
"132 of 246" figure be measured over Lessons ∪ Decisions and quoted into
decisions taken under a Lesson-or-Journey definition. A surface offering one
pooled selectable list would rebuild that hazard mechanically rather than
verbally
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:57`).

A two-family entry **gate** — two populations, never merged, chosen between
rather than pooled — is consistent with all three rulings. Consistency is not
ratification, which is why it is parked.

**Trigger:** it fires **after article creation from Lessons is working**, and
**never silently**. The trigger names an act that already happens (the first
completed article run from a Terrain selection) rather than a quantity
nothing measures.

**Note the standing tension this parking leaves open, rather than resolving
it:** §5 narrows the entry surface further, from Strands to Lessons, while
the served refusal above objects to an entry screen omitting material. §5.1
declares that divergence and §5.2 states its falsifiers; this parking is
where the *Decisions* half of the same objection waits. The two are recorded
adjacent deliberately — a later sitting reopening either should read both.

## 11. Open — carried as questions, never as contract

- **The completeness figure's rendering position.** The served material
  reports a specced burial: a contract that sorts output into buckets makes
  an editorial judgment about reader priority, and the bucket names hide it
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/claude-code-ops.md:15`).
  Whether the figure takes a fixed first-position line is undecided here.
- **Whether "sort" can narrow in practice.** §2.3 places sort under
  navigation. Whether a stable sort over a truncated view narrows the
  candidate set is cannot-determine — no served position was found on it, and
  it is not asserted either way.
- **Semantic subdivision within a group** — *this slot is CLOSED by §8.* The
  v1 text read "Whether Kogaki's Terrain ports it is not decided by this
  spec"; v2 decides it. The bullet is kept as a pointer rather than removed,
  so a reader holding v1 finds the disposition rather than an absence.
