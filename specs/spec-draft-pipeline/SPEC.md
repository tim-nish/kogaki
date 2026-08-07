# SPEC-draft-pipeline — the Brief's composed structure: Thesis, Strands, and the step sequence

**Status:** v1, authored 2026-08-07 (kogaki#127).
**Governs:** port manifest item 2 (`specs/SPEC.md` §5) — its structure half.

## 1. The manifest entry is a name and a contract, never a design

The manifest carries this subsystem's contract inline, as its admission
record:

> "2. **The Brief and its four gates** (thesis, journey incorporation,
> structure composed from the Brief's own state, plain register with
> round-trip concessions) — the design/realization boundary test."

`specs/SPEC.md:986-988`

What is admitted there is **four gates**, which is a contract. The design
that satisfies them is authored **here, fresh**, and this spec is not a port
of writing-assistant's Brief. The scope limit is stated in this repository
already, and it names this subsystem by name:

> "**The scope limit is part of the clause, not a footnote: the inheritance
> is limited STRICTLY to Terrain design.** Kogaki was created specifically to
> separate Draft and Brief completely from WA, and nothing here may be read
> as a general WA inheritance — not for Draft, not for Brief, not for any
> other subsystem. A sitting citing this section for a non-Terrain design
> question is misusing it."

`specs/spec-terrain/SPEC.md:177-182`

