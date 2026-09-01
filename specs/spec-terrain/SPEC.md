# SPEC-terrain — the survey/selection surface

**Status:** v33 (kogaki#700). This file carries the **current contract only**.
Superseded behaviour, defect specimens, version ledgers and withdrawn proposals
are not recorded here: history lives in git and in the issues, reachable by
`git log` and by the issue threads. A removed owner-facing behaviour is gone —
at most a refusing stub naming its replacement, never a prose restatement of
what it used to do.

**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

**The forward rule.** A removed owner-facing behaviour is **gone** — at most a refusing
stub naming its replacement (§15.6.3), never preserved behaviour and never a prose
restatement of what it used to do. A superseded behaviour kept as a record in an
operative carrier is material a later re-cut or implementer reads back in, which is how
a removed surface returns.

**Carriers with precedence over this prose.** `specs/spec-terrain/report-format.json`
wins on the **rendered form** (§14.1); `specs/spec-terrain/workflow.json` wins on
**sequencing, waits, write bindings and judgment-point placement** (§15.1);
`specs/spec-terrain/survey-schema.json` carries the survey record's shape. This
file governs intent and the semantic contracts, and stops being the contract
wherever one of those artifacts speaks.

Authored **here**, in the consumer, never ported as hub text:

> "Terrain is a consumer product and its design spec is consumer-side"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:23`

## 1. Sequencing — the decision this spec was required to make

`specs/SPEC.md` §5's ordering clause is the carrier; this section states the
decision it records. Terrain's screens present selections, so they depend on
manifest items **3** (the owner-facing proposal contract) and **4** (the gate
carrier). Both port **first, as their own PRs, with their own contracts**.

**The refusal is a boundary, not a preference:** a Terrain implementation that
grows its own proposal-rendering or gate-payload affordance has committed the
refused alternative under a different name, and §5's clause is what it is
measured against.

## 2. The inherited contracts

These three are the manifest's own, inherited unamended. This spec binds their
**application to Terrain**; it does not restate them as new invariants.

### 2.1 Completeness is a cover counted in placements

Every Strand appears in at least one section. Strands with no relation go in an
**explicit named section** rather than being dropped. Nothing is silently
dropped.

**The count runs AFTER composition**, not before. A completeness figure computed
over the candidate set rather than over the composed placements measures the
wrong thing and will read as a pass while material is missing.

**A figure names which family it counted.** The served vocabulary is three terms
— Strand (Lesson|Journey), thread-line (Decision|Position), and Thesis — and no
umbrella over Strand and thread-line is minted:

> "a covering word is what let the 2026-07-28 '132 of 246 Strands' figure be
> measured over Lessons ∪ Decisions (journeys excluded) and quoted into
> decisions made under the ratified Lesson-or-Journey definition, so every
> figure must name which family it counted"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`

So every completeness figure Terrain emits states its denominator's family. **A
bare count is a defect, not a terse rendering.**

### 2.2 Presentation-only grouping

Sections gate nothing. A navigation step carries **no selection authority** —
moving between screens, expanding a section, or changing the grouping axis never
narrows what the owner may choose. Screen 1's axis is the **served tag
vocabulary**; grouping is a view over the candidate set, never a filter on it.

This clause governs what grouping may do to a candidate set; it says nothing
about what the candidate set *is*. §5 fixes that separately, and the two are
deliberately not merged — the distinction between narrowing a set and
constituting one is what §5's declared divergence turns on.

### 2.3 The second-proposer boundary

A combination becomes a **proposal** exactly when something other than the owner
narrows the candidate set.

- **Navigation** (no proposal): enumerate, sort, filter-by-owner.
- **Proposal** (routes through item 3's contract): rank, trim, hide.

Stated as an enumeration with both sides named rather than as a principle. **An
act not in either list is a report, not a choice** — Terrain surfaces it as
unclassified with its reason and takes no narrowing action.

**WHERE THE DISCLOSURE IS OWED, and where its absence is the discharge**
(kogaki#737). The `Classification:` and `Narrows nothing:` lines are owed by a
surface that **selects** — one whose rendering is a subset of something larger,
where a reader cannot tell from the text alone that nothing was ranked, trimmed
or hidden. A surface that **enumerates its population completely** discharges
the boundary structurally: there is no subset to disclose, so a disclosure line
would assert as a fact about the act what the act's own shape already
guarantees.

**The nearest existing surface is a partial exemplar and is named as one.**
`tag_listing` enumerates completely and carries neither disclosure line — but it
*also* says it narrows nothing, in prose, in two of its four line classes (its
header and its `navigation_hint`). So it demonstrates the rule and something
more, and a reader taking it as the worked example would conclude that a prose
assurance is part of the discharge. It is not: **the structural half alone
discharges the boundary**, and a prose line saying so is admissible on a surface
that wants one, never required. Stated because the one precedent available
carries both halves, and an exemplar richer than its rule silently raises the
rule.

**The carrier is the surface's own allowlist, never a per-surface prohibition.**
A complete-enumeration surface declares the line classes it renders, with
`non_member_fallback: REFUSE`; the disclosure lines are then absent because
nothing but the declared classes may render, not because they were named and
forbidden. Written this way deliberately — an enumerated prohibition's
non-member fallback is admit, which is the shape §9 already chose against, and
a rule that reads *these two lines do not render here* would be that shape
arriving one surface later.
`consulted: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d topics/articles.md:149`

### 2.4 The WA baseline — Terrain design only, divergences declared

**Kogaki's Terrain reproduces WA's Terrain design by default**:
`writing-assistant specs/spec-terrain/SPEC.md`, `presentation.md` and their
amendment files are the design baseline, and a Kogaki divergence from them is
**declared in this spec with a source-qualified pin**.

**The scope limit is part of the clause, not a footnote: the inheritance is
limited STRICTLY to Terrain design.** Kogaki was created specifically to
separate Draft and Brief completely from WA, and nothing here may be read as a
general WA inheritance — not for Draft, not for Brief, not for any other
subsystem. A sitting citing this section for a non-Terrain design question is
misusing it.

**The divergence register.** Entries keep their numbers so citations stay valid;
a number absent from the list is an entry whose divergence no longer exists.

1. **Lessons-only candidate rows** (§5.1) — diverges from a served hub line;
   declared there with its falsifiers.
4. **No per-Strand Gloss line and no Journey line on the screen** (§6.1) — the
   baseline had closed group presentation as *"Group ID, Strand ID, gloss,
   journey — and nothing else"* (`writing-assistant specs/spec-terrain/
   amendments-2026-07-30--2026-08-01.md`, wa#1115/#1116); Kogaki's screen serves
   the IDs and the composed claim and serves **neither the per-Strand gloss nor
   the journey**, which live in the Full Report (§12). The cost is real and is
   declared rather than argued away: an owner navigating the screen reads Lesson
   IDs and a composed claim with no per-Strand headline until they open the Full
   Report.

An entry lands here **in the same amendment that creates the divergence**; a
divergence found shipping without an entry is a defect against this section.

The served surface discriminates toward recording rather than reversing:

> "A consumer that ships ahead of the hub wording DECLARES its divergence in
> the artifact, with a source-qualified pin … naming the diverged line converts
> an unratified shape into a CHECKABLE PROPOSAL … The hub's line still wins;
> what changed is that the gate had something exact to ratify rather than a
> shape to reverse-engineer."

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/knowledge-architecture.md:121`

**THE FLOW RULE.** `.claude/skills/terrain/SKILL.md` cites this section's flow
rule, so the rule is stated **here**, in full, and the skill states it
operationally. It has two limbs:

- **The negative limb.** The screens and the Full Report are the runtime's
  renderings, **served verbatim**: the flow composes the runtime's *inputs* —
  the claims, the subdivisions — and relays its *output* as-is, and **never
  re-renders, summarizes, reformats, tabulates or paraphrases** what the runtime
  printed.
- **The positive limb.** The runtime's rendering **reaches the owner as the
  FIRST act after the command returns** — before any gate, any question, and any
  other tool call. **A runtime refusal's stderr is delivered the same way and is
  never swallowed.** The object of that first act is **the artifact, named**:
  the screens are `reports/Screen.md` (§14.4.1) and the Full Report is
  `reports/FullReport.md` (§12.2), and relaying a rendering in full in the reply
  is the retyping §14.4 prohibits. **The form of the hand-over is non-normative**
  per §14.4.1 and no form may be read into this limb. Relaying nothing is a
  breach.

**This clause is PROSE, and prose at this layer is ADVISORY rather than a
carrier:**

> "the rule there is to SHRINK the free-form surface rather than lint it …
> `carry-a-rule-at-its-violation-layer` sites the carrier where the rule can be
> broken, which here is the model's own composition step — a layer the product
> does not own — so a rule written into a skill file or CLAUDE.md is
> **advisory, real, worth writing, and NOT a carrier**."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 topics/articles.md:106`

No check here can observe whether a string reached the owner's visible reply.
What the clause buys is that a run which relayed nothing is **visibly** in breach
of a stated obligation rather than conformant with a negative list — worth
writing, and not the same thing as enforced.

## 3. Inputs — served renderings only

Terrain reads through the seam, consumer `kogaki`: `element_survey`,
`gloss_index`, `glossary_entry`, `topic_thread`.

The repository-invisible boundary applies in full (`specs/SPEC.md` §2), and so
does the substrate-internals boundary (`specs/SPEC.md` §4's sided-evidence
clause and `policy/consultation-map.md` entry 2): Terrain reads **served
renderings**, never the state the gateway keeps to serve them.

**A resolver cites what it read, never what it was asked for.** Terrain quotes a
served rendering at the pin the seam returned, and where a served answer's
citation and content disagree the disagreement is surfaced rather than resolved —
a well-formed citation to a file that does not contain the quoted material passes
every downstream resolve check
(`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:130`).

## 4. Out of scope, by decision

Any proposal-rendering or gate-payload affordance of Terrain's own — those are
items 3 and 4, and building them here is §1's refused alternative. Also out:
probe, harvest, fact sheets, the sources gate, the provenance map/judge, and the
interview's mandated asks, all dropped by `specs/SPEC.md` §5.

**IN scope by decision: the provenance-neighborhood surface, §13.** Named here
rather than only at §13 because this section is where a reader checks whether a
surface is admitted, and a surface admitted only in its own section is admitted
where nobody looks for the answer.

**Why it is not the affordance the paragraph above refuses.** §13's suggestions
are **not proposals** in this spec's sense. §2.3 fixes "proposal" to the act of
**narrowing**, and routes `rank`/`trim`/`hide` to
`specs/spec-proposal-contract/SPEC.md` on exactly that ground. A widening view
narrows nothing, so it grows no proposal-rendering affordance and needs none —
"propose-only" in the neighborhood's vocabulary means *suggests without gating*,
which is this spec's **report**, not this spec's **proposal**. §13.1 states the
mapping so a later reader does not resolve the collision the other way and
conclude §1's refused alternative was built.

## 5. The candidate model — Lessons-only rows, Journey marked by absence

**The candidate row is one Lesson.** A Journey is not a row of its own; it is a
**mark on its Lesson's row**, and the mark reads by **absence** — a Lesson with
no Journey is decorated, a Lesson with one is not. Every screen that shows
candidate rows **states its denominator**, in Lessons.

The design's load-bearing half is the denominator rather than the mark. At high
Journey coverage a presence-mark decorates nearly every row and discriminates
between none; the thin Lessons are the actionable set, and the stated denominator
is what makes the **next coverage inversion visible on-screen** rather than
inferable only by someone who already suspected it.

The coverage figure is **re-measured at every run** rather than quoted from here.

### 5.1 Declared divergence — pending hub wording, stated rather than assumed

**This section diverges from a ratified served ruling. The divergence is declared
here rather than smuggled, and the hub's line still wins.**

The served line diverged from:

> "Screen 1 offers Topic selection …; **screen 2 shows all of that Topic's
> Lessons and Journeys** in semantically related sections whose first line is a
> derived title. The invariants that distinguish this from the abandoned unit,
> both mechanically checkable: **completeness** — sectioning is a permutation,
> every element appears exactly once, count-in equals count-out … and
> **presentation-only**"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:25`

**The reading Kogaki proceeds on:** candidate rows are Lessons only, with the
Journey family derived and marked by absence and the denominator stated.

**The refresh is OWED, not done.** No hub ruling has been requested and none is
assumed; a later served amendment supersedes this section without argument, and
until then this text is a **checkable proposal** rather than a settled shape.

> "**A consumer that ships ahead of the hub wording DECLARES its divergence in
> the artifact, with a source-qualified pin** … naming the diverged line converts
> an unratified shape into a CHECKABLE PROPOSAL"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:119`

A Terrain implementation that carries lessons-only rows **without** this section
present is the silent-promotion hazard realized, and the absence of this section
is the defect rather than the code.

**Scope of the divergence: item 1 only.** §§6, 7 and 8 each rest on a ratified
served ground and diverge from nothing.

### 5.2 The risk this design carries, and what would falsify it

The completeness invariant binds the **placement** of candidates. §5 changes the
**candidate set itself**, one step upstream of where the invariant watches — so a
design that never drops a placement can still have shrunk **count-in**, and the
placement check would pass while it did. That is the honest objection to §5.

**Why the design survives it.** Every Journey has a Lesson of the same slug, so
the Journey family is **representable without loss** as a per-Lesson mark:
Lessons plus marks reconstructs the Strand set exactly, count-out over Lessons
plus the marks equals count-in over Strands, and no Strand becomes unreachable.
The reduction is a **re-projection, not a drop**.

**Falsifier 1 — an orphan Journey.** A Journey whose slug matches no Lesson has
no row to be marked on and is silently dropped. The count is computable at every
run (`orphan_journeys`), and any value above zero **falsifies this section**.
Terrain **refuses the survey** in that case rather than rendering it — a
generation-time refusal, per §2.1's rule that nothing is silently dropped. The
refusal names the orphan slugs.

**Falsifier 2 — coverage saturation.** Marking by absence discriminates only
while some Lessons lack Journeys. At 100% coverage the marks decorate everything
and inform nothing, and the design's own rationale expires. The reversal trigger:
**coverage ≥ 99% (thin Lessons ≤ 1 of the served denominator)** reopens §5 as a
design question.

**The two falsifiers are not equally sited, and that is stated because the pair
otherwise reads as symmetrical:**

| | Falsifier 1 (orphan Journey) | Falsifier 2 (coverage ≥ 99%) |
|---|---|---|
| Computed | yes, every survey run | yes, every survey run |
| **Read** | **yes** — refuses the write | **no — nothing reads it** |
| Carrier | generation-time refusal, fixture-verified | none |
| Fires by | the code stopping | a human noticing a percentage |

> **instrument: none** — for Falsifier 2. Declared at authoring, per the rule
> that the declaration binds at authoring time and never as a periodic reader.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9`

**The cost, stated rather than absorbed.** A held item whose trigger nothing
reads can fire and go unnoticed; the failure mode is *fired-and-unread*, and it
presents as nothing happening. Falsifier 2 is honestly a **weaker instrument than
Falsifier 1** — a stated reopen condition on a rendered number, not a guarantee,
and it must not be quoted later as though the design were mechanically protected
against saturation.

Both falsifiers are **properties of the served corpus, not of Kogaki's code**,
which is why they are stated as triggers on a measurement Terrain already takes
rather than as tests over an implementation.

## 6. Navigation — the co-tag second step

### 6.0 The pre-selection listings are OWNER-EXECUTED, and write nothing

**A Screen is the rendering written after a tag has been selected — nothing
else.** The pre-selection tag listing the owner chooses a tag *from*, and the
per-tag row view they may ask to browse, are therefore not Screens. They write no
`reports/Screen.md`, and §6.3's two-act window is what `reports/Screen.md` is for.

**The channel: the OWNER runs them.** `tags --survey <record>` prints the tag
listing; `tag-rows --survey <record> --tag <T>` prints the per-tag row view. Both
go through the format guard, both write nothing, and neither is a state — so
§15.5's write authority never engages and §15.2's one-entry-point rule is
untouched, because these are not acts of the flow. The executor names the
invocation at its `TAG_SELECTION` stop, from the table's own `owner_reads`
declaration, and **neither runs it nor relays its output**.

The ground is that the channel is the owner's own terminal rather than stdout in
the abstract:

> "In the Claude Code harness a tool call's stdout is displayed to the MODEL,
> not reliably to the OWNER … every conformant behavior renders nothing, and the
> observed false claim ('the screen is above') is what an agent produces when
> instructed to deliver through a channel that does not display."

`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/claude-code-ops.md:69`

A session's tool call prints to the session; an act the owner types prints to the
owner.

Selecting a tag displays **the other tags its members carry, grouped by co-tag,
with counts** (`agents × architecture (3)`). This is the second navigation step,
and it is navigation in the full §2.3 sense: deterministic, complete, nothing
hidden, no ranking. Selecting a co-tag group narrows nothing — the full candidate
set stays reachable, and free text still reaches every Strand at the gate.

> "The remedy, when one is eventually needed, is a **SECOND NAVIGATION STEP** —
> not a cap and not a re-tag. … Elements already carry their other tags on the
> served surface, so offering those as a sub-selection is *navigation*:
> deterministic, complete, nothing hidden, no ranking."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:17`

**Machine-composed connective prose at render time is admissible**, and it
arrives with the invariants binding *harder*, not softer:

> "The ratified invariants bind **harder** with a model in the loop — composed
> section prose stays a permutation … and carries no selection authority; a
> composer able to omit or merge a Strand is
> [[grouping-upstream-of-selection-is-a-gate]] arriving again, wearing prose."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:110`

### 6.0.1 The co-tag SELECTION display — owner-executed, and it writes nothing (kogaki#737)

**Owner ruling 2026-09-01.** At the co-tag selection moment the display is
**guaranteed by the harness as screen output — never a file**. Fixed blocks; the
LLM controls exactly one sentence; it writes nothing.

**THE SCREEN DEFINITION IS SHARPENED, and that is this section's load-bearing
half.** §6.0 says *"a Screen is the rendering written after a tag has been
selected — nothing else."* Read on its key alone that admits this display, which
comes after a tag is selected and must write no file — so the key was **when**
where it meant **what**. A Screen is the rendering of the **co-tag groups**, the
surface §6.3's two-act window operates on and the one state that writes
`reports/Screen.md`. The selection display precedes it, on the same side of the
line as §6.0's listings, and `reports/Screen.md` keeps exactly one writing state
(`cotag_screen`) as it always had.

**The channel is §6.0's, unchanged and not re-argued: the owner runs it.** The
executor names the invocation at the selection stop, intent placeholder
included, and **neither runs it nor relays its output** — the same clause, for
the same reason, since a session's tool call prints to the session and an act
the owner types prints to the owner.

**Three blocks, and the surface's grammar admits nothing else.**

1. **Marker** — `CO-TAGS — selecting co-tags for: <tag>`, a fixed literal.
2. **Counts table** over **all** served tags, family-named columns
   (Lessons / Journeys), count descending. A tag name longer than its column
   wraps onto at most two lines, breaking at hyphens or spaces, never mid-word;
   the table may widen.
3. **`intent: <one sentence>`** — the LLM's sole contribution, supplied at the
   invocation and **refused** if it is multi-line, longer than 200 characters,
   or carries table or marker syntax.

**The bound is 200 and not "about 200".** A spec cannot ship an approximation
its emitter must then guess at; the refusal is the emitter's own `fail()` rather
than a lint. The judgment-class rule is the **root spec's** —
`specs/SPEC.md` §2.6.3 — and it is named with its document because this spec has
no §2.6 of its own, so a bare number would resolve here to nothing.

**§2.3's disclosure lines do not render here, and the reason is the grammar
rather than a prohibition.** Block 2 enumerates *all* served tags, so this is a
complete enumeration and §2.3's amended clause discharges the boundary
structurally. Nothing in this section names the disclosure lines as forbidden,
because that rule would be an enumerated prohibition whose non-member fallback
is admit.

**The declared class list is exactly `marker`, `table_header`,
`tag_count_row`, `row_continuation`, `intent` and `blank`, under
`non_member_fallback: REFUSE`.** A *seventh* class fails at emit time.

**The list has six members because the layout above needs six line CLASSES, and an
earlier form of this clause declared four — which made the ruled layout
unrenderable under its own grammar** (found at implementation, 2026-09-01, and
recorded as the Blocker that licensed this amendment). Block 2 is a table with
**family-named columns**, so a `table_header` line naming Lessons and Journeys
is what makes them named; and a tag name that **wraps onto a second line** needs
a class admitting that second line. Under the four-member list both were
non-members, and `non_member_fallback: REFUSE` means the emitter would have
refused the very layout this section requires two paragraphs earlier. A contract
that forbids its own ruled output is worse than one that under-specifies it: the
first fails at emit with no reading that satisfies both halves.

**The defect is stated rather than quietly corrected, because of how it
survived.** The four-member list was itself a repair — PR #746 round 1 found the
list saying "exactly the three classes above" while the implementing issue
planned four, and the fix reconciled the count against *that issue's plan*
instead of against **this section's own layout requirement**. A count checked
against one of its two readers is checked against neither.
`consulted: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d topics/knowledge-architecture.md:197`
— "a committed instance disagreeing with its class is a VIOLATION, never an
exemption", which is why the resolution had to move the declaration or the
layout and could not excuse the rendering.

`blank` is the separator class every owner surface in the carrier already
declares (`tag_listing` carries `header`, `tag_row`, `navigation_hint`,
`blank`).

**TWO COUNTS OF `tag_listing` ARE BOTH TRUE, and saying which is which is owed
here** (kogaki#737, PR #748 round 1; the observation stands as `reg-0193`). Its
**declared** `line_classes` array holds **four** — `header`, `tag_row`,
`navigation_hint`, `blank`. Its **content**-class guarantee, the one §9 chose
and `terrain/terrain.mjs`'s completeness inventory records, is **two**: the
header and one `tag_row` per section, *and nothing else*. A sentence naming
"two" is about the guarantee; a sentence naming "four" is about the array.
Written down because this section quotes both within a few paragraphs, and a
reader deriving a class model from it met the same surface twice with different
arithmetic and nothing saying they were counting different sets.

**Why this is a surface of its own and not a widening of `tag_listing`.** That
surface's completeness inventory names *"the header and one tag_row per section,
and NOTHING else"*, with a check that fails on a fourth line class; widening it
would delete the guarantee and the test enforcing it, and would carry an exemption justified by `tag_listing`'s
constraint onto a member that never had it — silently, since an exception exists
in order to skip a check.
`consulted: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d LESSONS.md:123`
It is also the wrong moment: `tag_listing` is pre-selection, and this display is
after a tag is chosen.

**What the display exists to remove is a generator, not an act.** The 2026-08-31
dogfooding run wrote `reports/Screen.md` at this moment by hand, and the run's
own write ledger records exactly one legitimate screen write, at `cotag_screen`.
A session that wants to show the owner the tag counts was squeezed between
§6.0's refusal to relay stdout and the delivery rule requiring an artifact;
manufacturing a file is what that squeeze generates. Banning the write without
supplying the surface would leave the generator in place.

### 6.1 What the co-tag screen SERVES — the compact GroupClaim-first form

**The screen serves, per group:** the **GroupID**, the **GroupClaim** — §7's
composed "in common:" line — and the **member Lesson IDs**. Where §8's conditions
bind, the members are served as SubGroups, each carrying its own SubGroupClaim
above its Lesson IDs (§6.2). Every figure names its families under §9.

**The screen carries no per-Strand Gloss line and no Journey line.** The
untruncated Claims and Glosses live in the Full Report (§12), which the owner
pulls per entered ID set. This is §2.4's register entry 4.

**The served form, per group:**

```text
G<n> — <co-tag name> — N Lessons: L<i>, L<j>, …
in common: <GroupClaim>
```

- The **heading line** carries the GroupID, the Lesson count, and the member
  Lesson IDs. The count names its family (§9).
- The **GroupClaim renders beneath the heading**, whole — a claim is never
  clipped mid-text. It renders for **every** group, subdivided ones included.
- Where §8's conditions put SubGroups on the group, the members render as
  SubGroups per §6.2's form instead of on the heading line, and the heading
  carries **the GroupID and the co-tag name alone**.
- **A blank line separates every group block and every SubGroup block.**

**INDENTATION IS NOT THE HIERARCHY CARRIER; THE GroupID IS.** Claim lines are
long prose, they wrap at the terminal edge, and a wrapped continuation begins at
column 0 — so the hierarchy would disappear exactly where the text is longest.
The level therefore lives in **content**: `G<n>` is a Group, `G<n>-<m>` is one of
its SubGroups (§6.2), and every line renders **flush left**.

**The ID space is registered rather than implicit:** `tokens.GroupID`
(`^G[0-9]+$`) and `tokens.SubGroupID` (`^G[0-9]+-[0-9]+$`) in
`specs/spec-terrain/report-format.json`.

The compact all-groups form is the ratified shape:

> "Top-N is WITHDRAWN and the compact all-groups form replaces it: the narrowing
> act moved to the owner, which is what puts the replacement inside the
> second-proposer boundary. **Every group renders as member ids plus the composed
> commonality line** … with the owner pulling a **Full Report** per named group.
> … the boundary's test is not whether a machine computed something but
> **whether what reached the owner is smaller than what exists**. Nothing is
> smaller."

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/articles.md:80`

**No flat slug dump.** Every Lesson ID reaches the screen inside at least one
Group, which is what §2.1's cover counted in placements guarantees and what
`COTAG_COVER_INCOMPLETE` refuses on.

**Purpose clause, stated here because the screen is judged against it.** Terrain
is a support system for **beginning** Brief creation and does not itself start
one; its job is surfacing which combination of Lesson IDs the owner would enter
when they later compose a Brief. **A screen with no visible Lesson IDs fails that
purpose regardless of what else it shows.**

### 6.2 SubGroups on the screen, and the threshold

**THE SCREEN CARRIES A THRESHOLD, AND IT IS TEN.** §8 governs it and this section
inherits it: a composed group at or above 10 members must serve SubGroups, and a
judged-empty outcome for one is refused at render.

Below the threshold, SubGroups appear where the judge's **coherence label** and
§8's two disjunctive disclosures put them.

**THREE GROUPING RULES, and what each one does when it fails.**

1. **The SubGroup member counts sum to the parent's total.** Every member placed,
   nothing silently dropped. A screen violating it **does not render** — a
   pre-render refusal in `cmdCotags`, over the placement rather than the rendered
   text, because the subdivided heading carries no parent count for a text-level
   rule to read. `report-format.json`'s `not_expressible` entry —
   `subgroup_members_sum_to_parent` — carries what that siting costs and its
   reopen trigger.
2. **The `(fits no composed SubGroup)` remainder is at most 30% of the parent's
   members.** The name is the schema's — `survey-schema.json`'s
   `subdivision.no_member_hidden_subgroup` — and is read from there, never
   restated in a renderer. A judgment whose remainder exceeds it is re-run or recomposed; it
   does not render — `catch_all_share` (§14.2), whose denominator is the sum of
   the group's own `subgroup_heading` counts.
3. **A split whose only named SubGroup restates the parent's own commonality does
   not discharge the subdivision obligation** — and *that phrase means the group
   renders no SubGroups*, not that the screen refuses. A split whose only named
   SubGroup the judge labels `forced` leaves the group rendering flat, with its
   own claim and member ids, exactly as an unjudged-empty group does — **and only
   below the split threshold**. At 10 members or more this fallback is
   unavailable, because the flat rendering it produces is the outcome §8 refuses,
   so the suppression yields and the group RENDERS its split, labelled `forced`.
   **Why not a refusal like 1 and 2:** those are properties of the *rendered text*
   and a violation means the emitter produced something incoherent. This one is a
   *judge's verdict*, and refusing the whole screen over it would contradict this
   section's own conformance clause.

**The screen JUDGES its SubGroups; it does not merely render them.** Three
requirements:

- **The screen renders each SubGroup's coherence verdict** — the label and its
  one-sentence why — exactly as the subdivision judgment produces it.
- **The screen emits both disclosures**, degenerate-claim and
  undiscriminating-claim, on the same disjunctive terms §8 states. Neither gates
  anything; both are disclosures.
- **The screen REQUIRES the judge pin** — model id and effort tier. A
  per-invocation judged surface with no judge pin is the drift-undetectable
  shape, where "recomputed fresh" silently becomes "recomputed by a different
  judge". A judged surface that records no judge is not cheaper than one that
  does; it is one whose drift cannot be seen.

The siting is the reason this belongs at the screen rather than upstream:

> "A rule is enforced only at the layer where it can be broken … when that layer
> belongs to another system, the carrier goes at the last boundary you control,
> with any gate upstream of it counting as ergonomics rather than control."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

**The served SubGroup form:**

```text
G<n>-<m> — N Lessons: L<i>, L<j>, … — <SubGroup name>
in common: <SubGroupClaim>
coherence: <label> — <why>
```

One line — SubGroupID, Lesson count, Lesson IDs, SubGroup name; the SubGroupClaim
on the next; the coherence verdict and any disclosures follow it; the judge pin
renders once for the screen. `G<n>-<m>` **names its own parent**, so a SubGroup
line met on its own — wrapped, or scrolled away from its group — still says where
it belongs.

**The ruled shape, whole:**

```text
G1 — agents × architecture
in common: <GroupClaim>

G1-1 — 3 Lessons: L1, L2, L3 — <SubGroup name>
in common: <SubGroupClaim>
coherence: tight — <why>

G1-2 — 3 Lessons: L4, L5, L6 — <SubGroup name>
in common: <SubGroupClaim>
coherence: related — <why>

G2 — agents × claude-code-ops — 9 Lessons: L7, L8, L9
in common: <GroupClaim>
```

**A suppressed split is DISCLOSED, never silent.** A group rendering flat because
its only named SubGroup was labelled `forced` is fully conformant, but a judgment
did run and did produce a split; an owner who sees a flat group cannot otherwise
tell that from a group nobody judged. The disclosure is aggregate rather than
per-group.

### 6.3 The post-tag-selection window — exactly two acts, and no question

**READ §6.0 FIRST.** This section governs the window that opens once a tag is
named. What the owner reads *before* naming one is not in this window and is not
a Screen; §6.0 carries its channel.

The window has a known beginning (the owner names a tag), a known end (the owner
speaks again), and exactly two acts inside it: the served screen, and the Full
Report on the owner's ID entry. **No question UI may appear in that window.**

**The fallback here is REFUSE, not report-only, and the window is what makes that
admissible.** An act in this window that is neither of the two named is a
**defect against this section**, and a question UI in this window is a defect
whatever it asks. Report-only is the correct fallback for an open-ended
enumeration; this enumeration is closed, so there is no admissible remainder to
surface.

**The fork is closed.** A tag named by the owner lands **directly at the co-tag
step**, not at a second listing; the per-tag row view runs only when the owner
asks to browse rows. **No question mediates the fork.**

**SCOPE — this allowlist governs the POST-SELECTION WINDOW ONLY.** A question
asked **before** a tag is named falls outside this clause by its own opening
words and acquires no carrier here; it travels with §10's parked opening gate.
Stated at its cost: **the flow before a tag is named has no stated allowlist.**

**What this clause does NOT claim.** Per §2.4's advisory-not-a-carrier statement,
this allowlist is enforced at no layer this repository owns. It shrinks the
free-form surface — which is the served prescription — and it does not detect its
own violation. A dogfood run remains the instrument.

## 7. GroupClaim-first rendering, and claim pinning

Selecting a co-tag group shows **the GroupClaim first**, then the member Lessons.
The claim is the composed "in common:" line — the plain-register statement of what
the members share.

**A claim composed over a member set is PINNED to that set.** A subset selection
**recomposes** the claim and **re-offers** it as a **gate event**, never a silent
refresh; the brief records the **adopted claim together with the members it was
composed from**.

> "A claim composed over a member set is PINNED to that set: a subset selection
> recomposes and re-offers it, and the brief records the adopted claim together
> with the members it was composed from. Keeping a group claim over a changed
> subset asserts commonality over absent members — a provenance lie — while
> discarding it throws away the only thing in the interaction the machine did not
> supply. … a derived expression's truth is relative to the set it was derived
> from, so the derivation carries that set and a change to the set is a GATE
> EVENT rather than a refresh."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

Two riders travel with it, quoted at the same pin: the full-group claim
**survives only in the per-invocation rendering**, and a recomposed claim is a
**proposal** — the owner may keep the original wording, with the recorded member
set making the mismatch **legible rather than forbidden**.

The re-offer is a gate and therefore routes through the gate carrier (manifest
item 4), not through an affordance of Terrain's own — §4 is unchanged and §1's
refusal still binds. Its siting in the flow is §15.6.1's `CLAIM_REOFFER` wait.

**The GroupClaim is composed AT the co-tag screen, for every group.** Two
consequences, and neither weakens anything above:

- **Composing a claim for every group narrows nothing** and writes no record. §6's
  classification is unchanged — the screen stays NAVIGATION. A claim record is
  written only when the owner acts on a group, which is where pinning and the
  re-offer gate live.
- **The pinning rule binds per group at screen scope.** Each screen-composed claim
  is pinned to the member set it was composed over, so a later subset selection is
  the same gate event this section defines. Nothing creates a second claim
  lifecycle; the *first* composition moves earlier.

**The origin travels as an ARGUMENT, and the no-record rider stands.** The caller
that composed the screen's claims already holds their text; the re-offer takes
the original claim and its member set the same way it takes the claim text
itself. So the obligation is met **without reopening the "writes no record"
rider**.

> "[[gate-input-surface-is-part-of-the-contract]] settles the presentation
> (machine-proposed proposal plus free-form override, never raw-artifact
> homework — **handing the owner a stale claim and expecting them to notice it
> no longer fits IS homework**) … a recomposed claim is a proposal, so an owner
> may keep the original wording with the recorded member set making the mismatch
> legible rather than forbidden."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

**An origin that is genuinely absent is stated, never fabricated.** Where a
re-offer has no original — the first composition over a set — the gate says so
rather than presenting the recomposed wording as if it had one.

**A DERIVED origin member set announces itself as derived.** Where an origin's
wording is supplied but its member set is not, the set may be taken from the group
the claim was composed over. **What is forbidden is the substitution being
silent**: a derived member set and a recorded one are otherwise indistinguishable
at the gate, so the gate declaration **distinguishes the two**, as a written value
rather than an omission.

> "When a consuming stage silently falls back to a substitute instead of
> requesting what an upstream stage produced … **make the fallback announce
> itself at the point of substitution, which is the only place the evidence still
> exists**."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:44`

> "an omitted field and a field reading `none` are the same silence to a reader
> and **completely different silences to a grep**"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:11`

## 8. Semantic subdivision — a judged substrate one level down

GroupClaim first, then **LLM-classified SubGroups each carrying its own composed
claim**, then the Lessons per SubGroup. It is **placement plus title-derivation,
hiding none** — the two acts the presentation-only invariant already permits —
and it is **not a cap**:

> "Subdivision is a **JUDGED SUBSTRATE APPLIED ONE LEVEL DOWN, not a cap**: a cap
> decides WHICH members appear, subdivision decides WHERE each appears and hides
> none."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:66`

**The judgment is ONE COHERENCE LABEL, closed at three.** The judge selects
exactly one of `tight` (members share one mechanism), `related` (members share a
theme, not one mechanism) or `forced` (grouped to satisfy the split requirement),
and supplies one free-form sentence of why. Both render under the claim. The
runtime refuses a value outside the set and refuses a label with no reason: the
two are ONE INSTRUMENT, and a default would be the engine supplying the judgment
the label exists to carry.

**Two disclosures, disjunctive.** The **degenerate-claim** disclosure fires when a
claim trails into enumeration. It does **not** detect the reported condition on
its own, which is why the second half exists: the claim is honest but
**UNDISCRIMINATING at the size served** — "an honest summary true of every member
discriminates between none"
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:67`).

**Three instruments, three quantities, none a threshold.** 20% of placements
(relative share), the screen budget (`screen_budget_lines`, rendering
destination), and at-a-glance legibility (`legible_at_a_glance`, absolute). **The three instruments gate nothing and are REPORTED
quantities.**

**THE SPLIT DECISION IS THE ENGINE'S AT TEN OR MORE.** A composed group at or
above **10 members** must serve SubGroups; a judged-empty outcome for such a group
is **refused at render**, the same class as `catch_all_share` — engine-side, no
model discretion. **Membership assignment stays the judge's; whether to split does
not.**

**The boundary's ground is arithmetic rather than taste:** the catch-all cap
leaves 30% of the parent, and 30% of 10 is 3 Strands — the minimum article — so
the requirement works AT 10 rather than above it.

**Two carriers, and they are checked against each other.**
`SUBDIVISION_REQUIRED_AT` in the runtime decides whether a split may be
suppressed; `subdivision_required_at_ten.threshold_members` in
`report-format.json` is what the format guard refuses against. Between two
disagreeing values a group is suppressed to flat and then refused, so it has no
legal rendering at all — `checks/check-terrain-composition.sh` reads both and
compares them.

### 8.1 Measurement before offering — the rider that binds this section

**Subdivision ships dogfood-first.** The ordering is inherited, not invented here:
implemented → dogfooded → owner-verdicted → offered. **Co-tags stay the default
for a run naming no substrate** — that rider is about which **substrate** a run
surveys, and SubGroups render INSIDE a co-tag group, so requiring them decides
nothing whatever about the substrate.

> "Shipping a judged substrate ARRIVES at its offering gate rather than
> discharging it: merged code evidences existence, never the gate's standing. …
> shipping answers *does it run?*, the gate asks *does its output serve the owner
> better than what it replaces?* … the build half being done makes the gate DUE"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:53`

**The ordering ran to completion and its verdict is REQUIRE, not offer.**
SubGroups on the screen and in the Full Reports are a **required** part of the
served surface: a run may not skip the subdivision judgment, and a run that never
asked is refused.

**The HUB-SIDE gate pointer stays NAMED and is NOT claimed as discharged by this
spec.** The gateway is read-only, so the disposition owed upstream is a
**proposal staged through the hub's own intake**, not an edit made from this side,
and it is **owed rather than done**. What Kogaki may do is record its own verdict;
what it may not do is write the hub's record.

**Precedence is declared per axis rather than per artifact.** The hub owns the
**ORDERING** axis — measure-before-offer. The owner owns the **VERDICT** axis —
whether the output serves.

> "A question like 'what's the status of this?' often has two halves answered by
> two different systems … If you write one rule for resolving disagreements, such
> as 'trust the more recent record', you hand one system the final word on facts
> it has no way to observe"

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 gloss/lessons/knowledge-architecture.md:197`

**A pin currency rule this section owes its readers.** `issue-pins --recheck`
compares shas, so a pin can drift, resolve cleanly to the wrong content, and pass
every guard this repository has. **Re-read a served line by content at the moment
it is relied on**, and expect line numbers to have moved.

### 8.2 The second-proposer boundary is unchanged by §§6–8

Grouping, claims and subdivision are **presentation** — placement plus
title-derivation. **Rank, trim and hide still route through manifest item 3's
proposal contract**, and the >3-option trim guard at the selection gate stands
(`terrain/terrain.mjs` `MAX_STRAND_OPTIONS`). §2.3 is not weakened by anything in
§§5–9; a subdivision that ranked, trimmed or hid would have committed §1's refused
alternative under a new name.

## 9. Rendering — headlines, and every figure names its families

**Gloss headlines per Strand.** A candidate row carries its **served Gloss
headline** — the plain-register one-liner — because a row of slug + family + tags
+ cite is a navigation skeleton with no material, and the survey is browsable only
when the owner who cannot yet name a story can read what each Strand *says*.
Constraints that ride it:

- **Served renderings only**, quoted at the pin the seam returned, never re-parsed
  from anywhere else (§3).
- **Tag-scoped and bounded** — one shard pair per viewed tag
  (`gloss_index("lessons/<t>")`, and `journeys/<t>` where the mark needs it),
  addressed `<kind>/<tag>` and never `<tag>` alone. **No fan-out, no whole-corpus
  prefetch.**
- **Navigation semantics unchanged** — the enriched view still narrows nothing.
- **A missing Gloss rendering is an ABNORMAL condition, marked and never
  substituted.** It is a fault to clear, not a known gap to tolerate
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:111`).

**Every emitted figure names its families.** §2.1's rule — "A bare count is a
defect, not a terse rendering" — binds **every figure Terrain emits**: section
counts, view footers, co-tag group counts, subgroup counts. `agents (115)` becomes
`agents (115 — 59 lessons + 56 journeys)`. Under §5 the candidate denominator is
Lessons, so a candidate-row figure names **Lessons** and the Journey half appears
as the coverage mark's own count; a figure spanning both families names both.

**Screen 1's tag rows carry a declared ALLOWLIST, and a line class not on it does
not render.** Permitted on a tag row: **the tag name, and the tag's Lesson
count**. Nothing else is permitted until this allowlist is amended. Stated as an
allowlist rather than as a prohibition because an enumerated prohibition's
non-member fallback is admit
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:45`).
**Scope:** this governs the per-tag rows only, and **nothing else travels with a
tag row** — the Journey half is carried on the **candidate rows**, by the coverage
mark's own count per §5, never on the tag row. The completeness figure stays
counted over placements and family-named (§2.1), and the survey RECORD keeps its
placement counts and per-section `by_family`.

**Where the recomputation lives.** `terrain/terrain.mjs` recomputes `by_family`
from the placements the figure claims to be counted over, and **refuses to write a
record whose stored figure disagrees** (`FIGURE_MISMATCH`). The refusal stays
**generation-time**: constrain generation, then detect what generation cannot
promise.

**The per-section family split lives in the RECORD.**
`specs/spec-terrain/survey-schema.json` carries a per-section `by_family`; the
section figure is recomputed from the placements it claims to be counted over and
refused on mismatch exactly as `completeness.by_family` is.
`checks/check-terrain-composition.sh` reads those field lists rather than
restating them. **The recompute algorithm is written twice** —
`terrain/terrain.mjs` (JS, generation-time) and
`checks/check-terrain-composition.sh` (Python, merge-layer) — and both are
extended together; collapsing that duplication is not licensed here and is named
so the next reader meets it in the spec rather than in the diff.

That siting is the ratified shape rather than a preference here:

> "A tool's config may hold copies of facts whose authority lives elsewhere only
> under a declared precedence rule (which side wins on mismatch) plus a mechanical
> mismatch check; a copy with declared, checkable subordination is conformance —
> a copy without one is a second authority growing in the dark."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:114`

Placements authoritative, the stored section figure subordinate,
`FIGURE_MISMATCH` the mechanical check.

## 10. Parked, with grounds — the Lessons-or-Decisions opening gate

**Parked, not decided, and not built.** A two-family entry gate offering Lessons
or Decisions at the opening screen is **new design owed its own spec decision**.
Its grounds are recorded so a later sitting reopens them rather than re-deriving
them.

The hub **refused ratifying the exclusion** of decision material from the entry
surface:

> "Ratifying the exclusion is REFUSED: an entry screen structurally omitting 54%
> of served material is a **discovery failure, not an honest scope**. …
> `[[reachability-is-address-plus-discovery]]` holds that reachability is the
> conjunction of a resolving address and a surface that discloses it; the decision
> shards have addresses and screen 1 discloses nothing about them, so ratifying
> the exclusion would record a discovery failure as a design."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 topics/articles.md:95`

**And it declined both joins, and minted no umbrella** over Strand and
thread-line — deliberately, because a covering word is what let the "132 of 246"
figure be measured over Lessons ∪ Decisions and quoted into decisions taken under
a Lesson-or-Journey definition. A surface offering one pooled selectable list
would rebuild that hazard mechanically rather than verbally
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:57`).

A two-family entry **gate** — two populations, never merged, chosen between rather
than pooled — is consistent with all three rulings. Consistency is not
ratification, which is why it is parked.

**Trigger:** it fires **after article creation from Lessons is working**, and
**never silently**. The trigger names an act that already happens (the first
completed article run from a Terrain selection) rather than a quantity nothing
measures.

**The standing tension this parking leaves open, rather than resolving it:** §5
narrows the entry surface further, from Strands to Lessons, while the served
refusal above objects to an entry screen omitting material. §5.1 declares that
divergence and §5.2 states its falsifiers; this parking is where the *Decisions*
half of the same objection waits.

**What a later unparking owes**, named so it is an act rather than a mood: (1) the
trigger above fires — article creation from Lessons is working; (2) a served line
speaks to the two-family entry gate, or the owner ratifies knowingly against a
silent substrate and the amendment says so; and (3) the amendment names the
**address** conjunct's disposition — either a Decisions path that resolves, or an
explicit record that the gate ships with discovery established and address still
open. A gate that establishes discovery and leaves address open is a real advance
on the refusal and is not a discharge of it:

> "a fix satisfying one conjunct presents as discharging the whole rule, because
> it cites the rule accurately and the citation lends the untouched conjunct its
> air of completeness — so **a fix invoking a conjunction lesson must name which
> conjunct it establishes and name the one it leaves open**."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 LESSONS.md:47`

## 11. Open — carried as questions, never as contract

**THE COMPOSITION PIN AND THE TYPED CLAIMS RECORD.** `.claude/skills/terrain/SKILL.md`
carries the hard line *"Compose from `compose-input`, never from the whole
survey"*, and instruction text is advisory to something whose job is to satisfy
instructions. The carrier is a refusal keyed to the composition input, **bound by
CONTENT rather than by presence**: `compose-input` emits a **composition pin**
beside its bounded read — the tag, the survey record's pin, and **the member set
it served, per group** — and `cotags --claims` requires that pin and refuses when
the claims' group/member set is not a subset of what the pin covers, **naming the
members that fall outside it**.

The claims artifact is a **typed record**:

    {
      "composition_pin": { "tag": "<T>", "pin": "<survey record pin>",
                           "groups": { "<T> × architecture": ["lesson:…", …] } },
      "claims": { "<T> × architecture": "…" }
    }

It mirrors §12.1's typed subdivision record, so both composed inputs carry one
shape rule learned once, and **claim and provenance travel in one artifact**: a
pin in a separate file can go stale relative to the claims beside it, and nothing
in the tool would catch that. **A bare `{group: claim}` map is refused BY NAME**,
so a stale composer fails loudly rather than silently.

**Why content and not presence, which is the whole of the design.** A stamp
asserting only that `compose-input` *ran* is satisfiable by a session that runs
it, takes the stamp, and composes from the whole survey anyway. Binding the
**subset relation** makes composing outside the bounded read unproducible rather
than discouraged:

> "constrain what the pipeline can **PRODUCE** rather than … improve what it can
> **DETECT** — an enumerated prohibition can only name yesterday's leak while a
> construction constraint makes tomorrow's unreachable"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:47`

**Scope boundary:** `--subdivisions` has its own typed form for its own reason
(§12.1) and is not re-typed by this rule.

---

The questions this section carries, as questions and never as contract:

- **The completeness figure's rendering position.** The served material reports a
  specced burial: a contract that sorts output into buckets makes an editorial
  judgment about reader priority, and the bucket names hide it
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/claude-code-ops.md:15`).
  Whether the figure takes a fixed first-position line is undecided here.
- **Whether "sort" can narrow in practice.** §2.3 places sort under navigation.
  Whether a stable sort over a truncated view narrows the candidate set is
  cannot-determine — no served position was found on it, and it is not asserted
  either way.
- **The co-tag group ORDERING.** The served surface orders groups "sorted
  descending by member count"
  (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/articles.md:80`),
  while Kogaki's shipped `COTAG_SORT` declares "co-tag name ascending, then member
  id ascending". Both are declared deterministic sorts and both are admitted as
  navigation, so neither is a violation; which one Kogaki serves is **undecided
  here**. Reopen at the next Terrain sitting, or when a dogfood run reports the
  ordering as a defect.
- **Is `projects:` a fourth neighborhood substrate?** The field is present on every
  lesson record and carries exactly the kind of link §13.3's substrate carries. It
  is **not adopted**, and the reason is a boundary rather than an oversight:
  `projects:` is already load-bearing as **harvest scope** in the evidence model,
  so recruiting it as a *relevance* substrate would give one field two jobs across
  two subsystems. **Its trigger is §13.5's MISS ARM** — a recorded miss whose Grain
  shares only `projects:` with the candidate set — which is an observation rather
  than a date, and it inherits that arm's own standing.

**deferred slots: none.**

## 12. The Full Report — untruncated material, keyed to what produced it

**What it is.** For a co-tag view, the **untruncated** material: GroupClaim and
SubGroupClaim in full, and the complete Lesson and Journey Glosses, with **no
truncation anywhere**. It is what the owner reads to think a Thesis through, where
§6.1's screen is what they navigate.

**When it is generated: on the owner's ID entry, one report per entered set.** A
report may span several Groups and/or SubGroups.

**THE IDENTITY'S QUERY COMPONENT IS `{ tag, ids }`, AND THE ID LIST IS
CANONICAL.** The set is **sorted before it enters the identity**, so re-entering
the same IDs in a different order is **one artifact, not two** — idempotence is
set-based. The rendering follows the same canonical order.

**THE MULTI-SECTION FORM — what appears ONCE and what repeats:**

```text
# Full Report — <tag>                      ← title: the TAG, not an id
*Selected tag:* `<tag>`
*Selections:* <canonical id list>          ← the entered set, in the identity
*Substrate pin:* `<pin>`                   ← ONCE
*Judge:* <judge pin>
> preamble

## <id> — <name>                           ← ONE SECTION PER ENTERED ID
in common: <claim>
  … its SubGroups and/or members …

## <id> — <name>
  …

## Counted                                 ← ONCE, aggregated over the set
## Served lines                            ← ONCE, merged and DEDUPED
## Provenance neighborhood                 ← ONCE, seeded by the entered set
```

**Once, and why each:**

- **The identity block**, including the pin, which renders exactly once per file.
  A per-section identity would multiply it by the set size.
- **`## Counted`**, aggregated over the whole set. The cost is stated: a
  per-section count is not shown.
- **`## Served lines`**, merged and **deduped**. A member entered under both `G5`
  and `G5-1` appears in the map once.
- **`## Provenance neighborhood`**, seeded by the entered ID set and aggregated
  over it. §13 governs its contents entirely; what §12 fixes is that it is **one**
  section rather than one per entered id, and that it comes **last** — the
  traversal walks the union of the entered set's members, and a per-section
  neighborhood would re-walk shared batches and render the same suggestion under
  several headings. **It renders even when empty.**

**Repeating: the sections, one per entered id, keyed by the id.** A section's
heading carries its id and its name, which is what lets an owner match a section
to what they typed.

**The title names the TAG, never the ids.** The title stays short and stable
however many ids are entered, and the ids belong in the identity block.

**THE SORT IS NUMERIC-AWARE.** `G5-1` sorts before `G10`, not after:
lexicographically `"G10" < "G5-1"`, which would render a screen's tenth group
above its fifth. Compare on the numeric components (`G<n>` then `-<m>`), never on
the raw string.

**What the owner gives up, stated rather than discovered:** section order is the
canonical order and not the entry order. An owner who wants a particular reading
order cannot get it by typing the IDs in that order.

**THE SERVED-LINES MAP IS SITED ONCE AT THE REPORT'S END AND ITS ROWS ARE BARE.**
The map **stays** — it is what lets a reader check the rendering against the
substrate without opening the machine record. Its rows render **bare
`file:line`**, and the Gloss cite rows do too; the pin is stated once, in the
identity.

**A report RECORDS its own identity**, in its own content: the **substrate pin**,
the **selected tag**, the **entered set**, and the **judge pin**. Without this the
artifact is unresolvable — §12.1 states identity as a *property* of a report, and
§12.2 forbids the only other source.

**It is a REPORT, and therefore not a choice.** It ranks nothing, narrows nothing,
and hides nothing, so it sits in neither §2.3 act list and the runtime writes it as a
report — `record-schema.json`'s act classification is untouched.

**It is a RENDERING, and therefore not an address.**

> "the Full Report is a RENDERING, not an address"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:71`

> "A G-id may be accepted at the screen that defined it and expands immediately to
> member ids, but the brief records members and pins, never a G-id, and
> recommendations may never key on one"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:64`

So a Brief, a proposal, or a recommendation **may never cite a report id**. They
cite members and pins. A report id addresses a rendering for the owner's own
re-reading and nothing downstream resolves one.

### 12.1 Identity — the triple (substrate pin, co-tag query, judge pin)

A Full Report is identified by the **substrate pin** in effect when it was
generated, the **co-tag query** that produced it, and the **judge pin** under which
its material was judged.

| act | result |
|---|---|
| same pin, same query, same judge pin, run twice | **one** report — the rerun is idempotent, not a duplicate |
| pin advances, rest unchanged | **two** reports, one per pin |
| same pin, different query, judge pin held fixed or not | **two** reports, one per query — a differing query is two reports whatever the judge pin |
| same pin, same query, **different judge pin** | **two** reports, one per judge pin — coexisting; neither collides nor supersedes |

**This table is the normative form.**

**The co-tag query is the pair (selected tag, entered id set).** Two reports are
the same report when both components match, and different otherwise. Nothing else
enters the key: not the composed claims, not the run.

**Why (selected tag, …) and not the group name alone.** §6's groups are composed
*per selected tag* and the same unordered pair is reachable from either side.
Keying on the rendered name alone would silently merge two reports whose member
sets are computed over different denominators.

**THE JUDGE PIN IS THE THIRD COMPONENT, ALWAYS**, and where no judged material is
present it takes the typed value `none`. Without it, two reports whose
`(pin, query)` match but whose judged content differs would be **one report by
identity and two by content**.

**The arity is UNIFORM.** A key whose shape depends on the report's own content is
one a requester cannot form without already holding the report they are trying to
address — **an identity a request cannot construct is not an identity.** `none` is
therefore a **typed value that must be present**, never an omitted component.

**A judge pin of `none` on a CO-TAG-GENERATED report is NON-CONFORMANT.** Such an
artifact is a failed run's output, not a coexisting peer. "Required" governs the
**judgment**, so every report the required path produces has a judge. The rule
binds the *artifact*; it does not touch the *key space*:

- **At the SCHEMA and IDENTITY level, `none` stays valid and typed.** A request
  must still be able to *form* `(pin, query, none)`, and it must resolve.
- **At the CONFORMANCE level, `none` is refused on the co-tag path.** A run at the
  co-tag view may never **mint** a report carrying it.

**`none` and an empty SubGroupClaim set are not synonyms:**

- **judge pin present, zero SubGroupClaims** = the judgment ran and found no
  split. **Conformant.**
- **judge pin `none`** = no judgment is attested. **Non-conformant on the co-tag
  path**, because it is indistinguishable from a run that never asked.

**Idempotence is keyed on the triple** and never read the judge pin's *value*, so
narrowing the set of values a conformant report may carry does not disturb it.

**THE RECORD CARRIES A DIGEST OF THE COMPOSED INPUTS IT WAS RENDERED FROM, AND A
RERUN WHOSE INPUTS DIFFER IS REFUSED.** The composed inputs — the claims record,
the subdivision record, the neighborhood judgment record and the emitter's
candidate record (§13, kogaki#700) — decide what the
artifact says and are **not** part of the identity, which is the clause above.
A prior record carrying digests but predating a later-added input flag is
**recomputed**, exactly as a record predating the whole field is: per-flag
absence and record-level absence are one situation at two grains.
Without this, a rerun supplying different ones matched on identity and the
idempotent-rerun branch **replayed the stored rendering while reporting
success**: measured on all three, a changed claims record re-rendered the first
claim, a changed subdivision record rendered no SubGroup, and a judged pull of a
set already reported unjudged rendered the unjudged form.

So the record stores a per-input digest beside its identity, and a rerun compares
before replaying:

| stored digests | act |
|---|---|
| match | the rerun is idempotent, exactly as case 1 above |
| differ | **refused**, naming which input changed |
| absent (a record written before the field existed) | **recomputed** — a record that cannot be shown idempotent is neither replayed nor refused |

**The digest is RECORDED, never KEYED, and that is the decision.** Widening the
identity was the alternative and is declined: §12.1 ratifies that nothing else
enters the key, and a fourth component would make a requester hash the inputs to
form an identity by hand. The served discipline asks for the other shape
directly — a rendering is pinned to the sha of the content it was made from, and
a mismatch **re-surfaces rather than silently re-rendering**:

> "a derived expression's truth is relative to the set it was derived from, so
> the derivation carries that set and a change to the set is a GATE EVENT rather
> than a refresh"

`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/articles.md:118`

**The cost is stated rather than discovered.** Re-pulling a set with better
claims is now a refusal the operator clears deliberately — by pulling into a
fresh report directory, which renders the new inputs as their own report. That
is what a gate event is, and it is the price of the artifact never rendering
material the invocation did not supply. A whitespace-only reformat of an input
refuses a rerun that would have rendered identically: a **false refusal, never a
false render**, and the record cannot know the edit was insignificant.

**THE SUBDIVISION INPUT IS A TYPED PER-GROUP RECORD:**

    {"Group": {"judged": true, "subgroups": [ … ]}}   judged, with a split
    {"Group": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
    key absent                                        not judged — refused on the co-tag path

and `--judge-model` / `--judge-effort` are **required for every `report`
invocation**, not only when SubGroupClaims are present. Two consequences bind the
implementation: an empty `subgroups` list renders **zero** SubGroupClaims and
**never** the catch-all, and a judged-empty group's `members` stay **populated**
rather than nulled.

**Why a typed form rather than an empty list.** Resting the boundary between a
conformant and a non-conformant artifact on JavaScript's truthiness of an empty
array means a composer emitting `{}` rather than `[]` produces the non-conformant
artifact silently, with nothing stating the rule at the layer where it breaks.

**A breaking change to a composed input owes an executable conformance fixture at
the boundary**, in both directions:

> "A change to a published format damages precisely the records it was meant to
> improve — the population that gains the new field is the population whose parse
> changes … because producer and consumer hold separate suites over one contract,
> neither side can see the break, so the contract owes an **executable
> conformance fixture at the boundary**"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:45`

**Why the pin and not a version field.**

> "An artifact that will be ACTED ON after it is computed carries the state it was
> computed against, and acting on it RE-VERIFIES rather than re-resolves … The
> shared failure is **silent re-resolution**, which converts a stale artifact into
> a *confident wrong action* — worse than an error, because the mechanism reports
> success."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:161`

> "Versioning is PINS, never a version field … A version number would be a
> conformance copy of the pins with no declared precedence and no mismatch check"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:83`

**The pin is the mismatch check**, with the **served surface authoritative and the
report subordinate** — a copy with declared, checkable subordination is
conformance; a copy without one is a second authority growing in the dark.

**A report generated under a superseded pin is never silently refreshed.** It is
kept as the reading of that pin, and a request under a new pin produces a new
report. Re-resolving one onto current content would assert that the owner read
something they did not.

### 12.2 Location and naming

**A report is RESOLVED by §12.1's identity TRIPLE, and the machine record is NAMED
by whatever filename the emitter chooses.** These are two jobs, not one:

- **Identity is normative.** A request for the report of `(pin, query, judge pin)`
  must resolve to exactly the report that identity identifies, and to a new one
  when any component differs.
- **The machine record's filename is implementer-owned and carries no authority.**
  Nothing may read meaning out of it, parse it to recover the triple, or key on it
  — the report's own recorded pin, query and judge pin are the only source of
  that. A filename is at most a convenience for a human listing a directory.

A filename derived from the triple looks like a key, is not one, and drifts
silently the first time an emitter changes how it renders a group name
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:171`).

**TWO ARTIFACTS, TWO RULES.**

| | machine record | owner rendering |
| --- | --- | --- |
| purpose | identity, idempotence, downstream reads | what the owner reads to think a Thesis through |
| format | JSON | Markdown (owner register) |
| home | run workspace — `$KOGAKI_RUN_DIR` or `~/.kogaki/runs/…` | **`reports/` in the working tree** |
| lifetime | the RUN | the OWNER's |
| committed | no | **no — but repo-VISIBLE** |

- **The machine record keeps everything §12.1 says.** The identity triple, the
  idempotence claim across invocations, the stable home that makes a rerun collide
  rather than duplicate — all of it binds the JSON.
- **The owner rendering is generated by DEFAULT on a terrain run**, with an opt-out
  (`--no-render`) for the explicit-request case.
- **Both are written in the same act.**

**THE OWNER RENDERING IS `reports/FullReport.md`** — a fixed human name,
**overwritten on every pull**, exactly one in the tree. Identity, idempotence and
the coexistence of reports under different identities are carried by the **machine
record alone**; the rendering is a pure function of the record.

**The refusal/repair.** An identity-named rendering (`terrain-full-report-*.md`)
found where renderings are written is **retired on sight** by the runtime,
announced in one line, never silently. A run that leaves **two or more**
owner-rendering files in the tree, or writes an identity-named file anywhere the
owner works, is a **contract violation** and a failed run.

**Which half of that is carried:**

- **Enforced by construction:** both report paths join the renderings directory
  with the literal `FullReport.md`, so no identity digest can reach a rendering
  filename — the defect is unwritable rather than detected.
- **Currently unobserved:** a rendering file arriving in the tree under any *other*
  name — hand-copied, left by a third-party tool, or written by a future code path
  that does not go through the renderings directory. **Nothing counts the rendering
  files.**

**Repo-visible, NOT committed.** `reports/` is `.gitignore`d. `specs/SPEC.md`
§2.5's clause 1 is satisfied by the file being in the tree where the owner works;
§2.5.2 forbids letting that placement also decide publication. **The ruling governs
visibility; it grants no publication.**

**Consequence.** A Full Report — in either form — is **not a citable artifact**.
Article material is quoted from served renderings at pins (`specs/SPEC.md` §2),
never from a report. Moving a file into the tree does not make it evidence.

**Count scoping.** This section's count governs **Full Report renderings**;
§14.4.1's governs the screen, and on disagreement each wins for its own artifact.

## 13. The provenance neighborhood — a widening of the settled Strand set

This section designs the mechanical layer and its judgment layer. §13.5 is the
gate on any further judged extension, and discard stays a valid outcome.

### 13.0 The defect, and the served ground it rests on

The candidate set reaching the owner is **co-tag-bounded**. A contemporaneous
Grain under an unrelated tag — an OwnerRule lesson explaining *why* a design
direction changed, sitting in the same sitting's batch as the design-change
Strands — is unreachable from the co-tag group that holds those Strands, and
nothing on the screen says it exists.

The ground is `[[reachability-is-address-plus-discovery]]`:

> "Ratifying the exclusion is REFUSED: an entry screen structurally omitting 54%
> of served material is a discovery failure, not an honest scope.
> `[[reachability-is-address-plus-discovery]]` holds that reachability is the
> conjunction of a resolving address and a surface that discloses it … **The harm
> is deliberately NOT the one `[[grouping-upstream-of-selection-is-a-gate]]`
> names — that governs granularity, where the full set is present and only the
> choosable unit is coarsened; here the material is absent from the axis
> entirely**."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:109`

**Which conjunct this section establishes, and which it leaves open.** **§13
establishes DISCOVERY and does not close ADDRESS.** The surface discloses that the
neighborhood exists, which is the conjunct the co-tag-bounded screen was failing.
The address conjunct stays open exactly where §13.3 says it does — a
`source_batch` that does not resolve by equality for the legacy batches — and
§13.3's unresolved marker is a *disclosure* of that gap, never a repair of it. A
reader taking §13 as closing reachability for this corpus is reading the untouched
conjunct's air of completeness rather than this section.

**The standing beyond article quality.** The contradiction-cost ruling admits
thesis-first reading *because* "the surprise channel is the terrain listing rather
than the repository". A co-tag-bounded Terrain weakens that channel, so this
surface defends the premise of a ratified position rather than only improving a
screen.

### 13.1 What it is under §2 — a report, never a proposal, and no divergence owed

The neighborhood **widens**. It never narrows the candidate set, never reorders
it, never hides a row, and gates nothing.

**THE ARTIFACT IS A SECTION OF THE FULL REPORT.** It is not a screen and has no
owner surface of its own: it renders inside `reports/FullReport.md`, at the ONCE
tier §12's multi-section form defines. §12.2's rules govern it wholly.

**Three things follow:**

- **It renders on every pull, empty included.** An absent section is
  indistinguishable from a pull that found nothing.
- **§14.1's owner-surface enumeration does not gain a member for it.** The section
  has no emitter of its own; it is part of the Full Report's.
- **It is still a report and still never a proposal — and it DOES select.** The
  section renders only the highest recommendation level present and at most ten
  rows, so it does not "narrow nothing". What survives is the distinction that
  matters: a **proposal** asks the owner to act on a selection; this section
  reports a reading and names what it withheld. The selection is disclosed in the
  same breath it is made — honest counts (`15 found, 8 shown`), the level it
  rendered at, and a count of unjudged candidates — so nothing is hidden even where
  much is not shown. The section proposes no act, and a taken suggestion enters
  through §14.3's assignor rather than by the section having chosen it.

**What grammar coverage of the section BUYS, and what it does not.**
`report-format.json` admits the section's line classes, so the forms are written
down, §14.5's fixture exercises them, and a renderer edit that changes a form
diverges from a contract rather than from nothing. What it does **not** buy is the
emit-time refusal of a line matching no class: `line_class_allowlist` is **inert on
`full_report`**, because three body classes there have a bare placeholder as their
whole form and a malformed line falls through to one of them. The new classes
**inherit** that exemption without being able to justify it, which is
`an-inherited-exemption-signals-nothing`
(`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:64`).
It is **disclosed and not repaired**: the fork is carried as a named deferred slot
in `report-format.json` (`deferred_slot_full_report_allowlist`).

**§2's three inherited contracts are untouched, and this is the load-bearing
paragraph of the section.** §2.3 defines a proposal as the act of narrowing:

> "the boundary engages exactly when something other than the owner narrows the
> candidate set, and its test is whether what reached the owner is smaller than
> what exists"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:89`

Nothing here is smaller. So:

- **§2.3 is applied, not amended.** A widening act is in neither of its lists, and
  its residual clause's remedy is exactly what §13.4 requires: surface it **with
  its reason**, take no narrowing action. Adding a widening branch to an
  **inherited** contract would be a consumer amending the manifest's own text.
- **No §5.1-style declared divergence is owed**, and the absence is recorded so a
  reader does not infer one was skipped. §5.1's discipline binds a consumer
  shipping *ahead of* a served ruling; here the served ruling is the ground.
- **The candidate model in §5 is unchanged.** The neighborhood is a **view beside**
  the candidate set. A suggestion becomes a candidate only by the **owner's** act
  of taking it.
- **"Propose-only" is the licensing vocabulary and not this spec's.** The mapping
  is propose-only → **this spec's report**.

### 13.2 Input is the SETTLED STRAND SET ALONE; the trigger is the REPORT PULL's ID ENTRY

The surface takes **one** input: the Strand set the owner has settled. The
GroupClaim is visible at selection as an aid to *choosing* that set and is **not an
input to the expansion**.

**The ground: a claim-shaped input is DEAD INPUT here.** §13.3's substrate is
member metadata and cannot read a claim. Specifying an unreadable input does not
sit inert: it reads as design, invites an implementation to invent a consumer for
it, and quietly licenses the judged layer §13.5 gates.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:15`
(`[[an-input-the-substrate-cannot-read-is-dead]]`)

**THE TRIGGER IS AN EXPLICIT OWNER ACT NAMING A BOUNDED SET** — the report pull's
ID entry. There is no standalone invocation. §6.3's two-act window is unchanged,
because the neighborhood belongs to **act 2** and never to a third act.

**ONE ENUMERATION PER RUN (kogaki#700).** The mechanical candidate set is
enumerated **once**, by the emitter state (`neighborhood_input`), which persists
the full enumeration in its candidate record. `J3_neighborhood` admits judgment
keys against that record, and the pull **consumes the same record** as its
mechanical layer — it does not re-enumerate. A judged pull re-reading the served
surface would be a second enumeration: a key admitted against the emitter's set
and absent from the re-read is silently dropped, and the section then reports the
judgment layer as not having run, which is the falsehood the orphan refusal
exists to prevent. Only a pull in the **unjudged flow** — no emitter ran, so no
admitted keys exist to stay consistent with — computes the neighborhood inside
`report`, seeded by the entered Group/SubGroup IDs. The candidate record is a
composed input under §12.1's digest rule exactly as the claims, subdivision and
judgment records are: not part of the identity, recorded beside it, compared
before any replay.

Expansion must not fire on an unsettled screen: a purely mechanical expansion is
**just as noisy fired too early**, so noise is a property of **trigger timing**,
not of the substrate. And a suggestion's only use is to inform the selection —
delivered after the set is settled, acting on one requires re-opening a decision
already made. Riding the report, the owner reads Glosses and neighbors together and
takes ONE informed act at the gate.

**Identity is unchanged.** §12.1's triple already covers everything the
neighborhood reads (the entered set rides the query component, and the substrate
pin is the same one), so idempotence needs no new component and a re-pull under the
same identity renders the same section.

**What trigger timing does NOT cover.** Trigger timing decides *when* the expansion
fires and nothing about *how far* it runs; the bound is §13.3's traversal bound. An
implementation that picks different values in code has settled a spec question
silently; one that derives them from the settled set's content has reintroduced the
dead input.

**Not a third sibling entry point, and Terrain ENDS at Strand exploration.** The
shape is *selection → Strand exploration → end of Terrain*. A session may offer to
start Brief afterward; this spec neither mentions nor guarantees that. The owner's
act of taking a suggestion is the last thing Terrain does.

### 13.3 The substrate, and the join that does not hold by equality

**ONE substrate.**

| substrate | link | depth |
|---|---|---|
| `source_batch` | same-sitting provenance | one hop |

**THE JOIN DOES NOT HOLD BY EQUALITY, and it fails silently.** A lesson's
`source_batch` matches a **dated** batch id exactly, and does **not** match a
**legacy numbered** one — the batch record's id is `q_a/3` while the lesson carries
`q_a/3/answer.md`, and the suffix defeats equality.

**So the resolver joins through the batch record's `members`, and an unresolvable
`source_batch` is reported rather than dropped.** The failure mode this forbids is
specific: an equality join returns *no batch-mates* for every Grain in the legacy
batches and presents that as "this Grain has no same-sitting siblings" —
indistinguishable on screen from a Grain that genuinely has none, which is this
surface reproducing one layer down the exact silent exclusion §13.0 exists to
remove. A batch-mate lookup that cannot resolve its `source_batch` therefore emits
an **explicit unresolved marker naming the value**, never an empty result.

**`members` is family-keyed** — `{"members": {"journey": [...], "lesson": [...]}}`
— so the join already carries each batch-mate's family and §13.4's no-pooling rule
needs no additional lookup.

**THE BOUND is traversal — substrates × depth — and its values are FIXED AND
DECLARED**, identical on every run, as the table above states them.

**Why fixed rather than keyed to anything.**

> Separate configuration by decision lifetime — per-repo facts set at onboarding
> vs per-artifact choices asked at artifact time; conflating lifetimes freezes
> editorial decisions as infrastructure.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:138`
(`[[config-by-lifetime]]`)

A fixed declared setting is an **onboarding-lifetime fact**: it REMOVES a decision
from the expansion loop, where a per-run choice puts one back in.

**What is still not settled, so the bound is not read wider than it is.** Whether
these values are *right* is unmeasured. What the declaration buys is that they are
**declared, reviewed once, and diffable**, so an implementation cannot pick them
silently and a correction is an amendment rather than a code change. **Reopen
trigger:** a real run in which a large settled set produces a neighborhood the
owner reads as drowning, or a small one that reaches nothing.

**Why this is a bound and not a filter.** A filter over the rendered set would
*narrow* what reaches the owner, engaging the §2.3 boundary §13.1 declares never
engages here. A bound on expansion narrows nothing: the neighborhood is material
offered **beside** the candidate set, so a bound decides how much additional
material is surfaced and removes nothing that would otherwise have reached the
owner. **An implementation that computes the full neighborhood and then drops
members against anything claim-shaped has built the filter, whatever it is named** —
and has reintroduced the dead input besides.

### 13.4 The section's shape

**Exploration.** For each Strand of the Group, the mechanical layer collects the
other Units promoted from the same Distill Batch.

**The judgment layer, over the mechanical candidates only.** Per candidate the LLM
supplies one free-form claim and one **recommendation level** from a harness-fixed
three-label set — `core` (the GroupClaim's argument needs it), `useful`
(strengthens or illustrates it), `background` (related, not load-bearing). The set
is CLOSED; extending it is the owner's act. **No model call happens inside the
tool**: the levels arrive as a file the session composed, and
`--judge-model`/`--judge-effort` remain the pin rather than an invocation.

**Display.** At most **ten** rows, all from the **highest level present**, and
nothing else in the report. The heading carries honest counts (`15 found, 8
shown`). Each row carries exactly four fields: the Strand ID, the relation in plain
words, the Gloss, and the claim with its level.

**FIELD 2 NAMES THE SETTLED MEMBER, NOT THE SUBSTRATE'S INSTANCE KEY.** The
relation reads *"from the same Batch as L88 (2026-08-13)"* — the settled Strand the
candidate shares a Batch with, by its display id, with the batch beside it. Where
the enumerator can name no member the row says *"the same Batch as the settled
set"*, which is a **stated** absence and distinguishable from the naming form.
**Field 2 orders its named members numerically**, because a display id's number is
its meaning on every surface here.

**FIELD 3 IS FETCHED, BOUNDED BY THE ROWS THAT RENDER.** The fetch runs over the
display selection — at most ten rows, and **none at all** on the empty,
all-unjudged and over-cap arms — and is bounded again to the union of those rows'
**own** tags. The corpus-wide prefetch §9 forbids is unreachable from here, because
the tag set is a function of ten records rather than of the corpus. **The bound is
a COUNT OF READS and is verified as one** — at the server, from the stub's own call
log, never from the run's accounting of itself.

**THE FETCH ADDRESSES BOTH GLOSS NAMESPACES** — `lessons/<tag>` and
`journeys/<tag>`, as `cmdView` does. The neighborhood's members are not all
Lessons: the enumerator indexes every served record carrying a slug and stamps
its family, so a journey-family suggestion reached no shard while its tags were
already in the union a `lessons/` read was spending. **The incremental cost is a
second shard per tag ALREADY in the union, not a new tag**, which is the shape
§9 already binds `cmdView` to, and the bound above is untouched: the tag union is
still a function of the rows that render.

**The Brief lane keeps ONE namespace, and that is a scoping rather than an
oversight.** Its members are settled Lessons by construction, so a `journeys/`
read there buys nothing and spends a shard per tag. The widening belongs to the
surface that needed it and is declared at that surface's call site.

**Four Gloss states, four renderings**, because collapsing any two asserts
something that did not happen:

- a shard **read** and carrying a rendering — the headline, **quoted at its cite**,
  because it is a served rendering and a headline carried as bare prose is the
  paraphrase-standing-for-a-quote shape the verbatim rule refuses;
- a shard **read** and carrying none for the slug — the abnormal marker `⟨no served
  Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩`, the same
  marker every other surface renders, so one vocabulary covers the state wherever
  it arises;
- **no shard carrying the row at all**, whether because it has no tag or because
  its family is outside the namespaces read — its own marker, naming which;
- **the seam itself unreachable**, so no shard was read at all — its own marker.
  Rendering this as read-and-carried-nothing asserts a read that never happened,
  which is the conflation the other three markers exist to prevent, one layer
  further out.

**Addressability is a property of the ROW and is decided first.** A row with no
address has nothing to attribute to the seam however the seam behaved, so the
no-shard marker wins over the seam marker rather than the other way round.

**THE SEAM STATE IS DECLARED UNOBSERVABLE FROM THIS PATH, with its reopen
trigger.** The marker and its arm exist and are asserted, and the state they
name **cannot arise from the report pull**: member Gloss bodies are read
NON-softly and that read runs before the neighborhood's soft fetch, so a down
seam exits and the pull renders nothing at all. Stated rather than left as an
implied capability — an orphaned verification is re-pointed or declared
unobservable at the sitting that finds it, never left carrying a discharging act
nothing can perform
(`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/claude-code-ops.md:128`).
**Reopen trigger:** the first Gloss caller on this path that reads softly, at
which point a down seam renders rather than exiting and the state becomes
reachable.

**The state is decided at the resolver's own boundary.** The resolver returns a
`found` flag beside each entry rather than stamping an entry for every member it was
handed, because a caller that cannot tell a shard that answered from one that did
not resolves the miss in the wrong place.

**An UNJUDGED candidate is its own state**, counted and named. The judgment layer
not having run is a different fact from a `background` verdict, and a section that
showed them alike would report the second where the first is true.

**THE JUDGMENT LAYER HAS A PRODUCING OCCASION IN THE TABLE.** §15's table carries
two states before `full_report`, mirroring `compose_input → J1_claims`: a
**compute** state that emits the mechanical candidates, and **`J3_neighborhood`**,
which takes the typed record. The emitter writes no owner artifact.

**BOTH ARE CONDITIONAL.** A run naming neither renders the all-unjudged line, which
is a **legitimate terminal**: refusing it would make the Report unobtainable
without an LLM pass. What the declaration removes is the *silent* version — an
unjudged run is a skipped conditional the run record **names**.

**J3 refuses three ways:** a judgment key naming no mechanical candidate (detectable
only against the enumeration the compute state wrote), a level outside the closed
set, and a level with no claim.

**ABOVE THE CAP AT THE HIGHEST LEVEL THE SECTION RENDERS NOTHING AND STATES THE
COUNTS.** Showing ten of eleven equally-recommended candidates needs a tie-break
among equals, and a machine deciding which relation the owner may see is the act
the served record names as failing the second-proposer test
(`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/articles.md:125`).
Silent truncation is refused by the rule that a surface which must not drop its tail
reports rather than truncates
(`topics/archive/knowledge-architecture.md:67`). **The cap binds as a REFUSAL**,
which is what makes an over-wide neighborhood unrenderable rather than quietly
abridged.

**§13.0's SILENT-EXCLUSION DUTY IS DISCHARGED ON THE SURFACE.** The enumerator marks
three gaps — a seed carrying no `source_batch`, a `source_batch` naming a batch
nothing serves, and a batch member the served set does not carry — and the section
renders them, one row per gap, **naming the subject rather than a count**: §13.0's
point is that the excluded thing is nameable, and a bare count is a disclosure the
reader cannot act on.

**THE TWO GAP KINDS PARTITION, AND ONLY ONE DISPLACES.** A **seed** gap means no
enumeration ran over that reference, which falsifies the empty form; it
**displaces** the empty form. A **member** gap is the opposite situation — the batch
**resolved**, the walk ran over it, and one of its listed members is not served — so
it renders **beside** the empty form, under its own header. **The kind is typed on
the marker at the point it is pushed** and never recovered by string-matching the
reason prose: a renderer reconstructing by text a fact the producer already knew is
a join every wording change silently breaks. The empty form and the seed-gap
disclosure are mutually exclusive by construction.

> "A check anti-correlated with its need is worse than no check, because its
> silence reads as a clean result."

`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/archive/claude-code-ops.md:24`

**The empty enumeration keeps its two-line form** where every seed resolved: the
enumeration ran and returned nothing, and — the half that refuses the strong
reading — absence here is absence of a same-Batch sibling and never evidence that
the settled set stands alone.

**A JUDGED RERUN OF AN ALREADY-REPORTED IDENTITY REPLAYS THE STORED RENDERING, and
that is DISCLOSED rather than repaired.** §12.1's identity triple does not include
the judgment record, so a judged pull of a set already reported **unjudged** takes
the idempotent-rerun branch and re-renders the unjudged artifact. Whether the
judgment record belongs in that triple is a change to a ratified identity and to
§12.1's uniform arity; it is carried on its own issue. Stated so the next reader
meets it as a known bound rather than as a rendering that mysteriously ignores their
judgments.

### 13.5 The extend-or-discard gate

**The entry condition is TWO-ARMED, and the arms are different jobs.** A further
judged layer enters only on a measured defect of the mechanical layer, by §8.1's
measurement-before-offering rider applied unchanged. The mechanical layer fails in
two directions:

- **The miss arm (recall)** — a recorded run in which the owner names a Grain that
  belonged in the Strand set and that §13.3's substrate did not reach. **Unfired.**
- **The flood arm (precision) — the live arm.** The first corpus-wide run fired it.

**The distinction is load-bearing, not taxonomy.** A layer entering on misses is a
**recall** mechanism; a layer answering the measured defect is a **precision**
mechanism — different jobs, different risks, different acceptance evidence. **The
stale miss condition can no longer authorize a recall-mechanism build**: a reader
holding the flood measurement must not be routed into the recall design by the arm
the evidence contradicts.

**A fired arm records direction; it does not open the gate.**

**The SLOT as a route is closed; the GATE as a condition is not, and the two are
different facts.** No LLM-driven selection over the survey surface is planned, no
replacement mechanism is proposed here, and any future judged layer arrives as its
own tightly-controlled design — **never through this slot**. The *condition* stands
as re-pointed: a future measured defect is still what any such design would owe as
its evidence, entering by its own licensed sitting. **Discard stays a valid
outcome**, and so does "mechanical layer sufficient".

**The instrument is the corpus-wide distribution the implementation already
produces** — no new instrument is owed. The trigger for either arm remains an
observation, never a date, and §13.3's unresolved-`source_batch` markers are
deliberately *not* evidence for either arm: an unresolved join is a mechanical
defect to fix, and counting it as a relevance miss or as flood volume would buy the
extension with the mechanical layer's own bugs.

**The §13.3 traversal bound is not this gate, and must not become it.** §13.3 bounds
how far the enumeration expands; this section holds *relevance judgment* behind the
two-armed condition. The line is drawn mechanically rather than by intent: **the
§13.3 bound may decide how much of the enumeration is traversed, and may never
score, rank, or drop an enumerated neighbor on relevance.** The observable tell is
**a bound whose removal would change *which* neighbors are surfaced rather than
*how many***.

### 13.6 Placement, and the coupling that is refused

**Terrain only.** The Brief's closed-Strand-set invariant is untouched:
mid-composition gap discovery keeps its ratified remedies, and re-opening a closed
set routes back through Terrain as an **owner** act.

**No Move coupling, and it is a prohibition rather than a scope note.** Suggesting
Grains *because they would make a Move applicable* is the declined adjacency/Recipe
shape, whose named observable defect is Move-first composition — the article's shape
choosing its material. A neighborhood that consulted the Move set would invert the
dependency this section exists to preserve.

### 13.7 What this binds in the implementation

- **`terrain/terrain.mjs`** — the enumeration (`neighborhoodOf`) and the rendering
  (`neighborhoodScreen`) are computed inside `cmdReport` and emitted as a section of
  the Full Report. Nothing writes `reports/Screen.md` for this rendering and nothing
  dispatches it by name. A widening view must not perturb `cotags` or
  `compose-input`'s composition pin, and after the re-siting it touches neither.
- **`compose-input`'s bounded read is unchanged.** §11's subset refusal is what
  guarantees claims are composed only from served members; a suggestion the owner
  **took** enters through the ordinary candidate path and is covered by that pin,
  and one the owner did not take is absent from both. **No amendment to §11 is
  owed** — recorded because a widening surface upstream of a subset guard is exactly
  where a reader would expect one.
- **`.claude/skills/terrain/SKILL.md`** — the flow carries the surface. Its hard
  line "Compose from `compose-input`, never from the whole survey" is untouched and
  is *why* the neighborhood cannot be implemented as a wider survey read at
  composition time.
- **`checks/check-terrain-composition.sh`** — the conformance home.
- **The display ID.** §14.3 assigns a `display_id` **once, in the survey record**; a
  neighborhood suggestion is by construction **not** in that record. The
  neighborhood mints its own `N<n>` space, declared disjoint from `L<n>`, and §14.3
  is **not** amended. A taken suggestion is assigned an `L<n>` by §14.3's existing
  assignor on the way in, and its `N<n>` does not follow it.

## 14. The rendered format's carrier, and the owner-surface display ID

**This section adds no format rule to this file. It moves the rules out of it.**

### 14.1 The carrier is `specs/spec-terrain/report-format.json`, and it wins

**One machine-readable grammar is the single carrier of the rendered form** — the
line classes admissible on each owner surface, the token shape of each field, and
the per-surface allowlist.

**An OWNER SURFACE is any text this runtime prints or writes for the owner to
read.** Defined once, here, and used with this meaning everywhere in §14. The
machine record is not one; it is machine-facing by §12.2's split.

**THE COVERAGE FIGURE IS DERIVED AND IS NOT STATED IN PROSE, HERE OR ANYWHERE.**
Its rule lives at `workflow.json`'s `owner_surface_coverage` and reads the **state
table**:

> **denominator** — the states in `workflow.json` whose `writes` is non-null.
> **numerator** — those of them whose `grammar_surface` names a surface present in
> `report-format.json`'s `surfaces`. A removed subcommand contributes to
> **neither** term.

Two carriers stating one figure in prose is precisely how this figure
desynchronized, so it is recomputed from the array rather than transcribed, and a
state added, removed or re-grammared moves it **by construction**. **The coverage
claim is about the grammar and never about a medium** — §14.2's refusal binds what
may be *emitted* rather than what may be written, so a surface that writes no
artifact owes conformance exactly as much. **Reopen trigger:** the first writing
state whose `grammar_surface` names no present surface, or the first writing state
added with none at all.

**§14.3's duty — no element name on an owner surface — binds every owner surface**,
covered or not, because that decision is about what the owner reads and not about
which emitter happens to have a grammar entry.

**Precedence is declared, not left to the reader.** Where this file's prose and the
grammar disagree about the **rendered form**, **the grammar wins.** A format
decision lands as a grammar edit; the prose sections describe intent and stop being
the contract.

> "Duplication is not the sin; unowned duplication is, because owning a fact means
> your version wins on disagreement and you may change it, so a safe copy has to be
> deliberately stripped of both powers. Write down which side wins when the two
> disagree, in a place both sets of maintainers will read, and add an automated
> check that makes divergence fail loudly instead of passing silently."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/architecture.md:243`

**That served line has two limbs and only one is landed.** The first — write down
which side wins — is the precedence declaration above. The second — *an automated
check that makes divergence fail loudly* — is **not built**: the prose sites are
governed, and **nothing compares them against the grammar**. §14.2's refusal
validates the emitters' *rendered text*, which is a different pair entirely. So the
prose sites are a conformance copy with declared precedence and no divergence check.
**Marked, not assumed.** A prose site can drift from the grammar and every gate
stays green. **Reopen trigger:** the first observed disagreement between a §14 prose
site and `report-format.json`, or the first grammar edit made without a
corresponding read of the prose sites.

**What precedence does NOT reach.** The grammar governs the **rendered form** and
nothing else. It does not govern which members are placed, what a claim says,
whether a figure is honest, or any §2.1 family-naming duty — those are decisions
this prose owns. §9's allowlist for screen 1's tag rows is *transcribed into* the
grammar and keeps its meaning; §2.1's "a bare count is a defect" stays prose,
because it is a rule about **what the figure means**, not about the shape of the
line carrying it.

### 14.2 The emitters refuse; they do not report

The emitters **validate their own rendered text against the grammar and refuse to
write or print on failure.** A nonconformant artifact becomes **unmintable** rather
than detectable.

> "The alternative is to restrict what the system can produce in the first place, by
> assembling output from material that was already approved, which removes the
> possibility instead of catching it. … A practical warning sign that you are on the
> wrong side of this: the collection of checks keeps growing at roughly one per
> incident."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/architecture.md:249`

The refusal is the constrain-side answer; the check suite is the fast path beneath
it.

**The refusal is generation-time**, which is where §9 already puts it: constrain
generation, then detect what generation cannot promise.

**The decidable set, enumerated because it is what the grammar must express.** Pin
occurrences per file == 1 (`pin_once_per_file`); zero `lesson:` tokens and zero
element names on an owner surface (§14.3); the G/SG ID grammar present
(`group_subgroup_id_grammar`, discharged on the co-tag screen by the allowlist
plus the id fragments the heading forms embed); member lists carry display IDs;
catch-all ≤ 30%; a group of ten or more rendered flat ⇒ refuse; a line class outside
the surface's allowlist ⇒ refuse. Every one is mechanically decidable on the
rendered text alone, **and a decision that is not mechanically decidable does not
enter the grammar and stays prose.**

**A rule whose token leaves the rendered text leaves this set rather than being
re-pointed.** `subgroup_members_sum_to_parent` is carried as a pre-render
refusal in `cmdCotags`, over the placement rather than the text, and
`report-format.json`'s `not_expressible` entry carries its reopen trigger and the
coverage that siting costs. Re-pointing such a rule at whatever quantity remains is
refused: a predicate that cannot fail is a decidable set claiming coverage it does
not have.

### 14.3 No owner surface renders an element NAME — the display ID does

**Screen output and Full Report alike display element IDs, never element names.**
This covers Lesson names (`lesson:<slug>`), Journey names and Decision names. The
principle: the system displays only information that can be explicitly justified,
and these names are information the machine wants to display, not information the
owner wants to read.

**The rendered token is the `display_id`, assigned ONCE in the survey record.**
`specs/spec-terrain/survey-schema.json` carries a per-candidate `display_id`
matching `^L[0-9]+$`, assigned at survey time. **The survey record is the ID→slug
map**; there is no second carrier and no per-artifact mint.

**The per-candidate `cite` is the identity form** — `gloss/ELEMENTS.jsonl
slug=<slug> kind=<lesson|journey> @<pin-sha>` — composed at survey time from the
served record's own `slug`/`kind` plus the response pin. The gateway's positional
cite is never copied into the record, so Brief and Draft transport identity
addresses by construction and the resolve check (`draft/cite-check.mjs`) receives
the only form it resolves.

**Why once rather than per artifact.** The display ID is a **join key**: the co-tag
screen, the Full Report generated from it, and a Brief launched from either all name
the same member.

> "The vocabulary is the hub's and is not re-minted per surface: a synonym in a join
> key is the same defect as a divergence."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:42`
>
> "two vocabularies do not merely disagree, they make the join return NOTHING, which
> reads as no data rather than as a conflict"
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:50`

The failure is silent by construction — a wrong-member resolution returns a
well-formed answer, so both ends log success. Assigning once removes the
possibility.

**The accepted cost, stated rather than discovered.** A survey-wide space numbers
candidates the owner never sees on a given screen, so a co-tag screen reads `L4,
L17, L58` rather than `L1, L2, L3`. That is the price of the ID meaning the same
thing on every surface. The ID is stable **within a pin**; a pin advance may
renumber, exactly as it already produces a second report.

**Consequence for §§6–9 and §12, governed rather than rewritten.** Wherever those
sections say a member's Lesson ID is rendered on an owner surface, the token
rendered is the `display_id`. §14.1's precedence is what carries this. The **machine
record keeps the slug, the cite and the map**.

### 14.4 Exactly one producer for owner-facing text

**The skill layer never retypes runtime output.** `.claude/skills/terrain/SKILL.md`
delivers the screen and the report as the files the runtime wrote — the owner reads
the artifact, not a quotation of it.

This closes a corruption channel no check on the runtime side can reach: a runtime
cannot fuse two lines mid-word; a model retyping a screen can. §2.4's verbatim-relay
rule is advisory prose sitting at exactly the layer where it breaks, and §14.2's
refusal guarantees nothing about the owner's eyes while a second producer stands
between the two.

**This is a removal, not a rule.** The relay stops being a producer at all; nothing
new is prohibited, so nothing new has to be policed. *"Delivering nothing is still a
failure"* stands, discharged by §14.4.1's hand-over.

### 14.4.1 Delivery binds to an ARTIFACT, never to a display channel

**The general rule is `specs/SPEC.md` §2.5.3 and this section CITES it.** What
follows is Terrain's own.

**Each screen is written by the runtime to `reports/Screen.md`** — a fixed human
name, **overwritten on every render** — exactly as §12.2 rules for
`reports/FullReport.md`. Delivery is then the act of the owner reading that
artifact. Under §15.5 there is **one screen writer**, private to the executor, with
one caller.

**Why an artifact and not a channel — the discriminator, kept because both declined
arms are otherwise reasonable.** A verbatim fenced relay and an owner-executed
command both work today. Each binds the contract to a fact about the surrounding
harness: that the reply renders, or that `!` output renders. Those are the same
shape as the assumption that produced the defect, so adopting either would make the
contract true until the harness moved and give no signal when it did. **A file the
runtime wrote has no such premise.** The fenced relay carries a second cost §14.4
already measured: it restores the producer whose removal that clause exists for.

**And the delivery MECHANISM is explicitly non-normative.** A pointer in the reply,
an owner-executed `!`-prefixed command, a harness file-send — any of these may hand
the artifact over, and **this spec names none of them as required**.

**A hand-over must occur; its FORM is what is free.** Writing the artifact is not
delivery. The relay names the artifact to the owner as the FIRST act after the
command returns — before any gate, any question, any other tool call. That ordering
is §2.4's positive limb. **What is NOT free is skipping it.** Whether the owner then
*reads* it is outside every carrier here — a statement about the owner, not a
discharge for the run.

**Against the owner's enforcement frame:**

| rule | how this satisfies it |
|---|---|
| nothing appears whose reason cannot be explained | one artifact per render, at one fixed name |
| information instructed to be output DOES appear | the artifact holds the runtime's own bytes |
| information whose display is prohibited does NOT | nothing is retyped, so nothing can diverge |

**What is NOT carried, stated rather than left to read as covered:**

- **The write is enforced by construction.** The runtime joins the renderings
  directory with the literal `Screen.md`, so a second screen name is unwritable
  rather than detected.
- **The mechanism is unchecked because it is unconstrained.** Nothing exits non-zero
  on a screen delivered by one form rather than another; there is nothing there to
  check, by design.
- **The hand-over floor has NO mechanical carrier.** That a run named the artifact to
  the owner is a property of the relay's behaviour, and nothing in this repository
  observes it. The floor is stated so a run that skips it is **wrong** rather than
  merely disappointing, and stated as uncarried so the clause is not read as having
  an enforcement it lacks.
- **Nothing counts the rendering files.** A rendering arriving under some other name
  — hand-copied, or written by a future path that does not go through the renderings
  directory — is unobserved.

### 14.5 A golden fixture, and what it is for

**One checked-in conformant specimen per surface the grammar covers**, under
`checks/fixtures/`, exercised by `checks/check-terrain-composition.sh`. A renderer
edit that changes the shape fails in the PR rather than in the owner's next hands-on
round.

**The count is stated per covered surface rather than as a flat number**, because a
flat number cannot stay true across §14.1's reopen trigger: the sitting that brings a
third surface under the grammar would otherwise have to choose between an
under-covered suite and a clause it contradicts. **The Full Report specimen carries a
non-empty provenance-neighborhood section**, since an empty one exercises the
empty-enumeration classes and none of the others.

**The two assertions, and the split is REPORTED rather than averaged.** A specimen is
asserted (1) **conformant** against the grammar, by the emitters' own predicate, and
(2) **byte-equal** to what the renderer produces over the committed input. Assertion
2 runs only where a renderer writes that surface's artifact; a surface printed by an
owner-executed command has none, so it carries assertion 1 alone. **A green line
claiming TWICE for a surface asserted ONCE is the figure-asserted-rather-than-derived
defect one layer down**, so the check names the split.

The fixture is **not** a second carrier and never wins against the grammar —
§14.1's precedence is one-way. Its job is the pair:

> "Nobody catches it because each side has its own tests: the publisher's confirm it
> wrote the new format, the reader's confirm it still reads the old one, and nothing
> checks the pair. Give the format one shared example that both sides run against."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/testing.md:45`

**The cost is stated rather than discovered: one specimen carries two concerns.** A
change to the report body and a change to the neighborhood rendering fail the same
fixture, and a reader diagnosing a failure has to establish which. That is the price
of leaving §14.1's owner-surface enumeration by emitter alone.

### 14.6 How A–E compose

The grammar (§14.1) is what the emitters validate against (§14.2); the display ID
(§14.3) is the token that grammar admits where a name used to render; the single
producer (§14.4) is what makes §14.2's guarantee reach the owner's eyes; the fixture
(§14.5) catches drift between hands-on rounds. Remove any one and the remainder still
reports the defect it can no longer prevent.

**The neighborhood's id space.** A suggestion §13 surfaces is by construction **not**
in the survey record, so §14.3's "assigned once in the survey record" does not reach
it. **The neighborhood record mints its own space, `N<n>` (`NEIGHBOR_ID`), declared
disjoint from `L<n>`, and §14.3 is NOT amended.** A taken suggestion is assigned an `L<n>` by
§14.3's existing assignor on the way in, and its `N<n>` does not follow it. The
disjointness is declared and mechanically checkable, and **no owner surface renders
both spaces for one element**. **The cost, stated:** two id spaces exist where there
was one, and an owner copying an id has to know which space it came from.

## 15. The control plane — a workflow table, and a re-entrant executor

Workflow orchestration is deterministic engine code, and an LLM session holds only
steps whose next action turns on an open question.

### 15.1 The workflow table is DATA, and its carrier is `specs/spec-terrain/workflow.json`

The states, their order, which of them **wait** for the owner, which of them **write**
which artifact, and which of them reach a **judgment point** are declared in one
versioned artifact. The executor is a generic interpreter of that artifact and holds
no state list of its own.

**EVOLVABILITY IS THE CONTRACT.** Moving a handoff, adding a wait, or adding an entry
point beside co-tags is a **table row plus a renderer** — never a change to executor
control code and never a prose instruction to a session. §10's parked opening gate, if
it is ever unparked, lands as a table change.

**Ratification.** An issue licenses the change; a dated owner decision settles whatever
in it is a decision rather than a transcription; the edit lands in the artifact; and a
`version` integer bump plus a **replaced** `licensed_by` line records it. That line names
the issue licensing the version the file currently holds and is not a history — the
carrier holds the current control plane only. The prose here
governs intent and **the artifact wins on the form it carries — and on nothing else**:
the table is authoritative over sequencing, waits, write bindings and judgment-point
placement, and over no semantic contract in §§2–14.

### 15.2 The executor is RE-ENTRANT, and no single process owns the run

Every wait in this flow spans a chat turn — the owner names a tag in chat, and later
enters IDs in chat. The runtime has no stdin path, supplying one would make a wait a
prompt, and §6.3's question allowlist for that window is **empty**. A blocking process
would also lose the run when killed.

**So: ONE entry point, entered once per act.** The executor reads the run record,
executes table states until the next declared wait, writes that state's artifact, and
stops. The session hands the owner the artifact and says nothing else; when the owner
speaks, the session re-enters the executor with what the owner said. The executor
validates that input against the **awaited** state and continues.

### 15.3 The run record carries CONTROL state, and never a second copy of anything

One machine run record, in the machine-local run workspace, carries the run's position:
which states have completed, which wait is outstanding, what the owner entered at each
satisfied wait, and which artifacts were written. There is **no second state store**.

**It holds no ID→slug map, and this is a constraint rather than an omission.** §14.3
rules the survey record **is** that map, assigned once, with no per-artifact mint. The
record therefore **references the survey record by path** and copies nothing out of it:
discharging the one-record rule by copying the map would breach §14.3 in the same act.

**Lifetime and siting** follow §12.2's machine-record precedent: machine-local, never
committed, and never an owner surface. A path under the run workspace is never named on
an owner surface outside debugging.

### 15.4 A wait is the executor STOPPING; it is never the runtime asking

The table declares which states wait. **The authoritative figure is
`workflow.json`'s `counted_baseline`**; the ordering below is a reader's orientation
and never a second authority.

    survey
      → TAG-SELECTION            (wait)
      → compose-input            (bounded read, emits the composition pin)
      → J1 claim composition     (judgment point)
      → CLAIM-REOFFER            (wait, conditional — entered only on a
                                  proper-subset claim; gate + capture)
      → J2 subdivision judgment  (judgment point)
      → co-tag screen            (writes a screen)
      → ID-SELECTION             (wait)
      → neighborhood compute     (conditional)
      → J3 neighborhood judgment (judgment point, conditional)
      → full report              (writes the report)
      → TRIM-RATIFICATION        (wait, conditional — entered only on a trim)
      → STRAND-SELECTION         (wait, gate + capture)
      → done

**§6.3's ruling binds the table.** Nothing runs unattended between the screen and the
owner's ID entry, and **no question UI may appear in that window**: the states between
TAG-SELECTION and ID-SELECTION declare no gate, and a table that gave them one would be
refused at ratification. What §6.3 does not do is *count the acts* — compose-input, J1
and J2 are states in their own right. The window's authority survives; its arithmetic
does not.

**Which waits render a gate declaration.** TAG-SELECTION and ID-SELECTION are the owner
**speaking**, unprompted, and render none. TRIM-RATIFICATION, STRAND-SELECTION and
CLAIM-REOFFER are declared gates and render one. All three carry `gate_id`, which
`field_semantics` requires of exactly the states whose `renders_gate_declaration` is
true.

### 15.5 Write authority — owner artifacts are written only from writing states

A renderer is a module-private function that only the executor calls, from the state the
table binds it to. **An owner artifact is written only from a writing state, and the
refusal binds the WRITE** — the property is unwritable rather than detected:

> "Where a defect class recurs against enumerated post-hoc repairs, the remedy is to
> constrain what the pipeline can PRODUCE rather than to improve what it can DETECT — an
> enumerated prohibition can only name yesterday's leak while a construction constraint
> makes tomorrow's unreachable; detection survives only where free composition is
> irreducible, and there the correct move is to shrink that surface rather than police it
> better."

`consulted: product-lab@c2f4650f6a3f4fa39c562c2538ddbd01c68dd7b0 LESSONS.md:81`

**The discriminator is the RESOLVED destination and never a flag.** §15.7 forecloses a
debug-only escape, and a route whose refusal could be switched off by an environment
variable would be exactly that — so the check is written against the resolved path, and
`--rendering-dir reports` is refused too. A caller rendering into a run-scoped location
writes no owner artifact by `specs/SPEC.md` §2.5.1's lifetime rule, which is why
throwaway-directory runs are unaffected rather than exempted.

**The authority is held by the executor and released on the way out.** It is set for the
duration of a `write`-kind state and restored in a `finally`, so a renderer that fails
cannot leave it standing for whatever runs next in the same process.

**What this does NOT claim.** **The composition remains callable out of order.**
`cotags` and `report` stay callable composition routes: a session can render a co-tag
screen into a temporary directory with no run record; what it cannot do is put one in
front of the owner. Removing them as entry points was refuted by observation — the
executor's `survey` state re-surveys live so fixtures are unreachable through it,
`compose_input` crosses the served-material seam, and `J1_claims` refuses without
`--claims`, which makes the claimless co-tag screen §6.1 requires unreachable through
the executor at all.

**The completeness criterion, stated in the same act as the purity one**, per:

> "An extraction, promotion, or generalization criterion is one-sided — it measures what
> must NOT remain, so it is satisfied most cheaply by removing behaviour, and checked
> alone it rewards the loss it exists to prevent; the completeness criterion must be
> stated in the same act (an inventory of behaviours that must survive, each with the
> test that fails if it stops holding), with a behaviour leaving only under a recorded
> decline."

`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 LESSONS.md:36`

The behaviours that must survive, each with the test that fails if it stops holding: the
co-tag screen composes without claims (the `NO_CLAIM` marker and its aggregate); a Full
Report renders at the DEFAULT owner location through the writer rather than through a
supplied path; and the screen artifact is written, overwritten and named.

**The caller set has its own carrier.** `check-terrain-workflow.sh` counts run records
against the table and `check-terrain-composition.sh` checks screen conformance, and
neither reads the caller set of the owner-artifact writers.
`checks/check-terrain-write-authority.sh` is that reader.

**ONE WRITER PER ARTIFACT, and GRAMMAR BINDS TO THE STATE, never to the artifact path.**
Each writing state declares its own `grammar_surface`; the writer stays one private
function, and it renders under the grammar the calling state names. Binding one artifact
to one grammar while several states write it makes a conformant state unrunnable under
the grammar it was bound to, or forces a bypass of the guard.

**The artifact NAME does not change, and per-state names were the declined arm.** §12.2
rules the tree holds one overwritten rendering per owner-rendering class, and per-state
names would multiply owner renderings — repairing a writer-count defect by breaking a
count rule one clause over.

**Delivery is unchanged.** §14.4.1's ruling that an owner rendering is an artifact the
runtime wrote, never a display channel, and that the hand-over's form is non-normative,
stands in every respect. §14.4's one-producer removal stands: the session composes the
executor's inputs and hands over its outputs, and retyping remains prohibited.

### 15.6 Judgment points are typed, fenced, and reached only from declared states

- **J1 — GroupClaim / SubGroupClaim composition (§7).** Composed outside the runtime and
  arriving as a typed claims record carrying its `composition_pin`; §11's subset refusal
  makes a claim naming material outside the bounded read unproducible.
- **J2 — subdivision judgment (§8).** Arriving as the typed per-group record with its
  judge pin; §8's coherence label is read from the supplied record and never invented,
  and a value outside the closed set is refused rather than defaulted. WHETHER the group
  must split is the engine's at the threshold and is not a judgment this state receives.
- **J3 — neighborhood judgment (§13.4).** Arriving as the typed per-candidate record;
  conditional, and a run naming none renders the all-unjudged line.

The runtime contains no model client and no prompt, and every judgment arrives as a file.
What this section adds is that they are reachable **only** from the states the table
declares, so a session cannot supply a judgment at a moment the table does not ask for
one. **The executor validates and never composes.**

### 15.6.1 The claim re-offer is a WAIT beside J1, never part of it

§7 rules that a claim pinned to a member set is **recomposed and re-offered as a GATE
EVENT** when the set becomes a subset, *"never a silent refresh"*. `J1_claims` stays a
pure validator. When a validated claim is pinned to a **proper subset** of what the
composition pin served for its group, the executor schedules `CLAIM_REOFFER` — `kind:
wait`, `writes: null`, `renders_gate_declaration: true` — which composes the declaration
carrying the origin block, **stops**, and resumes on the captured answer. Adoption is
applying that answer.

**Why a wait and not a second entry into J1.** A wait is *the executor stopping* (§15.4),
and adoption is **the owner's act rather than a judgment**, so it does not belong behind
the judgment fence. And `rec.judgments[<state id>]` is **one slot per state**, so a
second entry would overwrite the first and lose the origin the gate exists to show —
§7's silent refresh arriving through the run record.

**Why the declaration and capture stay INSIDE the executor.** §7's routing through the
gate carrier governs the **rendering** — `AskUserQuestion`, options verbatim, nothing
pre-selected, free text always on. The declaration and the capture are the table's.
Siting them outside would let a session mint a declaration with no run record.

> "Workflow orchestration (start, supervise, land, record, expose state) is deterministic
> infrastructure and belongs in engine code, while a session holds only the steps whose
> next action turns on an open question … a judgment step is engine-scheduled but
> model-decided."

`consulted: product-lab@0e00ef1af193220426d3aa680f3c5805520bcc6a LESSONS.md:32`

> "a state only the actor can declare is not a state anyone can check."

`consulted: product-lab@0e00ef1af193220426d3aa680f3c5805520bcc6a topics/claude-code-ops.md:39`

### 15.6.2 `subdivide` folds its COMPOSITION into J2, not only its validation

`J2_subdivision` **accepts the classification record and composes under it**, keeping the
cover refusal — `SUBDIVISION_COVER_INCOMPLETE` — where §2.1 put it. §2.1 makes completeness *a cover counted in placements*
— a runtime refusal — so folding only the validation would move a ratified refusal out of
the runtime and leave it to whatever composed the record.

### 15.6.3 A removed entry point refuses with a pointer; a bound one does not

A removed entry point does not simply disappear from the dispatcher: it survives as a case
that `fail()`s naming the state that now performs the work and the `run` invocation that
reaches it — a refusal naming the replacement, never a silent no-op. Such stubs emit no
owner surface and carry no sequencing authority.

**An entry point whose behaviour IS a state is different**, and is deleted outright with
no stub: it sits in `workflow.json`'s `bound_to_a_state` rather than in
`removed_entry_points`, the two maps are disjoint by that file's `entry_point_accounting`,
and it has a live successor the usage line already names. A removed one has none, and
without the stub its reader meets a bare unknown-command.

### 15.6.4 A GATE WAIT IS ANSWERED BY A CAPTURE — the in-band half

**At a wait whose declaration was written, the capture is not one way to answer, it is the
only one.** Admitting an answer on the sole test that *some* wait is outstanding lets a
session write `owner_input`, push `completed` and clear `awaiting` with a bare `--input`,
skipping the declaration's own option validation, the `tool_use_id` that evidences the
rendering, and the capture row entirely.

**And the carve-out, which is a real exception rather than an oversight.** `GATE_WORK`
is the gate-side mirror of the renderer table §15.1 requires, so a new gate state is a
table row **plus an option composer** — and a gate state this runtime binds no composer
to records its declaration **owed and unwritten**, naming why.
There is no declaration for a capture to be validated against, so a capture there
**refuses by name** — and `--input` **remains admissible**, because refusing both would
leave the state unanswerable, which is to say that adding a gate state to a table would
need driver code.

| the wait's declaration | how it is answered |
|---|---|
| **written** | a capture, carrying an offered option (or free text) and its `tool_use_id`. A bare `--input` is refused, naming the file and the invocation. |
| **owed and unwritten** | `--input`. A capture refuses, naming the state and why no declaration exists. |

**This is a statement about the RUNTIME, not about the owner's surface.** §6.3's question
allowlist for the post-tag window is empty and stays empty: the executor composes a file
and stops, and it still asks nothing. What the rule adds is that the answer it will accept
has to carry evidence that a question was put — and an answer nothing can show was asked
is what §2.3's gate carrier exists to prevent.

### 15.7 The standalone owner-facing subcommands are REMOVED, not flagged

The standalone owner-facing subcommands cease to exist as entry points. **A debug-only
flag is the declined arm**, on the served position that a retained generator regenerates
what a ban forbids:

> "A prohibition installed at one layer fails to align the system, because lower layers
> regenerate the forbidden expression from the material they hold at writing time — the
> mechanism is source-removal (change the writers' inputs so the correct form regenerates
> by itself), with denies installed only after, as leakage measurement."

`consulted: product-lab@c2f4650f6a3f4fa39c562c2538ddbd01c68dd7b0 LESSONS.md:16`

**WHAT A REMOVAL LEAVES BEHIND, and the distinction is load-bearing rather than
bookkeeping.** A removed entry point's *flow work* — validating a composed claim,
composing under a classification — is done by the state that owns it, because that work
was never the owner's surface. **A removed entry point's OWNER-FACING BEHAVIOUR is
gone.** It does not survive as a writing state, and this is the forward rule stated at
the site that would otherwise supply the loophole: a surface preserved as a state is a
removed behaviour re-installed under another name, and the record of the removal is what
re-installs it. Where owner-facing text must still reach the owner and is not a Screen,
it reaches them through §6.0's owner-executed channel, writing nothing.

**A surface leaves coverage by two different routes, and the difference is named rather
than averaged.** A subcommand **removed** stops emitting owner text at all and leaves the
**denominator**. A subcommand whose owner text **does not stop** — because it becomes an
owner-executed listing (§6.0) — **stays in the denominator and enters the numerator** by
gaining grammar. **The figure itself is not asserted here**; §14.1 derives it from the
state table, so the two routes are visible in the table's own rows rather than in a
list of departures kept beside it.

**`self-test` and `validate` survive** as non-flow utilities: they emit no owner surface,
carry no sequencing authority, and are reachable without a run record. Stated so their
survival reads as a decision rather than an oversight.

**Every dispatcher case appears in exactly one of `workflow.json`'s entry-point maps** —
the **totality** is the property rather than the count — so the next entry point is
covered by the totality rather than by having been remembered.

### 15.8 What is NOT carried

- **The hand-over floor has no mechanical carrier.** That a session named the artifact to
  the owner remains a property of the relay's behaviour, and nothing in this repository
  observes it. The executor can guarantee the artifact was *written*, never that it was
  *handed over*.
- **Nothing counts the rendering files.** A rendering arriving under some other name,
  hand-copied or written by a path outside the renderings directory, is unobserved.
- **The table's SEMANTIC honesty is not checkable.** That the declared order is the *right*
  order, that a wait belongs where it sits, and that a judgment point is placed where
  judgment is actually owed are judgments and route to the review lane. What is
  mechanically checkable is conformance to the table, never the table's fitness.
- **§14.1's derived owner-surface coverage figure is not executed.** Its **rule** is
  executable over `owner_surface_coverage` and **no registered member executes it**, so
  `at_this_version` stays a convenience for a human reader carrying no authority, exactly
  as that field says of itself. What *is* executed: the table's `counted_baseline` against
  the baseline the `states` array derives, the presence of every key that derivation
  produces, the run's traversal to a terminal over a fixture table, and the gate path —
  declaration composed, `--input` refused, capture validated, owed-and-unwritten refused.
- **Ratification of a table change is a human act.** Nothing denies an edit to
  `workflow.json` that no issue licensed; `version` and `licensed_by` name the current
  version and what licensed it, exactly as `report-format.json`'s do, and they gate no
  code path.

**deferred slots: none.**
