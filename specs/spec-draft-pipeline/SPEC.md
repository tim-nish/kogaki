# SPEC-draft-pipeline — the Brief's composed structure: Thesis, Strands, and the step sequence

**Status:** v2.1, amended 2026-08-07 (kogaki#179 — the reversal record's
second-order cause). v2 amended 2026-08-07 (kogaki#169). v1 authored 2026-08-07
(kogaki#127); §7's hold is **reversed** by this amendment and the reversal is
recorded at §7.0 rather than edited away.
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

## 4. A step, the Move it binds, and what neither may be

**Two shapes, not one.** The Brief's structure section is a **sequence of
steps**; a step may **bind** a Move from the library at §7. A step and a Move
are **separate types, and binding changes the type of neither** — a Brief
Step may bind a Move to the Thesis, and that makes the step neither a Move
nor the Move a step. The distinction is load-bearing and is the correction
kogaki#169 carries: a step is *this article's* sequence element, authored per
article and discarded with it; a Move is a durable, source-specific precedent
that outlives any one article. Collapsing them would make every Move an
article's private property and every step a library entry, which is neither.

### 4.1 The step — the Brief's sequence element

- **`step_id`** — the step's identity within this Brief.
- **`move`** — a binding to a Move library entry (§7), or **absent**. A step
  need not bind a Move; see the no-mandatory-Moves constraint at §7.5.
- **`materials`** — which Strands, which Journeys, the Thesis, a
  `reader_assumption`, or `constructed_material` it works on. Materials are
  **many-to-many** with steps.
- **`purpose`** — what the step does to the reader.
- **`reader_state_before`** and **`reader_state_after`**.
- **`depends_on`** — the earlier steps whose conclusions this step stands on.
- **`rationale`** — why *this article's* materials make this the next step.

### 4.2 The Move library entry — the adopted field subset

The subset adopted in the 2026-08-06 consultation and re-ruled by the owner
2026-08-07, in full, with nothing added:

- **`id`**
- **`status`** — one of `observed` | `generalized` | `proposed` | `validated`.
- **`intent`**
- **`requires`**
- **`effect`**
- **`constraints`**
- **`failure_modes`**
- **`sources`**

**Moves ↔ Strands are many-to-many.** A Move may bind **no** Strand, several
Strands, a Journey, the Thesis, or an earlier step's conclusion. Nothing
requires a Move to have a Strand, and nothing stops a Strand carrying many.

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

**The describe-never-generate boundary stands unchanged under v2**, and
admitting the Move library does not touch it. It constrains **names**: a name
may describe a composed structure afterwards and may never generate it
beforehand. A `move` binding is **not** a name read before a rationale — the
step's `rationale` is authored from *this article's* materials, and the
binding records which durable precedent that reasoning turned out to
instance. A composer that selected a Move first and then wrote a rationale to
fit it would be generating from a name, and that is refused here whatever the
name's provenance. The order is the invariant, not the vocabulary's absence.

**Deliberately absent from the step's shape**, each because it would be the
generating half in another costume: any **adjacency table** of which step may
follow which (no `compatible_previous_moves` / `compatible_next_moves`), any
**fit rule** proposing a shape from the material, and any `material_roles`
typing of what a material is *for* within a step. Adjacency is reasoned per
article from the step's own before/after states. A stored flowchart is the
declined menu one level down, and it stays out.

## 5. The Brief's centre, and the obligations ledger inside it

### 5.1 The settled structure section

v2 binds the Brief's whole structure section, not the step shape alone:

- **`reader_start`** — where the reader is before the article.
- **`reader_target`** — where the article leaves them.
- **`opening_question`**
- **`thesis`** — read from Terrain (§3), never invented here.
- **`sequence`** — the ordered steps of §4.1.
- **`strand_coverage`** — per selected Strand: `used_by_steps` and
  `role_in_thesis`.
- **`unresolved_obligations`** — the ledger of §5.2.
- **`thesis_closure`** — `explanation` and `established_by_steps`.
- **`tradeoffs`**

§3 (Thesis and Strands read from Terrain) and §6 (Candidates on the existing
gates, reasoning surfaced and never verdicts) are consistent with this shape
and stand unchanged under v2.

### 5.2 The obligations ledger

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

The quoted line is the 2026-07-29 completeness entry. v1 cited it as `:74` at
pin `f918c515`; it is the same text at `:75` at the current pin, after the
insertion recorded at §9.2.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/articles.md:75`
  request_id: e3fc01a8-baab-4c5e-8ac5-a86ad3e08059
  outcome: discriminating
  query: topic_thread("articles") — does the served article-design thread carry the 2026-08-06 Move adoption, what is its newest line, what does the declination name as its constituents, and does the completeness invariant follow the selected set into drafting?

**Receipt-integrity correction (kogaki#169, caution 2).** v1 carried
`request_id e6abb4ef-d145-4411-b308-90d9ef475ae9` **here**, as the receipt for
the completeness quote above. That was a defect: `e6abb4ef`'s recorded query
asks *"Does a cross-run signature ledger exist…"* and never asked about the
completeness invariant. The line was returned incidentally, among the twenty
that lookup rendered — genuinely returned, but by a query about something
else, so the receipt evidenced no one having asked whether the invariant
binds. It is **not deleted**, because it is a true record of a read that
happened, and it is **not moved** either — it stays where it sits and is
re-labelled to the reading it actually is, the ledger-absence measurement
whose subject is §7.2, where its query is its subject. kogaki#127's umbrella
claim of "4 distinct request_ids, one query and one reading each — no reuse"
was inaccurate for this one id and is accurate again once it sits at §7.2
alone.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9,11, topics/articles.md:41,120`
  request_id: e6abb4ef-d145-4411-b308-90d9ef475ae9
  outcome: discriminating
  query: Does a cross-run signature ledger exist — what act or instrument measures whether composed article structures have rationale untied to the article's own materials?

**The reading this receipt is:** the ledger-absence measurement. Its subject
is §7.2, and §7.2's "receipt at §5" pointers resolve here. It does **not**
support §5's completeness quote; that quote's receipt is `e3fc01a8` above.

There is **no mechanical judge** of any of this. kogaki#127 excludes a Probe
successor, mechanical evidence resolution, and automatic requires/effect
judgment by name, and `specs/SPEC.md` §3 already sites the split: Kogaki
guarantees citations, the substrate guarantees facts. Composition quality is
judged at the human gate.

`deferred-slot: obligations-ledger-carrier` — **RESOLVED** by this amendment
(kogaki#169), to **resolution (a): a section of the Brief document.** The
ledger is `unresolved_obligations` in §5.1's structure section, each entry
carrying **`introduced_by`** and **`discharged_by`** as step references.

The other two resolutions v1 listed — a machine-readable sidecar the gate
reads, and a projection assembled per Candidate at gate time — are **not
selected**. Recorded here rather than deleted so the alternatives stay
countable.

**This is not a fresh three-way choice made by this sitting.** The settled
design already sites the ledger on the Brief, and the sitting **confirms that
against the record** rather than re-deriving the fork: siting
`unresolved_obligations` on the Brief is what makes Thesis closure a
**checkable ledger** — the same document carries the obligations and the
`thesis_closure` that must discharge them, so the gate reads one artifact and
a sidecar cannot drift from it. A projection assembled at gate time was the
weaker option for the reason `derivable-artifact-is-a-view-not-a-noun` names
from the other side: the entries are **authored judgments** ("this step opens
this question"), not something a computation reveals from data already kept,
so they need a record and the record belongs where its consumer reads it.
v1's "three resolutions, **none selected**" **no longer describes the state**
and is struck.

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

## 6.9 Move INGESTION — how a Move enters the library (kogaki#223)

§7 admits `moves/` and `moves/INDEX.md`; **nothing said how a Move gets there**,
so the library was admitted with no intake. Verified rather than assumed before
writing: zero occurrences of ingest, normalize or selection-screen anywhere in
this spec.

**The workflow, owner-decided.** Input is a **free-form markdown file the owner
writes**. A kogaki command reads it and proposes each Move in exactly §4.2's
eight-field schema, stripping the excluded draft fields (`material_roles`,
`compatible_previous/next_moves`, `examples`) — the delete-me.md drafts predate
the field subset and carry them. An **agent review** applies the authoring
discipline as **judgment**: one transition not an arc, separable from content,
an id naming the operation in established terms, effect differing from
requires, statable invalidity, dedupe against the existing ids (a near-duplicate
proposes a `sources` amendment rather than a new entry), honest `status`
(`validated` is never assignable here), and `sources` naming real passages with
no fabricated citations. Then **one selection screen**: per-Move accept /
decline / free-form, the owner deciding. Accepted Moves land one file each in
`moves/`, and the command regenerates `moves/INDEX.md`.

**ADMISSION IS THE OWNER'S ACT AT THAT SCREEN, never the command's.** Review may
split or rename, so the reviewed proposal is not the authored file — nothing
self-admits.

### 6.9.1 The file interior — the §4.2 block IS the file body

**Owner selection 2026-08-08 (kogaki#223), and it is recorded as an UNCOVERED
fork resolved by judgment rather than by policy.** Two framings were put to the
served surface and neither discriminated file-interior layout
(`outcome: uncovered-after-2-framings`; `request_id:
bf5be3a2-ab69-4899-a7ca-0df5d909c3cd`). The nearest served line — *"the stronger
move being to serve structure so there is nothing to parse at all"*
(`product-lab@98195e0a LESSONS.md:45`) — governs **format contracts between a
producer and a consumer holding separate suites**, which the line states in its
own terms (*"because producer and consumer hold separate suites over one
contract, neither side can see the break"*), not a human-edited artifact's
interior, so it is
recorded here as **adjacent reasoning and not as grounding**. Claiming it would
be the over-reach this spec's own citation discipline refuses.

The eight fields of §4.2 render as a **structured block as the file body**, and
`moves/INDEX.md`'s row derives mechanically from those same fields.

**The declined arm, with its real cost.** Headed prose sections per field are
friendlier for fields that are genuinely paragraphs, and keep the artifact
unmistakably a *document* rather than a record — the side §7.5's
no-verdict-machinery ruling leans toward. It is declined because the INDEX row
would then be **composed rather than derived**, so INDEX and files can drift and
the regeneration contract would have to bind the derivation rather than the
freshness; and because a **missing field is invisible** in prose — an absent
heading reads as a stylistic choice where a block leaves a hole.

**The selected arm's own cost is stated rather than discovered:** long fields
read poorly as block scalars in a library a human is expected to *read*, and a
structured body invites the reflex to treat it as machine-authoritative — which
is one step from the verdict machinery §7.5 excludes. **Nothing in this section
makes the block a verdict surface**: the review is judgment, the screen is the
owner's, and no lint is admitted.

### 6.9.2 Constraints inherited, not restated

No Recipes and no retrieval-index applicability blocks; no adjacency or
material-role fields; no verdict machinery and no lint; no Probe and no
mechanical evidence resolution — quotation from served renderings at pins
remains the boundary. Pin resolution stays the sole mechanical instrument on
grounding.

### 6.9.3 kogaki#177's trigger is CANNOT-DETERMINE at the pin, and the coupling is named here

**CORRECTION RECORD (kogaki#236). The heading of this section and its opening
claim were WRONG, and they are withdrawn here rather than edited away**, because
the false claim is what the next reader needs to see was caught. Both were
ratified at PR #235 and merged.

**What was written:**

> kogaki#177's trigger *"when the hub distils the 2026-08-06 rulings"* — which
> **fired on 2026-08-07**, so served pins now exist.

**What is measured at `product-lab@98195e0a`, the pin this section itself
cites:**

| probe | result |
| --- | --- |
| `topic_thread("articles")`, all 127 lines | **0** lines matching `Move`; newest decision line **2026-08-05** |
| `policy_lookup` — the Move eight-field schema, Reader Path, grounds test | `coverage: low`, **0** Move hits |
| `surface_names(kind=topics)`, full enumeration | 20 identifiers, **none** Move-bearing |

The 2026-08-06 Move rulings are **not served**. The trigger's state is
**cannot-determine at this pin**, and the honest reading of an unobservable
condition is not *fired*.

**THE DEFECT IN THE REASONING IS THE PART WORTH KEEPING.** The ground offered
was that `topics/knowledge-architecture.md:9,12,14-15` carry **2026-08-07**
lines. Those lines are real — and they are the **baseline-dissolution** batch
(`q_a/2026-08-07-baseline-dissolution-and-consult-discipline`), a different
sitting from the Move batch the trigger names. **Evidence of *a* distillation
was read as evidence of *the* distillation**, on nothing but a shared date.

That is `product-lab@98195e0a LESSONS.md:56` landing on the axis the original
did not check — *"recency is evidence about when someone wrote and never about
what they could see"* — and the sharp part is that the original **quoted this
very line** while committing the error it names. Its hedge (claiming only that
the rulings are *"served and pinnable"*, not that every Move has a line) does
**not** rescue it: the unhedged half is the false half, because **which**
rulings was never verified. A bound drawn around the wrong axis reads as care
and buys nothing.

**The rule this section now carries, stated so the next instance is
unrepresentable rather than merely listed:** a claim that a hub trigger has
fired is evidenced by **the named batch's own lines at the pin**, never by a
same-dated neighbour. Date-adjacency is not evidence of content.

**What is NOT claimed:** that the hub never distilled the Move batch. Only that
it is not served at `98195e0a` — which is the whole of what a consumer can
check, and `topics/knowledge-architecture.md:15` is explicit that a consumer
holding only the hub's answer *"will confidently report the wrong KIND of
absence"*. If the batch exists unserved, that is a hub-side gap and kogaki#236
is the consumer-side evidence.

**What survives unchanged:** the two arms of the coupling below, and the named
slot. Only the premise that served pins **exist** is withdrawn — which makes
the slot's filling *more* clearly a decision, not less, since neither arm can
be taken until the pins resolve.

The first ingestion run is the natural vehicle for
writing each accepted Move's `sources` derivation pointer, discharging #177 in
the same pass; running #177 as a follow-up over the saved files is equally
admissible.

**That fork is NAMED rather than described, and the token is what names it:**

    deferred-slot: move-sources-derivation-vehicle
    instrument: the first `moves/` ingestion run — the act that either fills
                this slot or demonstrably does not, and which cannot occur
                without the filler being present at it

Prose saying *"the implementing sitting's to decide"* was this section's first
draft and it is the defect the token exists to replace: `specs/SPEC.md`
§"deferred slots" binds any text leaving a choice *to the implementation* to the
fixed token, **because gates bind to decision documents and an unnamed slot's
decision escapes every one of them**. The served position is the same one a
level up — *"a sitting that leaves a design choice to the implementation either
DECIDES the fork there … or emits a NAMED SLOT whose filling is itself a
decision act … An UNNAMED deferral is the defect"*
(`product-lab@98195e0a topics/knowledge-architecture.md:16`) — and it names this
exact escape route: the fork is *"legally exported past every decision-time
instrument"*, met at review *"entrenched, pre-argued"*. **Naming it in prose is
what the token replaces, not a lighter form of it.**

The `instrument:` line is written rather than omitted, per
`product-lab@98195e0a topics/knowledge-architecture.md:20` — *"`instrument: none`
is a first-class value that is WRITTEN, never omitted"* — since **an omitted
field and a field reading `none` are the same silence to a reader and completely
different silences to a grep**. Here the instrument is not `none`: the slot's
filling rides an act that already has to happen.

Filling it is a decision act owed on kogaki#223 — choice, alternatives and
receipt — **before the command embeds either answer**. This spec does not decide
it, and deferral is priced here rather than banned:
`topics/knowledge-architecture.md:16` is explicit that the rule is
**DECIDE-OR-NAME, never force-decide**, since forcing it now would decide
without the information the first run produces.

## 7. The Move library is ADMITTED — v1's hold REVERSED, and the reversal recorded

### 7.0 The reversal record

**v2 admits what v1 held.** The `moves/` library — one owner-editable
markdown file per Move, plus `moves/INDEX.md` — is admitted as **the Brief's
composition vocabulary**, and the step-level `move` binding of §4.1 is
admitted with it. The Brief's core is **Thesis + Strands + Moves**.

**This is recorded as a reversal, not as a rewrite.** v1's §7 is retained
below at §7.R, complete and unedited, including the reasoning that no longer
governs. The rule is served and it is the reason this section has the shape
it has:

> "…a design can be rejected after its code merged and nothing in the code
> points at that verdict. Before claiming anything is implemented, complete,
> or ready, ask what evidence you are holding; if it is mechanical, you have
> established existence and said nothing about approval, so **read the
> decision record for verdicts dated after that evidence, and when they
> conflict the later verdict wins and the conflict is reported rather than
> quietly reconciled**."

`gloss/lessons/knowledge-architecture.md:257@0cb46066653ef3db2e33f69971829d25c06b6507`
(`merged-code-evidences-existence-never-standing`; receipt at §9.1)

`b3722cb` — v1's merge — is **existence** evidence. The owner's 2026-08-07
ruling is a **later verdict**. Later verdict wins; the conflict is reported
here rather than quietly reconciled. The same surface refuses the opposite
move, of letting the shipped artifact settle the question by being shipped:
shipping first is not approving, and accepting a shipped shape merely because
it exists amends the contract by accident
(`gloss/lessons/architecture.md:89@0cb46066653ef3db2e33f69971829d25c06b6507`,
`a-shipped-ahead-implementation-does-not-ratify-its-shape`; receipt at §9.1).

**The cause: the hold was selected from a consult surface that could not see
the adoption.** Named, not smoothed over. The 2026-08-06 consultation settled
the Move design — Move as a third core type, the field subset at §4.2, the D1
collisions resolved — and those rulings reached only an unswept hub staging
file and kogaki#127's own thread. They never reached `topics/articles.md`,
whose newest decision line at the time of v1's sitting was the 2026-08-04
closed-structure-vocabulary declination. v1's sitting read that thread whole
and honestly; the adoption was **not there to find**. So v1 served a
superseded declination as the live word, and framed the admit-now alternative
as "proceeding against a live served declination" when the question had in
fact been resolved two days earlier.

**The pin recheck could not have caught it, and that is the structural
point.** `issue-pins.mjs --recheck` compares **SHAs**. An adoption that never
lands on the served surface leaves the SHA unchanged, so a staleness of
exactly this kind is invisible to it by construction. **Currency of a pin is
not liveness of a line.**

**And the surface has since learned to claim the currency it does not have —
the second-order trap, recorded because it is what would cause the next
recurrence (kogaki#179).** The hub swept during the v2 sitting itself, moving
the served pin from `f918c515` to `0cb46066`. The sweep did **not** bring the
Move adoption. Measured at the new pin rather than assumed, over the whole
127-line thread:

- **`Moves` → 0 occurrences. `Move ` → 0. `moves/` → 0.**
- **Newest actual decision line: `2026-08-05`.**
- **Frontmatter: `updated: 2026-08-07`.**

`topics/articles.md:4@0cb46066653ef3db2e33f69971829d25c06b6507` (receipt at §9.1)

So the freshness field advanced **two days past the newest decision the file
contains**, and past the adoption it still does not contain. Before the sweep
— that is, at `f918c515` — a reader consulting the thread saw nothing newer
than **2026-08-04** and could grow suspicious: the staleness was **legible in
the content**. (The two dates belong to different pins, and this section's
whole subject is a date that misleads, so each is named with its own:
**2026-08-04** newest at `f918c515`, **2026-08-05** newest at `0cb46066`.) After it, the
header asserts currency to 2026-08-07 while the adoption remains missing.
**The one cue that would have prompted a second look was removed and replaced
by a cue pointing the other way.**

The general form, so this does not read as one file's accident: **an
`updated:` field maintained by an act other than the one that appends
decisions can drift ahead of its own content**, and every consumer treating
that date as a liveness signal inherits the false premise. It is the same
shape as the pin rule one level down — and note what it survives. Here the
SHA **did** move, the recheck **did** refuse with the delta, and the
prescribed re-read **was** performed (§9.2). None of the three found the
adoption, because none of them counts content. **Only counting the content
does.**

**Stated plainly so the next sitting does not repeat the search: there is no
served line ratifying Moves, at either pin.** This amendment rests on the
owner's 2026-08-07 ruling carried in kogaki#169, not on served material, and
that is a fact about the record rather than a gap in this sitting's looking.

**What is reversed is a HOLD — not a served declination.** This distinction
is the whole difference between correcting a misread and overruling the hub,
and it is stated precisely:

- **v1 never ruled the Move library declined.** Its own words: the library is
  *"arguably* that vocabulary rebuilt one granularity down. This sitting does
  **not** rule that it is." v1 declined to admit while it believed the
  question open. The owner's ruling closes the question. There is therefore
  no served verdict being overturned — there is a hold being lifted by the
  authority that could always lift it.
- **The declination's own boundary excludes the Move design.** Read whole
  rather than one line at a time, `topics/articles.md:121` declines named
  frameworks "**each carrying slot obligations, plus a fit rule proposing
  candidates**". The Move design excludes **both** constituents by explicit
  rider — no mandatory Moves, no minimum sequence, no obligatory opening
  shape (no slot obligations); Recipes cite-as-precedent and never
  retrieve-as-generator, requires/effect judgment-class and never
  type-checked (no fit rule). It also satisfies the declination's own
  positive prescription, that "the rationale be tied to THIS article's
  materials" — a step binds its Move to *this* article's Strands, Journeys,
  Thesis, or an earlier step's conclusion.

The served surface names this failure mode exactly, and names it as a defect
of the **quoting**, not of the practice:

> "When you write down that some approach was rejected, put the
> distinguishing reason on the same line as the rejection, because tools and
> future readers quote one line at a time. If the detail that separates the
> rejected shape from the very similar approach you do accept lives on a
> neighbouring line, **a single-line quote will manufacture a contradiction
> that the full record already resolves**. … When someone reports that an
> approved practice contradicts a recorded rejection, check the wording of
> the rejection line first, since the fix is usually the line rather than the
> practice."

`gloss/lessons/knowledge-architecture.md:203@0cb46066653ef3db2e33f69971829d25c06b6507`
(`declines-travel-with-their-boundary`; receipt at §9.1)

That is the diagnosis of v1 §7: it quoted the declination alone and read the
Move library into it. **The fix is the reading, not the practice.**

### 7.R v1's text, retained

**Everything from here to the end of §7.4 is v1's text, kept verbatim and
superseded by §7.0.** It is retained because a reversal that edits away what
it reversed leaves the next reader unable to see that anything was reversed.
Read it as the record of a decision that no longer governs: its "held"
is now "admitted", and its §7.1 trigger is discharged by owner ruling rather
than by the ledger it names. §7.2's `instrument: none` measurement and §7.3's
account of what would have to exist **remain true and remain useful** — no
cross-run signature ledger exists today, and none is scheduled here.

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
  the command applies no path exclusion. **Sole hit: this spec file itself**,
  and re-running it over the 116 files that remain when `docs/stories/` is
  dropped returns that same hit. No `moves/`, no `drafts/`, no `briefs/`, no
  `articles/`, no composed Brief and no rendered article exist in this
  repository.
- **The ledger.** The §5 receipt's query, asked of the served surface at
  `product-lab@f918c515`. Its **top hit was the trigger's own sentence**
  (`topics/articles.md:120`) and **nothing in the response named a ledger**.
  What the response was is stated exactly, because the strength of an
  absence is the strength of the look: coverage `partial`, `truncated: true`,
  **20 lines rendered out of 290 topic candidates**. So this is a
  well-aimed look that found nothing, **not an exhaustive enumeration** —
  the query was the one the trigger's own wording supplies, and the surface
  answered with the trigger rather than with the instrument. Re-running this
  lookup would reproduce the truncation, not lift it. The exhaustive read of
  the two topics §5's receipt pins is `topic_thread("articles")` and
  `topic_thread("knowledge-architecture")`, read through the served tool that
  returns "one whole topic decision-thread file, pinned and line-quoted"
  rather than a slice of topic candidates. A reader who needs exhaustiveness
  runs those two; a reader deciding whether to rely on the ledger today has
  enough.

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

### 7.5 The constraints that survive the reversal

Admitting the library carries the 2026-08-06 consultation's **own riders**
forward as binding constraints. They are what keep the admitted thing on the
permitted side of the declination's boundary, so they are not decoration:

- **No mandatory Moves.** No step is required to bind one.
- **No minimum sequence**, and **no obligatory opening shape.** Slot
  obligations manufacture the property they require — the retired
  Surprise-slot precedent — so none are imposed.
- **No `compatible_previous_moves` / `compatible_next_moves` adjacency
  lists**, and **no `material_roles`** (§4). A stored flowchart is the
  declined menu one level down.
- **Recipes cite-as-precedent, never retrieve-as-generator.** Reopening is an
  owner decision, never a schema default (§8).
- **`requires`/`effect` matching is judgment-class.** It is **surfaced as
  gate evidence** (§6) and is **never type-checked**. No machinery renders a
  verdict on whether a Move's requires are met.
- **Pin resolution remains the sole mechanical kill criterion.** Nothing else
  in this pipeline blocks mechanically.
- **The describe-never-generate boundary of §4 is untouched** by the
  admission.

### 7.6 The ~20 derived Moves, and what their `sources` are not yet

Roughly twenty Moves were derived in the 2026-08-06 consultation. They enter
as **source-specific precedents, `status: observed`** — the claim-first
reading: each records a move observed in a particular source, not a
generalization licensed across sources. Promotion to `generalized`,
`proposed`, or `validated` is a later act with its own grounds.

**Their `sources` cannot cite a served pin today, and this spec says so
rather than manufacturing one.** The Moves sit in the hub's staging file
(`product-lab:q_a/staging/2026-08-06-composition-language-moves-and-reader-path.md`),
and **staging is not on the served surface** — verified for this amendment,
not assumed: `surface_names` enumerates no staging address, and
`topic_thread("articles")` at the current pin returns the article-design
thread **whole, 127 lines, with zero occurrences of "Move", "Moves", or
`moves/`** (§9.1). That absence is the same fact that caused the defect §7.0
records, still true at the moment this amendment is written.

So, stated exactly:

- **What the sources are:** the book passages and source material each Move
  was observed in, named in prose, plus the hub staging file as the
  derivation's location.
- **What they are not:** served pins. No `sources` entry may be written in
  `path:line@sha` form against the served surface until the hub distils the
  2026-08-06 rulings onto it.
- **Why the amendment does not wait for that sweep:** the *ruling* travels via
  kogaki#169 directly, carried by the owner, not derived from the surface.
  The hub-side distillation is gated hub-side and this spec does not depend on
  it. It remains **owed** — until it lands, a future consult of the served
  surface alone will reproduce v1's misread, which is exactly why §7.0 records
  the cause rather than only the correction.

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
- **No adjacency table and no fit rule** (§4) — and no `material_roles`.
  ~~**No Move library** (§7), and no typed step vocabulary~~ — **struck by
  v2 (kogaki#169)**: the Move library is admitted at §7 as the composition
  vocabulary, and §4.1's step carries a `move` binding. The strike is shown
  rather than silently removed, for the reason §7.0 gives.

## 9. The reads this amendment rests on

### 9.1 Receipts

Every quote v2 adds is verified at the **current** pin, not inherited from
v1's. One query, one reading, one request_id each — no receipt is carried
across queries.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/knowledge-architecture.md:203,257`
  request_id: 7f74c874-76a3-4e14-b8d4-4d3310545bbb
  outcome: discriminating
  query: gloss_index("lessons/knowledge-architecture") — when a merged artifact conflicts with a later ruling, and when does a single-line quote of a rejection manufacture a contradiction the full record resolves?

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/articles.md:14,42,75,121`
  request_id: e3fc01a8-baab-4c5e-8ac5-a86ad3e08059
  outcome: discriminating
  query: topic_thread("articles") — does the served article-design thread carry the 2026-08-06 Move adoption, what is its newest line, what does the declination name as its constituents, and does the completeness invariant follow the selected set into drafting?

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/architecture.md:89,149`
  request_id: 6ec7185d-247a-43a5-a1b9-15a439e90d8e
  outcome: discriminating
  query: consultation-map entry 2 read prescription — survey lessons/architecture headline-first before writing a record that claims evidence about a consultation.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/claude-code-ops.md:1-67`
  request_id: 08784dd0-4634-4539-a11e-c5259c9a6b13
  outcome: discriminating
  query: consultation-map entry 1 read prescription — survey lessons/claude-code-ops headline-first before a diff whose prose matches the check-infrastructure boundary.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/testing.md:1-157`
  request_id: 5fcb7c8c-e394-424b-98f2-1dafc7c66342
  outcome: discriminating
  query: consultation-map entry 1 read prescription — survey lessons/testing headline-first before a diff whose prose matches the check-infrastructure boundary.

**One receipt below is carried from the v2 sitting rather than newly read, and
that is disclosed rather than left for a reader to detect.** `7f74c874` on
`gloss/lessons/knowledge-architecture` was performed **at the v2 sitting**
(kogaki#169), and the served pin has **not moved since** — it is
`0cb46066653ef3db2e33f69971829d25c06b6507` there and here. It is reused for
the same reading, at the same pin, so §9.1's "one query, one reading, one
request_id" invariant holds; what would breach it is reusing an id for a
*different* reading, which is the `e6abb4ef` defect §5 corrects. `c1260d67` is
the read performed **for this amendment**.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/articles.md:4,121`
  request_id: c1260d67-aa98-4463-8511-f063f2e79443
  outcome: discriminating
  query: topic_thread("articles") — after the sweep, does the served article-design thread carry the 2026-08-06 Move adoption, what is its newest actual decision line, and what date does its frontmatter claim?

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9,11`
  request_id: fdea0642-fc3c-46ac-a63a-63b3a7cad0b4
  outcome: discriminating
  query: topic_thread("knowledge-architecture") — what does a held or parked item owe its trigger, and is `instrument: none` written or omitted?

**Entry 1 matched on the word "check" in changed prose again**, as it did for
v1 (§7.4), and the prescribed read was performed rather than waived. This
spec still touches no file under `checks/` and still registers no check; §6's
no-new-check clause is unchanged by v2.

### 9.2 The served surface moved mid-sitting, and the pins were re-read

**Recorded because a re-read that is not written down is indistinguishable
from an assumption.** kogaki#169's pins were taken at
`product-lab@f918c515`. During this sitting the served pin advanced to
`product-lab@0cb46066653ef3db2e33f69971829d25c06b6507`, and
`issue-pins.mjs --recheck` **refused with the delta**, exactly as designed:

> `policy moved: issue pinned f918c515…; served is product-lab@0cb46066…`
> `the lane refuses with this delta: re-read the pinned lines at the current pin before proceeding`

The re-read was performed and the delta resolved:

- `topics/articles.md` gained a header date change and **one new decision
  line** (a 2026-08-05 entry re-pointing the semantic-subdivision offering
  measurement to Kogaki), taking the thread from 126 to 127 lines. Every line
  this amendment relies on is **content-identical**, displaced by exactly
  **+1**: `:13`→`:14`, `:41`→`:42`, `:74`→`:75`, `:120`→`:121`.
- `gloss/lessons/knowledge-architecture.md` is **unchanged**: `:203` and
  `:257` carry the same text at the same numbers.
- **The Move adoption still has not landed**: the thread at the new pin
  contains zero occurrences of "Move", "Moves", or `moves/`. §7.6's pin gap
  and §7.0's stale-consult diagnosis both hold at the **current** pin, not
  merely at the one #169 was filed against.
- **But the frontmatter now says otherwise** (kogaki#179). The header at
  `:4` reads `updated: 2026-08-07`, while the **newest actual decision line
  is `2026-08-05`** and the adoption is absent. The counts, taken over the
  whole 127-line thread rather than sampled: `Moves` 0, `Move ` 0, `moves/`
  0. So the surface's freshness signal is **two days ahead of its own newest
  decision**. §7.0 records what follows from that; it is noted here as a
  measurement because this section is where the measurements live.

**A note the displacement earns.** That a one-line insertion moved four of
this spec's citations is the served defect
`bind-references-to-identities-not-positions`
(`gloss/lessons/architecture.md:149@0cb46066653ef3db2e33f69971829d25c06b6507`;
receipt at §9.1) happening to this document: a reference pointing at a
position is "a defect waiting for its date". v2 therefore names the **section
heading or lesson slug** beside each line number wherever it adds a citation,
so the identity survives the next insertion. v1's existing citations are left
at their original pin and numbers — they are records of reads that happened,
not claims about the surface today, and rewriting them would destroy that.

**Not repaired here:** the spec's older `f918c515` citations are not
re-pinned wholesale. That is a corpus-wide reference-hygiene question larger
than this amendment, and silently re-pinning historical receipts is the
opposite of what §7.0 is for.
