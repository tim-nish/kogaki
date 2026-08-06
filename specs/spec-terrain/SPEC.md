# SPEC-terrain — the survey/selection surface

**Status:** v4.5, amended 2026-08-06 — §12.2's normative bullet states the
key in §12.1's own form (it enumerated four members and called them a triple),
and story 1.30's two pointers are corrected. v4.4 amended 2026-08-06 — the identity sweep is redone by
ENUMERATING every site that states the key rather than by matching a wording,
which is what let "identity pair" and "(pin, query) key" survive v4.3; story
1.30's contradictory story question is withdrawn. v4.3 amended 2026-08-06 — §12.1's HEADING, opening sentence and
normative TABLE are brought into line with the triple (v4.2 changed the rule in
prose and left the table stating the old one), "the pair" is swept from the
four remaining identity sites, and story 1.30's acceptance criteria are
corrected to the triple with its merge named as §11's flip. v4.2 amended
2026-08-06 — the key's arity is UNIFORM (v4.1's
content-conditional judge-pin exception is WITHDRAWN: it decided the key from
the report's own content, so no request could form it) and §11's trigger names
its discharging act. v4.1 amended 2026-08-06 — three review-lane findings on PR #134
repaired under kogaki#131/#133's own license: §12 requires a report to RECORD
its identity, §12.1 puts the JUDGE PIN in the key where judged material is
present, and §11's trigger declares itself DEAD until story 1.30 merges. v4
amended 2026-08-06 (kogaki#131 and kogaki#133, decided as two
separate selections). v3 authored 2026-08-06 (kogaki#128 + kogaki#129, the
coupled screen/report cluster). v2.1 amended 2026-08-06 — §9's
`deferred-slot: terrain-family-split-carrier` is FILLED with alternative (a),
the split in the RECORD (kogaki#26/#27). v2 authored 2026-08-06 (kogaki#26 +
kogaki#27, the coupled Terrain-v2 cluster). v1 authored 2026-08-05
(kogaki#14).
**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

**What v4 adds, and why it is two decisions rather than one.** v3 shipped
§6.1/§6.2/§7 and §12 together because neither half was decidable alone. v4's
two issues are **not** coupled that way — kogaki#131 completes §12's own
contract, kogaki#133 completes the screen's — so they were decided as separate
selections over one file. They share `specs/spec-terrain/SPEC.md`, which is a
scheduling edge and not a decision dependency.

- **kogaki#131 → §11, §12.1, §12.2.** The co-tag query key is **decided**
  rather than deferred: v3's third identity case stated a rule whose
  discriminator was undefined, which is carrier-less by omission rather than a
  postponement. §12.2 discharges kogaki#129's naming ask by separating
  *resolution* (normative, §12.1's pair) from *the filename* (implementer-owned,
  authority-free). §11's eager-versus-pull bullet gains the reopen trigger it
  lacked. Spec-only: no story, and the fix is the spec change.
- **kogaki#133 → §6.1, §6.2, §7.** The screen judges its SubGroups and requires
  the judge pin; a screen-composed claim's origin travels into its re-offer as
  an argument, leaving §7's no-record rider standing; and the per-member pin is
  named rather than left as an unexplained column. Decomposed to story 1.31.

**What v3 adds, and why it is one decision rather than two.** v2 shipped
`claim` (§7) and `subdivide` (§8) as commands and left the co-tag screen
composing neither, so the machinery existed and the served screen did not use
it. v3 binds **what the co-tag screen serves** (§6.1) and **where the
untruncated material lives** (§12, the Full Report). The two were decided
together because neither is decidable alone: a compact screen is only honest
if the material it omits is reachable, and a report is only necessary if the
screen is compact. `specs/SPEC.md` §5's manifest entry is again **not**
amended — §§6.1 and 12 bind the *application* of the three contracts and
introduce no fourth.

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

### 6.1 What the co-tag screen SERVES — the compact GroupClaim-first form

**This section folds kogaki#128.** Its defect specimen is live and reproduces
at this amendment's pin: the served co-tag screen prints a co-tag count table
and, beside it, a flat `All 59 Lesson slugs, in served order:` dump. **No
GroupClaim appears anywhere and no Lesson IDs are visible *grouped*.** The
composition defect is that v2's machinery is unreached, not that it is wrong
— `cotagGroups` places every member (`terrain/terrain.mjs:488-503`) and
`cmdCotags` prints each group's *figure* while emitting member IDs **only
under `--group`** (`terrain/terrain.mjs:571-580`); `claim`
(`terrain/terrain.mjs:663`) and `subdivide` compose the missing halves and
nothing calls them, the skill's own flow being survey → view → narrow →
select with no co-tag step at all (`.claude/skills/terrain/SKILL.md`).

**The screen serves, per group, in this order:** the **GroupID**, the
**GroupClaim** — §7's composed "in common:" line — and the **member Lesson
IDs**. Where §8's conditions bind, the members are served as SubGroups, each
carrying its own SubGroupClaim above its Lesson IDs (§6.2). Every figure
names its families under §9, unchanged.

**The screen carries no per-Strand Gloss line and no Journey line.** The
untruncated Claims and Glosses live in the Full Report (§12), which the owner
pulls per named group.

**Each member row carries its served pin beside its ID** — v4, kogaki#133.
This is one token more than the ratified form quoted below names, so it is
stated rather than left as an unexplained column. Two grounds: §3's
quote-at-the-pin discipline governs every served rendering Terrain emits, and
the screen is where the owner reads the IDs they will later enter into a
Brief — a row whose provenance is invisible is the one place that discipline
would buy nothing. **It remains a pin and never a Gloss:** the rule above is
unchanged, and a row that grew a headline would breach it.

That split is the ratified form rather than a new design here:

> "Top-N is WITHDRAWN and the compact all-groups form replaces it: the
> narrowing act moved to the owner, which is what puts the replacement inside
> the second-proposer boundary. **Every group renders as member ids plus the
> composed commonality line** … [elided: "sorted descending by member count";
> Kogaki's shipped `COTAG_SORT` diverges and the divergence is carried at §11]
> … with the owner pulling a **Full Report** per named group. … the boundary's
> test is not whether a machine computed something but **whether what reached
> the owner is smaller than what exists**. Nothing is smaller."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:79`

  request_id: a50873dc-3240-4019-9fb9-2c3c18d64c6e
  outcome: discriminating
  query: Should a navigation screen carry a compact list of IDs and claims with the full untruncated material living in a separate report artifact, or should the screen itself carry the reading material? Does moving reading material off the screen into a report hide anything?

**The flat slug dump is REMOVED, and the removal is not a narrowing.** It is
the same members, served grouped instead of served twice — every Lesson ID
still reaches the screen inside at least one Group, which is exactly what
§2.1's cover counted in placements already guarantees and what
`COTAG_COVER_INCOMPLETE` already refuses on
(`terrain/terrain.mjs:534-544, 583-586`). Nothing that reaches the owner is
smaller than what exists, so §2.3's boundary is untouched. The dump's defect
was never that it showed too much: it is that a flat list beside a count
table lets **no image of a possible Thesis form**, which is the purpose §6
exists to serve.

**Purpose clause, stated here because the screen is judged against it.**
Terrain is a support system for **beginning** Brief creation and does not
itself start one; its job is surfacing which combination of Lesson IDs the
owner would enter when they later compose a Brief. **A screen with no visible
Lesson IDs fails that purpose regardless of what else it shows** — which is
the reading under which kogaki#128 is a defect rather than a preference.

### 6.2 SubGroups on the screen, and the threshold that is NOT one

**kogaki#128 asks for SubGroups "when a Group has many members (five or
more)". That number is admitted as CALIBRATION EVIDENCE and refused as a
threshold**, on §8's own standing rule — "Terrain implements no member-count
threshold. A number appearing in its code as one is a defect against this
paragraph." The issue's "five or more" is the same shape as the owner's
"above ~4 members" that §8 already ruled on: evidence for *where the
undiscriminating-claim condition binds*, never the condition itself.

So the screen serves SubGroups where **§8's conjunctive leaf condition and
its two disjunctive disclosures** put them, and the implementation carries no
`5`. This is recorded rather than silently corrected because the issue states
the number as the rule, and a reader holding kogaki#128 must find the
disposition rather than an absence.

**§8.1's ordering is unchanged by this section, and this section makes its
gate DUE.** Subdivision ships dogfood-first — implemented → dogfooded →
owner-verdicted → offered — and §8.1's offering gate is **undischarged**.
Serving SubGroups on the co-tag screen is what gives the owner output to
verdict; it is not the verdict, and merging it does not discharge the gate.
Carried as `deferred-slot: terrain-subdivision-offering-verdict`.

**The screen JUDGES its SubGroups; it does not merely render them** — v4,
kogaki#133. v3's wording ("where §8's conjunctive leaf condition and its two
disjunctive disclosures put them") was satisfied in the shipped screen by the
caller's JSON alone: the runtime placed members and printed name, claim and
ids, evaluating neither conjunct and emitting neither disclosure. Three
requirements close that:

- **The screen renders each SubGroup's leaf verdict** — which conjunct held
  and which failed — exactly as `subdivide` does over the same shape.
- **The screen emits both disclosures**, degenerate-claim and
  undiscriminating-claim, on the same disjunctive terms §8 states. Neither
  gates anything; both are disclosures.
- **The screen REQUIRES the judge pin** — model id and effort tier — on the
  same ground `subdivide` refuses without one: a per-invocation judged surface
  with no judge pin is the drift-undetectable shape, where "recomputed fresh"
  silently becomes "recomputed by a different judge". A judged surface that
  records no judge is not cheaper than one that does; it is one whose drift
  cannot be seen.

The siting is the reason this belongs at the screen rather than upstream:

> "A rule is enforced only at the layer where it can be broken … when that
> layer belongs to another system, the carrier goes at the last boundary you
> control, with any gate upstream of it counting as ergonomics rather than
> control."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

**This does not pre-empt §8.1's gate.** Requiring the judge pin and rendering
the verdicts makes the *dogfood specimen* honest, which is what the offering
verdict is taken over. A specimen that hid its own judgment would make the
gate decorative.

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

**v3 rider (kogaki#128): the GroupClaim is composed AT the co-tag screen, for
every group, not only under a separate `claim` invocation.** v2 left claim
composition reachable only by naming one group, which is why the served
screen carried none. Two consequences, and neither weakens anything above:

- **Composing a claim for every group narrows nothing** and writes no record.
  §6's classification is unchanged — the screen stays NAVIGATION, and the
  no-record rule at `terrain/terrain.mjs:470-483` binds the composition too.
  A claim record is written only when the owner acts on a group, which is
  where pinning and the re-offer gate already live.
- **The pinning rule binds per group at screen scope.** Each screen-composed
  claim is pinned to the member set it was composed over, so a later subset
  selection is the same gate event this section already defines. Nothing here
  creates a second claim lifecycle; it moves the *first* composition earlier.

**The origin travels as an ARGUMENT, and the no-record rider stands** — v4,
kogaki#133. v3 moved claim composition to the screen and the screen writes no
record, while the re-offer's original-wording context was reachable only from
a claim *record*. So for exactly the claims v3 moved earlier, the owner would
have met a recomposed claim with nothing to compare it against — which the
governing line names as the failure, not a shortfall:

> "[[gate-input-surface-is-part-of-the-contract]] settles the presentation
> (machine-proposed proposal plus free-form override, never raw-artifact
> homework — **handing the owner a stale claim and expecting them to notice it
> no longer fits IS homework**) … a recomposed claim is a proposal, so an owner
> may keep the original wording with the recorded member set making the
> mismatch legible rather than forbidden."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

  request_id: e743df88-b483-4669-a633-f6c2d4d6c99d
  outcome: discriminating
  query: A derived expression is composed at a surface that deliberately writes no record; a later change to its member set must re-offer it as a gate event carrying the original for comparison. How is the origin carried across a boundary where nothing is persisted?

**The mechanism is an argument, not a record.** The caller that composed the
screen's claims already holds their text; the re-offer takes the original
claim and its member set the same way it takes the claim text itself. So the
obligation is met **without reopening the "writes no record" rider** — the
served line binds what must reach the owner and leaves the transport open, and
the transport that requires no new persistence is the one that leaves §7's
navigation classification untouched.

**An origin that is genuinely absent is stated, never fabricated.** Where a
re-offer has no original — the first composition over a set — the gate says so
rather than presenting the recomposed wording as if it had one.

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

**`deferred-slot: terrain-family-split-carrier` is FILLED** (owner decision
2026-08-06, kogaki#26/#27): **(a) — the per-section family split lives in the
RECORD.** `specs/spec-terrain/survey-schema.json` gains a per-section
`by_family`; the section figure is **recomputed from the placements it claims
to be counted over and refused on mismatch exactly as `completeness.by_family`
already is**, extending the existing `FIGURE_MISMATCH` path rather than adding
a second mechanism; `checks/check-terrain-composition.sh` inherits it.

**The slot asked** whether the per-section family split belongs in the survey
RECORD or only in the RENDERING. v2's first draft called it "an implementation
choice, declared as one here rather than left silent"; that was the defect
`specs/SPEC.md` §4's kogaki#48 clause names, and declaring a deferral is not
an exemption from naming it — an unnamed slot's decision escapes every gate
that binds to a decision document, which is precisely what "declared as an
implementation choice" would have let happen. Naming it was v2's repair. This
is the fill, and it lands **before** stories 1.22–1.25 embed either answer,
which is the ordering that clause exists to produce.

**The alternatives, recorded because a decision without them is an assertion:**

- **(a) In the RECORD — CHOSEN.** `survey-schema.json` gains a per-section
  `by_family`, the section figure is recomputed from placements and refused
  on mismatch exactly as `completeness.by_family` already is, and the check
  inherits it. Buys mechanical enforcement at the same layer the existing
  figure guarantee lives; costs a served-record shape change, which is a
  schema version and a conformance surface — priced against the code below,
  where it is smaller than that sentence reads.
- **(b) In the RENDERING only — DECLINED.** Sections carry no new field and
  the split is computed at print time from candidates already in the record.
  Buys no schema change; costs the generation-time refusal, because there is
  no stored figure to disagree with placements. The declining reason is
  stated below, and it is sharper than "degrades to detection".

**The grounds for (a).** The served surface discriminates toward the record on
four independent lines, and none of them favours the rendering:

> "A tool's config may hold copies of facts whose authority lives elsewhere
> only under a declared precedence rule (which side wins on mismatch) plus a
> mechanical mismatch check; a copy with declared, checkable subordination is
> conformance — a copy without one is a second authority growing in the dark."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:114`

(a) is exactly that shape: **placements authoritative, the stored section
figure subordinate, `FIGURE_MISMATCH` the mechanical check.** The reading is
not novel here — the hub has already ratified it for a derived rendering: "a
derived rendering is not a second authority … explicitly derived … and the sha
pin as the mechanical mismatch check. That is a copy with declared, checkable
subordination — conformance, which that lesson permits"
(`topics/archive/knowledge-architecture.md:72`). `LESSONS.md:87`
(carry-a-rule-at-its-violation-layer) sites it: a section figure is **created
at record-write**, which is the layer at which it can be wrong, so that is
where the guarantee belongs. And `LESSONS.md:42` supplies the measurement
clause — "a count owes its enumeration at the point of MEASUREMENT rather than
at the point of dispute" — which (a) satisfies by enumerating at composition
and (b) does not, enumerating at print.

**The counter-line, recorded rather than buried.** One served line points the
other way, and a fill that hid it would be the assertion this section refuses:

> "The access log is PRIMARY CAPTURE and a reader over it is permitted: the
> no-second-ledger rule forbids storing the DERIVED COUNT, never the record
> written at the act."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:19`

A per-section `by_family` **is** a derived count, so the tension is real. It is
answered by in-repo precedent rather than by re-reasoning:
`completeness.by_family` is the identical shape — a stored derived count over
the same placements — ratified at v1 (kogaki#14/#17) and already refused on
mismatch at `terrain/terrain.mjs:206-209,278`. Under (b) the record would be
**inconsistent with itself**: section figures unguarded while the completeness
figure beside them, counted over the same placements, is guarded.

**Why (b) is declined, stated at its real cost.** Under (b) the refusal does
not degrade to detection — **there is no detection either.**
`checks/check-terrain-composition.sh` reads only the record, so a section
figure that never enters the record is unobservable at every layer this
repository owns. (b) was therefore never the carrier-free option it appeared
to be: choosing it would have obliged this section to mark the rule
**deliberately carrier-less with a reopen trigger**, on the served three-state
rule —

> "A stated policy is admissible in exactly THREE states — per-artifact-
> decidable (state it), detector designed in (measure it), or deliberately
> carrier-less (mark it, with a reopen trigger) — and carrier-less BY OMISSION
> is the defect."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`

**(a)'s costs, measured against the code rather than estimated.** Measured at
41ad16a and recorded so a later reader does not re-inflate the price:

- `survey-schema.json` gains **one** mandatory field — `section_required`
  gains `by_family`.
- `"version": "1"` → `"2"` has **zero readers**: nothing in `terrain/` or
  `checks/` reads `schema["version"]`, so the bump is a label for humans and
  breaks no code path.
- **Zero records to migrate**: `find . -name '*.terrain-survey.json'` returns
  0, because real runs live in the machine-local run workspace and are never
  committed (`records_home.rationale`; `specs/SPEC.md` §4 rider 3).
- The conformance surface is **two files**, both under
  `checks/fixtures/terrain/conforming/`. The 13 nonconforming fixtures assert
  `expected in got`, so an additional `SECTION_MISSING_FIELD` alongside the
  code each one names does not fail it; they need no edit.
- **No new check is admitted**, so no admission record, tier, runtime figure
  or removal signal is owed.

**One claim below is corrected here rather than left to surprise the
implementer.** The closing clause says the check "inherits the extension
without a second copy". That holds for the **field lists**, which
`survey-schema.json` carries once and the check reads. It does **not** hold for
the **recompute algorithm**, which is already written twice —
`terrain/terrain.mjs:193-215` (JS, generation-time) and
`checks/check-terrain-composition.sh:146-163` (Python, merge-layer). (a)
extends **both**. The duplication predates this fill and is not created by it;
collapsing it is not licensed by this decision, and it is named so the next
reader meets it in the spec rather than in the diff.

**Story 1.22's dependent acceptance criterion UNBLOCKS as written** under (a),
and its BLOCKED markers are cleared citing this section.

The record changes, so the clause binds rather than being vacuous:
**`specs/spec-terrain/survey-schema.json` is the single carrier** — the check
reads those lists rather than restating them — and
`checks/check-terrain-composition.sh` inherits the extension of those lists
without a second copy, subject to the recompute-algorithm correction above.

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
- **The co-tag group ORDERING** (v3, kogaki#128). The served surface orders
  groups "sorted descending by member count"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:79`),
  while Kogaki's shipped `COTAG_SORT` declares "co-tag name ascending, then
  member id ascending" (`terrain/terrain.mjs:486`), adopted under §6. Both are
  declared deterministic sorts and both are admitted as navigation, so neither
  is a violation; which one Kogaki serves is **undecided here**. kogaki#128
  raises the screen's *composition* and not its ordering, and deciding an
  unasked question inside another issue's sitting is how a decision escapes
  the gate that should have carried it. Reopen at the next Terrain sitting, or
  when a dogfood run reports the ordering as a defect.
- **Whether a Full Report is generated EAGERLY per co-tag view or PULLED on
  demand** (v3, kogaki#129). kogaki#129 licenses "every co-tag view" producing
  one; the served line §12 leans on describes "the owner **pulling** a Full
  Report per named group"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:79`).
  **Both satisfy §12 in full** — its content, identity, classification and
  location rules are indifferent to when generation fires — so neither is a
  violation and the divergence is not a defect. It is carried here rather than
  only as a story question so that a reader holding kogaki#129 and reading §12
  finds the disposition rather than an absence, which is the same duty the
  ordering bullet above discharges. The implementer states which they built,
  in the PR.
  **Reopen trigger** (v4, kogaki#131): the **first Terrain run that generates
  two or more Full Reports in one sitting**. That is the act on which the two
  readings first diverge observably — under *pull* the count matches the groups
  the owner named, under *eager* it matches the groups on the screen — and it
  is an act that already happens rather than a periodic reader.
  The trigger is stated because a bullet carrying neither a decision nor a
  trigger is carrier-less by omission, which is the named defect:
  "A stated policy is admissible in exactly THREE states — per-artifact-decidable
  (state it), detector designed in (measure it), or **deliberately carrier-less
  (mark it, with a reopen trigger)** — and carrier-less BY OMISSION is the
  defect"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`).
  **Instrument:** the report count a generating run produces.
  **The trigger becomes LIVE when story 1.30 merges, and is DEAD until then**
  (v4.1, kogaki#131) — §12's own defect specimen is that no run produces a
  report at all today, so the instrument has no writer and the trigger cannot
  fire however well-formed it is. Stated rather than left implicit, because a
  trigger that is dead for a reason nobody wrote down is indistinguishable from
  one that is live and simply has not fired: "a safeguard can be merged,
  correctly placed, and completely dead, because something it depends on is
  never produced by anything"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/lessons/testing.md:11`).
  **The discharging act is story 1.30's own PR** (v4.2, kogaki#131): the
  sitting that merges 1.30 re-reads this bullet and flips it live. Naming the
  event without naming what observes it would leave the flip to nobody —
  "postponing a decision until some event happens works only if something
  notices the event"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/INDEX.md:53`)
  — which is the carrier-less-by-omission shape this bullet's own
  admissibility argument refuses, one level down.

## 12. The Full Report — untruncated material, keyed to what produced it

**This section folds kogaki#129**, and it is the other half of §6.1: the
screen is compact only because this artifact exists. Its defect specimen is
an absence — the 2026-08-06 dogfooding run produced no report artifact
anywhere in the flow.

**What it is.** For a co-tag view, the **untruncated** material: GroupClaim
and SubGroupClaim in full, and the complete Lesson and Journey Glosses, with
**no truncation anywhere**. It is what the owner reads to think a Thesis
through, where §6.1's screen is what they navigate.

**A report RECORDS its own identity, and this is a requirement rather than an
implication** — v4.1, kogaki#131. Every Full Report carries, in its own
content, the **substrate pin**, the **selected tag**, the **named group**, and
the **judge pin** — the last taking the typed value `none` where no judged
material is present, per §12.1's uniform arity, so the recorded set is the key
exactly and never a subset of it. Without this
clause the artifact is unresolvable: §12.1 states identity as a *property* of
a report rather than an obligation to record one, and §12.2 forbids the only
other source — "nothing may read meaning out of [the filename], parse it to
recover the triple, or key on it — the report's own recorded pin, query and
judge pin are the only source of that." An implementer could satisfy every other clause here
and emit reports that no request could ever resolve to, which is the
`establish-the-substrate-before-reporting` shape: the artifact would agree with
everything and be founded on nothing.

**It is a REPORT, and therefore not a choice.** It ranks nothing, narrows
nothing, and hides nothing, so it sits in neither act list and the runtime
writes it as a report — §2.3 and `record-schema.json`'s act classification are
untouched. Nothing that reaches the owner through it is smaller than what
exists.

**It is a RENDERING, and therefore not an address.** This is the constraint
that governs what may key on it:

> "the Full Report is a RENDERING, not an address"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:71`

> "A G-id may be accepted at the screen that defined it and expands
> immediately to member ids, but the brief records members and pins, never a
> G-id, and recommendations may never key on one — *the Full Report is a
> RENDERING, not an address*"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:64`

So a Brief, a proposal, or a recommendation **may never cite a report id**.
They cite members and pins, exactly as they do today. A report id addresses a
rendering for the owner's own re-reading and nothing downstream resolves one.

### 12.1 Identity — the triple (substrate pin, co-tag query, judge pin)

A Full Report is identified by the **substrate pin** in effect when it was
generated, the **co-tag query** that produced it, and the **judge pin** under
which its material was judged — the last taking the typed value `none` where
no judged material is present. The cases, restated as the rule they share:

| act | result |
|---|---|
| same pin, same query, same judge pin, run twice | **one** report — the rerun is idempotent, not a duplicate |
| pin advances, rest unchanged | **two** reports, one per pin |
| same pin, different query, judge pin held fixed or not | **two** reports, one per query — a differing query is two reports whatever the judge pin |
| same pin, same query, one run subdivided and one not | **two** reports — `(pin, query, <judge pin>)` and `(pin, query, none)`, coexisting; neither collides nor supersedes |

**This table is the normative form.** kogaki#129 stated three cases and v4
carried them verbatim; the fourth is v4.2's, and it is written *into the
table* rather than only into the prose below, because the table is what an
implementer reads first and a table contradicted by a later paragraph is a
rule that is wrong as written for every reader who stops at it (v4.3,
kogaki#131).

**The co-tag query IS the pair (selected tag, named group)** — v4, kogaki#131.
Two reports are the same report when both components match, and different
otherwise; `agents × architecture` under tag `agents` is a different query
from `agents × report` under the same tag, and from `agents × architecture`
reached under tag `architecture`. Nothing else enters the key: not the
composed claims, not the run.

**The JUDGE PIN is the third component, ALWAYS** — v4.2, kogaki#131. A
report's identity is the **triple (substrate pin, co-tag query, judge pin)**,
and where no judged material is present the judge pin takes the typed value
`none`. v4 excluded the
subdivision from the key, and §6.2 in the same amendment made judge identity
drift-critical — "a per-invocation judged surface with no judge pin is the
drift-undetectable shape, where *recomputed fresh* silently becomes
*recomputed by a different judge*". Those two clauses together produced exactly
the collision §12.1 already rejects name-keying over: two reports whose
`(pin, tag, group)` match but whose judged content differs would be **one
report by identity and two by content**, arriving from the judge side instead
of the name side. A key that admits that is the second authority growing in the
dark, and it would be this section refuting itself four paragraphs apart.

**The arity is UNIFORM, and v4.1's content-conditional exception is
WITHDRAWN.** v4.1 keyed a report as a pair or a triple according to whether it
carried SubGroupClaims — which decides the key's shape from the report's own
content, so a requester holding `(pin, tag, group)` could not form the key
without already holding the report it was trying to address. **An identity a
request cannot construct is not an identity.** `none` is therefore a **typed
value that must be present**, never an omitted component — the same discipline
`park`'s three required declarations already follow, where `none` is a value
that must be typed.

**So the fourth case is stated rather than left open:** same pin, same query,
one run subdivided and one not are **two reports that coexist**, keyed
`(pin, query, <judge pin>)` and `(pin, query, none)`. They neither collide nor
supersede.

v4.1's withdrawn reasoning — that a null component "would make two
indistinguishable reports distinct" — was **false**: a report carrying
SubGroupClaims and one carrying none are distinguishable by their content,
which is exactly why they are two reports rather than one. The withdrawal is
recorded rather than edited away, because a reader holding v4.1 must find the
disposition rather than an absence.

**This was decided rather than deferred, and the distinction is the point.**
v3 left it to the implementer's PR. But the third row above states a rule —
"same pin, different query → two reports" — whose discriminator was undefined,
so the rule was not decidable from the artifact, carried no detector, and was
not marked carrier-less with a trigger. That is none of the three admissible
states:

> "A stated policy is admissible in exactly THREE states — per-artifact-decidable
> (state it), detector designed in (measure it), or deliberately carrier-less
> (mark it, with a reopen trigger) — and **carrier-less BY OMISSION is the
> defect**."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`

  request_id: ca778d10-dd16-48bb-8cff-194c687be8c0
  outcome: discriminating
  query: When a design decision is deferred, what distinguishes a named deferred slot from an open question carried in a spec's open section? Does an identity key discharge a naming decision, or is naming a separate deferral owed its own record?

An incompleteness in a shipped invariant is not a postponement, so it gets a
decision rather than a `deferred-slot:` token. Contrast §11's two open
questions, which are genuine forks between readings that both satisfy §12 —
those are marked, with triggers.

**Why (selected tag, named group) and not the group name alone.** A co-tag
group's name already embeds both (`agents × architecture`), so the pair looks
redundant — and it is not, because §6's groups are composed *per selected tag*
and the same unordered pair is reachable from either side. Keying on the
rendered name alone would silently merge two reports whose member sets are
computed over different denominators, which is the same-key-different-content
collision the hub already refuses at a resolver
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:145`).

**Why the pin and not a version field.** The triple is not a convenience key;
it is the ratified shape for a derivation that outlives its computation:

> "An artifact that will be ACTED ON after it is computed carries the state it
> was computed against, and acting on it RE-VERIFIES rather than re-resolves
> … The shared failure is **silent re-resolution**, which converts a stale
> artifact into a *confident wrong action* — worse than an error, because the
> mechanism reports success."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:161`

> "Versioning is PINS, never a version field … A version number would be a
> conformance copy of the pins with no declared precedence and no mismatch
> check"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:83`

  request_id: 4e9961fa-b7c2-467b-bf1e-6f4183f1cf8b
  outcome: discriminating
  query: A derived report artifact keyed to the substrate pin and the query it was computed against, regenerated idempotently per (pin, query) — is a derived rendering a second authority, and should such artifacts be committed or machine-local?

**The pin is the mismatch check, which is what makes a stored derivation
admissible at all.** The objection this has to answer is
`derivable-artifact-is-a-view-not-a-noun` — "A proposal table is a regenerated
VIEW, never a saved artifact to execute later"
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/claude-code-ops.md:66`).
It does not reach this case, on the same line's own terms and for two
independent reasons. First, that rule governs artifacts **acted on** after
computation, and a Full Report is **read**, never executed — it is a report,
per the clause above. Second, the same line names the remedy it demands for
stored derivation: "the pin **is** the mismatch check and the tracker is the
declared authority." The (pin, query, judge pin) key is that mismatch check, with the
**served surface authoritative and the report subordinate**. That is
`conformance-copy-needs-declared-precedence` satisfied rather than evaded — a
copy with declared, checkable subordination is conformance; a copy without one
is a second authority growing in the dark.

**A report generated under a superseded pin is never silently refreshed.** It
is kept as the reading of that pin, and a request under a new pin produces a
new report. Re-resolving one onto current content would assert that the owner
read something they did not.

### 12.2 Location and naming — machine-local, never committed

**Naming, and how it differs from identity** — v4, kogaki#131. kogaki#129
asked the sitting to decide three things: where reports live, **their
naming**, and whether they are committed. v3 decided the first and third and
left the second to be read out of §12.1, which does not answer it — so it is
answered here.

**A report is RESOLVED by §12.1's identity TRIPLE, and NAMED by whatever
filename the emitter chooses.** These are two jobs, not one:

- **Identity is normative.** A request for the report of
  `(pin, query, judge pin)` — the query itself being `(selected tag, named
  group)` — must resolve to exactly the report that identity identifies, and to a new one
  when any component differs. Every rule in §12.1 binds here.
- **The filename is implementer-owned and carries no authority.** Nothing may
  read meaning out of it, parse it to recover the triple, or key on it — the
  report's own recorded pin, query and judge pin are the only source of that.
  A filename
  is at most a convenience for a human listing a directory.

The split is not invented for this case; the hub already draws it between a
**join key** and a **citation that is provenance**
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:171`),
where a component was found joining on the citation and reporting 32 of 35
entries as orphaned. A filename derived from the triple is exactly that hazard's
shape: it looks like a key, is not one, and drifts silently the first time an
emitter changes how it renders a group name.

**So a naming scheme is neither specified nor forbidden here** — and that is
the decision, not a second deferral. An emitter may name reports however it
likes, *because* nothing is permitted to depend on the name. Had naming been
left to a `deferred-slot:`, the slot would have implied a decision was owed
before code could proceed; none is.

Reports are written to the **machine-local run workspace** (`~/.kogaki/runs/…`
or `$KOGAKI_RUN_DIR`), alongside the survey records they derive from, and are
**never committed**. This is decided here rather than deferred, because the
precedent is unambiguous and already binding: founding spec rider 3 makes the
run workspace machine-local and uncommitted, `.claude/skills/terrain/SKILL.md`
states it as a hard line, and the §9 fill on kogaki#26/#27 measured **zero**
committed survey records. A report is a derivation *of* a survey record and
cannot be more public than its input.

**Consequence, stated so it is not discovered later:** a Full Report is not a
citable artifact for anything outside the machine that made it. Article
material is quoted from served renderings at pins (`specs/SPEC.md` §2), never
from a report — which is the same boundary the rendering-not-an-address clause
above draws, arriving from the storage side.
