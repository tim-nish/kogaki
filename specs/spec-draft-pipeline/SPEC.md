# SPEC-draft-pipeline — the Brief's composed structure: Thesis, Strands, and the step sequence

**Status:** v26, re-cut 2026-09-03 (kogaki#784) under kogaki#743's four
criteria. No clause is amended by the re-cut: what left was carrier-held prose,
version narrative and ratification quote-trail. **Governs** port manifest item
2 — its structure half.

## What this file is for, and what it is not

No runtime reads this file. The Brief and Draft lanes are driven by their own
carriers — `src/compose.mjs`, `src/brief.mjs`, `src/assemble.mjs`,
`src/draft.mjs`, `src/packet-template.md`, `src/specialization-schema.json`,
`src/gate-registry.json`, `specs/move-extraction-contract.md` and the registered
checks — and where one of those decides a question, this file points at it and
does not restate it.

What is left is what no carrier can hold: semantic contracts, the conduct the
LLM owes at a judgment point, prohibitions whose violation is an absence, and
parked designs with their triggers.

**Every section carries a `necessity:` line** — the one reason it cannot live
in a machine carrier. A section whose reason cannot be stated is deleted.

**Section numbers are preserved.** Other carriers cite this spec by section —
`checks/registry.json`, `src/gate-registry.json`, the runtime modules and the
sibling specs — so the re-cut renumbered nothing. **A gap in the numbering is a
removed section, not missing text**, and every number another artifact cites
still resolves here.

**History lives in git and on the issues.** Version narratives, superseded
readings kept "so the supersession stays countable", defect specimens and
receipt trails were removed at the re-cut; `git log` and the issue threads hold
them. Where a superseded rule is still cited by another carrier, its section
number survives with one line saying where the current rule is.

**The current architecture, described from the implementation, is
`specs/spec-brief-draft-design/DESIGN.md`.** That record and this spec are not
duplicates: the record says what the built system *is*, this spec says what the
composition layer *must* be. Where they disagree the record describes and this
file binds.

`necessity:` the reading instruction for everything below, and the one section
whose subject is this file rather than the pipeline. A reader who does not know
the runtime ignores this spec looks here for behaviour and finds prose that no
longer matches — which is the state the re-cut removes and the one a later
amendment can restore.

## 1. Scope — what this pipeline may not import

This spec is authored here, fresh. It is **not** a port of writing-assistant's
Brief, and `specs/spec-terrain/SPEC.md`'s WA baseline does not reach it: that
clause is scoped strictly to Terrain design, and a sitting citing it for a
Brief or Draft question is misusing it.

The owner's inheritance whitelist for this pipeline is exactly four items — the
Terrain → Brief pipeline idea, the way it reads Thesis and Strands, the policy
that Draft creation is driven by questions in a UI, and the CanonicalDraft and
Variant concepts. **Anything else enters only with a benefit named at
admission.** Items 3 and 4 are neither bound nor excluded here; this spec stops
at the Brief's structure and both live downstream of it.

`necessity:` a prohibition on importing. No carrier can hold the absence of an
inheritance, and a whitelist with four members is exactly the kind of boundary
a later sitting widens by convenience if nothing states it.

## 2. The four gates of manifest item 2

| gate | state |
| --- | --- |
| thesis | **bound** — §3 |
| journey incorporation | **bound** — Journeys are admissible step materials (§4), §4.8 binds arc integrity, and the register choice rides Candidate differentiation (§6.1). **No incorporation gate is registered, and none is owed.** |
| structure composed from the Brief's own state | **bound** — §4, §5, §6 |
| plain register with round-trip concessions | **bound** — `src/packet-template.md` carries the operational instruction the model reads at generation; `specs/spec-brief-draft-design/DESIGN.md` §4 carries its ground. The surface-shape half is §5.1.3. |

The Brief's **durable home** is decided at §5.3. Checkpoints and resume remain
manifest item 5's owed future.

`necessity:` a per-gate statement of what is bound and by which section. No
carrier holds the mapping from an admission record's promises to the sections
discharging them, and a gate believed bound is how a remainder stops being
counted.

## 3. The Thesis and the Strands are read, never invented

Thesis + Strands is the ratified article-design substrate; the Framework
family is retired at the generator.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:13`

The Thesis and the selected Strands arrive from Terrain's selection. **This
pipeline neither generates them nor re-opens the owner's selection.**

**The completeness rider follows the selected set into composition.** A
proposed structure places every selected Strand or discloses the omission, and
the count is taken **after** composition — because a composer that cannot omit
in principle can still omit in fact.

`necessity:` a boundary on what may be invented. Nothing in a Brief's bytes
distinguishes a Thesis read from Terrain from one the composer wrote, so the
rule cannot be a validation and has to be a stated prohibition.

## 4. A Step, the Move it binds, and what neither may be

**Two shapes, not one.** The Brief's structure section is a sequence of Steps;
a Step **binds** a Move from the library (§7). A Step and a Move are separate
types and **binding changes the type of neither**. A Step is *this article's*
sequence element, authored per article and discarded with it; a Move is a
durable, source-specific precedent that outlives any one article. Collapsing
them makes every Move an article's private property and every Step a library
entry, which is neither.

`necessity:` a type distinction with no runtime representation — nothing in the
records forces it, and the collapse is a convenience that reads as tidiness.

### 4.1 The Step — the Brief's sequence element

- **`step_id`** — the Step's identity within this Brief.
- **`move`** — a binding to a Move library entry (§7). **Required.**
- **`materials`** — which Strands, which Journeys, the Thesis, a
  `reader_assumption`, or `constructed_material` it works on. **Many-to-many**
  with Steps.
- **`purpose`** — what the Step does to the reader.
- **`reader_state_before`** / **`reader_state_after`**.
- **`depends_on`** — the earlier Steps whose conclusions this Step stands on.
- **`rationale`** — why *this article's* materials make this the next Step.
- **`introduces`** — optional; §4.13.
- **`bridges`** — optional; §4.11.
- **`opens_section`** — optional; §4.15.

**Why `move` is required.** `Step = Input + State`. The inputs are the Strands,
the Thesis and previous Step output; **the Move is the State**, and
`reader_state_before`/`after` are that framework's result. So `move` is not a
candidate carrier for some property that could be delivered another way — it is
what a Step is made of, and a Step without one has no defined reader-state
transition type rather than an undertested one.

The shape is enforced by `validateSteps` in `src/compose.mjs`, so a Move-less
Step is unwritable rather than discouraged.

**Reopen trigger.** The declined `move: none` arm — every Step declaring either
a library entry or a typed absence with a reason — costs nothing while no
untypeable transition has been observed. **The first genuine transition that
cannot be typed against the library, forcing a filler entry minted only to
satisfy the validator, re-costs that arm**, as its own fork, one instance,
never a silent skip.

`necessity:` the field list is enforced by a carrier; what is not is *why* the
Move is mandatory, which is a claim about what a Step is. Deleting the reason
leaves the requirement looking like an arbitrary strictness, which is how it
gets relaxed.

### 4.2 The Move library entry — the adopted field subset

`id`, `status` (`observed` | `generalized` | `proposed` | `validated`),
`intent`, `requires`, `effect`, `constraints`, `failure_modes`, `excerpt`.
Nothing added. The schema authority is `specs/move-extraction-contract.md`.

**Moves ↔ Strands are many-to-many.** A Move may bind no Strand, several, a
Journey, the Thesis, or an earlier Step's conclusion.

**Names describe, never generate.** A Step may carry a descriptive name,
written **after** the Step is composed: admissible in a Candidate's
*rendering*, inadmissible in the material that *produces* it. A `move` binding
is not a name read before a rationale — the rationale is authored from this
article's materials, and the binding records which durable precedent that
reasoning turned out to instance. **A composer that selected a Move first and
then wrote a rationale to fit it has generated from a name.** The order is the
invariant, not the vocabulary's absence.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:13`

**Deliberately absent from the Step's shape**, each because it would be the
generating half in another costume: any **adjacency table** of which Step may
follow which, any **fit rule** proposing a shape from the material, and any
`material_roles` typing of what a material is *for*. A stored flowchart is the
declined article-framework menu one level down.

`necessity:` the absent fields are the load-bearing half and no carrier can
hold an absence. The order invariant is invisible in the finished Brief, which
is exactly why §4.5 has to make it observable.

### 4.3 Reader Path is the ARTIFACT; the five blocks are the workflow

**Reader Path names the artifact only** — the ordered sequence of Steps inside
one Candidate. The workflow blocks have their own fixed names:

    path composition → Move binding → Candidate assembly → path review → Candidate selection

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:20`

**Every MUST below names the block that judges it.** A MUST with no named judge
is a rule with no occasion, and the occasion is the scarce resource. **Where
this spec states an obligation without naming its block, the obligation is
defective, not merely unhomed.**

A Strand may support multiple Steps and is never consumed by first use.

`necessity:` a vocabulary rule plus a self-binding completeness test. Nothing
executes "every MUST names its judge", and this spec has already failed it
against itself once (§5.1.1), which is the argument for keeping it stated.

### 4.4 The Step's grounding, and the `entailed` flag

A Step's grounds are **specific propositions**, each exactly one of: a
**Strand proposition** traceable to sentences in the material; a **named
earlier Step's effect**, naming which effect of which Step; or a **declared
reader assumption**, declared in the Brief and visible at Candidate selection.
Because a previous-Step ground names its effect the same way, **Strand-less
Steps are covered unchanged**.

**A proposition not explicit in the material is flagged `entailed`, with its
entailment reasoning exposed at the human gate** — entailment is
interpretation, judged rather than silently trusted.

**Semantic reconstruction is allowed**; the absence of a rhetorical label in
the source does not block a reading. **Unsupported completion is prohibited,
and the list is closed:** no facts or examples absent from the Strands, no
unstated causal mechanisms, no external material introduced to make a Move
applicable, no Strand meaning bent to fit a pre-selected Move, no
general-knowledge bridging. **A Move never creates or broadens the premise for
its own applicability** — the self-justifying case, which is the one a composer
reaches for under pressure.

**When information is unavailable there are exactly three moves — omit the
Step, revise the path, or leave the Strand unused** — and inventing material is
not among them. Judged at **path review**.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:17`

`necessity:` a closed list of prohibited inferences, each of which produces
well-formed output. No schema can tell a reconstructed reading from an invented
one; only a reader holding the material can.

### 4.5 The grounds test — the observable form of describe-never-generate

The composition order is **Strand information → concrete Step reasoning → Move
binding**, and the order is **invisible in the finished Brief**: a Move-first
and a grounds-first composition can produce identical text. So the invariant is
carried by a test on the artifact rather than by a claim about how it was made.

**Delete the Move name from the Step's rationale. If what remains does not
stand on its grounds, the Step was composed Move-first.** Judged at **path
review**.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:16`

`necessity:` the whole point is that the property is unobservable and the test
makes it observable. A carrier could not hold either half.

### 4.6 Every MUST is judgment, and nothing becomes a lint

1. **A review agent applies every MUST as judgment** — not a linter, not a
   schema check.
2. **The human gate approves results only.** An owner editing a Candidate line
   by line is composing, and the gate would become a second author with no
   record of the change.
3. **No rule becomes a lint, even where deterministic processing is possible.**
   Stated at its strongest deliberately: the semantic-economy removal test
   (§4.7) *looks* mechanizable, and this clause exists so it is never re-read as
   a lint waiting to be built.

**The three evaluation levels — local Move validity, transition continuity,
Thesis closure — are NOT licensed checks.** They survive only as reasoning
surfaced on Candidates at the human gate.

**Pin resolution of every claim remains the sole mechanical instrument on
grounding, and Moves must not dilute or compete with it.**
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:19`
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:11`

`necessity:` a prohibition on building machinery. Its violation is the
existence of a check, so the only carrier that could hold it is the absence of
one — and the pressure to add it arrives precisely when a rule looks decidable.

### 4.7 Semantic economy — what binds Move AUTHORING

- **One local transition** per Move.
- **The five-warrant sentence test.** Every sentence outside `excerpt` is
  warranted by exactly one of: the operation, the required prior reader state,
  the produced reader state, a valid-vs-invalid application distinction, an
  observable failure form. **A sentence whose removal changes none of them is
  removed.**
- **One proposition, one field.** A proposition appearing in two fields is a
  defect in both.
- **`excerpt` carries the observed reader movement and the article's title, and
  nothing else** (§4.13.1).
- **A failure mode never paraphrases a constraint**, and a Move never describes
  an article position, a sequence of Moves, a whole-article outcome, or the
  materials an article must supply.

**Reader states are article-specific propositions, never a global list**, and
the concrete before/after states live **only on the Step**. A Move carrying its
own before/after states is a global vocabulary growing quietly.

**Literature-derived Moves enter as `observed` or `generalized`, never
`validated`.** Promotion is a later act with its own grounds; an importer
admitting a Move as `validated` mints a judgment nobody made.

Judged at **Move ingestion's agent review** (§6.9) for a Move entering the
library, and at **path review** for a Move edited in place. **The removal test
is applied as judgment and is never mechanized** — §4.6 clause 3 exists for
this sentence specifically.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:14`
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:10`

`necessity:` an authoring discipline applied by a reader to prose. Every clause
is a judgment about meaning, and §4.6 clause 3 forbids the mechanization that
would otherwise be the obvious carrier.

### 4.8 Journey integrity — the arc, not the layout

- **A Lesson's claims and evidence project freely into multiple Steps.** No
  budget, no once-per-Strand rule.
- **A Journey may support multiple Steps and NEED NOT STAY CONTIGUOUS.**
  Adjacency is not what its integrity is made of.
- **The Strand's boundaries remain PROVENANCE.** They record where material
  came from and never dictate where it lands; one section per Strand is the
  source-shaped block §4.3 exists to dissolve.
- **The temporal and causal relations — initial understanding → turning point →
  outcome — are never reversed or severed.**

So the constraint is on the **arc**, not the layout: a Journey scattered across
four non-adjacent Steps in its own causal order is conformant; two adjacent
Steps that put the outcome before the turning point are not. Judged at **path
review**.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:18`

`necessity:` three permissions and one constraint, all about meaning. A layout
rule could be checked; an arc's causality cannot.

### 4.9 The analysis document — where observed sequences live

Recording observed sequences is ratified, and a Move's record may not hold
them. They get **one home**: `analysis/<source-slug>.md`, one file per source
passage, the slug the whole stem — mirroring `moves/<id>.md`.

**The interior is prose, and the prose is the point.** Headed sections of
source-specific precedent, no schema, no field set, no required ordering. **The
temptation is a table, and a table is the adjacency data §4.7 excludes wearing
a different hat.** There is no field for a sequence anywhere in this design,
including here — which is what makes a sequence structurally unable to migrate
into the Move schema.

**No INDEX and no regeneration contract.** `moves/INDEX.md` is regenerated
whole because every column is read off a file (§6.9.1a); an `analysis/INDEX.md`
would compose its rows rather than derive them. A reader finds these files by
name and by the pointers into them.

**A Move's `excerpt` may point at an analysis document, and the prose contains
the literal path.** Without the path the pointer leaves no trace, and a Move
that points is byte-identical to one that does not.

**Two shapes declined.** An appendix section inside each Move file — it puts
sequence content inside the schema file, which §6.9.0 condition 3 refuses. A
single repository-wide `analysis.md` — it overrides *per-passage* rather than
implementing it, and grows without bound toward the split already ratified.

**Stated residue:** nothing binds a source passage to its slug, so two sittings
analysing the same passage may produce two files where the design intends one.
Weaker than §6.9.1a's id collision, because no act computes it. A naming rule is
owed only once a second passage exists to disagree about.

`necessity:` a destination and a prohibition on structure. "There is no schema
here" is a property no schema can express, and a prohibition whose positive
destination does not exist is a prohibition waiting to be worked around.

### 4.10 Journey register — the gate this section used to bind is retired

**This section binds nothing.** The dedicated journey-incorporation gate it
carried was retracted by owner ruling; the obligations it held moved to §6.1,
where the four frozen composition requirements bind every composed Candidate.
The register choice is made by **selecting a Candidate** at the
Candidate-selection gate, and conformance is judged at **path review**.

**Journey register is contingent**: a Brief whose selected Strands carry no
Journey material has no register to differentiate on, and §6.1's MUSTs are
vacuous for it rather than violated by it.

**This repository ships ahead of the hub wording here and declares the
divergence rather than absorbing it.** The served line still sites the register
decision at a brief gate; the ruling that retracted the gate answers its
rationale rather than ignoring it, because Candidate assembly and selection are
themselves Brief-stage acts. The hub refresh is **owed, not done**.
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:87`
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:172`

`necessity:` a live divergence from a served line, which the served discipline
requires be declared in the artifact. The section number survives because other
carriers cite it.

### 4.11 The Bridge Step and the revise pass

Once the Thesis is decided and the Step sequence is being composed, a causal
gap between adjacent Steps is repaired by inserting a **Bridge Step**.

**An insertion contract, not a type.** A Bridge Step is an ordinary §4.1 Step
whose placement is constrained by its neighbours: its `reader_state_before` is
the predecessor's `reader_state_after`; its `reader_state_after` supplies what
the successor's `reader_state_before` requires; `depends_on` is updated across
the splice. It may use Strands or not, and bind a Move or not; where its
connecting claim is not traceable to Strand material it carries the flags every
Step already has (§4.4).

**`bridges` marks; it never constrains.** The placement constraints above make a
Step *well-placed*, and an ordinary Step is equally well-placed — so nothing in
them distinguishes an **inserted** Step from one composed in the first pass.
Insertion is a fact about the Brief's history, not about its shape, and a
disclosure computed from an unrecoverable fact must read it from a record. So
`bridges` is an optional array of exactly two Step ids, validated on
composition and carried through the recorded serialization. It mints no Move.

**No special Move class exists for a bridge.** A bridge-shaped Move enters the
library as an ordinary Move through §6.9 when a reference passage yields one.

**The Brief workflow never proposes or creates a Move.** `/brief` completes the
Brief from the **existing** library and the selected Strands; minting is not
this workflow's act. A transition typing against no entry raises §4.1's reopen
trigger rather than composing anyway.

**The revise pass.** After path review, per Candidate: a gap found in
transition continuity routes that Candidate **back to path composition**, where
the composer inserts a Bridge Step or discloses the gap as a §5.2 ledger entry.
The revised Candidate is **re-reviewed before assembly**. **The loop is bounded
at one revise round per Candidate**; a gap surviving it is disclosed and rides
to the gate, never re-looped.

**Routing a finding does not make an evaluation level a check.** Transition
continuity is observed inside path review's `evaluation_levels` area
(`src/review.mjs`) — there is no area by that name. The revise pass registers
no check member, computes no score and produces no verdict.

**Approval is post-hoc disclosure.** No per-Bridge question: each Candidate's
evidence at the existing selection gate carries its inserted bridges — how
many, between which Steps, and each bridge's reasoning. Three grounds:
per-Candidate machine-side work must never multiply owner questions; the flags
already expose every bridge's reasoning at the one gate that exists; and a
per-Bridge stop would be a default mid-workflow stop with no inspection need.

**deferred slot: `bridge-approval-shape`** — escalation to explicit per-Bridge
approval, if dogfooding shows bridges misbehaving. Owed on its own licensing
issue with choice, alternatives and receipt before any gate embeds it.

`necessity:` an insertion contract whose marking field is validated by a
carrier, and whose *reason* — insertion is history, not shape — is what stops
the field being deleted as redundant with the placement constraints. The
bounded loop and the disclosure shape are conduct at a judgment point.

### 4.12 The Step↔Move instantiation contract

A Step **instantiates** a Move: `move` names a record in the library (§7), and
the Step's `reader_state_before`/`after` are the **instance forms** of that
Move's `requires`/`effect`, specialized to this reader and these Strands. §4.1
makes the binding required; this section governs **the relationship the binding
asserts**.

**Two halves, carried by different machinery on purpose:**

| half | the question | who answers | where it is carried |
|---|---|---|---|
| mechanical | does the id resolve? | the runtime | a set-membership test over the library |
| judged | are the instantiated states consistent specializations? | the composing sitting | a typed record the runtime validates and never composes |

`necessity:` that the contract HAS two halves, and that which half a property
belongs to is not a matter of convenience. The table above is the division;
§4.12.1 and §4.12.2 each state why their own half sits where it does.

#### 4.12.1 The mechanical half — move id resolution

Every `move:` resolves to a record in the library. A path **cannot be adopted**
and `resolve` **refuses an existing Brief** with a dangling id; the refusal
names **the Step and the id**.

**Two seats, and neither subsumes the other.** Adoption stops a dangling id
entering a Brief. `resolve` stops a Brief whose **library moved underneath it**
— a Move renamed or withdrawn after composition dangles without the Brief
changing at all, so a Brief that passed adoption can fail at realization.
**One resolver, not two:** both seats call the same exported function.

`necessity:` two seats and one resolver. That neither seat subsumes the other
is a claim about when a library moves relative to a Brief, which no call site
states.

#### 4.12.2 The judged half — the specialization verdict

1. **A mandatory occasion with no skip**, at adoption — the act that writes a
   path into a Brief.
2. **A typed record the harness VALIDATES AND NEVER COMPOSES.** The carrier is
   `src/specialization-schema.json`. No default verdict exists, none is
   inferred from a Step's fields, and a missing record is a refusal rather than
   a blank to fill.
3. **A deterministic refusal naming the failing Step**, in the path's own
   order, **quoting the sentence the judging sitting wrote** rather than
   paraphrasing a judgment the runtime did not make.

**Why not path review.** Path review's output is reasoning surfaced for a human
gate — never a verdict, never a score — and `src/review.mjs` refuses any
verdict-shaped field by key. A specialization verdict recorded there would be
**unattachable by construction**. The judgment is sited where a verdict is a
legitimate output.

**The record is bound on both axes** — the **Candidate** it was composed
against, and per verdict the **Move** the Step binds. Without the first a
sitting judges the Candidate it likes and adopts the one it wants; without the
second a verdict certifies a relationship that is not the one in the Step.

**One verdict per Step, exactly, in both directions.** A short record is the
skip this occasion exists to prevent, arriving one Step at a time; a long one
means the record was composed against a different path than the one adopted.

**The vocabulary is closed and three-valued** — `consistent` | `contradicts` |
`cannot-determine`, exactly one passing. **`cannot-determine` is first-class,
not an escape hatch:** under a two-valued read an honest non-answer must render
as one of the two answers, and the value that absorbs it is the passing one. It
does not weaken the gate — it refuses exactly as `contradicts` does — and it
buys a refusal that says **which**, because an unjudgeable Move contract and a
contradicted one need different repairs.

**The judged half is rendered once, at composition, and is not re-derived at
realization.** `resolve` re-runs the mechanical half only; re-deriving the
verdict would be the runtime composing one, which clause 2 forbids.

**deferred slot: `specialization-judgment-and-path-review-ordering`** — where
the judgment point sits relative to path review's own pass. Not answered by
inference from this section; owed on its own licensing issue.

`necessity:` the split between what a runtime may decide and what only a
reading sitting can. The schema holds the record's shape; nothing but prose can
say why the verdict may not be composed by the thing that validates it.

### 4.13 The reader-knowledge ledger — `introduces` on a Step

A Step may carry **`introduces`**: the terms it puts in front of the reader for
the first time, each bare or with a one-line meaning anchor. Authored at Brief
composition, by the composer, like every other Step field.

The harness **derives** what a reader arriving at Step N already knows: the
union of Steps 1..N−1's entries. **Always computed, never stored** — a stored
copy would be a second answer to a question the path already answers, and would
be wrong the moment a Step moved.

**What the field buys.** An unintroduced term becomes **addressable**:
responsibility traces to the first Step carrying it, or to the Brief when no
Step does. That is a fact about the path, not a judgment about the prose, which
is what lets it be mechanical at all.

**First introducer wins, and that IS the addressability rather than a
tie-break.** A second declaration is not an error and is not dropped; it simply
moves nothing.

**One line per entry.** A term may contain a comma and its anchor almost always
does, so a comma-joined field cannot be parsed back. Write and read are one
round trip, asserted at both ends; a malformed entry refuses **naming the
Step**, on both sides, through one shared grammar.

**An empty ledger is a reading, never a failure.** The field is optional, and a
requirement would have refused the whole existing corpus rather than adding
anything to it.

**Shape only.** Whether a term is genuinely new here, whether its anchor
explains it, and whether the Step's grounds already carry it are judgments.
Nothing in this section reads meaning.

`necessity:` that an unintroduced term is ADDRESSABLE — a fact about the path
rather than a judgment about the prose, which is the property that lets any of
this be mechanical. §4.13.1 states the exemplar predicate's own reason.

#### 4.13.1 The Move exemplar predicate — the `excerpt` field

A record's **`excerpt`** is **the author's own account, in a few lines, of the
specific reader movement they focused on when they identified the Move** — what
the passage establishes, what it then shows the reader, where the reader ends
up. It is **not a verbatim quotation**: a Move derived at a meta level from a
long article is not served by that text sitting in the record, and a verbatim
requirement lowers the excerpt's value rather than raising it. What a later
writer imitates is the **movement**.

**A record whose `excerpt` carries text IS an exemplar.** A record whose
`excerpt` is empty cannot serve as a Packet exemplar, and the Packet renders a
**stated absence** naming the Move and the repairing act while **substituting
nothing**. A `sources` key surviving beside `excerpt` is a design error and the
compose check fails it by name.

`necessity:` §4.13's derivation is carried by `src/compose.mjs` and asserted by
the registered checks; what no carrier holds is why accumulation may not be
stored, why the first introducer is the answer rather than a tie-break, and
what an excerpt is *for* — which is what stops it drifting back to a quotation.

### 4.14 The Step Packet

The **harness-assembled input from which the model realizes one Step's prose** —
the one LLM judgment of the Draft lane. `draft.mjs packet --step <id>` renders
it; the session realizes the prose; `section` validates it.

**RENAMED FROM "THE SECTION PACKET" (kogaki#825), and the rename is recorded
rather than left to a reader who remembers the old heading.** §4.15 makes
*Section* a **grouping of Steps**, so an artifact rendering exactly one Step was
a per-Step packet named for a grouping — in a served spec heading, in a
registered member's admission record, and at the top of the template the model
reads. The rename lands at **every** site carrying the proper noun in one act:
this heading, `specs/spec-brief-draft-design/DESIGN.md` §2.1 and §3,
`checks/registry.json`'s `draft-runtime` contract, `src/draft.mjs`, and
`src/packet-template.md`. **A subset was refused**: renaming the served heading
without the registry contract that quotes it would put two names on one artifact,
which is the defect one level worse than the one being fixed.

**THE `section` SUBCOMMAND KEEPS ITS NAME, and that is a decision rather than an
oversight.** `draft.mjs section` accepts one Step's realized prose, so after
§4.15 its name reads as the grouping it does not handle. It is retained because
it is an **entry point**, not prose: `checks/registry.json`'s kogaki#815 clause
couples the Harness's entry-point set to `.claude/skills/draft/SKILL.md` **in
both directions**, so moving it moves the CLI, the skill and a registered
member's admission record together — an act whose licence is not "the Packet
names its Section". The retention is recorded here and in the skill so a reader
meeting the mismatch finds a decision rather than a leftover; renaming it is
available later on its own licence.

**The Packet is the model's ENTIRE input.** Nothing outside it is read, which is
why every block opens with a **fixed usage header** saying what the block is
for: a block whose use is not stated gets used for whatever it resembles. The
exemplar fails worst — read as content rather than as form, it hands this
article another article's subject matter — so its header says so in the
imperative.

**Block order is fixed**, heavy prose late and the instruction last: global
anchors → the Move's contract → the Step's fields → the §4.13 ledger → every
previously realized Step's prose in recorded order → the write instruction.

**`requires`/`effect` are EXCLUDED**, and the exclusion is the ruling rather
than an omission: §4.12 makes the Step's `reader_state_before`/`after` the
instance forms of exactly those two fields, so rendering both would put the
general and the specialized statement of one thing side by side and leave the
model to choose. The Step's instantiated states win.

**Deterministic** means the same inputs render the same bytes: no timestamp, no
run id, and prior Steps' prose in the **Brief's recorded order** rather than from
a directory read.

**A missing input refuses BY NAME rather than rendering an empty slot.** In an
input that is the model's whole world, a hole is not a gap the model notices —
it is a hole the model fills by invention.

**Stored exactly as served**, overwritten on re-render, with path and sha
recorded in the run record **and** announced on stderr. Those are two acts, not
one: a print is read by whoever is watching, a record by whoever comes after.

`necessity:` the renderer is the carrier and this section does not restate it.
What no carrier holds: why the Packet is the model's entire input, and why an
absence must refuse rather than render.

#### 4.14.1 The template is a runtime-read carrier, and it points at no spec

`src/packet-template.md`, read at generation like `report-format.json` and
`workflow.json`. **Template content is operational text only** — rules that
change model behaviour at generation, kept minimal, a rule entering only with
demonstrated runtime effect.

**It carries no pointer to any specification**, asserted against **both** the
template and the rendered Packet, because a filled slot could carry one in.
Design principles about the template live in
`specs/spec-brief-draft-design/DESIGN.md`, never here.

**Two clauses live in the template rather than in a spec** — the operational
plain-register definition and the round-trip instruction. Both are operational,
so the file the model reads is where they belong.

`necessity:` the template is the carrier and this section does not restate it.
What no carrier holds: why the Packet is the entire input, why an absence must
refuse rather than render, and why the template may not cite a spec — each a
claim about what the model will do with a surface, which only a reader can
judge.

### 4.15 The Section — a grouping of Steps, declared on `opens_section`

**A Step is one unit of realization; a Section is one promise to the reader that
the question changes here.** They are different units, and binding the heading to
the Step produced both drafts the owner rejected on 2026-09-03 — one heading per
Step read as fragmented, none read as unscannable. A **Section is a grouping of
Steps declared in the Brief**: the Harness renders one heading per Section and
none inside it.

**The carrier is `opens_section: <title>`** on the Step that opens a Section,
absent on a Step that continues one. One key, not two: its **presence** marks the
opening and its **value** carries the title. A separate `section_title` key was
declined at kogaki#822 because two keys can disagree — a Step opening with no
title, a title on a continuing Step — and neither state has a meaning.

**Filled at composition, validated at composition.** Judging which Steps open is
composition-time judgment and belongs where the Steps are already judged: the
Brief. The four rules below are the Harness's **validation of that judgment**,
not a second judge — so a Brief that opens a Section on every Step, or on none,
is refused **naming the rule it broke and the Step**.

**THE SITE IS COMPOSITION, NOT `mint`, AND THE CORRECTION IS RECORDED RATHER
THAN MADE SILENTLY (kogaki#822).** The 2026-09-03 owner ruling and kogaki#822's
acceptance both say *validated at `brief.mjs mint`*. That is not reachable:
`mint` consumes the adopted (Thesis, name) pair and writes a Brief **shell** —
its own output states that the Reader Path, coverage and obligations are filled
in later — so **no Step exists at mint for any rule to read**. The Steps arrive
at composition, where `validateSteps` (`src/compose.mjs`) already refuses every
other §4.1 and §4.13 shape, and that is where these rules run. Same class as the
rule-4 split below, one level up: a rule stated at a stage its subject does not
reach. The ruling's intent — refuse before the Brief is adopted, naming the rule
and the Step — is unchanged and is satisfied here; only the named act moves.

1. **A Step opens a Section when it changes the reader's question** — its
   `purpose` answers a question the previous Step did not pose, or its
   `introduces` (§4.13) names a term later Steps use.
2. **A Step continues the current Section when it develops the previous one** —
   its `depends_on` is the immediately preceding Step and its `materials`
   overlap that Step's.
3. **The first Step always opens.** A Section never closes on a Step that only
   sets up the next one, so a heading never lands on a transition paragraph.
4. **Length is a check, not the rule.** A Section running past roughly a display
   and a half of prose without a heading is refused with a request to split; two
   consecutive Sections that are each one short Step are refused with a request
   to merge. **Article length enters as a bound on the grouping, never as its
   reason** — the ordering is load-bearing, because a length rule promoted to the
   reason is a heading budget, which is the fragmented draft again with a number
   attached.

**RULE 4 SPLITS BY WHERE ITS PROPERTY EXISTS, and composition validates only
the half it can compute (kogaki#822).** The rule as ratified carries two clauses and they
measure different things:

- *"two consecutive Sections that are each one short Step"* — the **Step count**
  is a fact about the Brief, present as soon as the Steps are.
  **`validateSteps` refuses it**: two adjacent Sections holding exactly one Step
  each refuse with the request-to-merge, naming rule 4 and both Steps. The word
  *short* is dropped from the composition-time form deliberately — it qualifies
  prose that does not exist yet, and a check that guessed at it would be
  refusing on an estimate.
- *"a Section running past roughly a display and a half of prose"* — this
  measures **realized prose**, which the Brief does not contain. Mint cannot
  evaluate it and does not pretend to.

**A composition-time proxy was the declined alternative**, and the ground is this
section's own: a Step's `purpose` length predicts its realized prose length
weakly at best, so the refusal would fire on the estimate rather than on the
thing — which is the heading budget rule 4's last sentence exists to refuse,
arriving through the back door. The split is by **property type**, the shape
this repository's build governance already uses: a computable fact is carried
where it is computable, and a judgment stays where a reader can make it.

**deferred slot: the prose-length clause's carrier.** Where the length check
runs once prose exists — inside `emit`, inside `section`, or at review — is
**not decided here**, and it is deliberately not loaded onto kogaki#823, whose
licence is the renderer's Section headings and the frontmatter trace and says
nothing about a length refusal. Filling this slot is its own decision act on its
own licensing issue, with alternatives and a receipt, before any code embeds a
threshold. Until it is filled the clause binds the **composing sitting's**
judgment and no runtime, which is what it did before this amendment; what
changes is that the gap is now stated instead of being discovered by an
implementer reading rule 4 and looking for its check.

**This section is NORMATIVE and `specs/spec-brief-draft-design/DESIGN.md` §2.1
points at it.** The four rules were ratified there on 2026-09-03 and stood in
both documents at kogaki#822's pickup; a copy with no declared precedence and no
mismatch check is a defect this repository has already paid for elsewhere, so
the precedence is declared rather than left to two texts that can drift. DESIGN
§2.1 keeps the ruling's grounds — why Section is a unit at all — and this section
keeps the contract a validator and a registered check assert against.

**What this section does not decide.** How a Section title is *worded* is
composition judgment; this says a title exists and where it is declared, never
what it should say. Packet timing and location stay §3's and kogaki#809's.

**BUILT AT THIS HEAD, and the halves are still named separately because they
landed at different times.** The DECLARATION half landed at kogaki#822: the
field is admitted by `validateSteps`, the grouping rules above refuse at
composition, and `renderStep` serializes it. The RENDERING half landed at
**kogaki#823** — `parseBrief` reads `opens_section` back through the same
refusal the composition side applies, `emit` writes one `## <title>` per Section
at its opening Step, and the frontmatter trace carries the Step→Section mapping.
The round trip is whole.

**THE RENDERING HALF NEEDED A SECOND ACT, which the unbuilt note did not
anticipate and which is recorded because the note's own reading of the head was
wrong.** That note said `emit` "still writes one heading per Step". It wrote
**none**: `assembleBody` joined the realized prose, and the headings in the
2026-09-03 specimen were written **by the model into the prose**. So heading
authorship was **unowned** rather than misplaced, and *one per Step* described
one draft rather than a rule anything held. Writing the headings from
`opens_section` is therefore only half the repair; `section` must also **refuse
realized prose that carries a heading of its own**, or the count of headings
stays whatever the realization happened to produce. Both halves shipped
together at kogaki#823.

`necessity:` the four rules are a validator's contract and a registered check's
assertion target, so they need a site inside this spec rather than a pointer out
of it — §4.1 names every other optional field's own subsection and this field had
none. What no carrier holds: why a heading is a promise to the reader rather than
an artifact of how the text was produced, and why length is subordinated to the
grouping rather than standing in for it.

## 5. The Brief's centre, and the obligations ledger inside it

`necessity:` a container for §§5.1–5.3. The grouping is what makes the Brief's
centre readable as one thing rather than three fields and a file path.

### 5.1 The settled structure section

- **`reader_start`**, **`reader_target`**, **`opening_question`** — authored at
  **path composition**, per Candidate; land at **Candidate selection**.
- **`thesis`** — read from Terrain (§3), never invented here.
- **`sequence`** — the ordered Steps of §4.1.
- **`strand_coverage`** — per selected Strand: `used_by_steps`,
  `role_in_thesis`.
- **`unresolved_obligations`** — the ledger of §5.2.
- **`thesis_closure`** — `explanation`, `established_by_steps`.
- **`tradeoffs`**

`necessity:` the field list is carried by `src/compose.mjs`, `src/brief.mjs`
and `src/assemble.mjs`. What no carrier holds is which block authors which
field, which the subsections below state one at a time.

#### 5.1.1 The three reader fields, and the block that authors them

**The block is PATH COMPOSITION, per Candidate.** The three fields describe a
reader's movement, and a Candidate's Reader Path *is* that movement in ordered
Steps. So they are composed where the movement is composed, carried per
Candidate, and land at adoption beside `thesis_closure` and `tradeoffs`.

- **No new gate and no new check.** They ride the Candidate-selection gate §6
  already carries, as `journey_coverage` does.
- **Two Candidates may differ on the reader axis**, and the difference is
  composition information rather than noise: a Candidate that starts the reader
  somewhere else is a different article.
- **The fill pass is NOT the site**, and declining it was a decision. Filling
  from the composed Steps is simpler, and it lands the values *before*
  Candidates exist — so every Candidate would carry identical reader fields and
  the gate could not differentiate on them. **The mint was declined on a
  different ground:** a Thesis states a claim, not a reader's starting state, so
  deriving these three from the adopted Thesis would invent material its source
  does not carry.

**An absent value REFUSES at adoption as an unauthored field**, naming which
field is missing. It does not fill a default and does not render a typed
absence and proceed. The contrast with §6.1 MUST 1 is the argument: a Journey's
absence is a *fact about the served material*, which a composition sitting
cannot conjure; these three are the composer's own to author.

`necessity:` an authoring site and a refusal, both judgments about where a
value comes from. A default would satisfy every mechanical property here.

#### 5.1.2 The vocabulary guard's reach

`theses/<slug>/brief.md` is a tracked document the owner reads directly, and a
guard refuses spec-internal vocabulary in it. **It governs the composer's own
text** — slot captions, headings, the reader-facing definition, the frame. It
does **not** govern the adopted Thesis or the Strand material: display id, slug,
served cites, the survey pin, the Brief's own name.

**The layer argument, not a preference.** The rule is that *this codebase's*
vocabulary does not reach the owner. An owner typing their own Thesis cannot
break it — they are not this system — and neither can a served rendering quoted
at its pin. **The boundary is where this composer writes; past it, the text is
the owner's.**

`necessity:` whose text a guard reaches is a layer argument. The guard greps a
lexicon; it cannot tell the composer's words from the owner's.

#### 5.1.3 The owner surface is prose; the schema stays in the record

A schema may exist internally — **every owner-facing rendering is ordinary
prose**, and at minimum communicates the claim and its concession. Where a
schema-style presentation reaches a surface at all it carries **at most three
fields**; beyond that the presentation defeats natural line breaks and stops
being readable.

**Which governs is stated rather than left to the composer.** Prose governs
**everything composed FOR the owner**. The three-field bound is a **ceiling on
the other case** — a record-side presentation surfacing incidentally, which this
pipeline should be shrinking rather than authoring. A composer choosing between
them has already made an error: the choice is whether the surface is composed
for the owner, and it always is.

It binds the thesis-determination gate's options (§5.3), the
Candidate-selection gate's rendering (§6), and the minted Brief's own composed
text.

`necessity:` the field list is carried by `src/compose.mjs`, `src/brief.mjs` and
`src/assemble.mjs` and asserted by `checks/check-brief-compose.sh`. What no
carrier holds: which block authors which field and why, why a refusal rather
than a default, whose text the vocabulary guard reaches, and what shape an
owner surface takes — four judgments about authorship and audience.

### 5.2 The obligations ledger

The Brief carries **`unresolved_obligations`** so Thesis closure is readable at
the gate rather than reconstructed there. Every question a Step opens, every
analogy it introduces and every limitation it concedes is entered with the Step
that discharges it, each carrying **`introduced_by`** and **`discharged_by`**.

- **An undischarged obligation renders as undischarged.** It is a
  **disclosure**, never a refusal: nothing here blocks, and no machinery judges
  whether the discharge is good.
- **The Strand cover is counted in placements, after composition**, and an
  unplaced selected Strand discloses.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:75`

**The ledger is a section of the Brief document**, not a sidecar and not a
projection assembled at gate time. The same document carries the obligations and
the `thesis_closure` that must discharge them, so the gate reads one artifact
and a sidecar cannot drift from it. The entries are **authored judgments** —
"this Step opens this question" — not something a computation reveals from data
already kept, so they need a record and the record belongs where its consumer
reads it.

**There is no mechanical judge of any of this.** Composition quality is judged
at the human gate; Kogaki guarantees citations and the substrate guarantees
facts.

`necessity:` the field is in the record shape and the fill is carried by
`src/compose.mjs`; the siting argument is not. "Why not a sidecar" is the
question a later implementer asks, and the answer is a claim about drift that no
code expresses.

### 5.3 The durable home and the entry point

**The flow.** Entry resolves the settled Strand set (LessonDisplayIDs against
the survey record) → the **thesis-determination gate** → the **mint**.

**One gate, carrying a pair.** The gate presents each option as a **(Thesis,
slug) pair**: `enter` derives one slug per candidate and carries it in the gate
payload, and adopting an option adopts both halves. **There is no separate slug
question at any point in this flow.**

*A gate may carry a second decision class only if that class is separately
RENDERED and separately DECLINABLE* — a slug riding invisibly inside a Thesis
option would be a second judgment ratified with only the first actually asked.

- **Separately rendered.** The slug appears as its own visible element of the
  option — **the bare slug, never a `theses/` path** — because the option is
  already dense, carrying a Thesis, its concession and a name at once. It
  renders in the option **label**; the live shape is
  `src/gate-registry.json`'s `brief-thesis-adoption` entry, which this clause names
  rather than restates.
- **Separately declinable.** An owner who adopts a listed Thesis but wants a
  different slug says so **in the same one answer**; the adopt act takes the
  adopted Thesis and an optional slug override. **Declining the slug must never
  cost the owner the Thesis.** The free-form channel is the owner's own Thesis,
  taken verbatim, and its slug derives from it.

**The slug is thesis-derived and owner-decided**, which keeps SPEC-terrain
§12.2's no-machine-identity repair.

**Pre-Thesis state is machine-local run state.** The owner artifact begins
exactly when the first piece of substantive owner judgment — the Thesis —
exists. The home is a directory per Brief, `theses/<slug>/`, idempotent by slug
with a collision refusing, and the runtime is **creator, never editor**.

`necessity:` the gate's payload shape is in `src/gate-registry.json` and the flow
is in `src/brief.mjs`. What no carrier holds: the two conditions a merged gate
may not shed, and why declining a slug may not cost the Thesis.

#### The invocation completes the Brief

**A command is named for the artifact it completes, and it runs until that
artifact is complete.** One invocation drives the whole arc — entry, the thesis
gate, the mint, path composition, path review with §4.11's revise routing,
Candidate assembly, the Candidate-selection gate, adoption — and ends only at a
**filled** Brief, or at an owner answer that ends it.

**A human gate is not a stop.** What is abolished is the **default** stop.

**A mid-workflow stop is legitimate only when NAMED, and only on an
inspection-need** — a point where the owner must leave the conversation to read
another surface before the next gate can be answered honestly. **This flow has
no such point**, and both gates are answerable from what the runtime renders
into them. A later sitting that finds one adds the named stop there, with its
ground; it does not restore the default.

`necessity:` the gate's payload shape is in `src/gate-registry.json` and the flow
is in `src/brief.mjs`. What no carrier holds: the two conditions a merged gate
may not shed, why declining a slug may not cost the Thesis, and why a
mid-workflow stop needs an inspection-need — all conduct at an owner surface.

## 6. Candidates ride the existing gate — no new carrier, no new check

Two to three **Candidates** per article, differing in **reader experience**,
presented on the carriers this repository already ships: the record shape,
Where/Why and the effect-stating label (`specs/spec-proposal-contract/SPEC.md`),
and the declared gate registry and selector affordance
(`specs/spec-gate-carrier/SPEC.md`).

**No gate is registered by this spec and no check is registered by this spec.**
A new check would owe an admission record, a removal signal and a typed
observing instrument, and a check admitted ahead of its subject is the shape
this repository refuses.

Each Candidate carries, **as its evidence at the gate**, the composition-time
reasoning: Step validity, transition continuity, Thesis closure, the obligations
ledger's state, and the Strand placement count. **Reasoning surfaced for the
owner, never an automated verdict** — the evidence is what the owner reads, not
what a checker passed.

**The premise's negation is a first-class option**: the composing premise is
that the Thesis and the selected set support a structure, so the option set
carries "none of these — the Thesis or the selected set is what should change",
flagged `negates_premise`. **The free-text channel does not discharge it.**

`necessity:` two prohibitions on minting carriers, and a rule about what an
option set must contain. A gate registry can hold the gate; nothing can hold
the decision not to register a second one.

### 6.1 Journey register is an axis of Candidate differentiation

**Candidates differ in reader experience, and journey register is one of the
ways they differ.** This is where §2's incorporation obligation is discharged —
by differentiation Candidates already carry, not by a gate of its own. **There
is no register vocabulary and no standing menu**: Candidate composition
inspects *this* Brief's state and composes what fits *this* article.

**The four frozen requirements bind every composed Candidate, not a favoured
one:**

1. **Place every selected member's journey material, or disclose the
   omission.** A Candidate that silently drops a selected Strand's Journey
   material is non-conformant; one that places none of it and says so is
   conformant.
2. **Cite the served arc at the pin** — the Strand's Journey rendering, at the
   Brief's own pin, never a paraphrase.
3. **Honor the ARC-SHAPE FLOOR: before-position → what broke → after-position,
   never rule-statement register.** A Candidate that flattens an arc into a
   rule statement is not composable, whatever its other merits.
4. **Enumerated, never ranked-and-trimmed, and free text wins.**

**Vacuous, never violated, on a Brief with no Journey material.**

**Judged as judgment, never as a lint.** Conformance is read at **path review**
(§4.8's arc clauses, per Candidate, as `src/review.mjs` runs them) and surfaced
to the owner as reasoning per §6's evidence rule.

`necessity:` four composition MUSTs applied to prose by a reader. The arc-shape
floor in particular is a judgment about register that no grammar decides.

## 6.9 Move INGESTION — how a Move enters the library

Input is a **free-form file the owner writes**, conventionally carrying a
`.md` extension. **It is not markdown**, and §6.9.0's grammar refuses markdown
constructs by name: the extension is the owner's filing convenience, not a
promise about the interior. A command reads it and
proposes each Move in exactly §4.2's eight-field schema, stripping the excluded
draft fields. An **agent review** applies the authoring discipline as
**judgment**: one transition not an arc, separable from content, an id naming
the operation in established terms, effect differing from requires, statable
invalidity, dedupe against existing ids (a near-duplicate proposes an amendment
rather than a new entry), honest `status` (**`validated` is never assignable
here**), and an excerpt naming real passages with no fabricated citations. Then
**one accept/decline question**: per-Move accept / decline / free-form, the owner
deciding. Accepted Moves land one file each in `moves/`, and the command
regenerates `moves/INDEX.md`.

**ADMISSION IS THE OWNER'S ACT AT THAT QUESTION, never the command's.** Review may
split or rename, so the reviewed proposal is not the authored file — nothing
self-admits.

`necessity:` the review criteria are judgments about a record's prose, and the
admission boundary is a rule about authority. A tool that admitted its own
proposals would satisfy every mechanical property this spec states.

### 6.9.0 The input grammar

**A record begins at a column-0 `id:` key and runs to the next one or to end of
file; each record is parsed as a YAML mapping under the four conditions below.**
Markdown constructs are **not required** — the `.md` extension is the owner's
filing convenience, not a promise about the interior — and they are **refused
wherever a grammar can see them**.

**`id` MUST be the record's first key.** A record written with `status:` above
`id:` is not seen as a boundary at all: it is absorbed into the record above,
which silently acquires the wrong `status` while the record below loses its own.

**Four conditions admit a record. Together they leave exactly one quiet failure,
which condition 4 names and bounds rather than claiming away:**

1. **Nothing precedes the file's first `id:`.** Any leading text is refused,
   naming the line. This is the condition that catches an out-of-order *first*
   record, which no per-record check can see.
2. **Duplicate keys within a record are refused rather than resolved.**
3. **After the strip step, a record carries exactly §4.2's eight keys — no more
   and no fewer.** The ordering matters: the excluded draft fields are stripped
   **first**, so their presence routes to the strip step rather than to a
   refusal. A record that absorbed its neighbour's `status` leaves that
   neighbour with seven, and this condition catches it.
4. **A markdown construct anywhere in the file is refused, naming the line.**
   The bounded blind spot: **a bullet among the items of a legal block sequence
   is indistinguishable from data**, and no grammar can see it.

**Why condition 4 is a rule rather than a parser behaviour.** A mid-file list,
fence, `---`, `***` or blockquote breaks a YAML parse loudly, but `#` is YAML's
**comment character** — a markdown heading at column 0 terminates the preceding
folded scalar and is read as a comment: silently discarded, no error, no line
named. Records on either side are both admitted and the heading vanishes. So
the failure mode is stated here and made uniform, rather than inherited from
whichever parser is in use.

`necessity:` a grammar the tool implements, and four conditions plus one named
blind spot that the tool's behaviour alone does not disclose. The comment case
in particular is invisible in every artifact it corrupts.

### 6.9.1 The file interior — the §4.2 block IS the file body

The eight fields render as a **structured block as the file body**, and
`moves/INDEX.md`'s row derives mechanically from those same fields.

**The declined arm, with its real cost.** Headed prose sections per field are
friendlier for fields that are genuinely paragraphs, and keep the artifact
unmistakably a *document*. Declined because the INDEX row would then be
**composed rather than derived**, so INDEX and files could drift; and because a
**missing field is invisible** in prose — an absent heading reads as a stylistic
choice where a block leaves a hole.

**The selected arm's own cost is stated rather than discovered:** long fields
read poorly as block scalars in a library a human is expected to *read*, and a
structured body invites the reflex to treat it as machine-authoritative — one
step from the verdict machinery §7.5 excludes. **Nothing here makes the block a
verdict surface.**

`necessity:` a form selection with both arms' costs stated. Neither cost is
recoverable from the shipped form, and the declined arm is the one a later
reader proposes again.

#### 6.9.1a What that entails

**The file body.** The eight fields in §4.2's order as a YAML mapping,
byte-identical in form to the block the owner authored — which is what makes
normalize over a conforming input close to identity. No fence, no `---`
delimiters: front-matter delimiters imply a document below the metadata, and
here the block **is** the document.

**The filename.** `moves/<id>.md`, the `id` field as the whole stem —
**derived, never composed.** A review that renames a Move renames its file, and
nothing else has to agree because nothing else stores the name. Two accepted
Moves cannot share an `id`; the collision surfaces at the accept/decline question as
the dedupe judgment §6.9 already assigns to review, never as a silent
overwrite.

**The INDEX row.** One row per file sorted by `id`, carrying `id`, `status` and
`intent` — **every column read off a file, none composed.** That is the
property the declined arm could not have, and it is why the regeneration
contract binds **freshness only**: INDEX is rewritten whole at each ingestion
run, and a stale INDEX is a run that did not happen rather than a derivation
that drifted. **Nothing reads INDEX to decide anything.**

`necessity:` a form selection with both arms' costs stated, and a derivation
property (`every column read off a file`) that is the reason the regeneration
contract can be as weak as it is. Neither survives in the tool.

### 6.9.2 Constraints inherited, not restated

No Recipes and no retrieval-index applicability blocks; no adjacency or
material-role fields; no verdict machinery and no lint; no Probe and no
mechanical evidence resolution. Quotation from served renderings at pins remains
the boundary, and pin resolution stays the sole mechanical instrument on
grounding.

**The proposal listing is SHOWN, before the accept/decline question**, and it is
not written to a file (owner ruling 2026-09-04, kogaki#858). The artifact-delivery
rule this clause used to inherit rested on a premise the same ruling found false —
that output cannot reach the owner without a file or an owner-typed command — and
it went with the concept it was built on. One consequence survives it, because the
consequence was never about the vehicle:

- **The count line comes FIRST and is never suppressed.** The parsed-record
  count is the only instrument that can catch `1` where the owner wrote `22`,
  and it travels with the rendering wherever the rendering is read.

**"No verdict machinery" is a CONSTRUCTION constraint on this surface, not only
a prohibition:** the renderer makes a per-row verdict, score or status token
**unrenderable** rather than disallowed. The specimen is a shipped per-row
`judgment: clean` column — excluded by name and shipped anyway, because a
prohibition binds whoever writes the renderer and nothing bound the output.
Review owes **readings** and silence where there is nothing to say.

`necessity:` an inherited-constraints list whose value is that it is *not*
re-derived, plus one clause the inheritance does not cover — the owed tense —
which is what tells a reader which side of a spec-ahead-of-code interval they
are standing on.

### 6.9.4 `move-sources-derivation-vehicle` — REOPENED

    deferred-slot: move-sources-derivation-vehicle
    status: REOPENED (kogaki#548, 2026-08-19)

**The successor position.** A Move's `excerpt` holds **source text only** — what
text this Move came from, the passage it locates, the derivation it explains.
`git log moves/<id>.md` is the audit trail for when and from what batch a Move
was ingested. **No Source/Provenance schema distinction is defined**, because
nothing demands one.

**Three grounds, each independently sufficient**, for withdrawing the tool's
appended derivation string:

1. **Not source text.** It located no passage and explained no derivation — it
   recorded an ingestion event and a batch outcome. §4.7's rule already excluded
   it.
2. **Redundant with git.** The ingestion date, the batch and the source commit
   are all in version history.
3. **Mutation after acceptance.** The tool appended it *after* the owner
   accepted at the accept/decline question, so what landed on disk was not what was
   approved and the delta was never displayed. **Nothing may change a record
   between the owner's acceptance and the write.**

**What this does NOT touch.** §4.9's `analysis/<source-slug>.md` pointer is
**authored** into a proposal's own excerpt and reaches disk through the owner's
acceptance like every other field. What was retired is a tool writing into a
record after acceptance; what remains is an author writing source text.

**The carrier of ground 3 is mechanical:** `tools/move_ingest.py` asserts that
`save_accepted` writes every §4.2 field exactly as the owner accepted it.

`necessity:` a reopened slot with its successor position, and one general rule
— nothing changes between acceptance and write — whose violation is invisible
in the artifact, since the mutated record is well-formed.

## 7. The Move library

`moves/` and `moves/INDEX.md` are admitted. Moves are **source-specific
precedents** entering as `status: observed` — each records a move observed in a
particular source, not a generalization licensed across sources. Promotion to
`generalized`, `proposed` or `validated` is a later act with its own grounds.

`necessity:` the entry status is an authoring rule about what a record claims,
and "observed, not generalized" is a distinction no field validates.

### 7.1 Trigger

The reopen condition is the served declination's own.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:120`

`necessity:` a reopen condition owned by a served line. Carrying it here is what
makes §7.2's typed `none` a measured absence rather than an unexamined one.

### 7.2 `instrument: none` — typed deliberately, with the reason

**No act observes this trigger**, and both halves of that are measured rather
than asserted:

- **Not in kogaki.** No composed Brief or rendered article ships here, so there
  is no run to sign and nothing for a ledger to accumulate.
- **Not in product-lab.** The cross-run signature ledger the trigger names does
  not exist; the lookup that would have found it returned the trigger's own
  sentence and no ledger.

**The strength of an absence is the strength of the look**, so the look is
stated: the served response was `partial` and truncated, 20 lines rendered out
of 290 topic candidates. That is a well-aimed look that found nothing, **not an
exhaustive enumeration**. A reader who needs exhaustiveness runs
`topic_thread("articles")` and `topic_thread("knowledge-architecture")`.

**The nearest plausible-and-wrong instrument, named so nobody reaches for it
later: this spec's own §6 Candidates gate.** The trigger is a **cross-run**
property — structures, plural, shown to have untied rationale — and a
per-article gate observes one article's rationale and by construction cannot
observe a signature across runs.

**Consequence, stated rather than hidden: this trigger fires only if a human
looks.** An accepted cost, not an unnoticed one.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9`
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:41`

`necessity:` a typed `none` with its measurement. An absent instrument is the
one state no instrument can report, and an unchecked zero is false on the day
it is written.

### 7.3 What would have to exist

A **cross-run signature ledger**: an act recording, per composed Brief, which of
the article's own materials each Step's rationale tied to, read **across** runs —
so that "rationale untied to the article's own materials" becomes a quantity
something measures rather than an impression someone forms. It cannot be built
while the corpus is empty.

`necessity:` the shape of an instrument that does not exist. Naming it is what
stops the next sitting reaching for the plausible-and-wrong one.

### 7.5 The constraints that survive

- **No minimum sequence**, and **no obligatory opening shape.** Slot
  obligations manufacture the property they require.
- **No `compatible_previous_moves` / `compatible_next_moves` adjacency lists**,
  and **no `material_roles`.** A stored flowchart is the declined menu one level
  down.
- **Recipes cite-as-precedent, never retrieve-as-generator.**
- **`requires`/`effect` matching is judgment-class.** It is surfaced as gate
  evidence (§6) and **never type-checked**. **No machinery renders a verdict on
  whether a Move's requires are met** — §4.12.2's verdict is the composing
  sitting's, validated by the runtime and composed by it never.
- **The describe-never-generate boundary of §4 is untouched** by the library's
  admission.

**Mechanical kills are enumerated rather than capped at one.** A Move-less Step
is unwritable (§4.1); a dangling move id refuses at adoption and at `resolve`
(§4.12.1); a specialization record that is absent, mis-shaped or non-passing
refuses at adoption (§4.12.2). Pin resolution remains the sole mechanical
instrument **on grounding**, which is a narrower claim than being the sole
mechanical kill.

`necessity:` a list of things that must not be built, plus the boundary between
what a runtime may kill on and what it may not judge. Every member's violation
is the *existence* of machinery, which only prose can forbid.

### 7.6 The ~20 derived Moves and their excerpts

Roughly twenty Moves were derived in the 2026-08-06 consultation and entered as
`status: observed`. **Their excerpts name the book passages and source material
each Move was observed in, in prose.** A `path:line@sha` pin against the served
surface is **permitted and is not the act ingestion performs**: the derivation
pointer written at ingestion is prose provenance naming the passage, on the
corpus's own survival measurement — unpinned `file:line` citations broke
repeatedly where issue anchors survived every relocation.

**kogaki#177 is the carrier for backfilling those excerpts, and its own body
names the wrong act** — "backfill each admitted Move's `sources` with its served
pin". Under the ruled form the backfill writes prose, in the ingestion run that
saves each Move; an implementer following that text literally would write the
one form the owner declined.

`necessity:` a permission and a declined form that read identically in the
records. Nothing in a Move's bytes says which of the two a pin-shaped excerpt
would be, and the issue that discharges it currently says the wrong one.

## 8. Non-goals

Not in this pipeline: a Probe successor; mechanical evidence resolution;
automatic `requires`/`effect` judgment; a closed structure vocabulary or
framework menu; adjacency data in any form; a second style artifact.

`necessity:` an enumeration of what was decided against. Absence of code is not
evidence of a decision, and each of these has been proposed at least once.

## 9. Open, with triggers

- **`bridge-approval-shape`** (§4.11) — per-Bridge approval, if dogfooding
  shows bridges misbehaving.
- **`specialization-judgment-and-path-review-ordering`** (§4.12) — where the
  judgment point sits relative to path review's own pass.
- **`move-sources-derivation-vehicle`** (§6.9.4) — REOPENED; the successor
  position is recorded there.
- **§4.1's reopen trigger** — the first genuine transition that cannot be typed
  against the library.
- **§7.1's trigger**, whose instrument is `none` by §7.2 and fires only if a
  human looks.
- **The hub refresh §4.10 declares owed** — this repository ships ahead of the
  served wording on the register's siting.
- **§4.9's naming residue** — nothing binds a source passage to its slug; a
  naming rule is owed once a second passage exists to disagree about.

`necessity:` open questions are by definition in no carrier. Carrying them here
is what keeps a deferral from reading as a decision.
