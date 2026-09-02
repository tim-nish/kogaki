# SPEC-draft-pipeline — the Brief's composed structure: Thesis, Strands, and the step sequence

**Status:** v25, amended 2026-09-02 (kogaki#749) — **§4.14, the Section
Packet**: the harness-assembled input from which the model realizes one Step,
rendered deterministically from a runtime-read template that points at no
specification. `requires`/`effect` are excluded because §4.12 makes the Step's
instantiated states their instance forms; a missing input refuses BY NAME
because a hole in the model's entire input is one it fills by invention; prior
Sections render in the Brief's recorded order rather than the directory's.
**§4.14.2 records what is NOT built**: spec-style-contract's deletion waits on
kogaki#752, and the Packet's retention path waits on kogaki#750 — the two
operational clauses ARE harvested and that spec's §4 is reduced to a pointer,
so no duplicate stands.
**deferred slots minted by this amendment: none** — both remainders are unbuilt
halves with named blockers, not undecided forks.

**Status:** v24, amended 2026-09-02 (kogaki#751, owner ruling 2026-09-02) —
**the Move record's evidence field is `excerpt`, and an excerpt is the author's
own account of the reader movement, never a verbatim quotation.** Two
corrections to v23, both the owner's: (1) `Excerpt` does not mean a quoted
passage — a Move derived at a meta level from a long article is not served by
that article's text pasted into the record, and a verbatim requirement lowers
the excerpt's value; (2) the field the records carried as `sources` **was
already the excerpt** — the cleanup at kogaki#548 stripped the routing
contamination and left the author's account under the wrong name — so there is
no separate "source" information to preserve and no re-extraction to perform.
The field is **renamed** in the 22 records, the ingestion tool and the
contract; §4.13.1 and §4.13.2 are superseded in place; and a `sources` key
surviving in a record is a design error the compose check now fails by name.
Where older text below says `sources` of a Move record, read `excerpt` — that
text is retained as record, not edited. §4.2's list and §4.7's rule, the two
normative sites, are amended in place.
**deferred slots minted by this amendment: none.**

**Status:** v23, amended 2026-09-02 (kogaki#751) — **§4.13, the
reader-knowledge ledger**, and **§4.13.1, the Move exemplar predicate**,
transcribing the second pair of 2026-09-01 owner rulings. A Step may declare
`introduces`; the harness DERIVES `reader_already_knows` for Step N as the
union of Steps 1..N−1 — always computed, never stored — which makes an
unintroduced term addressable to the first Step carrying it, or to the Brief
when none does. A Move record without a verbatim `Excerpt:` cannot serve as a
Packet exemplar, and the block renders a STATED ABSENCE rather than
substituting the description. **§4.13.2 records what is NOT built**: the
re-extraction of the 22 existing records is unbuildable from this repository —
the source articles are neither in the tree nor served — and fabricating
excerpts is the one act the contract exists to prevent.
**deferred slots minted by this amendment: none** — §4.13.2 is an unbuilt
half with a named blocker, not an undecided fork.

**Status:** v22, amended 2026-09-02 (kogaki#747) — **§4.12, the Step↔Move
instantiation contract**, transcribing the owner rulings of 2026-09-01. A Step
instantiates a Move, and until now nothing checked any part of that
relationship: `move:` was parsed for `step_id` only, so a dangling id rode a
minted Brief until the Section Packet assembler failed on it mid-draft. The
contract lands in two halves carried by different machinery — id resolution is
MECHANICAL and refuses at adoption and at `resolve`; specialization is an LLM
JUDGMENT recorded in a typed record the harness validates and never composes,
at a mandatory occasion with no skip. §7.5's sole-mechanical-kill-criterion
rider is SUPERSEDED in place (it was already stale at v18) and its
judgment-class siblings stand unamended.
**The arc gains a stage, and it is stated HERE rather than by editing v19's
row**: `/brief` now drives entry → thesis gate → mint → path composition → path
review → Candidate assembly → Candidate selection → **the §4.12 specialization
judgment** → adoption. v19's status row below still names the eight-stage form
in the present tense and is NOT edited — this spec retains superseded text as
record, so a reader entering through the version record meets this line first
and finds the older row as the history it is. (PR #774 round 1 read the v19 row
as a live arc summary, which is the reading that makes stating the current form
at the top load-bearing rather than decorative.)
**deferred slots minted by this amendment: `specialization-judgment-and-path-review-ordering`.**

**Status:** v21, amended 2026-08-21 (kogaki#577) — **§5.3 v11's release
condition is recorded as FIRED.** The clause declared the option body a
try-one-first placement and pre-authorized the move to the label without
amendment; the condition fired at the 2026-08-20 dogfood and kogaki#567 made the
move, leaving this clause declaring a site the runtime no longer uses — while
`gates/registry.json` had been repaired to delegate its standing to exactly this
text. No amendment was owed for the move and none is claimed; what was owed was
the record. The clause names its carriers and asserts no reading of their state.
**The v11 status row below still reads "the slug renders as its own element of
the option body", in the present tense, and is NOT edited** — this spec retains
superseded text as record rather than rewriting it, so that row stands and its
PLACEMENT half is released at §5.3's separately-rendered bullet. A reader
entering through the version record, which is how an amendment record is normally
entered, meets this pointer rather than the retired site asserted as live.
**deferred slots minted by this amendment: none.**

**Status:** v20, amended 2026-08-20 (kogaki#566) — **the owner surface is
prose and the schema stays in the record.** §5.1.3 carries the owner's
2026-08-20 ruling at the layer that broke it: the thesis-candidate templates
emitted field-labelled frames, a double period and a semicolon-spliced run-on,
and the frame then rode the adopted Thesis into the minted Brief. Every
owner-facing rendering this pipeline emits is ordinary prose; a schema-style
presentation that does reach a surface carries at most three fields; the mint
records the adopted CLAIM and strips the gate's framing. Sited here rather than
in `specs/spec-style-contract/SPEC.md` §4 because that spec binds the protocol
of an owner-authored document and binds no authored clause. §4's three clauses (numbering as of v1; clauses 1 and 2 moved to `src/packet-template.md` at kogaki#749 — see §4.14.1)
reach this composer unchanged and are not restated. **deferred slots minted by
this amendment: none.**

**Status:** v19, amended 2026-08-20 (kogaki#522) — **`/brief` completes the
Brief.** The invocation drives entry → thesis gate → mint → path composition →
path review → Candidate assembly → Candidate selection → adoption, ending only
at a **filled** Brief or at an owner answer that ends it. There is **no default
mid-workflow stop**; the only legitimate stop is a *named* inspection-need, and
§5.3 records that this flow has none and why. **"Exactly one owner question" is
bounded to the pre-mint segment** and always was — the completed flow raises two
gates, thesis adoption and Candidate selection, and each blocks on its answer.
A human gate is not a stop: the workflow raises it and continues on the answer.

**Status:** v18, amended 2026-08-19 (kogaki#548) — **§6.9.4's FILLED slot is
REOPENED and `sources` carries source text only.** The ingestion run's
derivation pointer is retired by owner ruling on three grounds: it is not source
text (§4.7's own rule already excluded it), it is redundant with `git log`, and
it was appended AFTER the owner's acceptance so what landed on disk was not what
was approved. The reopen is licensed by §6.9.4's own clause returning its fork
to open on disagreement; the v1 fill is retained unedited. kogaki#417 D1's form
decision is MOOTED rather than reversed. §4.9.1's analysis-document pointer is
untouched — it is AUTHORED into a proposal and reaches disk through acceptance,
which is why retiring a tool's post-acceptance append does not reach it.

**Status:** v18, amended 2026-08-25 (kogaki#642) — **a Move is MANDATORY on
every Step, reversing v17's optional reading.** `Step = Input + State`: the
Strands, the Thesis and previous Step output are the inputs, the Move is the
State, and `reader_state_before` / `reader_state_after` are that framework's
**result** rather than the guarantee's carrier. v17 declined this arm by testing
`move` as a candidate *mechanism* for the no-filler *property*; the owner's frame
is **definitional** — what a Step is — so the served line v17 rested on was
applied to a fork it does not reach. That line's own instruction is why: "the
test is not whether the mechanism is named but what work the naming does, so
consult the rationale, not the phrasing", and for that the rationale is the
authority.

`consulted: product-lab@c2f4650f6a3f4fa39c562c2538ddbd01c68dd7b0 LESSONS.md:120`
  request_id: 18db2bd0-606e-4d27-bda1-5462442d4f92
  outcome: discriminating
  query: "When a rule names both a protected property and the mechanism
         delivering it, does that guidance apply to a definitional claim —
         where the disputed field is the definition of the object rather than
         a candidate carrier for a property?"

**The carrier is `validateSteps` in `src/compose.mjs`, cited here and restated
nowhere** (rider R1, owner selection 2026-08-25). The requirement binds at
composition, where a Move-less Step becomes **unwritable rather than
discouraged**; this spec names the seat and does not reproduce the check.

**The reopen trigger is named, because the declined arm's cost is currently
hypothetical** (rider R2). v17 declined `Step = Input + State` partly on library
pressure against a 22-entry library; the owner reports never having received
that pressure as a report, and this sitting found **no tracked Brief in the tree
at all**, so the cost has no instance. The trigger: **the first genuine
transition that cannot be typed against the library — one that forces a filler
entry minted only to satisfy the validator.** That instance is the evidence that
re-costs §7's `move: none` arm, and it comes back as **its own fork**, never as a
silent skip. Until it fires, minting a real entry under real pressure is the
library doing its job.

**Status:** v17, amended 2026-08-19 (kogaki#550, kogaki#551) — **the `move`
field stays OPTIONAL and §4.1 now names which half of that rule binds**, and
**`compose.mjs`'s `fill` CLI route is RETIRED.** The property protected is that
every Step effects a real reader-state transition; `reader_state_before/after`
plus path review are today's carrier, and the `move` binding is not and never
was. `fill` wrote a Brief's sequence bypassing §6's Candidate-selection gate,
so its output was a path nobody chose and nobody could decline; the exported
`fillBrief` composer is untouched.

**Status:** v16, amended 2026-08-19 (kogaki#524) — **the Bridge Step and the
revise pass.** A causal gap between adjacent Steps is repaired by inserting an
ordinary §4.1 Step whose before/after states are fixed by its neighbours — no new
type, no new field, and no special Move class. A gap found at path review's
`evaluation_levels` area routes its Candidate back to composition for **one**
bounded revise round, then re-review before assembly; a gap surviving it is
disclosed and rides to the gate. Approval is **post-hoc disclosure** on the
existing selection gate, never a per-Bridge question. **The Brief workflow
proposes and creates no Move** — a missing Move degrades a Brief and never blocks
one (§7.5). Routing a finding does **not** make an evaluation level a check:
`topics/articles.md:22` supersedes their entry into the registered check suite,
and `topics/articles.md:28` already ratifies *revise the path* as a remedy.
**deferred slots minted by this amendment: `bridge-approval-shape`.**

v15, amended 2026-08-19 (kogaki#537) — **the minted Brief's
vocabulary guard binds THIS COMPOSER'S OWN TEXT, and not the material it
carries.** The captions, headings and frame are guarded; the **adopted Thesis**
and the **Strand material** (display id, slug, cites, survey pin, Brief name)
are not. The rule being enforced is that this codebase's vocabulary does not
reach the owner, and a rule is enforced at the layer where it can be broken —
the composer. An owner typing their own Thesis is not this system leaking, and
neither is a served rendering quoted at its pin. **Measured at the decision:** 0
of 160 served lesson headlines trip the predicate, while §5.3 v11's free-form
Thesis path is live by design — so the guard's full-line reach could only ever
have fired on the owner's own words, at mint, after the one gate answer was
spent. **deferred slots minted by this amendment: none.**

v14, amended 2026-08-19 (kogaki#528, discharging kogaki#519) —
**RESOLVING a settled Strand's served rendering is not the Brief fetch §5.3
forbids.** §5.3's closed-set invariant governs GROWING the set; resolving the
material a member already names is not growth, and the two were conflated by
`composeThesisCandidates`'s own "never fetched" comment. Thesis candidates are
therefore composed from each member's **served Gloss rendering**, never from
its slug. **The Brief lane performs no seam read of its own**: terrain resolves
the renderings, bounded by the settled members' own tags, because terrain is
the one component that reads served renderings (§3, §9) — which is also why
attaching a rendering to every candidate at survey-generation time was REFUSED,
that being the whole-corpus prefetch §9 names. An unresolved rendering is
DISCLOSED with terrain's abnormal marker and never substituted with the slug,
and an unavailable seam DEGRADES rather than blocking a Brief, per the founding
rule that the substrate is an enhancer and never a dependency. **deferred slots
minted by this amendment: none.**

v13, corrected 2026-08-19 (kogaki#531) — **three corrections to
v12's own text, no decision reopened.** §5.1.1's refusal is renamed from
`unsupported completion` to an **unauthored field**: §4.4 owns the former and
defines it as material invented from outside the Strands, which is the opposite
act, so v12 labelled its refusal with a term meaning its reverse. The runtime
carrier is re-pointed from `story 1.77 under kogaki#521` — a story id resolving
to nothing in the tree, under an umbrella that closed at its own merge — to
**PR #532, merged as `0d008c8`**. And the transitional sentence naming that work
as pending is removed, since the merge falsified it. **deferred slots minted by
this correction: none.**

v12, amended 2026-08-19 (kogaki#521) — **§5.1's three READER
fields get their authoring block.** `reader_start`, `reader_target` and
`opening_question` were bound by §5.1 and written by no runtime; they are
authored at **path composition**, per Candidate, and land at **Candidate
selection**. An adopted Candidate carrying no value for one of them REFUSES at
adoption, naming the field, as unsupported completion. No precedent in this
spec prescribes that refusal and none is claimed: §6.1's nearby rule points the
opposite way and DISCLOSES, because an omitted Journey is a fact about the
served material, whereas nothing external withholds these three — an empty one
records that the composing act did not run. The runtime carrier is story 1.77
under kogaki#521, named rather than left to a report. This is §4.3's own
named-judge rule applied to this spec: an obligation stating no block is
defective, not merely unhomed. No field is added and no new gate or check is
registered. **deferred slots minted by this amendment:
`section-5-1-bare-name-fields`** — §5.1 leaves `tradeoffs` a bare name; it has
a writer, so it is not this issue's defect, and defining a bound field is a
decision act owed on its own licensing issue.

v11, amended 2026-08-18 (kogaki#518) — **§5.3's SEPARATE SLUG
APPROVAL is SUPERSEDED by owner ruling: one gate carries the (Thesis, slug)
PAIR.** No separate slug question exists. The thesis-determination gate
presents each option as a Thesis together with its derived slug; adopting an
option adopts both halves. v9's clause "the slug is one candidate derived
from the adopted Thesis, **presented through the question UI for approval**"
is retained below as a supersession record rather than edited away — what is
superseded is the SECOND ASK, never the owner's authority over the slug,
which the paired option and its typed override carry intact. The merge is
admissible only under the served constraint it is bound by: a gate may carry
a second decision class **only if that class is separately rendered and
separately declinable**, so the slug renders as its own element of the
option body and stays declinable without abandoning the option or restating
the Thesis. **deferred slots minted by this amendment: none.**

v10, amended 2026-08-18 (kogaki#492) — **§4.10's SITING is
SUPERSEDED by owner ruling: the journey register rides CANDIDATE
DIFFERENTIATION, not a gate of its own.** The register choice is no longer
decided at a dedicated Brief gate; Candidates already differ in reader
experience, and journey register is an axis of that difference. The
2026-07-31 frozen requirements SURVIVE unchanged, re-homed to **§6** as
composition MUSTs binding **every** Candidate. §4.10 becomes the
**supersession record** — it retains v8's reading rather than editing it
away, and names the served line it diverges from at its pin. §2 row 2 stays
**bound** and is re-pointed: no incorporation gate is registered, and none is
owed. Spec-only resolution; the runtime binding of the MUSTs into the shipped
Candidate composer is carried by **kogaki#501** rather than left as a
slot. **deferred slots minted by this amendment: none.**
v9, amended 2026-08-17 (kogaki#494) — **§5.3 is RE-SEQUENCED by
owner ruling: the Brief is minted at Thesis adoption, not at entry.** Entry
resolves the settled Strand set (refusals unchanged) → the
thesis-determination gate (kogaki#488) → the mint; the slug is **one
candidate derived from the adopted Thesis**, presented through the question
UI for approval with free-form override. Two grains of v7 are superseded and
the supersessions are stated in §5.3 rather than absorbed; the home grain,
the §5.1 typed-unfilled-slots interior downstream of the Thesis,
idempotence-by-slug, the closed-set invariant and creator-never-editor are
unchanged. **deferred slots minted by this amendment: none.**
v8, amended 2026-08-17 (kogaki#492) — **§4.10 binds the
journey-incorporation gate**, closing §2's item-2 gate table row 2, the one
"partial" standing since v1. The register choice is decided **at the Brief**,
after Thesis determination and before path composition; the option-composer's
frozen requirements are inherited from the served design and quoted at the
pin; the adopted register rides the Brief as a **disclosure, never a §5.1
slot**; the judges are named per §4.3's own rule (the gate itself; path
review via §4.8). Spec-only resolution — no implementation is scheduled by
this amendment; the gate's runtime enters when a run of the product surfaces
it, per the kogaki#127 promotion rule §5.3 already exercises.
**deferred slots minted by this amendment: none.**
v7, amended 2026-08-16 (kogaki#482) — **§5.3 lands the Brief's
durable home and its entry point**, discharging the absence §2 declared
deliberately ("manifest item 5's and is not decided here") on the first
run-surfaced demand (the owner attempting a Brief for a pulled report's
G1-1 and finding no entry point — the promotion condition kogaki#127's close
named). The home is a **directory per Brief** (`theses/<slug>/brief.md`,
tracked); the entry point is a **new `brief` skill fronting a runtime**,
outside Terrain, whose input unit is the `LessonDisplayID` and nothing else.
§2's durable-home paragraph is re-pointed rather than edited away.
**deferred slots minted by this amendment: none** (checkpoint/resume format
is item 5's remaining future and is HOMED, not designed — see §5.3).
v6, amended 2026-08-16 (kogaki#474) — **§6.9.2 gains the selection
screen's delivery binding by INHERITANCE**: `specs/SPEC.md` §2.5.3 now carries
the cross-surface rule that an owner-facing screen is delivered as an artifact
the mechanical half writes, and §6.9.2 cites it rather than restating it. What
is this section's own is named there and nowhere else — the artifact
`reports/MoveScreen.md` and the count-line-first rule — both written in the
**owed tense** with story 1.70 named as their carrier, since no code writes that
file at this head. §6.9.2's existing *"no verdict machinery and no lint"* is
re-read as a **construction constraint** rather than a prohibition: the renderer
makes a per-row verdict token unrenderable. No other section is touched and no
prior ruling is reopened. **deferred slots minted by this amendment: none.**
v5, amended 2026-08-13 (kogaki#426) — §2's item-2 gate table row 4
(plain register with round-trip concessions) moves from **not bound** to
**bound**: manifest item 6's carrier landed as
`specs/spec-style-contract/SPEC.md` (v1), and the row's v1 reading is kept
beside the table rather than edited away. v4, amended 2026-08-08 (kogaki#223) — **Move ingestion is
CONSTRUCTED against its first real input**: §6.9.0 binds the input grammar to
what the owner actually authored, §6.9.1 gains the file interior, filename and
derived INDEX row that fork (a) entails, §6.9.4 **FILLS** the named slot
`move-sources-derivation-vehicle`, and §7.6's pin prohibition meets its own
release condition. v3, amended 2026-08-08 (kogaki#220) — **the ratified Move
architecture is CONSTRUCTED**: §§4.3–4.9 add Reader Path as the artifact and
its five workflow blocks, the Step's grounding propositions and `entailed`
flag, the grounds test, path review's judgment-class ruling, semantic economy,
Journey integrity and the analysis document. v2.1, amended 2026-08-07 (kogaki#179 — the reversal record's
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

`specs/SPEC.md:4801-4803`

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

`specs/spec-terrain/SPEC.md:626-631`

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

| Item 2 gate | state |
| --- | --- |
| thesis | **bound** as design — §3 |
| journey incorporation | **bound** — Journeys are admissible step materials (§4), §4.8 binds arc integrity, and the **register choice rides Candidate differentiation** at §6, whose composition MUSTs carry the 2026-07-31 frozen requirements (v10, kogaki#492). **No incorporation gate is registered, and none is owed.** At v8 this row read "… §4.10 binds the incorporation gate itself"; at v1–v7 it read "**partial** — … the incorporation gate itself is owed". Both prior readings are kept here rather than edited away |
| structure composed from the Brief's own state | **bound** — §4, §5, §6; the load-bearing one |
| plain register with round-trip concessions | **bound** — `specs/spec-style-contract/SPEC.md` §4, which carries manifest item 6's re-homing (kogaki#426). The operational definition and the round-trip test are that spec's; this row's "with round-trip concessions" half is §4 clause 2 — **§4's clause numbering MOVED at kogaki#749** and this reference is repointed rather than left dangling: clauses 1 and 2 (the operational definition, the round-trip test) are OPERATIONAL and their carrier is now `src/packet-template.md`, which the model reads at generation; that spec's §4 keeps only their GROUND and clause 3. A reference to "§4 clause 2" therefore resolves to the template's round-trip instruction, and a composer that needs the text reads the template rather than the spec. **The SURFACE-SHAPE half is §5.1.3** (v20, kogaki#566): §4 binds the protocol of an owner-authored document and has no standing to say what this repository's composers may emit, so a reader tracing this gate reads both |

**Row 4 was re-assessed at v5 and again at v20, and row 2 at v8 and again at v10. Rows 1 and 3 carry
their v1 judgments unchanged and were not re-checked at either head** — the
column is named `state` rather than `v1` because two rows no longer hold a v1
value, and that rename asserts currency for the other two that nothing here
established.

**Row 4 changed at v5, and what it said at v1 is kept rather than edited
away (kogaki#426).** At v1 it read:

> "**not bound** — it consumes manifest item 6 (the style contract), whose
> re-homing kogaki#127 excludes from this sitting by name ("No new style
> artifact")"

That reading was correct for its own sitting: the row was blocked on an
absent carrier, and it named which one. kogaki#426 supplied the carrier —
`specs/spec-style-contract/SPEC.md` (v1) — so the row's stated precondition
is discharged and nothing about v1's judgment is retracted. #127's "No new
style artifact" is a prohibition on **proliferation**, never on the one
contract existing; the new spec ships **no authored style clause and no
second style artifact**, which is what keeps that prohibition intact rather
than overridden.

The Brief's **durable home** — where the document lives, checkpoints and
resume — is manifest item 5's and was not decided at v1: v1 describes the
Brief's structure section and says nothing about its file. **The home half
is decided at §5.3 (v7, kogaki#482)**, on the first run-surfaced demand;
checkpoints and resume remain item 5's owed future, now with a declared
home rather than an open siting question.

**The Move architecture is CONSTRUCTED at §§4.3–4.9 (kogaki#220).** Reader
Path as the artifact plus the five workflow blocks, the Step's grounding and
the `entailed` flag, the grounds test, path review's judgment-class ruling,
semantic economy, Journey integrity and the analysis document. **Every clause
there quotes its served line at a pin**, §4.8 included — its line is
`topics/articles.md:18@dec0d568`, read at round 2 (receipt at §9.1).

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
- **`move`** — a binding to a Move library entry (§7). **Required** (v18,
  kogaki#642): every Step binds one, and §7.5's no-mandatory-Moves rider is
  superseded by name there.

  **Why it is required, and it is not the property/mechanism reading returning
  (v18, kogaki#642).** `Step = Input + State`. The inputs are the Strands, the
  Thesis and previous Step output — any or all; the **Move is the State**, and
  `reader_state_before` / `reader_state_after` are that framework's **result**.
  So `move` is not a candidate carrier for a property that could be delivered
  some better way: it is **what a Step is made of**, and a Step without one has
  no defined reader-state transition type rather than an undertested one.

  **What v17 got wrong, recorded rather than silently replaced.** v17 read this
  arm as proposing `move` as a *mechanism* for the no-filler *property*, found
  that a Step can bind a Move and transition nothing, and declined on that
  ground plus library pressure. The first half tests a claim this arm never
  made. The served line v17 rested on says so itself — the authority is what
  work the naming does, and the rationale rather than the phrasing settles it:

  > "the test is not whether the mechanism is named but what work the naming
  > does, so consult the rationale, not the phrasing."

  `consulted: product-lab@c2f4650f6a3f4fa39c562c2538ddbd01c68dd7b0 LESSONS.md:120`
    request_id: 18db2bd0-606e-4d27-bda1-5462442d4f92
    outcome: discriminating
    query: "When a rule names both a protected property and the mechanism
           delivering it, does that guidance apply to a definitional claim —
           where the disputed field is the definition of the object rather
           than a candidate carrier for a property?"

  The no-filler property is **untouched** by this amendment: it still binds, and
  `reader_state_before` / `reader_state_after` plus path review still carry it.
  v18 adds a second, independent requirement rather than re-homing that one.

  **The carrier is `validateSteps` in `src/compose.mjs`** — cited, restated
  nowhere. It binds at composition, so a Move-less Step is **unwritable rather
  than discouraged**, and this clause names the seat instead of reproducing the
  check.

  **The reopen trigger** (v18, rider R2). The declined `move: none` arm — every
  Step declaring either a library entry or a typed absence with a reason —
  costs nothing today because the library pressure v17 weighed has no observed
  instance: 22 entries, no report of an untypeable transition, and no tracked
  Brief in the tree. **The first genuine transition that cannot be typed against
  the library, forcing a filler entry minted only to satisfy the validator, is
  the evidence that re-costs that arm** — brought back as its own fork, one
  instance, never a silent skip. Until then, minting a real entry under real
  pressure is the library working.
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
- **`excerpt`** — the author's account of the reader movement they
  observed when they identified the Move (v24; formerly `sources`, renamed
  2026-09-02 — §4.13.1).

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

### 4.3 Reader Path — the ARTIFACT, and the five workflow blocks

**Reader Path names the artifact only: the ordered sequence of Steps inside one
Candidate.** It is not a stage, not a process and not a workflow phase, and the
blocks that were loosely called by that name get their own fixed names:

    path composition → Move binding → Candidate assembly → path review → Candidate selection

> "Reader Path names the ARTIFACT only — the ordered sequence of Steps inside
> one Candidate — and the workflow blocks formerly lumped under that name get
> fixed names: path composition → Move binding → Candidate assembly → path
> review → Candidate selection. … the describe-never-generate order-invariant
> lives at the composition→binding boundary; each MUST in the design names the
> block that judges it. Prior loose Issue usage gets a pointing comment, never
> an edit."

`product-lab@dec0d568 topics/articles.md:20` (receipt at §9.1)

**Every MUST below names the block that judges it.** That is not
bookkeeping: a MUST with no named judge is a rule with no occasion, and the
occasion is the scarce resource. Where this spec states an obligation without
naming its block, the obligation is defective, not merely unhomed.

**Prior loose usage in Issues gets a pointing comment, never an edit** —
rewriting a filed Issue to match later vocabulary destroys the record of what
was actually asked.

### 4.4 The Step's grounding, and the `entailed` flag

A Step's grounds are **specific propositions**, each exactly one of:

- a **Strand proposition**, traceable to sentences in the material;
- a **named earlier Step's effect** — naming *which effect of which Step*,
  exactly as a Strand ground names its proposition;
- a **declared reader assumption**, declared in the Brief and visible at
  Candidate selection.

Because a previous-Step ground names its effect the same way, **Strand-less
Steps are covered unchanged** — the test below does not weaken where no Strand
is involved.

**A proposition not explicit in the material is flagged `entailed` on the Step,
with its entailment reasoning exposed at the human gate**, because entailment
is interpretation and is judged rather than silently trusted.

> "A non-explicit Step proposition is flagged `entailed` on the Step with its
> entailment reasoning exposed at the human gate, and reader assumptions are
> declared in the Brief, visible at Candidate selection — because entailment is
> interpretation, judged rather than silently trusted. Semantic reconstruction
> is allowed (the absence of a rhetorical label in the source does not block
> it); unsupported completion is prohibited: no facts or examples absent from
> the Strands, no unstated causal mechanisms, no external material to make a
> Move applicable, no Strand meaning bent to fit a pre-selected Move, no
> general-knowledge bridging — and a Move never creates or broadens the premise
> for its own applicability. When information is unavailable: omit the Step,
> revise the path, or leave the Strand unused."

`product-lab@dec0d568 topics/articles.md:17`

**The permitted and the prohibited are a pair and neither travels alone.**
Semantic reconstruction is *allowed* — the absence of a rhetorical label in the
source does not block a reading. Unsupported completion is *prohibited*, and
the list is closed as served: no facts or examples absent from the Strands, no
unstated causal mechanisms, no external material introduced to make a Move
applicable, no Strand meaning bent to fit a pre-selected Move, no
general-knowledge bridging. **A Move never creates or broadens the premise for
its own applicability** — the self-justifying case, which is the one a composer
reaches for under pressure.

**When information is unavailable there are exactly three moves — omit the
Step, revise the path, or leave the Strand unused — and inventing material is
not among them.** Judged at **path review**.

### 4.5 The grounds test — the observable form of describe-never-generate

The composition order is **Strand information → concrete Step reasoning → Move
binding**, and the order itself is **invisible in the finished Brief**: a
Move-first composition and a grounds-first composition can produce identical
text. So the invariant is carried by an observable test rather than by the
order:

> "The describe-never-generate order — Strand information → concrete Step
> reasoning → Move binding — is enforced through an OBSERVABLE GROUNDS TEST,
> because the order itself is invisible in the finished Brief: a Step's
> rationale must stand with the Move name deleted, on its grounds — a specific
> Strand proposition, a named earlier Step's effect, or a declared reader
> assumption. … The observable defect is a Step whose rationale cannot be
> stated without naming the Move — Move-first composition regardless of
> whether a Strand is involved."

`product-lab@dec0d568 topics/articles.md:16`

**The test: delete the Move name from the Step's rationale. If what remains
does not stand on its grounds, the Step was composed Move-first.** Judged at
**path review**.

This is the §4.2 rationale rule reaching the Step, and it is the same boundary
§4 already carries from the other side — *a name may DESCRIBE a composed
structure afterwards and may never GENERATE it beforehand*. What §4.5 adds is
that the boundary is now **checkable on the artifact** instead of being a claim
about how the artifact was made.

### 4.6 Path review — every MUST is JUDGMENT, and nothing becomes a lint

> "Every MUST in the Move-composition design is JUDGMENT-CLASS, applied by a
> review agent at path review: the human gate approves results only and
> performs no fine-grained edits, and no rule becomes a lint or automated
> check — **even where deterministic processing is possible**. … this keeps the
> composition layer inside the no-verdict-machinery hard constraint, with pin
> resolution remaining the sole mechanical instrument."

`product-lab@dec0d568 topics/articles.md:19`

Three clauses, each doing separate work:

1. **A review agent applies every MUST as judgment.** Not a linter, not a
   schema check.
2. **The human gate approves results only** — no fine-grained edits at the
   gate. An owner editing a Candidate line by line is composing, and the gate
   would become a second author with no record of the change.
3. **No rule becomes a lint, even where deterministic processing is
   possible.** The exclusion is stated at its strongest deliberately: the
   semantic-economy removal test (§4.7) *looks* mechanizable, and the served
   line exists so it is never re-read as a lint waiting to be built.

**The three evaluation levels — local Move validity, transition continuity,
Thesis closure — are NOT licensed checks.** They survive only as reasoning
surfaced on Candidates at the human gate:

> "The three evaluation levels — local Move validity, transition continuity,
> Thesis closure — are NOT licensed checks: they survive only as reasoning
> surfaced on Candidates at the human gate. This supersedes the second-round
> assessment that they would enter the registered check suite as judgment-class
> members with admission records; the owner ruled that automatic requires/effect
> judgment is not needed."

`product-lab@dec0d568 topics/articles.md:11`

**That supersession is recorded rather than absorbed** — an earlier assessment
had them entering the registered check suite *with admission records*, which is
a conformant-looking path, and a reader meeting only the outcome would not know
the check-suite route was considered and refused.

**Pin resolution of every claim remains the sole mechanical instrument on
grounding, and Moves must not dilute or compete with it.**

### 4.7 Semantic economy — what binds Move AUTHORING

> "The Move semantic economy policy is RATIFIED: a Move describes exactly ONE
> local transition in reader understanding; every sentence outside sources must
> be warranted by exactly one of five judgments — identify the operation, the
> required prior reader state, the produced reader state, a valid-vs-invalid
> application distinction, or an observable failure form — and a sentence whose
> removal changes none of them is removed; one proposition appears in exactly
> one field; sources carries only what locates the observed passage and
> explains the derivation. A failure mode never paraphrases a constraint, and a
> Move never describes an article position, a sequence of Moves, a whole-article
> outcome, or the materials an article must supply."

`product-lab@dec0d568 topics/articles.md:14`

- **One local transition** per Move.
- **The five-warrant sentence test.** Every sentence outside `excerpt` is
  warranted by exactly one of: the operation, the required prior reader state,
  the produced reader state, a valid-vs-invalid application distinction, an
  observable failure form. **A sentence whose removal changes none of them is
  removed.**
- **One proposition, one field** — a proposition appearing in two fields is a
  defect in both.
- **`excerpt` carries the observed reader movement and the article's title,
  and nothing else** (v24; the v1 form read *`sources` carries location and
  derivation only* — the field held the same account then, under a name that
  described what the contaminated design had appended to it).
- **A failure mode never paraphrases a constraint**, and a Move never describes
  an article position, a sequence of Moves, a whole-article outcome, or the
  materials an article must supply.

Judged at **Move ingestion's agent review** (§6.9) for a Move entering the
library, and at **path review** for a Move edited in place. **The removal test
is applied as judgment and is never mechanized** — §4.6 clause 3 exists for
this sentence specifically.

**What a Move IS, and the reason the adjacency fields are absent:**

> "Move is ADOPTED as the third core type of the composition layer — the
> Brief's core is Thesis + Strands + Moves — with exactly the eight-field
> schema … `material_roles` and the compatible_* adjacency lists are
> DELIBERATELY ABSENT, because **a stored flowchart is the declined
> article-framework menu one level down**. A Move is a durable reader-state
> transition type: no finished prose, no topic-bound content, no encoded
> position, no verdict machinery; reader states are article-specific
> propositions, never a global list, and the concrete before/after states live
> only on the Step that binds the Move. Literature-derived Moves enter as
> observed or generalized, never validated — promotion is a later act with its
> own grounds."

`product-lab@dec0d568 topics/articles.md:10`

Two consequences this spec must carry explicitly, because both are easy to
reintroduce as conveniences:

- **Reader states are article-specific propositions, never a global list**, and
  the concrete before/after states live **only on the Step**, never on the
  Move. A Move carrying its own before/after states is a global vocabulary
  growing quietly.
- **Literature-derived Moves enter as `observed` or `generalized`, never
  `validated`.** Promotion is a later act with its own grounds — an importer
  that admitted a Move as `validated` would be minting a judgment nobody made.

### 4.8 Journey integrity

> "Journey integrity binds composition: a Lesson's claims and evidence project
> freely into multiple Steps, and a Journey may also support multiple Steps and
> need not stay contiguous — but its temporal and causal relations (initial
> understanding → turning point → outcome) are never reversed or severed. The
> Strand's boundaries remain provenance; what must survive rearrangement is the
> arc's causality, because rearranging a Journey's internal causality changes
> its meaning."

`product-lab@dec0d568 topics/articles.md:18`

Four clauses, and the permissive three are as load-bearing as the constraint:

- **A Lesson's claims and evidence project FREELY into multiple Steps.** No
  budget, no once-per-Strand rule — this is §4.3's "a Strand may support
  multiple Steps and is never consumed by first use" reaching the Lesson.
- **A Journey may also support multiple Steps, and NEED NOT STAY CONTIGUOUS.**
  A Journey's Steps may be separated by Steps grounded elsewhere; adjacency is
  not what its integrity is made of.
- **The Strand's boundaries remain PROVENANCE.** They record where material
  came from and never dictate where it lands — one section per Strand is the
  source-shaped block §4.3 exists to dissolve.
- **The temporal and causal relations — initial understanding → turning point
  → outcome — are never reversed or severed.** What must survive rearrangement
  is the arc's causality, because rearranging a Journey's internal causality
  changes its meaning.

So the constraint is on the **arc**, not on the layout: a Journey scattered
across four non-adjacent Steps in its own causal order is conformant, and two
adjacent Steps that put the outcome before the turning point are not. Judged at
**path review**.

### 4.9 The analysis document — where observed sequences live

> "Observed multi-Move sequences live in the separate per-passage analysis
> document as source-specific prose precedents — never in a Move's sources
> field (which stays strictly location + derivation) and never as library
> structure; a Move's sources may point at that document. This reconciles the
> semantic-economy sources rule with the ratified allowance for recording
> observed sequences: **one home, structurally unable to migrate into the
> schema.**"

`product-lab@dec0d568 topics/articles.md:22`

The reconciliation is the point. Recording observed sequences is ratified and
`sources` may not hold them, so the sequences get **one home** — a per-passage
analysis document of source-specific prose precedents — and a Move's `sources`
may *point* at it. **Structurally unable to migrate into the schema**: there is
no field for a sequence, so the adjacency lists §4.7 excludes cannot return
through this door.

#### 4.9.1 What §4.9 entails, constructed (kogaki#420)

**§4.9 ratified where sequences live and fixed nothing else about the place,
so for as long as that stood it was a rule with nowhere to obey it.** A sitting
that observed a real multi-Move sequence had no ratified destination, and the
two paths of least resistance were the two §4.9 names as forbidden: widen
`sources`, or reintroduce library structure. **A prohibition whose positive
destination does not exist is a prohibition waiting to be worked around**, and
that is what this subsection removes — by construction, not by a check. §4.6
and §6.9.2 both exclude lint, so nothing here detects a violation; what changes
is that obeying the rule is now possible.

Owner selection 2026-08-13 at the `/ship-cycle 220` gate.

**The location.** `analysis/<source-slug>.md` — one file per source passage,
the slug the whole stem. This deliberately **mirrors `moves/<id>.md`**: two
libraries that read alike, sit side by side, and index each other not at all.

**The interior is prose, and the prose is the point.** Headed sections of
source-specific precedent, with no schema, no field set, and no required
ordering. The temptation is a table — sequences look tabular — and a table is
the adjacency data §4.7 excludes wearing a different hat. **There is no field
for a sequence anywhere in this design, and that includes here**: what makes
§4.9's "structurally unable to migrate into the schema" true is that the
destination has no schema to migrate *from*.

**No INDEX, and no regeneration contract.** `moves/INDEX.md` is regenerated
whole from `moves/` because every one of its columns is *read off a file*
(§6.9.1a) — a property prose cannot have. An `analysis/INDEX.md` would compose
its rows rather than derive them, which §6.9.1 already declined for the Move
file interior and declines again here for the same reason. A reader finds these
files by name and by the `sources` pointers into them.

**The pointer form is `sources`' own, unchanged — and it NAMES THE DOCUMENT'S
PATH.** A Move's `sources` may point at an analysis document in prose, and that
prose **contains the literal path `analysis/<source-slug>.md`**. The form is
still `sources`' own — a string in a field that already holds provenance prose,
per kogaki#417 D1 — and this subsection introduces no second convention beside
it. Concretely, `tools/move_ingest.py` is **untouched**: nothing in the
mechanical half learns a new type and `attach_derivation_pointer` needs no case.

**The path requirement is not decoration, and this clause's first draft omitted
it.** §6.9.0 measured the specimen's `sources` as *"provenance prose naming a
source passage"* for all 22 records — so under a pointer form that is only
"prose naming the passage", a Move that points at an analysis document is
**byte-identical to one that does not**. §4.9's ratified allowance would have
been nominally implemented and **not discriminable**, and kogaki#420's own
completion instrument — `git grep -l analysis/ moves/` — presupposes a trace
that form leaves none of. The acceptance test above was passed *because* the
pointer carried no signal, which is the wrong reason to pass it. Requiring the
path restores the signal and costs the acceptance test nothing: a literal path
inside prose is still prose.

**Precedence, declared rather than assumed.** This subsection restates four
dispositions it does not own — §4.9's *per-passage*, kogaki#220's
construction-only scope, §6.9.0 condition 3's exactly-eight-keys, and §6.9.1's
decline of a composed interior. **On any divergence the cited section wins and
this subsection is repaired**; §4.9.1 may not amend any of them, and a reader
finding a conflict repairs here rather than there.
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:215`
— *"Duplication is not the sin; unowned duplication is, because owning a fact
means your version wins on disagreement and you may change it, so a safe copy
has to be deliberately stripped of both powers."*

**Two shapes declined, recorded so neither is re-proposed blind.**

- **An appendix section inside each Move file.** Fewer artifacts, and it fails
  on §4.9's own words: it puts sequence content inside the schema file, and
  §6.9.0 condition 3 admits **exactly** §4.2's eight keys, so the section would
  either be a ninth key or prose smuggled below a record boundary the grammar
  binds. Declined on the section's own stated ground rather than on taste.
- **A single repository-wide `analysis.md`.** Simplest to find and to read
  whole, and it requires §4.9's word *per-passage* to be **overridden rather
  than implemented** — a supersession this sitting has no license for, since
  #220 carried construction only and its design was ratified. It also grows
  without bound with no natural split, and the split it would eventually need
  is the per-passage one already ratified.

**Stated residue.** Nothing binds a source passage to its slug, so two sittings
analysing the same passage may choose different slugs and produce two files
where the design intends one. This is the same class as §6.9.1a's id collision
and gets the same answer — it surfaces to a human, here at the moment of
writing the file rather than at a selection screen — but it is **weaker**,
because no act computes it: `moves/<id>.md` collides mechanically on a derived
stem, while a passage has no id to derive from. Recorded rather than solved; a
naming rule is owed only once a second passage exists to disagree about.

### 4.10 The journey register rides Candidate differentiation — and v8's gate, SUPERSEDED (v10, kogaki#492)

**This section no longer binds a gate. It records a supersession and points
at §6.** At v8 it bound a dedicated journey-incorporation gate at the Brief,
sited between Thesis determination and path composition. That siting is
retracted by owner ruling; the obligations it carried are not.

**The ruling, quoted rather than paraphrased** (kogaki#492, owner, 2026-08-17,
recorded on the issue thread "so the direction does not decay in a
transcript"):

> "**No Journey-specific block inside the Brief.** A Journey stays what the
> ratified definition already makes it — a first-class Strand (Strand = one
> Lesson or one Journey), selectable independently; a parent Lesson and its
> Journey may both be selected as two independent Strands. Placement is path
> composition's ordinary work; place-or-disclose is the completeness rider;
> arc integrity stays §4.8, judged at path review.
>
> **The register choice rides Candidate differentiation instead of its own
> gate.** Candidates already differ in reader experience; different journey
> registers are a natural axis of that difference. The 2026-07-31 frozen
> requirements SURVIVE as composition MUSTs on every Candidate: every
> selected member's journey material placed or its omission disclosed; the
> served arc cited at its pin; the arc-shape floor (before-position → what
> broke → after-position, never rule-statement register); options enumerated
> never ranked-and-trimmed; free text wins.
>
> **This supersedes the 2026-07-31 'decided at its own gate' wording** — the
> amendment must state the supersession rather than absorb it. Scope of this
> issue accordingly: close spec §2 row 2 with this design (no new gate
> registered)."

**The served line this spec now diverges from, named at its pin.** v8 quoted
and rested on:

`product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:87`
— "**The journey register is decided AT the brief gate, and what the hub owes
is the option-composer's FROZEN REQUIREMENTS, never a register vocabulary.**
… Deferring the incorporation choice past the Brief distorts the article's
structure, so it belongs to the stage where design happens".

That line is **still served at this head** — the divergence is this
repository's, ahead of the hub wording, and the hub refresh is **owed, not
done**. Declaring it here rather than absorbing it is what the served
discipline requires:
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:172`
— "A consumer that ships ahead of the hub wording DECLARES its divergence in
the artifact, with a source-qualified pin … naming the diverged line converts
an unratified shape into a CHECKABLE PROPOSAL."

**Note precisely what is superseded and what is not.** The served line has two
halves. Its **siting** half — *decided at the brief gate, because deferring
past the Brief distorts structure* — is what the ruling overturns, and the
ruling's own ground answers the served rationale rather than ignoring it: the
choice is **not** deferred past the Brief, because Candidate assembly and
selection are themselves Brief-stage acts (§6). Its **requirements** half —
the frozen option-composer requirements — is not superseded at all and is
carried forward verbatim at §6. A supersession that silently took both halves
would be the absorption the ruling forbids.

**Where the obligations now live: §6.** The four frozen requirements bind
**every composed Candidate**, stated once at §6 and not restated here.

**What is retracted with the gate.** v8's *"adopted register rides the Brief
as a DISCLOSURE"* clause is moot rather than reversed: with no separate
register decision there is no adopted register to disclose — **the selected
Candidate is the register**. §5.1's field list is unchanged by this amendment
exactly as it was unchanged by v8, so the shipped entry-point runtime and its
registered check stay conformant without churn; and v8's reason for refusing a
slot survives with more force, not less (`topics/articles.md:86@8906f207` —
"a mandatory slot for a CONTINGENT property manufactures the property").

**The judges, named per §4.3's own rule.** The register **choice** is the
**Candidate-selection gate's** (§6) — a human selection over composed
Candidates, which is what it already was, now with no second gate beside it.
**Conformance** of a composed path to its Candidate's arc obligations is
judged at **path review**, where §4.8's arc-integrity clauses already sit. No
new judge, no new block, **no gate registered in the gate registry by this
spec**, and nothing here becomes a lint (§4.6 clause 3 reaches this section
unchanged).

**The contingency clause survives the re-siting.** Journey register is a
property only of Briefs whose selected Strands carry Journey material; a Brief
with no Journey-bearing member has no register to differentiate on, and §6's
MUSTs are vacuous for it rather than violated by it.

**v8's reading, retained rather than edited away** — the convention §2 row 2
and §7.R already exercise:

> "**The journey register is decided AT the Brief — after Thesis
> determination, before path composition.** This is the gate §2 row 2 owed
> from v1, and its siting is served rather than chosen here. … **The gate
> fires only when the Brief's selected Strands carry Journey material.** …
> **The adopted register rides the Brief as a DISCLOSURE, never a §5.1
> slot.** … The register **choice** is the gate's — a human selection over
> composed options, exactly as Candidate selection is."

v8 was correct for its own sitting and on the evidence it had: it read the
served line as written and sited the gate where that line put it. What it
could not have is a ruling issued six minutes after its commit landed.

**What this amendment does not do.** It re-opens neither §4.8's arc clauses
nor §6's carrier rulings, adds no field, and registers no check. It schedules
no implementation **in this sitting**: the runtime binding of §6's MUSTs into
the shipped Candidate composer is carried by **kogaki#501**, so
the obligation has a carrier rather than a mention in a closing report.

### 4.11 The Bridge Step and the revise pass (v16, kogaki#524)

**Owner ruling 2026-08-18, restated and confirmed the same sitting.** Once the
Thesis is decided and the Step sequence is being composed, a causal gap between
adjacent Steps is repaired by inserting a **Bridge Step**.

#### The Bridge Step is an INSERTION CONTRACT, not a type

**No new Step type**, and one new optional §4.1 field — `bridges`, which names
the adjacent pair the Step was inserted between. A Bridge Step is an ordinary
§4.1 Step whose placement is constrained by its neighbours:

- its `reader_state_before` is the predecessor's `reader_state_after`;
- its `reader_state_after` supplies what the successor's `reader_state_before`
  requires;
- `depends_on` is updated across the splice.

**Why the marking is a field rather than a recovered property (corrected
2026-08-19, PR #546 round 1 finding 3).** This section first said "no new
field", and the implementation shipped in the same commit recognised a bridge
by exactly such a field — a contradiction between a spec and its runtime, which
is the worse of the two defects. The constraints above are *placement*
constraints: a Step satisfying them is well-placed, and an ordinary Step is
equally well-placed, so nothing in them distinguishes a Step that was
**inserted** from one composed in the first pass. Insertion is a fact about the
Brief's history, not about its shape, and §4.11 makes post-hoc disclosure the
whole of the approval shape — a disclosure computed from an unrecoverable fact
must read it from a record. So `bridges` is admitted in §4.1 as optional, an
array of exactly two step ids, validated on composition and carried through the
recorded serialization. It marks; it never constrains, and it mints no Move.

**And the served position warns against exactly this resolution, so the reason
it does not bind here is stated rather than skipped.** The headline is quoted
whole:

> "If a team agrees on a data format and a downstream service ships a
> different-but-equivalent format before the agreed schema file has actually
> landed, the two do not have equal claim: the approved decision is the
> contract and the code is only one implementation of it. Shipping first is not
> approving, and accepting the shipped shape merely because it exists amends
> the contract by accident. … Resolve the divergence before any real data
> exists, while it is still just a code change."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:77`

The trap it names is a de facto standard set by the first real record in the
shipped shape. **No such record exists** — no Brief carries a `bridges` field,
both halves are unmerged, and this is still just a code change, which is the
window the line itself names as the one to resolve in. The field is admitted on
the argument above — insertion is a fact about history, not about shape — and
not on the fact that code for it exists; had the argument gone the other way,
the correct repair would have been to delete the field, not to ratify it.
Recorded here so a later reader can see the position was consulted and
answered, rather than unmet.

It may use Strands or not, and it may bind a Move or not. Where its connecting
claim is not traceable to Strand material it carries the flags **every** Step
already has — `entailed` with its reasoning, or a declared reader-assumption
ground (§4.4). "Authored" in the ruling means written by the composer rather
than quoted from material; it says nothing about approval, which the disclosure
below settles.

**No special Move class exists for a bridge, and that is a boundary rather than
an omission.** A bridge-shaped Move — a shared-experience appeal, an inductive
plausibility account — enters the library as an ordinary Move through the
existing ingestion path when a reference passage yields one. A Bridge Step's
inputs and outputs are fixed by its neighbours, so an ordinary Move, or none,
suffices.

#### The Brief workflow never proposes or creates a Move

A missing Move **degrades** the output — a strange article, or the same Move
reused repeatedly — and that degradation is the owner's signal to find or create
the Move and ingest it themselves. `/brief`'s responsibility is to complete the
Brief from the **existing** Move library and the selected Strands.

This closes cleanly because **minting** a Move is not this workflow's act —
§7.5's never-minted rider, which v18 leaves standing. **The optionality half of
this sentence is superseded** (v18, kogaki#642): a Step now binds a Move, so a
missing one no longer degrades a Brief, it makes the Step unwritable, and a
transition typing against no entry raises §4.1's reopen trigger rather than
composing anyway. Stated here so the exclusion is a
**greppable position** rather than an absence a later reader reads as an
oversight.

#### The revise pass — the occasion the contract is used at

After path review, per Candidate: a gap found in transition continuity routes
that Candidate **back to path composition**, where the composer inserts a Bridge
Step or discloses the gap as a §5.2 ledger entry. The revised Candidate is
**re-reviewed before assembly**.

**The loop is bounded: one revise round per Candidate.** A gap surviving it is
disclosed and rides to the gate — never re-looped.

**WHERE THE FINDING COMES FROM, named precisely (kogaki#524's label correction).**
Path review has **six** areas (`src/review.mjs`) and none is called
"transition continuity". That level is observed inside the **`evaluation_levels`**
area — §4.6's "three levels, observed and never scored", enumerated at §4.6
above as local Move validity, transition continuity and Thesis closure. A reader
looking for a transition-continuity *area* will not find one, and the issue's own
body sent this sitting looking for it.

**ROUTING A FINDING DOES NOT MAKE AN EVALUATION LEVEL A CHECK**, and the
distinction is load-bearing because the served ruling reads, on its face, as
forbidding this:

> "The three evaluation levels — local Move validity, transition continuity,
> Thesis closure — are NOT licensed checks: they survive only as reasoning
> surfaced on Candidates at the human gate. This supersedes the second-round
> assessment that they would enter the **registered check suite as judgment-class
> members with admission records**."
>
> `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:22`

What that supersedes is naming them **registered checks**. The revise pass
registers no check member, computes no score, and produces no verdict: a review
agent's judgment routes a Candidate, and the outcome is a composer's Bridge Step
or a disclosure — both judgment acts. And the remedy itself is already ratified
rather than minted here:

> "When information is unavailable: omit the Step, **revise the path**, or leave
> the Strand unused."
>
> `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:28`

So the revise pass is the ratified *revise the path* remedy given an **occasion**
(a review finding) and a **bound** (one round), not a second survival mode for a
level the ruling confined to one.

#### Approval is POST-HOC DISCLOSURE, with the fork left open

**No per-Bridge question.** Each Candidate's evidence at the existing selection
gate carries its inserted bridges: how many, between which Steps, and each
bridge's reasoning — the entailment reasoning or the declared assumption.

Three grounds, each doing separate work: per-Candidate machine-side work must
never multiply owner questions (§6's bound, kogaki#490); the flags already expose
every bridge's reasoning at the one gate that exists; and a per-Bridge stop would
be a default mid-workflow stop with no inspection need, which kogaki#522's rule
removes.

**The fork is deliberately open.** If dogfooding the completed mechanism shows
bridges misbehaving, escalation to explicit per-Bridge approval is the recorded
alternative. Recorded rather than decided, so a run informs it rather than an
argument.

**deferred slot: `bridge-approval-shape`** — the per-Bridge-approval escalation,
owed on its own licensing issue with choice, alternatives and receipt before any
gate embeds it.

### 4.12 The Step↔Move instantiation contract (v22, kogaki#747)

A Step **instantiates** a Move. `move` names a record in the Move library
(§7), and the Step's `reader_state_before`/`reader_state_after` are the
**instance forms** of that Move's `requires`/`effect`, specialized to this
reader and these Strands. §4.1 v18 made the binding required; this section
governs the **relationship the binding asserts**, which until now nothing
checked at all.

**The gap this closes, stated as it was found.** The draft harness parsed a
step block for `step_id` only, so `move:` was **uninterpreted dead input**: a
typo'd or renamed id sat silently in a minted Brief. It became load-bearing the
moment the Section Packet assembler joined `Step.move → moves/<id>.md` — at
which point a dangling id fails at Packet time, **mid-draft**, rather than at
the composition that wrote it.

**The contract has two halves and they are carried by different machinery on
purpose.** Which half a property belongs to is not a matter of convenience:

| half | the question | who answers | where it is carried |
|---|---|---|---|
| mechanical | does the id resolve? | the runtime | a set-membership test over the library |
| judged | are the instantiated states consistent specializations? | the composing sitting | a typed record the runtime validates and never composes |

#### 4.12.1 The mechanical half — move id resolution

Every `move:` in a Brief's Reader Path resolves to a record in the Move
library. A path **cannot be adopted into a Brief** and `resolve` **refuses an
existing Brief** with a dangling id; the refusal names **the Step and the id**.

**Two seats, and neither subsumes the other.** Adoption stops a dangling id
entering a Brief. `resolve` stops a Brief whose **library moved underneath
it** — a Move renamed or withdrawn after composition dangles without the Brief
changing at all, so a Brief that passed adoption can fail at realization, and
that case is reachable only from the second seat.

**One resolver, not two.** Both seats call the same exported function. Two
resolvers are two things that can disagree about what a dangling id is, and
the refusal a composer meets would stop matching the one a realizer meets.

**An unreadable library is not an empty library.** Where the store cannot be
read, the refusal is a **store fault** and names no Step. This is not a
nicety: reading an unreadable directory as an empty set makes every id dangle,
so the run refuses **truly, for a false reason**, and sends a composer to
re-bind Moves that were never wrong.

**The library reads as a set of IDS and nothing more.** A resolver that parsed
`requires`/`effect` would be one edit away from comparing them, which is the
lint §4.6 clause 3 forbids. The restraint is in the reader, not in a rule
about the reader.

**Where the library is, stated rather than left in a usage line.** The store
defaults to `moves/` **relative to the working directory**, and `--moves-dir`
names it anywhere else. Two consequences a reader is owed, because this is the
one part of §4.12 that is a fact about the *environment* rather than about the
artifact:

- The realization runtime had **no working-directory dependency before this
  section** — a Brief arrives as a path and the workspace default is
  home-relative — and `resolve`, `material`, `section` and `emit` all reach the
  resolution through one shared entry, so all four now carry it. Driven from
  outside the repository root they refuse as a **store fault**.
- That refusal is **legible rather than silent**: it names the store it could
  not read and names `--moves-dir` as the discharge, which is the unreadable-
  is-not-empty rule above doing the work it was written for. A fixture or a
  driver running elsewhere passes the flag.

The default is not made Brief-relative: inferring a repository root from a
Brief's path would be a guess about a layout this spec does not govern, and a
wrong guess resolves **silently** against the wrong library, which is strictly
worse than a refusal that says where it looked.

#### 4.12.2 The judged half — specialization is judged, and its record is typed

Whether a Step's instantiated `reader_state_before`/`after` are consistent
specializations of its Move's `requires`/`effect` is **an LLM judgment in the
workflow**, not an owner inspection. The owner ruling of 2026-09-01 is that
the judgment is **desirable but too cognitively expensive for manual
dogfooding**, which is a statement about who performs it and not a weakening
of what it asserts.

It is wired to the LLM-judgment boundary standard, whose three clauses are
each load-bearing here:

1. **A mandatory occasion at Brief composition, with no skip.** The occasion is
   **adoption** — `assemble.mjs adopt-candidate` — because that is the one
   surviving write that lands a sequence in an existing Brief (§5.3 v17). A
   path reaches a Brief through there or it does not reach one at all, which
   is what makes the occasion unskippable rather than merely required.
2. **A typed record the harness VALIDATES AND NEVER COMPOSES.** The carrier is
   `src/specialization-schema.json`, on the single-carrier arrangement
   `record-schema.json` and `gate-schema.json` already use. No default verdict
   exists, none is inferred from a Step's fields, and a missing record is a
   refusal rather than a blank to fill.
3. **A deterministic refusal naming the failing Step**, in the path's own
   order, **quoting the sentence the judging sitting wrote** rather than
   paraphrasing a judgment the runtime did not make.

**Why not path review, which judges every other MUST.** §4.6 puts every
composition MUST at path review, so that is the first place to look and the
wrong one. Path review's output is **reasoning surfaced for a human gate —
never a verdict, never a score, never a pass/fail** — and `src/review.mjs`
refuses any verdict-shaped field **by key**. A specialization verdict recorded
there would be **unattachable by construction**. The judgment is not moved out
of review's spirit; it is sited where a verdict is a legitimate output.

**The record is bound to what it judges, on both axes.** It names the
**Candidate** it was composed against and, per verdict, the **Move** the Step
binds. Without the first, a sitting judges the Candidate it likes and adopts
the one it wants. Without the second, a verdict certifies a relationship that
is not the one in the Step.

**One verdict per Step, exactly, in both directions.** A short record is the
skip this occasion exists to prevent, arriving one Step at a time; a long one
means the record was composed against a different path than the one adopted.

**The vocabulary is CLOSED and three-valued**, and the third value is the
decision worth recording: `consistent` | `contradicts` | `cannot-determine`,
with exactly one passing. `cannot-determine` is a **first-class value, not an
escape hatch** — under a two-valued read an honest non-answer must render as
one of the two answers, and the value that absorbs it is the passing one. The
same finding one domain over: a two-valued exists→accepted read where the
ratified rule is three-valued and the honest value was cannot-determine
(`consulted: product-lab@ded20f50ab341da7017375db08a4796166f47890
topics/archive/knowledge-architecture.md:95`). It does not weaken the gate,
because a `cannot-determine` refuses exactly as a `contradicts` does. What it
buys is that the refusal says **which** — an unjudgeable Move contract and a
contradicted one need different repairs, and a two-valued record renders them
identically.

**The judged half is rendered ONCE, at composition, and is not re-derived at
realization.** `resolve` re-runs the mechanical half and not this one: the
verdict was reached by a sitting reading the material, and re-deriving it at
realization would be the runtime composing a verdict, which clause 2 forbids.

#### 4.12.3 What this amends, and what it does not

§7.5's rider **"Pin resolution remains the sole mechanical kill criterion"** is
**superseded**, and it was already stale when this section was written: §4.1
v18 (kogaki#642) made a Move-less Step unwritable, which is a second mechanical
kill the rider did not record. §4.12.1 is the third. The riders that stand
unchanged, and are load-bearing here rather than merely surviving:
`requires`/`effect` matching is **judgment-class** and **never type-checked**,
and **no machinery renders a verdict** on whether a Move's requires are met.
Nothing in §4.12.2 renders one — the verdict is the sitting's, and the runtime
owns the record's shape and the refusal.

**What is NOT decided here, named rather than left.** Where the judgment point
sits relative to path review's own pass — before it, after it, or interleaved —
is not settled by siting the occasion at adoption; adoption is the seat that
makes it unskippable, and review's ordering is a separate question. It is not
answered by inference from this section.

**deferred slot: `specialization-judgment-and-path-review-ordering`** — owed on
its own licensing issue with choice, alternatives and receipt before any flow
embeds an order.

#### 4.12.4 Receipts

Three consultations, one per fork this amendment turned on. Each is recorded
with what it discriminated, because a receipt that does not say what it settled
is evidence that someone asked and nothing more.

**Where the judgment record lives** — inside the artifact it judges, or beside
it as a separate typed input. Settled for the second: judgment belongs at
declared seams where the order is already fixed, supplying a value between two
steps whose sequence is determined, rather than as a layer wrapping them; and a
context that both authors an artifact and then judges it re-checks the framing
that produced it.
`consulted: product-lab@ded20f50ab341da7017375db08a4796166f47890 LESSONS.md:13`
`consulted: product-lab@ded20f50ab341da7017375db08a4796166f47890 LESSONS.md:43`

**Whether the cases earn a new registered member.** Settled against: the typed
improvement loop routes a missed mechanical property to the merge carrier and a
missed judgment to the consultation's inputs, and constrain-generation is the
design's move rather than a member per property.
`consulted: product-lab@f3947495a753371d4777f82e87e490debc5f9cb7 topics/knowledge-architecture.md:329`

**Superseding §7.5's rider in place rather than deleting it.** The convention is
the served one — a superseded clause keeps its text and gains the amendment, so
a reader arriving at an older rendering meets the correction rather than a live
claim.
`consulted: product-lab@f3947495a753371d4777f82e87e490debc5f9cb7 GLOSSARY.md:242`

### 4.13 The reader-knowledge ledger — `introduces` on a Step (v23, kogaki#751)

A Step may carry **`introduces`**: the terms or concepts it puts in front of
the reader for the first time, each **bare** or with a **one-line meaning
anchor** where the Step's own grounds do not already supply it. Authored at
**Brief composition**, by the composer, like every other Step field.

The harness then **derives** what a reader already knows arriving at Step N:
the **union of Steps 1..N−1's entries**.

**Accumulation is always computed, never stored.** `reader_already_knows` is
not a field, is not written into a Brief, and is not carried in a run record.
A stored copy would be a second answer to a question the path already answers,
and it would be wrong the moment a Step moved.

**What the field buys, stated because it is the whole point.** An unintroduced
term becomes **addressable**: responsibility traces to **the first Step
carrying it**, or to **the Brief** when no Step does. That is a fact about the
path rather than a judgment about the prose — which is what lets it be
mechanical at all.

**First introducer wins, and that IS the addressability rather than a
tie-break.** Where two Steps declare the same term, the reader met it at the
earlier one, so that is where a later question resolves. The second
declaration is **not an error** — a composer may legitimately restate a term —
and it is not silently dropped either: it simply moves nothing.

**One line per entry, and the serialization could not be otherwise.** A term
may contain a comma and its anchor almost always does, so a comma-joined field
cannot be parsed back. `renderStep` writes one `introduces:` line per entry and
`parseBrief` reads them back the same way; the two are one round trip and are
asserted at both ends.

**A malformed entry refuses NAMING the Step**, on both sides, through one
shared grammar — a writer and a reader disagreeing about what an entry is
would fail silently at exactly the field whose value nobody re-derives by hand.

**An empty ledger is a reading, never a failure.** A path that introduces
nothing derives an empty ledger and says so. Every Brief in this repository is
in that state today, which is why the field is **optional** and why a
requirement would have refused the whole existing corpus rather than adding
anything to it.

**Shape only, and §4.6 clause 3 stands.** Whether a term is genuinely new
here, whether its anchor explains it, and whether the Step's grounds already
carry it are **judgments**. Nothing in this section reads meaning.

#### 4.13.0 Receipts

**The disclosure-not-assertion choice**, and the completeness criterion above,
both rest on served lines rather than on this sitting's taste. The library's
exemplar count is rendered and never asserted because a check that failed when
the count moved would go red **exactly when a record is authored or retired**
(at v23: when the re-extraction it enabled was performed) — a check
anti-correlated with its own need, where "its silence
reads as a clean result"
(`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f
topics/archive/claude-code-ops.md:24`).

**v23's unbuilt half belonged in the RUN's own output** and not only here: a job
that stops on purpose and waits for something outside its control says so where
the operator looks, because from outside "a deliberate hold and an
accomplishment of nothing are indistinguishable"
(`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f
LESSONS.md:37`).
At v24 there is no unbuilt half (§4.13.2), and the receipt stays as the record
of why the v23 run disclosed one.

#### 4.13.1 The Move exemplar predicate — the `excerpt` field (v24)

`specs/move-extraction-contract.md` is the schema authority for Move records.
A record's **`excerpt`** is **the author's own account, in a few lines, of the
specific reader movement they focused on when they identified the Move** —
what the passage establishes, what it then shows the reader, where the reader
ends up. It is **not a verbatim quotation** (owner ruling 2026-09-02): a Move
derived at a meta level from a thousand- or ten-thousand-character article is
not served by that text sitting in the record — it is noise — and a verbatim
requirement would lower the excerpt's value rather than raise it. What a later
writer imitates is the **movement**, and the author's account of it is the
exemplar.

**The field was renamed, not replaced.** The records' `sources` text was
already this account. The original implementation wrote the Move-loading
route into the field as a rubber-stamp, contaminating it with tags and
routing information; kogaki#548 stripped that out, and what remained was the
excerpt under the wrong name. There is **no separate piece of information
called "source" to preserve**: the article's title inside the excerpt's first
sentence is the whole of a record's provenance, and version history holds the
rest. A `sources` key surviving beside `excerpt` in any record is a design
error, and the compose check fails it by name.

**The predicate.** A record whose `excerpt` carries text **is** an exemplar; a
record whose `excerpt` is **empty** cannot serve as a Packet exemplar, and the
Packet renders its excerpt block as a **stated absence** naming the Move and
the repairing act, substituting nothing. That is the one absence left: the
v23 distinctions between an absent marker, a malformed marker and an empty one
were distinctions among forms of quotation, and there is no quotation.

**The retired marker is text.** A record whose excerpt happens to contain the
string `Excerpt:` is an exemplar because it carries an account, not because of
the marker, and the reader parses nothing out of it.

**The library today: 22 of 22.** Every record carries an excerpt, which is the
same fact v23 stated as "every record is description-only" — read under the
correct definition. The count is still **disclosed and never asserted** (§4.13.0).

**The library reads as a set of ids for §4.12 and as excerpts HERE, and the two
readers stay separate.** §4.12's resolver deliberately reads ids and nothing
else; this predicate reads `excerpt` and nothing else. Neither grows into the
other.

#### 4.13.1a Receipts for the v24 withdrawal

Two mapped boundaries are touched by this amendment — check infrastructure, and
record disposition — and both are consulted here rather than left unasked.

**The supersession's SHAPE is the served one**, and it is the reason v23's text
below is retained rather than deleted: a reversal is recorded as a
**supersession rather than a retraction** where the superseded reasoning was
correct and parts of it survive intact. That is exactly this case — the refusal
to fabricate quotations was right, and only the belief that quotations were
owed was wrong.
`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f topics/knowledge-architecture.md:293`

**A run that ends with work remaining names the next act, or says there is
none.** v23 named an act; v24 says there is none, which is the other arm of the
same rule and is why the withdrawal is stated rather than merely implied by the
absence of a follow-up.
`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f topics/claude-code-ops.md:48`

**The check keeps its shape rather than growing a clause.** The `(m)` cases are
re-pointed at the renamed field and one guard is added for a surviving
`sources` key; nothing is appended to catch a class the rename removes, per the
typed improvement loop that routes a missed mechanical property to the merge
carrier rather than to a new enumerated denial.
`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f topics/knowledge-architecture.md:329`

#### 4.13.2 The re-extraction is WITHDRAWN — the issue's design was wrong (v24)

v23 recorded a re-extraction of the 22 records as an unbuilt half with a named
blocker: verbatim excerpts, and the four source articles neither in this tree
nor on the served surface. **Both premises were wrong, and the owner said so
on 2026-09-02**: the excerpt was never meant to be verbatim, and the field
already held it. The 2026-09-01 ruling's *"re-extracted from their source
articles through the contract"* is withdrawn by the same authority that issued
it. No actor holding the source articles is awaited, no fabrication was ever at
risk, and the v23 text below is retained as the record of a correct refusal
made under a wrong premise — the refusal to fabricate quotations was right;
the belief that quotations were owed was not.

What v23 got right survives unchanged: **only the evidence field was touched**.
Each record keeps its `id`, `status`, `intent`, `requires`, `effect`,
`constraints` and `failure_modes` byte for byte; the rename changed one key
and no value. And the round-2 finding carried on kogaki#751 — the greedy
excerpt body in `src/compose.mjs` — is **retired with the marker it parsed**:
there is no marker, no quoted body and no regex, so the defect has no site.

The two-specs observation from the same round ("`sources`' shape in the
contract, the predicate in §4.13.1") is answered the same way: the contract
owns the field's content and this section owns what the Packet does with it,
and the seam between them is now a field read whole rather than a grammar
two files had to agree on.

---

*v23's §4.13.2 text, retained as record:*

>
> The 2026-09-01 ruling also directs that the existing records be **re-extracted
> through the contract** so each carries a conforming excerpt. **That has not
> been done, and it could not be done from this repository.**
>
> The excerpts must be **verbatim**, and the passages live in the source
> articles — *"Why Is a Weak State Like North Korea So Frightening?"*, *"Maritime
> and Continental States."*, *"Attack-Defense Advantage Is Ambiguous."* and their
> siblings. Those articles are **not in this tree and not on the served
> surface**: §7.6 already records that these Moves' `sources` "cannot cite a
> served pin today" because they sit in the hub's staging file and **staging is
> not served**. The material a verbatim excerpt would be copied from is
> unreachable from here.
>
> **The one thing that must not happen is the thing that would look like
> progress.** Composing plausible passages and marking them `Excerpt:` would
> produce records that are *fabricated quotations presented as evidence* — the
> exact failure the contract's own rule 1 exists to prevent ("A paraphrase or
> description of the passage is not acceptable"), made worse by the marker
> asserting verbatimness. **A stated absence is the honest state and the
> mechanism above renders it.**
>
> So the split is recorded rather than left to be inferred: **the mechanism is
> built and the migration is not**, and until then every record renders its
> absence.
>
> **The next act is named rather than left implied.** A run that ends with work
> remaining names the next act or says there is none
> (`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f
> topics/claude-code-ops.md:48`). It is: **an actor holding the four source
> articles re-extracts the 22 records through
> `specs/move-extraction-contract.md`, one article at a time**, and each record
> that gains a conforming `Excerpt:` becomes an exemplar with no further change
> to anything here — the predicate already admits it, and the disclosed count
> moves on its own.
>
> **The completeness criterion, stated in the same act as the purity one.** The
> predicate above is one-sided: it tests for the marker's PRESENCE, and a
> one-sided test "is satisfied most cheaply by deleting behaviour"
> (`consulted: product-lab@dc000a386d8a9a89d7905fd139071fd9c67bdd8f
> topics/claude-code-ops.md:132`). So what a re-extraction must PRESERVE is
> written down here rather than discovered by its reviewer: each record keeps its
> `id`, its `status`, and its `intent`/`requires`/`effect`/`constraints`/
> `failure_modes` as they stand — only `sources` is rewritten — because those
> five fields were authored against the reader and the technique rather than
> against the passage, and re-deriving them from an excerpt would narrow a
> general Move to the one article it was observed in. A re-extraction that
> changes them is a re-authoring and owes its own licence.
>
> **Why this is not a deferred slot.** A deferred slot names an undecided fork.
> Nothing here is undecided: the design is settled, the mechanism is shipped, and
> what remains is an act requiring material this repository does not hold. It is
> an unbuilt half with a named blocker, and calling it a fork would misfile it as
> a question when it is an errand.

### 4.14 The Section Packet (v25, kogaki#749)

The **harness-assembled input from which the model realizes one Step's prose** —
the one LLM judgment of the Draft lane. `draft.mjs packet --step <id>` renders
it deterministically; the session realizes the prose; `section` validates it as
before.

**The Packet is the model's ENTIRE input.** Nothing outside it is read, which
is why every block opens with a **fixed usage header** saying what the block is
for: a block whose use is not stated gets used for whatever it resembles. The
exemplar is the one that fails worst — read as content rather than as form, it
hands this article another article's subject matter, which is why its header
says so in the imperative.

**Block order is fixed**, heavy prose late and the instruction last: global
anchors (Thesis, Reader start, Reader target, Opening question, verbatim from
the Brief) → the Move's contract → the Step's fields → the §4.13 ledger →
every previously realized Section verbatim in recorded order → the write
instruction.

**`requires`/`effect` are EXCLUDED, and the exclusion is the ruling rather than
an omission.** §4.12 makes the Step's `reader_state_before`/`after` the
**instance forms** of exactly those two fields, so rendering both would put the
general and the specialized statement of one thing side by side and leave the
model to choose. The Step's instantiated states win.

**Deterministic** means the same inputs render the same bytes: no timestamp, no
run id, and prior Sections in the **Brief's recorded order** rather than from a
directory read — a `readdir` would make the Packet's bytes depend on the
filesystem.

**A missing input refuses BY NAME rather than rendering an empty slot.** In an
input that is the model's whole world, a hole is not a gap the model notices —
it is a hole the model fills by invention.

**Stored exactly as served**, overwritten on re-render, with path and sha
**recorded in the run record** beside the Section it produces — and announced on
stderr as well. The two are not the same act, and this sentence said "announced"
while the runtime only printed (PR #780 round 1): a print is read by whoever is
watching, a record by whoever comes after, and the ruling is about the second. A
re-resolve **preserves** those entries where the Brief has not moved, because
the run record is overwritten at `resolve` by design and an overwrite would
orphan Packet files still on disk and still current.

#### 4.14.1 The template is a runtime-read carrier, and it points at no spec

`src/packet-template.md`, read at generation like `report-format.json` and
`workflow.json`. **Template content is operational text only** — rules that
change model behaviour at generation, kept minimal, a rule entering only with
demonstrated runtime effect.

**It carries no pointer to any specification**, which is #749's acceptance
criterion 3 and is asserted against **both** the template and the rendered
Packet, because a filled slot could carry one in. Design principles about the
template live in the Brief/Draft design record (kogaki#752), never here.

**Two clauses are harvested into it from the style contract** — the operational
plain-register definition (no unexplained term of art, one relation per
sentence, a concrete subject acting; never audience impersonation) and the
round-trip instruction (the original claim recoverable, losses explicitly
conceded). Those are **operational**, so the file the model reads is where they
belong.

#### 4.14.2 What is NOT built here, and why the deletion waits

#749 also rules `specs/spec-style-contract/` **deleted** with its obligations
re-homed. **That half is not executed**, and the reason is the sequencing rather
than the ruling:

- the two operational clauses **are** harvested, and that spec's §4 is reduced
  to a pointer at the template — so no second carrier for them exists;
- the **three prohibitions** and §4's normative ground re-home into the
  Brief/Draft design record, which is **kogaki#752 and unbuilt**. Deleting now
  would either drop them or decide #752's shape as a side effect of a
  construction act.

An eviction judgment folded into a build is one a gate cannot ratify
separately — `consulted:
product-lab@816f1df898282d1780d0753316715aa9ad3eeeff
topics/knowledge-architecture.md:341`. And what the harvest performs is the
**removal of a copy** rather than a relocation for want of a destination —
`consulted: product-lab@816f1df898282d1780d0753316715aa9ad3eeeff
topics/knowledge-architecture.md:331`.

**Retention names its own substitution.** #749 routes the stored Packet to
`runs/draft/<slug>/packets/`, per **kogaki#750, also unbuilt** — there is no
`runs/` tree. The Packet is written to the run workspace where every other
machine-local draft artifact already lives, and the command **says so on every
render**, naming the owed path. It moves when `runs/` lands.

**The next act is named:** kogaki#752 gives the three prohibitions a home, and
kogaki#750 gives the Packet its retention path; #749 closes when both have
landed and the deletion is executed against them.

## 5. The Brief's centre, and the obligations ledger inside it

### 5.1 The settled structure section

v2 binds the Brief's whole structure section, not the step shape alone:

- **`reader_start`** — where the reader is before the article. *Authored at
  **path composition**, per Candidate; lands at **Candidate selection** (v12).*
- **`reader_target`** — where the article leaves them. *Authored at **path
  composition**, per Candidate; lands at **Candidate selection** (v12).*
- **`opening_question`** — the question the article's opening puts to the
  reader standing at `reader_start`. *Authored at **path composition**, per
  Candidate; lands at **Candidate selection** (v12).*
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

#### 5.1.1 The three reader fields get their authoring block (v12, kogaki#521)

**The defect, as found.** §5.1 binds nine fields. `src/compose.mjs fill`
writes three of them (`sequence`, `strand_coverage`, the §5.2 ledger);
`src/assemble.mjs adopt-candidate` writes two (`thesis_closure`,
`tradeoffs`); `thesis` is filled at mint by construction (§5.3 v9). The
remaining three — `reader_start`, `reader_target`, `opening_question` — were
written by **no runtime at all**. Measured 2026-08-19: grepping all four
`brief/*.mjs` for the three field names returns **three hits, every one of
them in `src/brief.mjs:93-95` and every one a DECLARATION rather than a
write** — the `FIELDS` slot table that renders each name as
`*(awaiting composition)*`. No assignment, no `replaceSlot` call and no fill
path names any of the three. The reading is therefore **zero writers beside
three declarations**, which is the precise shape of the defect: the fields are
announced by the document and authored by nothing. The dogfooded Brief
`briefs/derived-artifacts-inherit-source/brief.md` completed adoption with all
three still rendering `*(awaiting composition)*` — **named at the path it had
when the observation was made, and NOT IN THE TREE**: it is the record of a
dogfood run rather than a pointer to a document, and the directory it names has
never been tracked. Left at its original `briefs/` spelling for the same reason
(kogaki#766): the rename moved the durable home, and rewriting a past
observation's path would make the record false about the run it describes.

**This is §4.3's own rule failing inside this spec.** §4.3 states it without
qualification — *"a MUST with no named judge is a rule with no occasion, and
the occasion is the scarce resource. Where this spec states an obligation
without naming its block, the obligation is defective, not merely unhomed."*
§5.1 stated three obligations and named no block for any of them. The
amendment is that rule applied to its own author, not a new rule.

**The block is PATH COMPOSITION, per Candidate.** The three fields describe a
reader's movement — where they stand, where they end, what they are asked —
and a Candidate's Reader Path *is* that movement in ordered Steps (§4.3). So
the values are composed where the movement is composed, carried per Candidate
through Candidate assembly, and land in the Brief at adoption beside
`thesis_closure` and `tradeoffs`.

Three consequences, stated so they are not rediscovered:

- **No new gate and no new check are owed**, which is what kogaki#521 declared
  out of scope. The three ride the Candidate-selection gate §6 already carries,
  exactly as `journey_coverage` rides it as per-Candidate evidence (§6.1).
- **Two Candidates may differ on the reader axis**, and that difference is real
  composition information rather than noise: a Candidate that starts the reader
  somewhere else is a different article, and the gate is where that is chosen.
- **The fill pass is NOT the site**, and declining it was a decision. Filling
  from the composed steps in `compose.mjs fill` is simpler — one writer, one
  act — but it lands the values *before* Candidates exist, so every Candidate
  would carry identical reader fields and the selection gate could not
  differentiate on them. The mint was declined on a different ground: a Thesis
  states a claim, not a reader's starting state, so a mint deriving these three
  from the adopted Thesis would be inventing material its source does not
  carry — §3's read-not-invented rule.

**An absent value REFUSES at adoption as an UNAUTHORED FIELD.** Where the
adopted Candidate carries no value for one of the three, `adopt-candidate`
refuses and **names which field is missing**. It does not fill a default, and
it does not render a typed absence and proceed.

**This refusal stands on its own ground, and NO precedent in this spec
prescribes it.** An earlier draft of this clause cited §4.4 as a carries-none
precedent; §4.4 governs a Step's grounding and the `entailed` flag and
prescribes no refusal of this kind, so the citation is **withdrawn rather than
reworded**. The one nearby precedent — §6.1 MUST 1 — points the **opposite**
way, and that contrast is the whole argument: §6.1 **discloses** an omitted
Journey because its absence is a *fact about the served material*, which a
composition sitting cannot conjure. These three fields are the reverse case.
Nothing external withholds them, so an empty `reader_start` records that the
composing act did not run. Disclosing it would leave legal precisely the state
kogaki#521 was filed about — a Brief complete through adoption with all three
still slots — merely relabelled.

The refusal is what gives THIS clause a mechanical carrier instead of a
disciplinary one:

> "an item whose discharging act is unnamed produces no surfaced next action,
> and that silence is caused by the gap rather than evidence of completeness,
> so the item is re-proposed and re-excluded forever while its unexecuted
> content propagates into whatever derives from it"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:53`

**The runtime binding has a carrier, and it has LANDED.** This clause binds a
refusal in `adopt-candidate`; the act that landed it is **PR #532, merged as
`0d008c8`**, which also reconciled `src/brief.mjs:95` with the
`opening_question` clause §5.1 carries. The spec's own v10 precedent
(kogaki#501) refuses the shape where an obligation's carrier is a mention in a
report rather than a named act, and that refusal binds this amendment too — so
the carrier is named as a **merged commit a reader can open**, never as a story
id that resolves to nothing in the tree nor as an umbrella that closes at its
own merge. The transitional sentence this paragraph carried until kogaki#531 —
naming the work as pending — is removed rather than reworded: a clause authored
knowing it would be falsified is a claim with an expiry that no act reads.

**What this amendment does not do.** It adds no field, registers no new gate,
and opens neither §4.8's arc clauses nor §6's carrier rulings. **§5.2's
"disclosure, never a refusal" stance is untouched, and this clause is not an
exception to it**: §5.2 governs the *obligations ledger*, whose entries are
judgments about material a sitting may legitimately leave open, while this
clause governs three structure fields whose absence records an act that did
not run. The paragraph above claims a mechanical carrier for THIS clause and
makes no claim about the ledger, which stays a disclosure.

**Boundary consult, recorded because the first pass missed it.** This clause
writes three disposition readings into a spec — what §6.1 prescribes, what
§5.2's stance is, and (in the withdrawn draft) what §4.4 prescribed — which is
consultation-map **entry 3, record disposition**. The prescribed survey was run
on the second pass: `gloss_index("lessons/knowledge-architecture")`
headline-first over all 60 units, and kogaki#521 read whole (body, 0 comments).
The governing line names the defect the withdrawn citation was:

> "Duplication is not the sin; **unowned** duplication is, because owning a
> fact means your version wins on disagreement and you may change it, so a
> safe copy has to be deliberately stripped of both powers. Write down which
> side wins when the two disagree."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:215`
(`conformance-copy-needs-declared-precedence`)

Applied here: this clause **owns** its refusal rule and copies no section's
disposition. Where it describes §6.1 it describes it as a **contrast it does
not govern**, and §6.1 wins on any disagreement about §6.1.

**Deferred slot: `section-5-1-bare-name-fields`.** §5.1 gives `opening_question`
and `tradeoffs` bare names where every other field carries a defining clause.
This amendment supplies one for `opening_question`, because naming its
authoring block without saying what it holds would home an obligation whose
content is still unstated. **`tradeoffs` is left bare and is named here rather
than quietly fixed** — it has a writer (`adopt-candidate`), so it is not this
issue's defect, and defining a bound field is a decision act owed on its own
licensing issue.

#### 5.1.2 The vocabulary guard's reach (v15, kogaki#537)

`theses/<slug>/brief.md` is a tracked document the owner reads directly, and
kogaki#526 installed a guard refusing spec-internal vocabulary in it — an
internal identifier or a pointer into a spec the owner does not hold. That guard
read **every line**. This clause decides **whose text it governs**.

**It governs the composer's own text.** The slot captions, the headings, the
reader-facing definition, the frame. It does **not** govern the **adopted
Thesis** or the **Strand material** — display id, slug, served cites, the survey
pin, the Brief's own name. Those arrived from the owner or from the served
substrate; they are what the Brief exists to carry.

**Why, and it is the layer argument rather than a preference.** The rule is that
*this codebase's* vocabulary does not reach the owner, and

> "a rule is enforced only at the layer where it can be broken"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:103`

An owner typing their own Thesis cannot break that rule — they are not this
system. Neither can a served rendering quoted at its pin. The governing line on
the guard's own kind says the same from the other side: it scopes the lexicon
grep to

> "the known internal vocabulary **at the boundary** … that grep covers only the
> coined-identifier sub-class"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:63`

The boundary is where this composer writes. Past it, the text is the owner's.

**The measurement, because kogaki#537 made it part of the decision.** Every
served lesson rendering was resolved and tested against the predicate:
**0 of 160**, across 16 tag shards, denominator stated. So the served side was
never the live hazard. The **owner** side always was — §5.3 v11 takes a
free-form Thesis **verbatim**, so a Thesis containing a snake_case token or a
section reference was refused **at mint**, after the one permitted gate answer
had been spent, naming a token the owner had deliberately written. That is the
defect this clause removes, and it was reachable by design rather than by
accident.

**Two things this does not do.** It does not relax the guard on composer text —
a key-bearing caption still refuses, and the check drives that refusal through
the real composer rather than asserting the predicate in isolation. And it does
not widen §5.2's disclosure stance: this is a refusal that was mis-aimed, not a
refusal converted into a disclosure.

**The cost, stated rather than left.** A leak written **into** an exempt line is
unguarded, and the exempt set is an **enumeration** — the kind that goes stale.
It is small, it lives in one function, and it is named here so a future line
carrying external content is routed deliberately: through the material emitter,
or the guard silently widens back to text this codebase did not write. The
alternative that would remove the enumeration — a positive admission test at one
typed owner-surface seam, with the lexicon grep demoted to a fast path beneath
it — is the shape `LESSONS.md:63` prescribes and is **not built here**; it is
named as the end state this clause is a fast path toward.

#### 5.1.3 The owner surface is prose; the schema stays in the record (v20, kogaki#566)

§5.1.2 decides **whose** text the vocabulary guard governs. This clause decides
**what shape** that text takes when it reaches the owner, and it is sited here
for the same reason: the composer is the layer where the rule can be broken.

**The ruling (owner, 2026-08-20).** A schema may exist internally — the record
half stays as it is — but **every owner-facing rendering is ordinary prose**.
The loose contract form: write the surface in plain prose; it must at minimum
communicate the claim and its concession. Where a schema-style presentation
does reach a surface, it carries **at most three fields** — beyond that the
presentation defeats natural line breaks and stops being readable.

**The two are not two readings of one act, and which governs is stated rather
than left to the composer.** Prose governs **everything composed FOR the owner**:
if a rendering exists because an owner will read it, it is written as prose and
the three-field bound never licenses an alternative. The bound is a **ceiling on
the other case** — a record-side presentation that surfaces incidentally, which
this pipeline should be shrinking rather than authoring. A composer choosing
between them has already made an error: the choice is whether the surface is
composed for the owner, and it always is.

**What it binds.** Every rendering this pipeline puts in front of the owner: the
thesis-determination gate's options (§5.3), the Candidate-selection gate's
rendering (§6), and the minted Brief's own composed text. **The §6 half's
discharging carrier is kogaki#568**, named here rather than left as "a companion
issue": an unnamed deferral is the defect the portfolio rule names —

> "a sitting that leaves a design choice to the implementation either DECIDES
> the fork there … or emits a NAMED SLOT whose filling is itself a decision act
> … An UNNAMED deferral is the defect."

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/knowledge-architecture.md:94`

The binding lands here at v20 and its discharge is that issue's; nothing in this
amendment's own story touches `src/assemble.mjs`. It binds the composer
and not the material — a served Gloss rendering quoted at its pin arrives as
prose already, and the owner's free-form Thesis is the owner's, exactly as
§5.1.2 scopes the guard.

**And the mint records the CLAIM, not the frame.** What the owner adopts at the
gate is a claim; the sentence that carries it to the gate also says how the
other settled members serve it, and that half is gate scaffolding. It does not
survive the mint. The Brief's Thesis section holds the adopted claim in plain
prose, and the settled members stay derivable from the Brief's own Strands
section rather than restated inline.

**Why here and not in `specs/spec-style-contract/SPEC.md` §4**, where §2 row 4
points register. That spec binds the **protocol** of an owner-authored document
and says so:

> "It binds **no authored clause**: the contract's own text is owner-authored,
> at the owner's drafts destination, and **nothing in this repository creates
> that file.**"

`specs/spec-style-contract/SPEC.md:42-45`

A rule about what **this repository's** composers may emit is not a clause of
the owner's style contract. §4's three clauses (numbering as of v1; clauses 1 and 2 moved to `src/packet-template.md` at kogaki#749 — see §4.14.1) — the operational definition, the
round-trip test, and candidates rather than a single rendering — reach this
composer unchanged and are not restated here; this clause adds the surface-shape
half that §4 has no standing to carry.

**The carrier is a shape refusal, never a string match.** A check asserting a
literal frame — `/Concedes:/` was the one that shipped
(`checks/check-brief-entry.sh`, v19 and earlier) — rewards the templating the
ruling forbids, and the served position says so at the level of the check's own
kind:

> "the check must be equivalence rather than string match: a string check would
> reward exactly the templating D1 forbids"

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/articles.md:49`

So what is checked is that no candidate's rendered halves **open with a field
label**, and that the concession is present as prose. The round-trip concession
itself is untouched — §4 clause 2 still requires it as part of the output; what
is retired is the label announcing it.

**The producer that earned this clause, named rather than generalised.**
`composeThesisCandidates` emitted three fixed frames — a colon-framed spine
sentence, a semicolon-spliced member list, and a `Concedes:` field — so the
owner read labelled fields where §4 promises plain register, and the frame then
rode the adopted Thesis into the minted Brief. Two mechanical defects travelled
with it: the served headline already ends in a period and the template appended
a second, and full sentences joined with `"; "` produced one unreadable
sentence. Both are removed at the producer.

**Two costs, stated.** The rendered options no longer restate the supporting
members' headlines inline, so an owner comparing candidates reads the leads and
the count rather than the full list — the members are on the Full Report the ids
were read from and in the Brief's Strands section, and this is the run-on the
ruling names, not a narrowing of what the gate discloses. And the
`rest`-filtered-by-position property `checks/check-brief-entry.sh` guarded is
retired **with its mechanism** rather than re-guarded: nothing splices a
supporting member's sentence into a candidate any more, so the defect it caught
is unproducible. The check's replacement asserts that unproducibility directly.

**That retirement is licensed rather than asserted.** The served rule on this
act class is that members are reviewed rather than deleted, with one exception,
and this is the exception:

> "**Admission requires a REMOVAL SIGNAL DECLARED AT BIRTH, and retention runs
> on a catch ledger over EXERCISED runs; never-fired members are review
> candidates, never auto-deletions.** … delete only retired-subject orphans
> whose catch record can never matter"

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/claude-code-ops.md:81`

The retired case's **subject** is gone, not merely quiet: with no splice there is
no filter, so no future run can exercise the guarded path and no catch record it
could accumulate can matter. A member whose subject a diff removes is the
retired-subject orphan that line permits deleting; a member that simply has not
fired is not, and nothing here widens the permission to that population.

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

### 5.3 The durable home and the entry point (v7, kogaki#482; re-sequenced v9, kogaki#494; slug paired into the one gate at v11, kogaki#518)

**Paired into the one gate at v11 (kogaki#518, owner ruling 2026-08-17
recorded in kogaki#494's thread; rendering ruled 2026-08-18).** The v9 clause
below — *"presented through the question UI for approval"* — is a SECOND ASK,
and it is superseded. **There is no separate slug question at any point in
this flow.** The thesis-determination gate presents each option as a
**(Thesis, slug) pair**: `enter` derives one slug per Thesis candidate and
carries it in the gate payload, and adopting an option adopts both halves.
The mint consumes the adopted pair. The v9 text is kept below so the
supersession stays countable, exactly as v9 kept v7's.

*Why a pair may ride one gate at all, and the two conditions it may not shed.*
The merge is not free — a gate may carry a second decision class **only if
that class is separately RENDERED and separately DECLINABLE**, and a slug
riding invisibly inside a Thesis option would be a second judgment ratified
with only the first actually asked:

> "A gate may carry a SECOND DECISION CLASS only if that class is separately
> RENDERED and separately DECLINABLE. … approving the plan would ratify two
> judgments … with only the first actually asked. So such a close must appear
> as its own visible element of the plan … and be removable without
> hand-editing the message or abandoning the group."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/archive/knowledge-architecture.md:159`

So both conditions bind this section, and neither is presentation polish:

- **Separately rendered.** The slug appears as its own visible element of the
  option — the **bare slug**, never the `theses/<slug>` path, **since the option
  is already dense** (owner rendering ruling 2026-08-18). Placement in the body
  rather than the label was a **try-one-first instruction, not a settled
  placement**: if it reads badly in use, it moves to the label, and that move
  needs no amendment here.

  **The bare-slug ground is RE-HOMED rather than dropped, and it survives the
  move.** It was written as "since the option **body** is already dense" and the
  body is no longer the site — but density was never a fact about the body: it
  is a fact about an option carrying a Thesis, its concession and a name at
  once, which the label now carries in one line. So the ground reads "the option"
  and still does its work. Dropping it while the rule it grounds survived would
  leave a reader unable to ask whether it still applies —

  > "when such an input is removed, its rationale must be re-homed rather than
  > dropped, or it returns as an argument for restoring the element"

  `consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:35`

  **THE CONDITION FIRED, and the site is now the option LABEL (kogaki#567).**
  The body entry read badly in use at the 2026-08-20 dogfood — it sank the name
  below the fold of an already dense option, so the owner answered a pair having
  seen one half. The move is the one this clause pre-authorized, so no amendment
  was owed and none is claimed here; **what was owed was this record**, because a
  release condition that has fired and gone unrecorded reads to the next reader
  as a choice still open. The property is unchanged and only its site moved: the
  name is set off and named rather than folded into the Thesis prose, and it
  renders once.

  **Where the disposition is read, and what this clause does not assert.**
  `gates/registry.json`'s `brief-thesis-adoption` entry carries the live shape,
  and kogaki#567 carries the move. This clause names those carriers and states
  no reading of their current state — a record that asserted one would rot the
  next time either moved.

  `consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:97`
- **Separately declinable.** An owner who adopts a listed Thesis but wants a
  different slug says so **in the same one answer**, and the adopt act takes
  the pair as two arguments — the adopted Thesis and an optional slug
  override. Declining the slug must never cost the owner the Thesis: it
  requires neither restating the Thesis nor abandoning the option. The
  free-form channel remains what it was at v9 — an answer written there is
  the owner's own Thesis, taken verbatim, and its slug derives from it.

*What is NOT superseded.* The slug is still **thesis-derived and
owner-decided**, so SPEC-terrain §12.2's no-machine-identity repair is kept
by this route exactly as v9 kept it by its own. The owner still decides the
slug; what is removed is the second interruption in which they decided it.
And the two-gates reading is not merely permitted to collapse but **owed** to:

> "two gates whose `owner_decision` resolves to the same vocabulary entry at
> the same artifact are ONE gate, the second being a defect"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:63`

**Re-sequenced at v9 (kogaki#494, owner ruling 2026-08-17).** Brief creation
runs: **entry resolves the settled Strand set** (LessonDisplayIDs against the
survey record, every refusal below unchanged) → **the thesis-determination
gate** (kogaki#488) → **the mint**. The slug is **one candidate derived from
the adopted Thesis**, presented through the question UI for approval, with
free-form override; the approved slug names `theses/<slug>/`. Two grains of
v7 are superseded, stated rather than absorbed:

- *"the slug is owner-chosen **at entry**"* → the slug is **owner-approved at
  Thesis adoption**, derived from the Thesis. The owner still decides it —
  approval with free-form override — so §12.2's no-machine-identity repair is
  kept by a different route.
- *the mint-at-entry checkpoint* → **pre-Thesis state is machine-local run
  state** — a machine record, legitimately machine-local per the served
  artifacts-live-where-human-works split (`topics/knowledge-architecture.md:28`,
  quoted below). The owner artifact begins exactly when the first piece of
  substantive owner judgment — the Thesis — exists.

Unchanged by v9: the directory-per-Brief home (kogaki#482's grain), the §5.1
typed-unfilled-slots interior for everything **downstream of the Thesis**
(the `thesis` field itself is filled at mint by construction), idempotence-
by-slug with collision refusing, the closed-set invariant from the mint, and
creator-never-editor. Where v7 prose below says the mint or the slug happens
"at entry", this block is the current reading; the v7 text is kept so the
supersession stays countable.

**Promoted by a run, exactly as the promotion rule required.** kogaki#127's
close left "Reader Path composition as a live workflow, the Step record as an
artifact, the path-review agent" deliberately uncarried, with the rule that an
item enters only when a run of the product surfaces it — never ranked from
inside the loop (`consulted:
product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:14`). On
2026-08-16 the owner attempted to start a Brief for group `G1-1` of a pulled
Full Report and found no entry point. This section carries the **entry point
and the home** that demand instance names — and only those: the live
composition workflow, the Step record and the path-review agent remain
uncarried, each still awaiting its own surfacing run.

**The durable home is a DIRECTORY PER BRIEF: `theses/<slug>/brief.md`,
tracked in the repository.** The class was settled by the hub and is applied,
not re-decided:

> "An adopted Brief IS a second declared-product class and belongs in the
> host repo … a run workspace holds things whose lifetime is the RUN, a
> declared product holds things whose lifetime is the OWNER's, and the
> Brief's stated lifecycle — created and deleted casually, re-drafted from
> frequently — puts it squarely in the second."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:45`

> "a MACHINE RECORD (identity, run workspaces, logs) is legitimately
> machine-local; a HUMAN-FACING ARTIFACT (a report the owner reads, a screen,
> a document) must live where the owner works."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:28`

What this section's own decision adds is the **grain** (owner selection at
the kogaki#482 gate, 2026-08-16): a directory, because manifest item 5's
remaining future — checkpoints and resume — then lands **beside the
document** with no re-siting decision, which is the same one-decision-now
shape §2's gate table already prefers. The declined arm is recorded so it is
not re-proposed blind: **one file per Brief** (`theses/<slug>.md`) is the
flattest enumeration and was declined because checkpoints would then either
ride inside the document or reopen the home question this section exists to
close. **The cost is stated:** a directory holding one file today. Tracked
rather than gitignored, because a Brief is a product the owner enumerates,
selects and re-opens — the exact acts `articles.md:45` records failing when
the home was a recency-keyed workspace. The slug is ordinary human
vocabulary, never a machine identity — identity-named files on an owner
surface are the defect §12.2 of SPEC-terrain repaired. *(v7 read "owner-chosen
at entry"; superseded at v9 — the slug is owner-approved at Thesis adoption,
per the block above.)*

**The entry point is a NEW invocation — a `brief` skill fronting a runtime —
and it sits OUTSIDE Terrain.** Terrain ends at Strand exploration and its
spec neither mentions nor guarantees a Brief launch (owner correction
2026-08-09; the boundary is cited from `specs/spec-terrain/SPEC.md` §13.2 and
not re-argued). The composing producer is the runtime, never the session: the
skill drives inputs and hands over the artifact the runtime wrote —

> "owner-facing content that has a composed artifact goes through the seam
> and the reply carries a pointer rather than a restatement."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:131`

**The input unit is the `LessonDisplayID`, and nothing else** — SPEC-terrain
§14.3's join key, "assigned once in the survey record … and a Brief launched
from either", stable within a pin. The entry point takes the settled Strand
set as `L<n>` ids plus the survey record that assigned them, resolves each id
against that record, and **refuses** an id the record does not carry — a
refusal naming what was entered and what the record holds, never a silent
drop (the completeness rider of §3, applied at entry). **Group and SubGroup
ids are refused BY NAME**: `G<n>`/`G<n>-<m>` are minted per report identity
(§12.1 of SPEC-terrain) and name a grouping, not the settled set; an entry
point that accepted one would key a Brief to a token a pin advance renumbers.
The refusal says exactly that, and points at the report's member headings
where the `L<n>` ids stand beside the grouping the owner navigated by.

**What the entry point MINTS is the §5.1 structure, empty where composition
owes it.** `theses/<slug>/brief.md` opens with the reader-facing definition
of "brief" — coining an owner-facing term obliges a reader-facing definition
in the same act (`consulted:
product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:132`)
— then carries the §5.1 fields: the selected Strands with their pins and
served cites resolved from the survey record — each cite in the identity form
`gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey> @<pin-sha>`
(SPEC-draft-command v2, kogaki#600; composed at the producing site by
terrain's survey, kogaki#612 — the positional line-number form is
unproducible and the resolve check refuses it); `thesis`, `sequence`,
`reader_start`, `reader_target`, `opening_question`, `strand_coverage`,
`thesis_closure`, `tradeoffs` and the §5.2 ledger present as **typed unfilled
slots**, never omitted — an absent field and a field awaiting composition are
different silences, and only the second lets a later sitting resume. The
Thesis is what Brief composition determines from the settled set; the mint
never invents one (§3's read-not-invented rule, applied to the minting
act). *(At v9 the mint runs at Thesis adoption, so `thesis` is filled at
mint by construction; the typed-unfilled-slot rule governs every field
downstream of it.)*

#### The invocation completes the Brief (v17, kogaki#522)

**A command is named for the artifact it completes, and it runs until that
artifact is complete** (owner ruling 2026-08-18). `/brief` is a command for
completing a Brief, not for creating a Brief template. So one invocation drives
the whole arc — entry, the thesis-determination gate, the mint, path
composition, path review with §4.11's revise routing, Candidate assembly, the
Candidate-selection gate, and adoption — and ends only at a **filled** Brief, or
at an owner answer that ends it: the premise's negation at either gate, or "none
of these" at the selection gate.

**A human gate is not a stop.** The workflow raises it and continues on the
answer. What is abolished is the **default** stop — ending mid-arc because the
mint happened to be the last act anyone wired up. The observed specimen is the
2026-08-18 dogfood run: it ended after the mint with every composition field an
unfilled slot, and the owner typed "keep going" to get the rest.

**A mid-workflow stop is legitimate only when it is NAMED, and only on an
inspection-need** — a point where the owner must leave the conversation to read
another console or surface before the next gate can be answered honestly.
Terrain's co-tag inspection is the named precedent.

**This flow has no such point, and the finding is recorded rather than left to
be re-derived each sitting.** Both gates are answerable from what the runtime
renders into them: the thesis gate carries its candidates composed from the
settled set with each one's concession stated (§5.3 v11), and the
Candidate-selection gate carries each Candidate's composition-time reasoning as
its evidence (§6), including what it bridged (§4.11). Neither asks the owner for
a fact the payload does not contain. A later sitting that finds one adds the
named stop **there**, with its ground; it does not restore the default.

**The rule's LIMIT, because a served position bounds it and the issue recorded
none.** kogaki#522's `consult:` line reads `none: … no served position
discriminates it yet`. One does — not the rule's truth, its edge:

> "It is a genuine requirement that a command finish its job rather than leaving
> a person to hand-copy text, but finishing is bounded by ownership: when a
> workflow crosses a line where one side proposes and another side approves,
> there is one completing action per side, not a single one spanning both. …
> If the producer can write directly past the receiver's gate, that gate is
> decorative in everything but name."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:203`

The test it supplies is **does the workflow write past a gate its owner owns**,
and this one does not: each gate blocks, nothing under `theses/` exists before
the thesis is adopted, and `adopt-candidate` refuses without a recorded owner
answer. Completing the Brief is therefore one completing action on **one** side
of no ratification boundary. Were a second party's gate ever added to this arc,
this clause stops at it rather than driving through it.

**What "exactly one owner question" means, stated because extending the flow
makes the unqualified reading false.** §5.3 v11's ruling bounds the **pre-mint**
segment: one gate carrying the (Thesis, slug) pair, and no second slug ask. The
completed flow raises **two** gates in total, the second being §6's
Candidate-selection gate, which v11 never spoke to. The property v11 protects is
that the owner is not interrupted twice for one decision class; the mechanism is
the single pre-mint gate. **The property binds; the count does not** — a reading
that froze the number at one would forbid the selection gate this spec has
carried since v1.

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:299`
— "state which of the two actually binds … the first time somebody can deliver
the same property by a better mechanism, the text supports two equally honest
readings."

**deferred slot: `single-path-fill-route`.** `src/compose.mjs fill` writes a
sequence from one composed path, bypassing assembly and the selection gate. The
arc above always routes through §6, so `fill` is not on it. Whether it is a
legitimate second route or a pre-§6 remnant is a decision act owed on its own
licensing issue with alternatives and a receipt — **filed as kogaki#551**,
which carries both arms and their costs. This sitting names the slot, schedules
its discharge, and changes nothing about `fill`. The issue number is here
because a slot whose only carrier is a paragraph somebody must re-read is not
scheduled at all: a tracking artifact names its discharging act.

**The closed-set invariant binds from the mint.** The Strand set the entry
point writes is the set composition may use; growing it is an owner act that
routes back through Terrain, never a Brief fetch (`consulted:
product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:13`).

**What the invariant forbids is GROWTH, not RESOLUTION (v14, kogaki#528).**
Reading the served rendering of a Strand the set ALREADY NAMES adds no member,
so it is not a Brief fetch and never was; the invariant and the prohibition on
resolution were conflated by `composeThesisCandidates`'s own comment ("never
fetched, never widened"), which read the second conjunct as implying the first.
The distinction is the one the whole section rests on: **the set is owner state
and the material is served state**, and only the first is closed here.

Two consequences bind the implementation rather than being left to it. The
resolution is **terrain's**, called by the Brief lane and never performed by it,
because terrain is the one component that reads served renderings (§3, §9) — a
second reader would put the seam boundary in two places. And it is **bounded by
the settled members' own tags**, never by the corpus, which is why the
alternative of attaching a rendering to every candidate at survey generation was
refused: that is the whole-corpus prefetch §9 already names.

An unresolved rendering **discloses** with terrain's abnormal marker and is
never substituted with the slug — a substitution would restore exactly the
defect kogaki#519 reports, silently. An unavailable seam **degrades** rather
than blocking: a Brief stays startable, per the founding rule that the
substrate is an enhancer and never a dependency.

**Idempotence is by slug, and a collision refuses.** Re-invoking with an
existing slug refuses rather than overwriting — a Brief is owner state from
the moment it exists, and the entry point is a creator, never an editor.

**What this does to §7.2's `instrument: none`, named here because the
declaration binds at authoring time and this amendment is the authoring
moment (PR #483 round 1).** §7.2's first measured ground reads "No Brief or
Draft carrier ships here today … there is no run to sign, so there is
nothing for a ledger to accumulate", beside §7's dated corpus measurement.
The entry point's landing (story 1.71) falsifies the **carrier half** of
that premise going forward: `theses/` will exist and hold documents. It does
**not** by itself falsify the ground's conclusion — a minted Brief with
every composition field an unfilled slot is still **no signed run**, and the
cross-run signature ledger the trigger names still does not exist — so the
hold's `instrument: none` **stands, on its second ground alone**, and the
sitting that lands the first *composed* Brief (a filled sequence, a run to
sign) is the one that owes §7.2 a re-read. Stated here rather than left,
because a hold resting on a premise a sibling section quietly retired is the
false-premise inheritance §7.2's own measurement discipline exists to
prevent.

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

### 6.1 Journey register is an axis of Candidate differentiation (v10, kogaki#492)

**Candidates differ in reader experience, and journey register is one of the
ways they differ.** This is where §2 row 2's incorporation obligation is
discharged — by the differentiation Candidates already carry, not by a gate of
its own. The siting, the ruling behind it, and the supersession it records are
at §4.10; what follows is the binding.

**The gate is the one that already exists.** No gate is registered by this
section, exactly as §6's opening states for the whole of §6: the register
choice is made by selecting a Candidate at the Candidate-selection gate. There
is **no register vocabulary and no standing menu** — the three registers once
floated (worked example, short story, standalone paragraph) were ideas, never
a menu; Candidate composition inspects **this** Brief's state and composes
what fits **this** article.

**The 2026-07-31 frozen requirements, carried forward verbatim as composition
MUSTs.** They bind **every** composed Candidate, not a favoured one:

1. **Place every selected member's journey material, or disclose the
   omission** — the completeness rider of §3 and §5.2, reaching Candidate
   composition unchanged. A Candidate that silently drops a selected Strand's
   Journey material is non-conformant; one that places none of it and says so
   is conformant.
2. **Cite the served arc at the pin** — the Strand's Journey rendering, at the
   Brief's own pin, never a paraphrase.
3. **Honor the ARC-SHAPE FLOOR: before-position → what broke →
   after-position, never rule-statement register.** The floor binds **every**
   Candidate offered — a Candidate that flattens an arc into a rule statement
   is not composable, whatever its other merits. This is the one requirement
   the 2026-07-31 design called new work; the other three are the
   thesis-candidate requirements re-used verbatim.
4. **Enumerated, never ranked-and-trimmed, and free text wins** — the same
   presentation discipline §6's Candidate set already carries, which is why
   this requirement costs nothing here.

**Vacuous, never violated, on a Brief with no Journey material.** Journey
register is contingent on the selected Strands carrying Journey material. Where
none do, these MUSTs bind nothing and a Candidate set that differentiates on
other axes alone is fully conformant — the contingency §4.10 states, applied.

**Judged as judgment, never as a lint.** Conformance is read at **path
review** (§4.8's arc-integrity clauses, per Candidate, as `src/review.mjs`
already runs them), and surfaced to the owner as reasoning on the Candidate
per §6's evidence rule. Nothing here becomes a check: §4.6 clause 3 and §6's
"no check is registered by this spec" both reach this section unchanged.

**The runtime binding is owed and CARRIED, not deferred namelessly.** The
Candidate composer shipped after §4.10 was written (`src/assemble.mjs`,
`src/compose.mjs`, `src/review.mjs`; kogaki#489/#490/#491), so these MUSTs
have a live target this spec does not bind in this sitting. **kogaki#501** is
that carrier.

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

### 6.9.0 The input grammar, measured against the first real input

**The paragraph above describes the input as "a free-form markdown file the
owner writes". That description was written before any such file existed. One
now does, it was authored before this sitting, and it is the specimen this
section binds the grammar to** — repository-root `moves.md`, 512 lines,
owner-authored, deliberately untracked. Measured rather than assumed:

| property | measured on the specimen |
| --- | --- |
| records | 22, each a YAML mapping carrying exactly §4.2's eight keys **in §4.2's order** |
| separator | **one blank line**, and nothing else — no `---`, no heading, no fence (but see the record-boundary rule below: the blank line is not what the grammar binds) |
| field form | `id` and `status` plain scalars; the other six all `>-` folded block scalars |
| `status` values | `observed`, uniformly — as §7.6 says they enter |
| markdown constructs | **zero** — no heading, list, fence, rule or blockquote anywhere in the file |
| excluded draft fields | **zero** — `material_roles`, `compatible_previous/next_moves` and `examples` are all already absent |
| `sources` shape | provenance prose naming a source passage; **zero** occurrences of `path:line@sha` |

**Three corrections to §6.9's stated input follow, and each is a correction
because the specimen contradicted it, not because a tidier wording was
available.**

**1. The input is not markdown, and the grammar must not require it to be.**
The specimen carries a `.md` extension and contains no markdown at all. A
normalizer that locates records by heading or by fence finds **nothing** in the
first file it is ever handed. The bound grammar is therefore: **a record begins at a
column-0 `id:` key, and runs to the next one or to end of file; each record is
parsed as a YAML mapping under the four admission conditions below.** Markdown
constructs are **not required** — the extension is the owner's filing
convenience, not a promise about the interior — and they are **refused wherever
a grammar can see them**, by condition 4, which names the offending line. The
one place it cannot see is stated with condition 4 below rather than left for a
reader to discover: a bullet among the items of a legal block sequence is
indistinguishable from data.

**That refusal is stated as a rule rather than as a parser behaviour, and the
correction is worth recording.** This clause first said markdown was "tolerated
and ignored"; the repair replaced that with a claim that a heading, list, fence,
rule or blockquote "breaks the record's parse **loudly**". **Both are false, and
they are false in opposite directions.** Measured under PyYAML 6.0.3: a mid-file
list, fence, `---`, `***` or blockquote does break loudly — but `#` is **YAML's
comment character**, so a markdown heading at column 0 terminates the preceding
folded scalar and is read as a **comment: silently discarded, no error, no line
named**. Two records on either side of a `## notes` line are both admitted, and
the heading vanishes.

**The exercise could not see it, for exactly the reason the specimen could not
see defect 1.** The only heading shape exercised was a *leading* one — where
condition 1 fires first and masks what the parser actually does. A mid-file or
trailing heading was refused by nothing. **This section's own recorded failure
shape reproduced one turn later: a normative claim about a failure mode,
exercised only on the axis where a different rule answers.** Recorded rather
than tidied away, because a normalizer born against a false statement of its own
failure mode is what kogaki#220 would have consumed.

So the loud-parse claim is **withdrawn entirely** and replaced by condition 4,
which sees every markdown construct at every position — the comment case
included — and makes the failure mode uniform and stated rather than inherited
from whichever parser is in use.

**`id` MUST be the record's first key — an anchor can only see a record that
starts where it looks, and that precondition is stated rather than assumed.** A
record written with `status:` above `id:` is not seen as a boundary at all: it
is absorbed into the record above, which silently acquires the wrong `status`
while the record below loses its own. That is the same failure correction 3
refuses by name, and a repair that reintroduced it would be worth nothing.

**Four conditions admit a record. Together they leave exactly one quiet failure,
which condition 4 names and bounds rather than claiming away:**

1. **Nothing precedes the file's first `id:`.** Any leading text — a stray
   field, a markdown heading — is refused, naming the line. This is the
   condition that catches an out-of-order *first* record, which no per-record
   check can see.
2. **Duplicate keys within a record are refused rather than resolved.** The
   whole-file collapse of correction 3 is a record with 22 duplicates of every
   key; it cannot be quiet under this rule even where the parser would allow it.
3. **After the strip step, a record carries exactly §4.2's eight keys — no more
   and no fewer.** This is not a new requirement: §6.9 already binds the
   proposal to *exactly* the eight-field schema. The ordering matters — the
   excluded draft fields are stripped **first**, so their presence routes to the
   strip step rather than to a refusal; what a short or long field set then
   means is a genuine defect. A record that absorbed its neighbour's `status`
   leaves that neighbour with **seven**, and this is the condition that catches
   it.
4. **Every column-0 non-blank line inside a record is a `<key>:` line, or a
   block-sequence item belonging to an OPEN sequence — the token being `-`
   followed by a space or end of line, which is what makes a `---` rule foreign
   to a sequence rather than an item of it, and keeps that catch on the rule
   instead of on the parser. `***` was never at risk — it does not begin with
   `-` — and is named here only because the first draft of this clause claimed
   the pin for both.** A sequence opens
   at a column-0 key carrying no value, stays open across its own items and
   their indented continuations, and closes at the next column-0 key — or before
   its first item, if an indented line arrives first, because that line is the
   key's value and no sequence was ever opened.
   Continuation lines are indented, because that is what YAML
   already requires of them, so any *other* unindented line is foreign to the
   record it sits in — a heading, a fence, a rule, a blockquote, a bullet after
   a scalar. This is the condition that sees a `#` heading, which conditions 1–3
   and the parser all miss. It refuses **by position**, so a construct is caught
   wherever it appears rather than only where it happens to break something.

   **The `-` exemption is not a loophole, and it is here because condition 4's
   first draft over-refused.** A YAML block sequence may legally sit at column 0
   under its own key, and a record written that way parses to the identical
   value as the indented form — so refusing it would reject **valid input on a
   purely typographic axis**, and would falsify §6.9.1a's promise that a saved
   file is byte-identical in form to what the owner authored. A *markdown* list
   after a `>-` scalar is still refused — by **condition 4 itself**, via the
   qualifier below, rather than by the parser that also happens to reject it.
   **The division of labour is the point** — condition 4 catches what the parser
   accepts silently, and the parser catches what is not YAML. Neither is asked
   to do the other's job, and neither is left resting on the other.

   **The open-sequence qualifier is part of the exemption and not decoration,
   and it took THREE attempts. The three failures are kept because they are the
   same failure, and this section's subject is that failure.**

   - **No qualifier at all.** The exemption reached every `-` line anywhere in a
     record, including a bullet after a `>-` scalar — which the parser happens
     to reject today, so the rule rested on the parser rather than on itself.
   - **`no inline value`.** Tested the wrong property one position over: a key
     whose value is an **indented** scalar or mapping carries no *inline* value,
     so a column-0 bullet after it passed the rule and was again left to the
     parser.
   - **Adjacency (`immediately follows`).** Over-corrected. Only a sequence's
     **first** item can immediately follow its key, so every item after the
     first was refused — rejecting a plain two-item sequence, a sequence of
     `>-` folded scalars, and a sequence of mappings, all legal YAML. It also
     made the residue below **unreachable**, so the section's grammar
     contradicted its own declared bound.

   **The property is sequence membership, and it needs the state the first three
   tried to infer from one line of context.** A sequence is open or it is not;
   an item is admissible exactly when one is open. Two of the three failures
   were under-refusals resting on the parser and one was an over-refusal of
   valid input — **the same defect from opposite sides**, which is the axis this
   section keeps rediscovering and now states as the reason each attempt is
   recorded rather than replaced.

   **ONE RESIDUE REMAINS, AND IT IS BOUNDED AND STATED RATHER THAN CLOSED.** A
   markdown note bullet written *among* the items of a legal column-0 sequence
   is **indistinguishable from data** — under a bare key, `- note to self` *is* a
   sequence item, and no grammar can separate it from `- one`. It is admitted,
   silently, as content. This is the one place §6.9.0 does not deliver "no quiet
   failure", and it is written down because the alternative — leaving the
   unqualified claim standing — is the defect class this whole section exists to
   record. The exposure is small and its shape is exact: **only** inside a block
   sequence, **only** where the owner chose a sequence for a field §6.9.1a
   expects to be prose — §4.2 fixes the field *set* and types only `status`, so
   the prose expectation is §6.9.1a's and is cited there rather than
   misattributed — and it costs a wrong value rather than a lost Move. The selection
   screen is where a human sees it, which is the same instrument §6.9 already
   relies on and not a new one.

**Exercised, with each case's catching condition named.** A case is listed only
where it was first observed to **fail** against the previous text and then to
pass against this one — a case never seen to fail is not evidence:

| input shape | result | caught by |
| --- | --- | --- |
| the specimen `moves.md` | 22 admitted | — |
| two records, first `intent` spanning two paragraphs | 2 admitted, scalar intact | — |
| **a record whose `requires` is a column-0 block sequence** | **admitted** | — (condition 4's first draft refused this; see the `-` exemption above) |
| `status:` before `id:`, **as the file's first record** | refused twice over | 1 and 3 |
| `status:` before `id:`, **mid-file** | refused twice over | 2 and 3 — condition 1 never fires here, and the two variants are listed separately because crediting one row to "1 and 3" would misattribute the mid-file case |
| **mid-file `## heading`** | **refused** | **4** (was silently discarded) |
| **trailing `## heading`** | **refused** | **4** (was silently discarded) |
| mid-file fence / `---` / `***` / blockquote | refused | 4 (was a parser error, now a rule) |
| **`- bullet` after a `>-` scalar, inside a record** | **refused** | **4** — no sequence is open there; before any qualifier it was refused only by the parser |
| **`- bullet` after an INDENTED value or mapping** | **refused** | **4** — the indented line is the key's value, so no sequence opened; the case the `no inline value` qualifier missed |
| **2-item column-0 sequence; a sequence of `>-` scalars; a sequence of mappings; a blank line between key and sequence** | **admitted** | — all four were **refused** by the adjacency qualifier and are admitted by open-sequence; listed because the over-refusal was found only by measuring valid input |
| mid-file **markdown** list between records | refused | **4** — the qualifier moved this catch to the rule; **before it the catcher was the parser**, not condition 2 (an unqualified exemption swallowed the `-`, and the `ParserError` meant no mapping was built, so condition 2's duplicate-key detection never ran). Re-measured at this head rather than carried forward |
| **a note bullet among the items of a legal column-0 sequence** | **ADMITTED as data** | **none — the stated residue.** Recorded rather than claimed closed: inside an open sequence it *is* an item and no grammar separates it from `- one`. Re-measured at this head: the adjacency qualifier had made this row **unreachable**, so the grammar contradicted its own declared bound, and open-sequence restores it |
| leading `## heading` | refused | 1 — and it is listed to record that condition 1 **masks** the parser here, which is why it was the wrong shape to have exercised alone |

**Where the conditions run, since they do not all run at the same stage.**
Conditions 1, 2 and 4 are **parse-time** — they are properties of the input
text. Condition 3 is **post-normalize**, after the excluded draft fields are
stripped. The section calls all four "the input grammar" for brevity; they span
two pipeline stages, and the ordering is load-bearing rather than incidental.

§4.2 fixes the field set and §6.9.1a fixes the order; the specimen already
conforms to both. None of this constrains anything the owner was doing — it
makes a deviation announce itself instead of eating a Move.

**One nit is DECLINED on measurement, and the reason is recorded because the
proposed fix would open a hole.** It was suggested that condition 1 skip blank
and comment lines, so that an inert YAML comment at line 1 is not refused. It is
declined: a leading `## heading` sits **before the file's first `id:`**, so it is
inside no record and **condition 4 cannot see it**. Condition 1 is the only
instrument that reaches it. Skipping comments there would make a leading heading
silently discarded again — reintroducing, at line 1, precisely the defect
condition 4 was added to close. **The cost is accepted, and it is stated in
full rather than by its most sympathetic instance:** condition 1 refuses a legal
inert comment above the first record *and* a leading `%YAML` directive;
condition 4 refuses a column-0 `#` comment inside a record and inside an open
sequence. All four are the design working as intended, and all four are refused
loudly with the line named. Listing only the first would understate what the
declination buys.

**The boundary is the column-0 `id:`, NOT the blank line, and the difference is
load-bearing.** This section's first draft said "split on blank lines", which
the specimen satisfies — its 22 records split identically under either rule —
and which **§6.9.1a's own guidance then falsifies**: a field that is genuinely a
paragraph is written as a `>-` folded scalar, and a folded scalar may contain a
blank line between its paragraphs. Exercised on a two-record input whose first
`intent` carries two paragraphs, the blank-line rule yields **three** blocks:
the first parses as a **partial mapping with the second paragraph silently
discarded**, the second raises a scanner error, and only the third is a whole
record. The column-0 rule yields two records with the folded scalar intact.

The specimen could not have caught this — all 22 of its records are
single-paragraph — and §6.9.0's own record-count instrument catches only the
loud half, since a partial mapping still counts as a block. **A grammar that the
authoring guidance in the section next door invalidates is the defect worth
recording**, and it is recorded rather than quietly replaced.

Indentation is what delimits a block scalar in YAML, so the column-0 anchor is
reading the record boundary off the same property the parser does, rather than
off a whitespace convention that happens to coincide with it on one input.

**2. Stripping the excluded draft fields is CONDITIONAL, never a
precondition.** §6.9 states as fact that the input carries them, because
`delete-me.md`'s drafts predate the field subset. The specimen carries none —
the owner stripped them while authoring. The normalizer strips what is present
and requires nothing to be, and it does **not** treat their absence as evidence
that it was handed the wrong file.

**3. A whole-file parse is NOT a record parse — this is the failure that cannot
announce itself, so it is refused by name.** (The heading of this correction
formerly read *"the blank line is the record separator"*, which correction 1
above withdrew forty lines earlier. It is corrected here rather than left as the
same contradiction-with-the-neighbouring-clause this section exists to record —
this time §6.9.0 against itself.)
Measured on the specimen: a whole-file YAML parse **succeeds**. It returns one
mapping, because 22 records sharing eight key names collide key-for-key and the
last one wins — **21 Moves are lost and no error is raised**, and the surviving
mapping is byte-equal to the *last* record, which is how the mechanism was
confirmed rather than inferred. A parser cannot discover this from its own
return value: it gets a well-formed Move.

**The scope of that measurement, stated rather than overclaimed:** duplicate
keys are an error condition in the YAML specification, and a strict parser is
entitled to reject the file loudly. What was measured is **PyYAML 6.0.3** doing
the quiet thing — the parser is named, because "a permissive parser" is not a
fact anyone can re-measure. The rule above is therefore written to hold under
**either** parser: it never relies on the silence, and by refusing duplicate
keys itself it stops depending on the noise.

So, normatively: **the split precedes the parse, and a whole-file parse is
refused rather than merely discouraged.** The command reports the **record
count it parsed** to the owner at the selection screen, beside the count of
blocks it split — because the only instrument that can observe this defect is a
human seeing `1` where they wrote `22`. This is not a lint and adds no verdict
machinery: it is an arithmetic fact the command already holds, displayed rather
than withheld.

**What the specimen settles about fork (a), which is the ground the selection
rested on.** The owner is *already authoring in §4.2 block form* — unprompted,
before any command existed to read it. Form (a) is therefore not a shape
ingestion imposes on the owner's input but **the shape that input is already
written in**, and the normalize step over this specimen is close to identity.
That ground was carried into this sitting as an assertion and is recorded here
as a measurement.

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

**The selection is carried forward, not re-opened.** The owner selected (a)
again at this sitting's gate; arm (b) stays declined on the grounds already
recorded above — composed-rather-than-derived INDEX rows, and a missing field
being invisible in prose — and those grounds are cited here rather than
restated.

#### 6.9.1a What (a) entails, constructed

§6.9.1 selected the form and stopped there. The three things that follow
mechanically from it are written here, because kogaki#220's construction
consumes this library and cannot consume a shape that was chosen but never
drawn.

**The file body.** The eight §4.2 fields, in §4.2's order, as a YAML mapping —
**byte-identical in form to the block the owner authored**, which is what makes
the normalize step over a conforming input close to identity. No fence, and no
`---` delimiters: front-matter delimiters imply a document below the metadata,
and here the block **is** the document. A field whose value is genuinely a
paragraph is a `>-` folded scalar, as the specimen already writes them.

**The filename.** `moves/<id>.md`, where `<id>` is the `id` field and the whole
stem — **derived, never composed.** A review that renames a Move renames its
file, and nothing else has to be updated to agree, because nothing else stores
the name. Two accepted Moves cannot share an `id`, and the collision surfaces at
the selection screen as the dedupe judgment §6.9 already assigns to review,
never as a silent overwrite.

**The INDEX row.** `moves/INDEX.md` carries one row per file, sorted by `id`:

| column | source |
| --- | --- |
| `id` | the file's `id` field, which is also its stem |
| `status` | the file's `status` field |
| `intent` | the file's `intent` field |

**Every column is read off a file; none is composed.** This is precisely the
property arm (b) could not have, and it is why the regeneration contract binds
**freshness only** — INDEX is rewritten whole from the files at each ingestion
run, and a stale INDEX is a run that did not happen rather than a derivation
that drifted. Nothing reads INDEX to decide anything: it is a reader's table of
contents, and §6.9.1's refusal to make the block a verdict surface extends to
it.

### 6.9.2 Constraints inherited, not restated

No Recipes and no retrieval-index applicability blocks; no adjacency or
material-role fields; no verdict machinery and no lint; no Probe and no
mechanical evidence resolution — quotation from served renderings at pins
remains the boundary. Pin resolution stays the sole mechanical instrument on
grounding.

**The selection screen's DELIVERY is inherited too, and this section is the
inheriting site (kogaki#474).** `specs/SPEC.md` §2.5.3 rules that an
owner-facing screen is delivered as an artifact the mechanical half writes,
never through a display channel and never model-retyped. **That clause is cited
here and restated nowhere** — this section's own title is the reason: a
constraint this section inherits is not one it re-derives. Two consequences bind
move ingestion specifically, and both are this section's own rather than
§2.5.3's:

- **The artifact is to be `reports/MoveScreen.md`** — a fixed literal,
  overwritten on every render, repo-visible and not committed. The name is this
  surface's because the renderers are independent and a shared name would have
  them clobber each other; the *discipline* around the name is §2.5.3's.
- **The count line is to come FIRST and never be suppressed**, per §6.9.0 — the
  parsed-record count is the only instrument that can catch `1` where the owner
  wrote `22`, and the 2026-08-16 truncation is what a screen without a leading
  count looks like from the owner's side.

**Both bullets are written in the OWED tense, and the carrier is named: story
1.70 under kogaki#474.** This is the ordinary spec-ahead-of-code interval, named
here so a reader who runs the tool and finds no `reports/MoveScreen.md` knows
which of the two is stale — the code, not the clause. **Nothing in this
repository writes that file at the head this section was amended at**, and
saying so is the whole point: issue #474's own empty-query names *"the skill
edited to name the artifact while the tool still writes nothing"* as the state
this work exists **not** to recreate, and a present-tense clause here would
half-instantiate exactly that state one layer up. `specs/SPEC.md` §2.5.3's
member list reads this section as a member of the clause, never as a claim that
the surface already complies.

**"No verdict machinery" above is now a CONSTRUCTION constraint on this surface,
not only a prohibition.** §2.5.3's closing clause binds it: the renderer makes a
per-row verdict, score or status token **unrenderable** rather than disallowed.
The specimen is the 2026-08-16 run's per-row `judgment: clean` column — verdict
machinery on the selection screen, which this section already excluded by name
and which shipped anyway, because a prohibition binds whoever writes the
renderer and nothing bound the output. Review owes **readings** — this proposes a
split, these two are near-duplicates — and silence where there is nothing to say.

**deferred slots: none.**

### 6.9.3 kogaki#177's trigger — a false FIRED, a correction, and a verified FIRED

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

**RESOLVED THE SAME DAY, AND THE RESOLUTION IS THE POINT (kogaki#177).**
Re-consulted hours later, the seam returns pin
`product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299`, where the Move batch
`q_a/2026-08-07-move-architecture-and-composition-language` **is served** —
`topics/articles.md:10,11,14,16,17,19,20,22`, carrying the eight-field schema,
the semantic-economy policy, the grounds test, the `entailed` flag, the
judgment-class ruling, the Reader Path blocks and the analysis-document home.
**kogaki#177's trigger HAS fired**, verified at the named batch's own lines.

So the hub committed between two consultations in one session, and **the
correction above stayed true across that commit** — because it claimed only
what it measured. Had it said *"the hub has not distilled the Move batch"*, it
would have been false within hours, and a spec carrying a confidently false
absence claim is worse than the over-claim it replaced. **The rule this section
carries was vindicated by the first case it met:** evidence is the named
batch's own lines at the pin, which made this check decisive where a date would
have been another coin-flip.

The two arms of the coupling and the named slot are **unchanged** — what
changes is that both are now *reachable*, so the slot's filling is live work
rather than blocked work.

**What is NOT claimed, and what kept the record true:** that the hub never
distilled the Move batch. Only that it was not served at `98195e0a` — which is the whole of what a consumer can
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

### 6.9.4 The named slot is REOPENED — `move-sources-derivation-vehicle`

    deferred-slot: move-sources-derivation-vehicle
    status: REOPENED (kogaki#548, 2026-08-19) — was FILLED (kogaki#223, 2026-08-08)

**THE FILL IS WITHDRAWN by owner ruling of 2026-08-19, and this section's own
clause is what licenses the withdrawal**: it marked the placement of a
derivation pointer inside `sources` as the author's judgment, with the fork
**returning to open on disagreement**. This is that disagreement. The v1 text
is kept below unedited, because a superseded fill must stay countable.

**The successor position.** `sources` holds **source text only** — what text
this Move came from, the passage it locates, the derivation it explains.
`git log moves/<id>.md` is the audit trail for when and from what batch a Move
was ingested. **No Source/Provenance schema distinction is defined**, because
nothing demands one.

**Three grounds, each independently sufficient.**

1. **Not source text.** The appended string located no passage and explained no
   derivation — it recorded an ingestion event and a batch outcome. §4.7's own
   rule for `sources` already excluded it, so this is that rule applied rather
   than a new one.
2. **Redundant with git.** The ingestion date, the batch and the source commit
   are all in version history; the string stored in a semantic field what the
   history already held.
3. **Mutation after acceptance.** `save_accepted` appended it *after* the owner
   accepted at the selection screen, so what landed on disk was not what was
   approved, and the delta was never displayed. This is the sharpest of the
   three and the one that generalises: **nothing may change a record between
   the owner's acceptance and the write.**

**What is mooted rather than reversed.** kogaki#417 D1 decided the pointer's
FORM — prose provenance over a `path:line@sha` pin, on the corpus's own
survival measurement. With no pointer there is no form to decide, so that
decision is not overturned; its subject is gone.

**What this does NOT touch.** §4.9.1's `analysis/<source-slug>.md` pointer
stays exactly as it is. That one is **authored** into a proposal's own `sources`
value and reaches disk through the owner's acceptance like every other field —
which is precisely why retiring the tool's append leaves it untouched. What was
retired is a tool writing into a record after acceptance; what remains is an
author writing source text.

**The carrier of ground 3 is mechanical, not this prose.** `tools/move_ingest.py`
asserts that `save_accepted` writes every §4.2 field exactly as the owner
accepted it. Deleting the append and leaving nothing watching would readmit the
same class the next time a field looked like a good place to record something.

---

*The v1 fill follows, unedited.*

**THE CHOICE: the first ingestion run writes each accepted Move's derivation
pointer, in the same act that saves the file.** kogaki#177 is discharged by
that run rather than following up over the saved files.

**Where the pointer goes, and what it is not.** It goes **inside `sources`**.
No ninth field is added, and §4.2's subset is untouched — the constraint that
nothing is added to the eight is not bent to make room for this. §7.6 already
declares `sources` to hold two things: the passages the Move was observed in,
**plus the derivation's location**. The derivation's location is currently the
hub's unserved staging file. The ingestion run **replaces that location with
the served pin** it resolved while proposing the Move. The prose observation
half is the owner's and is not rewritten.

**The receipt, and what in it discriminates.** The served line is about the
hub's own distill gate, a different artifact class — so what transfers is its
structure, and the structure is the whole of the fork:

> "The distill gate is the sole writer of a decision line and **the one moment
> where the batch's `source_repo:` and the sitting's subject repos are both in
> hand**; **attribution is a fact computable by the actor at the moment of the
> act** … **Backfill is prospective only, with one mechanical exception: where
> a batch contains a staging file carrying `source_repo:`, the attribution is
> READ rather than guessed.**"

`topics/knowledge-architecture.md:173@dec0d568dd8fc0b2df1185eac10dc1a10600f299`

**The widening across artifact classes is the author's judgment and is
attributed as such.** That line rules on the hub's own distill gate writing an
attribution field; it does not mention Moves, `moves/`, or this repository. What
is carried here is its **structure** — write-at-the-act versus backfill-later
for a provenance field, and the read-versus-guess test that decides between them
— applied to a different artifact by this spec's author. A reader who judges the
structure not to transfer is disagreeing with **this section**, not with the
served line, and the fork returns to open.

The ingestion run **is** the both-in-hand moment: it holds the accepted Move
and the served ruling line it resolved that Move against, simultaneously and
only then. A follow-up pass holds a saved file and must go **re-derive** which
served line it came from — the guess the served line permits only where the
staging file makes it a read instead. Here nothing in the saved file records
which line it was derived from, so the follow-up pass would be guessing at
exactly the point the served position says not to.

The second framing's return names the cost of getting this wrong:

> "A record contract adopted at one unit of work is silently absent at the unit
> below it, and the absence is invisible from above — from the instrumented
> unit's perspective everything is instrumented, so the gap is found only by
> whoever pays the cost the records were meant to carry."

`LESSONS.md:27@dec0d568dd8fc0b2df1185eac10dc1a10600f299`

An ingestion run that saves files and leaves the pointer to a later pass looks
complete from inside the run. The gap surfaces at the first consumer that needs
a Move's grounding — kogaki#220's construction — which is the reader who pays.

**The declined arm, with its real cost, not dismissed.** #177 following up over
the saved files is genuinely cheaper per run: it separates a bulk provenance
sweep from the per-Move judgment at the selection screen, and it lets a single
later pass apply one consistent pin across all files rather than whatever pin
each run happened to resolve at. That second property is a real advantage and
it is given up here — **files ingested at different runs will carry pointers at
different pins**, which is accepted because a pointer's job is to be resolvable
and re-checkable, not to be uniform. The arm loses because its cheapness is
purchased by discarding information the run already had.

**What is NOT claimed.** Not that every Move in the specimen has a matching
served line — §6.9.3's own rule forbids that inference, and the specimen's 22
`sources` fields carry **zero** `path:line@sha` today. A Move whose derivation
the run cannot resolve at a served line keeps its prose `sources` unchanged and
is reported as such at the selection screen. **`sources` is provenance-only**
per the semantic-economy ruling of §4.7, and an unresolvable pointer is
recorded as absent rather than manufactured.

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
  rider — no minimum sequence, no obligatory opening shape (no slot
  obligations); Recipes cite-as-precedent and never
  retrieve-as-generator, requires/effect judgment-class and never
  type-checked (no fit rule). It also satisfies the declination's own
  positive prescription, that "the rationale be tied to THIS article's
  materials" — a step binds its Move to *this* article's Strands, Journeys,
  Thesis, or an earlier step's conclusion.

  **`no mandatory Moves` was dropped from this list at v18 (kogaki#642) and
  the argument does not rest on it.** The declination's first constituent is
  **slot obligations** — an obligatory position in a sequence, which the
  no-minimum-sequence and no-obligatory-opening-shape riders exclude between
  them. Requiring that every Step name its State component imposes no position
  on any Step and constrains no Move to any slot, so the excluded constituent
  stays excluded by the riders that actually bear on it. Recorded rather than
  silently pruned: an argument quietly losing a premise reads, later, as an
  argument that never had it.

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

- **No mandatory Moves — SUPERSEDED at v18 (kogaki#642), by name.** The rider
  read "no step is required to bind one", was confirmed at v17 (kogaki#550)
  against the `Step = Input + State` reading, and is now reversed: **every Step
  binds a Move** (§4.1), because the Move is the State component of a Step
  rather than a candidate carrier for the no-filler property v17 tested it as.
  The rider is superseded rather than deleted, so a reader meeting it in an
  older rendering finds the amendment instead of a live figure to count
  against. **What the rider was protecting survives intact and is where it
  moves to:** the 2026-08-06 consultation's boundary was against a *stored
  flowchart* — obligatory shapes, adjacency lists, slot obligations — and the
  three riders below carry the whole of that. Requiring the State component of
  a Step is not a sequence obligation and imposes no shape on which Moves may
  follow which.
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
  **SUPERSEDED at v22 (kogaki#747), and it was already stale when superseded.**
  §4.1 v18 (kogaki#642) made a Move-less Step unwritable — a second mechanical
  kill this rider did not record — and §4.12.1 adds move id RESOLUTION as a
  third. The rider is superseded rather than deleted, so a reader meeting it in
  an older rendering finds the amendment instead of a live claim to count
  against. **What it was protecting survives at the rider above it**, unamended:
  requires/effect matching is judgment-class and never type-checked, and no
  machinery renders a verdict on whether a Move's requires are met — §4.12.2's
  verdict is the composing sitting's, validated here and composed here never.
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

#### 7.6.1 The prohibition above has MET ITS OWN RELEASE CONDITION (kogaki#223)

**The bullet "what they are not" is written with a release condition attached —
*"until the hub distils the 2026-08-06 rulings onto it"* — and that condition is
now satisfied.** §6.9.3 verified the Move batch
`q_a/2026-08-07-move-architecture-and-composition-language` **served** at
`product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299`, at the named batch's own
lines rather than at a same-dated neighbour.

**This is recorded as a disposition act, and the conflict is reported rather
than quietly reconciled** — the served position on exactly this move:

> "Before claiming anything is implemented, complete, or ready, ask what
> evidence you are holding; if it is mechanical, you have established existence
> and said nothing about approval, so read the decision record for verdicts
> dated after that evidence, and **when they conflict the later verdict wins and
> the conflict is reported rather than quietly reconciled**."

`gloss/lessons/knowledge-architecture.md:269@dec0d568dd8fc0b2df1185eac10dc1a10600f299`

So, exactly:

- **§7.6's text above is RETAINED unedited**, including the prohibition, because
  it was true when written and the reader needs to see the condition it carried
  rather than a text that never carried one.
- **What changes is its standing, not its accuracy.** The prohibition was
  conditional and its condition has lapsed; it no longer forbids anything.
  `sources` **may** now carry `path:line@sha` against the served surface.

  **The second half of this bullet — "and §6.9.4 is the act that writes it" —
  is SUPERSEDED, and the supersession is reported here rather than quietly
  reconciled, which is what the served line quoted above demands of exactly
  this move (kogaki#177, 2026-08-13).** §6.9.4's act was implemented at
  kogaki#418, and the owner decided its FORM at kogaki#417 D1: the derivation
  pointer written into `sources` is **prose provenance naming the passage, and
  never a `path:line@sha` pin**. So the permission this bullet records still
  stands — nothing forbids a pin in `sources` — while the sentence naming
  §6.9.4 as the act that exercises it is false: that act writes prose.

  **The grounds are not re-argued here, only pointed at.** D1 rests on the
  corpus's own survival measurement — 148 unpinned `file:line` citations broke
  repeatedly against 1,127 issue anchors of which every one survived every
  relocation — plus the measurement that the specimen's 22 records already
  write `sources` as prose, so normalize stays close to identity.
  `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:69`

  **What this costs kogaki#177, stated because that issue is the one that
  breaks.** #177's body names its own discharge as *"backfill each admitted
  Move's `sources` with its served pin"*. Under D1 that discharge is **not the
  act to perform** — the backfill writes prose, in the ingestion run that saves
  each Move — and an implementer following #177's text literally would write
  the one form D1 declined. The correction is recorded on #177 itself; this
  bullet is the spec-side half.

  **Nothing observed either drift, and that is the reusable half.** The rule
  quoted above — *the later verdict wins and the conflict is reported rather
  than quietly reconciled* — is a discipline with no instrument behind it: no
  act in this repository re-reads a merged clause when a later decision lands
  on the same subject, so both this sentence and #177's discharge stayed false
  from 2026-08-13 until a sitting happened to look. Marked rather than solved.
- **What does not change is the NEVER-MANUFACTURED rule:** nothing is written
  into a `sources` field for a Move whose derivation cannot be resolved. That
  rule survives D1 untouched, because it constrains *fabrication* and says
  nothing about form.
  **The attribution this bullet used to carry — "the pins are written by the
  run that resolves them (§6.9.4)" — is superseded by the paragraph above and
  is dropped rather than left standing.** It restated the same false claim one
  bullet later, under a heading asserting it did not change, so a reader
  arriving at §7.6.1 from kogaki#177's discharge met the correction and then
  met the thing it corrects. Recorded rather than silently re-cut: the first
  version of this correction fixed the sentence it was looking at and not the
  claim, which is the more useful half of the mistake.
  **And the "today" reading is re-read against D1.** The specimen's 22
  `sources` fields carrying zero pins was written as a transient measurement
  awaiting a target. Under D1 it is neither: **zero pins is what the ingestion
  act now produces**, so the figure is the design's steady state rather than a
  gap to close.
- **Standing was checked, not inferred from recency.** Being written later says
  when someone wrote, not what they could see
  (`gloss/lessons/knowledge-architecture.md:209@dec0d568dd8fc0b2df1185eac10dc1a10600f299`);
  what settles this is the batch's own served lines, re-read at the current pin,
  which is the same instrument §6.9.3 established after the false FIRED.

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

**kogaki#220 (Move architecture construction), 2026-08-08.** §§4.3–4.9 are
written from these lines and quote them verbatim.

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:10-11,14,16-20,22`
  request_id: de0275ba-0d8f-497a-8288-0fd2adc5455d
  outcome: discriminating
  query: Move library eight fields id status intent requires effect constraints failure_modes sources; Reader Path composition, Move binding, Candidate assembly, path review, Candidate selection; grounds test rationale stands with the Move name deleted

**`:18` was read at round 2 and its own read is recorded, not folded into the
receipt above.** The first sitting cited `16-17,19-20` and stepped over `:18`,
and §4.8 then declared the position unserved — an absence claim about a line
the cite list never reached, which no recheck could falsify because a recheck
verifies the lines a receipt cites and is silent about the ones it does not.
The line is served, it is quoted verbatim at §4.8, and the read that found it
is here rather than absorbed:

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:18`
  request_id: 9e8cc66b-ee67-46cc-8b80-85eb95a876cc
  outcome: discriminating
  query: topic_thread("articles") — Journey integrity: is multi-Step projection of a Journey allowed, may a Journey be non-contiguous, and what do the Strand's boundaries remain?

**The same batch was measured ABSENT earlier the same day** at
`product-lab@98195e0a` — 0 `Move` lines in `topics/articles.md`, newest decision
2026-08-05, no Move-bearing topic across a full `surface_names` enumeration.
The hub committed between the two consultations. Recorded here because §6.9.3
carries the correction that measurement produced, and a reader meeting only
this receipt would not know the pins were unresolvable hours before.

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

**kogaki#492 v10 (the journey register re-sited onto Candidate
differentiation), 2026-08-18.** The design itself is an **owner ruling on the
issue thread**, not a served line — the consult below discriminated only *how
to record a supersession of a still-served position*, which is what §4.10's
divergence declaration rests on.

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:172`
  request_id: 18df16ad-c103-4664-b868-ec0ed5e9acb6
  outcome: discriminating
  query: journey register choice rides Candidate differentiation rather than its own brief gate; recording a supersession of an earlier served wording in a spec amendment

**The served surface did NOT move for this amendment, and that is the
finding rather than a gap.** `topics/articles.md:87` still carries the
2026-07-31 "decided at the brief gate" wording at this pin; the shape read run
as this sitting's pre-step reported 0 of 4 sections differing from the
vendored digest. So this spec is **ahead of the hub**, deliberately and
declaredly, and the hub refresh is owed. A later reader who finds `:87`
contradicting §4.10 is reading the divergence this section names, not a defect.

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