So §2.4's WA baseline does not reach this spec, and no clause below may be
read as inherited. The owner's inheritance whitelist for this pipeline
(kogaki#127, consultation 2026-08-06) is exactly four items — the Terrain →
Brief pipeline idea, the way it reads Thesis and Strands, the policy that
Draft creation is driven by questions in a UI, and the CanonicalDraft and
Variant concepts. Everything else enters only with a benefit named at
admission.

## 2. What v1 binds, and which gates stay owed

v1 binds the **structure half** of item 2. Stated per gate so the remainder
is countable rather than assumed:

| Item 2 gate | v1 |
| --- | --- |
| thesis | **bound** as design — §3 |
| journey incorporation | **partial** — Journeys are admissible step materials (§4), the incorporation gate itself is owed |
| structure composed from the Brief's own state | **bound** — §4, §5, §6; the load-bearing one |
| plain register with round-trip concessions | **not bound** — it consumes manifest item 6 (the style contract), whose re-homing kogaki#127 excludes from this sitting by name ("No new style artifact") |

The Brief's **durable home** — where the document lives, checkpoints and
resume — is manifest item 5's and is not decided here. v1 describes the
Brief's structure section and says nothing about its file.

**The whitelist's other two members are owed, not silently covered.** §1's
inheritance whitelist has four members; items 1 and 2 (the Terrain → Brief
pipeline, and reading Thesis and Strands) are discharged by §3. Item 3 —
Draft creation driven by questions in a UI — and item 4 — the CanonicalDraft
and Variant concepts — are **neither bound nor excluded by v1**: this spec
stops at the Brief's structure, and both live downstream of it. Listed here
so the remainder stays countable rather than being read as covered.

## 3. The Thesis and the Strands are read, not invented

The article-design substrate is served and ratified:

> "**Thesis + Strands is RATIFIED as the article-design substrate and the
> Framework family is retired AT THE GENERATOR — owner verdict, carried not
> derived.** F1–F5 intent types, the stage-2 question generator, mandatory
> slots, Angle and the standing Reader/Significance questions go wholesale
> rather than per concept."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:13,34,120`
  request_id: 798432a0-9043-46ca-b629-1fb9c8f918a6
  outcome: discriminating
  query: topic_thread("articles")

The Thesis and the selected Strands arrive from Terrain's selection
(`specs/spec-terrain/SPEC.md`). This pipeline neither generates them nor
re-opens the owner's selection.

**The completeness rider follows the selected set into composition.** A
proposed structure places every selected Strand or discloses the omission,
and the count is taken **after** composition, because a composer that cannot
omit in principle can still omit in fact. That is a served invariant, not a
local one, and it is quoted at §5.

## 4. A step, and what a step may not be

The Brief's structure section is a **sequence of steps**. Each step states,
in prose:

- **materials** — which Strands, which Journeys, the Thesis, or an earlier
  step's conclusion it works on. Materials are many-to-many with steps.
- **purpose** — what the step does to the reader.
- **reader state before** and **reader state after**.
- **rationale** — why *this article's* materials make this the next step.

The rationale field is normative and is the whole point of the shape. The
served declination that governs article structure says what fixes the
observed defect:

> "**Article structure is COMPOSED per article from the Brief's own
> materials, and the closed structure vocabulary proposed the same day is
> DECLINED with its boundary on this line: named frameworks remain citable
> vocabulary, never a menu.** … the observed failure was not a missing
> vocabulary but a selection ground — the run chose on NOVELTY,
> differentiation from a sibling article, and a menu would have left novelty
> available as the ground. What fixes it is requiring the rationale to be
> tied to THIS article's materials, which composition does and a stock does
> not. The boundary that travels: a name may DESCRIBE a composed structure
> afterwards and may never GENERATE it beforehand."

`topics/articles.md:13@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §3)

**Names are describing, never generating.** A step may carry a descriptive
name, and the name is written **after** the step is composed. Normatively:
a name is admissible in a Candidate's *rendering* and inadmissible in the
material that *produces* it. A composer that reads a name before it has a
rationale has generated from a name, whatever the name's provenance.

**Deliberately absent from the step's shape**, each because it would be the
generating half in another costume: any typed vocabulary of step kinds, any
adjacency table of which step may follow which, any fit rule proposing a
shape from the material. Adjacency is reasoned per article from the step's
own before/after states. The library that would carry a typed vocabulary is
**held**, with its trigger and its instrument declaration, at §7.

## 5. The obligations ledger

The Brief carries an **obligations ledger** so Thesis closure is readable at
the gate rather than reconstructed there. Every question a step opens, every
analogy it introduces, and every limitation it concedes is entered with the
step that discharges it.

- An **undischarged obligation renders as undischarged**. It is a
  **disclosure**, never a refusal: nothing here blocks, and no machinery
  judges whether the discharge is good.
- The **Strand cover** is counted in placements here, after composition, and
  an unplaced selected Strand discloses:

> "the COMPLETENESS invariant follows the selected set into drafting, so a
> proposed structure places every selected Strand or discloses the omission
> … The ordering rider transfers unchanged and is the checkable half: **the
> count check runs AFTER composition**, since a composer that cannot omit in
> principle can still omit in fact."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9,11, topics/articles.md:41,74,120`
  request_id: e6abb4ef-d145-4411-b308-90d9ef475ae9
  outcome: discriminating
  query: Does a cross-run signature ledger exist — what act or instrument measures whether composed article structures have rationale untied to the article's own materials?

There is **no mechanical judge** of any of this. kogaki#127 excludes a Probe
successor, mechanical evidence resolution, and automatic requires/effect
judgment by name, and `specs/SPEC.md` §3 already sites the split: Kogaki
guarantees citations, the substrate guarantees facts. Composition quality is
judged at the human gate.

`deferred-slot: obligations-ledger-carrier` — whether the ledger is a
section of the Brief document, a machine-readable sidecar the gate reads, or
a projection assembled per Candidate at gate time. Three resolutions,
**none selected**: the choice changes what a consumer may bind to, so it is a
decision act owed on kogaki#127 with its own consult before code embeds it,
per `specs/SPEC.md` §4's deferred-slot clause.

## 6. Candidates ride the existing gate — no new carrier, no new check

Two to three **Candidates** per article, differing in **reader experience**,
are presented on the carriers this repository already ships:

- the record shape, Where/Why, and the effect-stating label —
  `specs/spec-proposal-contract/SPEC.md`;
- the declared gate registry and the selector affordance —
  `specs/spec-gate-carrier/SPEC.md`.

No gate is registered by this spec and **no check is registered by this
spec**. A new check would owe an admission record, a removal signal and a typed
observing instrument (`specs/SPEC.md` §4, the check-registry bullet); v1 has
nothing yet to observe,
and a check admitted ahead of its subject is the shape this repository
already refuses.

Each Candidate carries, **as its evidence at the gate**, the
composition-time reasoning: step validity, transition continuity, Thesis
closure, the obligations ledger's state, and the Strand placement count.
This is **reasoning surfaced for the owner, never an automated verdict** —
the evidence is what the owner reads, not what a checker passed.

**The premise's negation is a first-class option**, per
`specs/spec-proposal-contract/SPEC.md` §2.1: the composing premise is that
the Thesis and the selected set support a structure, so the option set
carries "none of these — the Thesis or the selected set is what should
change", flagged `negates_premise`. The free-text channel does not discharge
it.

## 7. The Move library is HELD — its trigger is served, and no act observes it

**What is held.** A `moves/` library of Move *types* — one owner-editable
markdown file per type, carrying Intent / Requires / Effect / Constraints /
Failure modes — together with `moves/INDEX.md`, and the step-level binding of
a `move id` in §4's step shape. kogaki#127 proposes all of it; v1 admits
none of it.

**Why held rather than admitted.** A live served declination is in force:

> "**A closed structure vocabulary for article outlines** (named frameworks —
> ki-shō-ten-ketsu, conclusion-first, empathy-example-first — each carrying
> slot obligations, plus a fit rule proposing candidates) — declined
> 2026-08-04 because it is the retired Framework family rebuilt with
> different members, and slot obligations manufacture the property they
> require (the retired Surprise-slot precedent)."

`topics/articles.md:120@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §3)

A library of Move types carrying Requires / Effect / Constraints is
*arguably* that vocabulary rebuilt one granularity down — Requires becomes
the fit precondition, Effect becomes the slot obligation, and INDEX.md
becomes the menu. This sitting does **not** rule that it is. It declines to
admit it while the question is open, which is a smaller act than either
ruling would be.

**Why held rather than declined.** Roughly twenty Moves were already derived
in the 2026-08-06 consultation. Declining would discard the question along
with the material; the hold preserves it behind a stated trigger. Those
Moves are **not stored by this spec** and have no home in kogaki today —
they remain in the hub's own staging
(`product-lab:q_a/staging/2026-08-06-composition-language-moves-and-reader-path.md`)
and enter this repository only if the hold reopens. Recorded plainly so that
"where did the twenty Moves go" has an answer.

### 7.1 Trigger

The reopen condition is the served declination's own, quoted verbatim:

> "Reopen only if composition is shown to produce structures whose rationale
> is untied to the article's own materials, which is what the cross-run
> signature ledger measures."

`topics/articles.md:120@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §3)

### 7.2 `instrument: none` — typed deliberately, with the reason

The governing rule is served and binds at authoring:

> "**A held or parked item names an act that ALREADY HAPPENS and observes the
> quantity its trigger fires on, or declares `instrument: none` — and the
> declaration binds at AUTHORING time, never as a periodic reader.** … the
> trigger named a number NO ACT MEASURED, so it could fire only if a human
> remembered to run `wc`."

`topics/knowledge-architecture.md:9@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §5)

**No act observes this trigger.**

- **Not in kogaki.** No Brief or Draft carrier ships here today, and the
  article corpus is zero. There is no run to sign, so there is nothing for a
  ledger to accumulate.
- **Not in product-lab.** The cross-run signature ledger the trigger names
  **does not exist**. The lookup that would have found it returned the
  trigger's own sentence and no ledger — that is the query recorded in §5's
  receipt, and its answer is the absence.

**Both of those are claims about the world, so they are measured here rather
than asserted** — a hold resting on an unchecked zero can be false on the day
it is written, and every later reader inherits the false premise
(`gloss/lessons/testing.md:59@f918c5158c718394b3a0e4f10239d75bbb451b74`,
`an-empty-population-hold-owes-its-measurement`; receipt at §7.4). The two
queries and what they returned:

- **The kogaki corpus.** `git ls-files | grep -iE
  '^(moves|drafts?|briefs?|articles?)/|brief|draft|canonical'`, run
  2026-08-07 at branch `spec/127-draft-pipeline` over all 147 tracked files —
  the command filters nothing out, and the 116 files that remain when
  `docs/stories/` is dropped return the same one. **Sole hit: this spec file
  itself.** No `moves/`, no `drafts/`, no `briefs/`, no `articles/`, no
  composed Brief and no rendered article exist in this repository.
- **The ledger.** The §5 receipt's query, asked of the served surface at
  `product-lab@f918c515`. Its **top hit was the trigger's own sentence**
  (`topics/articles.md:120`) and **nothing in the response named a ledger**.
  What the response was is stated exactly, because the strength of an
  absence is the strength of the look: coverage `partial`, `truncated: true`,
  **20 lines rendered out of 290 topic candidates**. So this is a
  well-aimed look that found nothing, **not an exhaustive enumeration** —
  the query was the one the trigger's own wording supplies, and the surface
  answered with the trigger rather than with the instrument. Re-running this
  lookup would reproduce the truncation, not lift it; the exhaustive read is
  the pair the response's own `continue` block names —
  `topic_thread("articles")` and `topic_thread("knowledge-architecture")`,
  each returning its whole topic thread rather than a slice of topic
  candidates. A reader who needs exhaustiveness runs those two; a reader
  deciding whether to rely on the ledger today has enough.

**The nearest plausible-and-wrong instrument, named so nobody reaches for it
later: this spec's own §6 Candidates gate.** It is the obvious candidate — the
owner reads each Candidate's rationale there — and it is refused on the served
line that refuses it:

> "\"One author across 100 articles\" is a corpus property invisible to
> per-article review by construction
> ([[composition-defects-survive-per-change-review]]), which is why the
> per-article Reviewer cannot be asked to carry it."

`topics/articles.md:41@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §5)

The trigger is a **cross-run** property — structures, plural, *shown* to have
untied rationale. A per-article gate observes one article's rationale and by
construction cannot observe the signature across runs. Naming it would be the
reads-plausibly-and-wrongly defect; this repository's ledger already records
that exact shape at kogaki#20, where a differently-scoped enumeration was the
nearest plausible-and-wrong instrument and was refused by name.

The general rule the refusal instances is served, and it also licenses what
§7.3 does instead of inventing something:

> "If it survives because the problem is repetition or sameness — something
> no single output can display — then the thing that detects it must look
> across many outputs, and no stricter single-output check will ever do. …
> Shipping with none of these is fine only if you write down that you are
> doing so and what would make you revisit it."

`gloss/lessons/testing.md:131@f918c5158c718394b3a0e4f10239d75bbb451b74`
(`match-the-detectors-unit-to-the-propertys-unit`; receipt at §7.4)

**So the value is written, not omitted:**

> "**`instrument: none` is a first-class value that is WRITTEN, never
> omitted: the rule does not close the fired-and-unread edge, it makes that
> edge's residue greppable.** … #153 … and #154 … fire on external events
> with NO recurring observer, and no rule invents one."

`topics/knowledge-architecture.md:11@f918c5158c718394b3a0e4f10239d75bbb451b74` (receipt at §5)

**Consequence, stated rather than hidden: this trigger fires only if a human
looks.** That is an accepted cost, not an unnoticed one.

### 7.3 What would have to exist

A **cross-run signature ledger**: an act that records, per composed Brief,
which of the article's own materials each step's rationale tied to, and reads
that record **across** runs — so that "rationale untied to the article's own
materials" becomes a quantity something measures rather than an impression
someone forms.

It **cannot be built now**, on the same served ground that holds the
corpus-level drift check: the corpus is approximately zero published
articles, so the instrument could not run if built
(`topics/articles.md:41`, receipt at §5). It becomes buildable at the point
kogaki has composed Briefs to sign — which is downstream of this spec's own
implementation, not of this spec. Building it is not scheduled here and is
not a deferred slot of this spec: it is a substrate-shaped act whose subject
does not yet exist.

### 7.4 The read that produced §7.2's measurement and §7.3's licence

Consultation-map entry 1 matched this branch on the word "check" in changed
text — an incidental prose match, since this spec touches no file under
`checks/` and registers nothing. The prescribed read was performed rather
than waived, and it was not idle: it supplied the empty-population rule that
turned §7.2's two assertions into measurements, and the detector-unit rule
that licenses §7.3's "write down that you are shipping without one".

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/lessons/claude-code-ops.md:1-67`
  request_id: 551e4a98-c065-4831-9956-88ae12142076
  outcome: discriminating
  query: entry 1 read prescription — survey lessons/claude-code-ops headline-first before a diff whose prose matches the check-infrastructure boundary

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/lessons/testing.md:1-157`
  request_id: 07590a65-17ff-4dbd-b720-1c3103cac7c8
  outcome: discriminating
  query: entry 1 read prescription — survey lessons/testing headline-first before a diff whose prose matches the check-infrastructure boundary

One further line from that read is recorded because it names this hold's
honest status rather than flattering it: a rule that reaches a reader only as
a document is **advice**, not a mechanism in force, and it is more honest to
label it as advice than to believe it is installed
(`gloss/lessons/claude-code-ops.md:29@f918c5158c718394b3a0e4f10239d75bbb451b74`,
`a-rule-reproduces-only-through-a-default-carrier`). §7.2's closing sentence
is that label, written on purpose.

## 8. Non-goals

Restated with their grounds so the exclusions are not re-litigated per
sitting:

- **No Probe successor, no mechanical evidence resolution, no automatic
  requires/effect judgment.** Kogaki never opens the repositories that are
  the provenance of Strands (`specs/SPEC.md` §2); material is quoted from
  served renderings at pins.
- **No Recipe generator.** Recipes are not built and never generate
  Candidates — the describing/generating boundary at §4. Reopening is an
  owner decision if the repertoire grows, Recipes prove useful, and
  Move-based composition goes hollow; never a schema default.
- **No new style artifact.** Surface style is manifest item 6's, re-authored
  on its own admission.
- **No automated composition scoring**, and **no check registered by this
  spec** (§6).
- **No Move library** (§7), and no typed step vocabulary or adjacency table
  (§4).
