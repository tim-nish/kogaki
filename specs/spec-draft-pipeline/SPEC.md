# SPEC-draft-pipeline — the Brief's composed structure: Thesis, Strands, and the leg sequence

**Status:** v47, amended 2026-10-21 (kogaki#1493) — **A REGISTER RULE
YIELDS TO A PLANNED LINE.** The Audience's `register` was rendered into the
Packet with no statement of what it may govern, so a rule written into an
Audience file could contradict a Paragraph Waypoint's point or operation and
the Writer had no rule saying which held. The owner decided (2026-10-21): the
Audience is a weak constraint, which may influence the prose inside the
structure a Move provides but must not modify or extend that structure, and
the judge is not to stop on each conflict. So the Packet template states,
directly before `{{register}}` and outside it, that the line holds and the rule
yields for that sentence, with no refusal raised for the conflict; no judge or
check reads the conflict (§4.14). Carriers: `src/packet-template.md`,
`checks/check-draft-packet.sh`.
**deferred slots minted by this amendment: none.**

**Status:** v46, amended 2026-10-21 (kogaki#1488) — **THE REGISTER CARRIES NO
VOICE RULE.** The Audience's `register` held a Voice paragraph, carried over
from the Persona's `prose` block, telling the Writer to qualify in the first
person any claim whose scope was narrower than its sentence. That is a rule
of what a paragraph says, and since the paragraph Move and the ParagraphPlan
what a paragraph says is fixed by its Paragraph Waypoints and the Segments
they realise. The owner decided (2026-10-21): the first person and the scope
of a claim belong to the Segments of a paragraph Move, and the rule exceeds
the Register's responsibility. So the paragraph is deleted and nothing
replaces it, and the Register's examples below no longer name voice (§4.14,
§5.1.1). Carriers: `audiences/dev-to-zenn.md`, `checks/check-draft-packet.sh`.
**deferred slots minted by this amendment: none.**

**Status:** v45, amended 2026-10-14 (kogaki#1370) — **THE READER FILE IS THE
AUDIENCE, WITH A `persona` KEY AND A `register` KEY.** The file the Brief
composes for held `reader` and `prior_knowledge`, which say who the reader is,
beside `prose`, which says how the prose addresses them, and was called the
Persona after its first half alone. The owner decided (2026-10-13): the
writing component is the **Register**, and the file holding the Persona and
the Register is the **Audience**, with a key for each. So the file moves to
`audiences/dev-to-zenn.md` as `id`, `persona` (holding `reader` and
`prior_knowledge`) and `register` (§5.1.1, §4.14); the setting
`brief.persona_file` becomes `brief.audience_file`; the Leg Packet's
`{{prose_rules}}` slot becomes `{{register}}`; and the Register's rules are
moved, none edited. Persona stays the name of the `persona` key. Carriers:
`audiences/dev-to-zenn.md`, `kogaki.settings.json`, `src/brief-workflow.json`,
`src/compose.mjs`, `src/draft.mjs`, `src/brief.mjs`, `src/packet-template.md`.
**deferred slots minted by this amendment: none.**

**Status:** v44, amended 2026-10-13 (kogaki#1355) — **A JOB UNIT IS BOUNDED
PER CALL AND PER ATTEMPT COUNT, AND THE STATUS LINE SHOWS THE ATTEMPT AND AN
ESTIMATE.** The Brief run of 2026-10-13 ended with no Brief: all three compose
units were refused on their first attempt, after 605, 760 and 600 seconds, and
not one was asked again, because a retry started only if it would end within
twenty minutes of the job's start, which two ten-minute attempts never do. The
owner decided (2026-10-13), thinking of it as HTTP requests: bound each call by
time and each unit by a number of attempts, with three attempts by default, and
show the attempt and, from the second on, an estimate of the time left. So a
call running past `brief.call_limit_s` is stopped and asked again, a refusal
spends an attempt, a unit ends refused only once `brief.unit_attempts` is spent
(§4.12.2), and no other time bound applies. This replaces kogaki#1273's
rule that a refused unit is retried once and only when the retry fits; that
Issue's other rules stand. Carriers: `kogaki.settings.json`,
`src/brief-workflow.json`, `src/workflow/detached-job.mjs`, `src/brief.mjs`,
`src/gate-registry.json`. **deferred slots minted by this amendment: none.**

**Status:** v43, amended 2026-10-09 (kogaki#1311) — **A LEG CARRIES ITS
WAYPOINTS, THE MOVE IS READ ONLY UNTIL THE CANDIDATE IS COMPOSED, AND THE
DRAFT WRITES FROM THE LEG ALONE.** On 2026-10-08 `/draft` stopped at Leg 4 of
5: the writer could not perform the Move's `technique` from a Packet carrying
one claim, after the fit judgment had passed the Leg by reading its state lines
— the second run of the class #1276 repaired three days earlier. `technique`
was read at four sites with four co-inputs. The owner decided (2026-10-09):
"Information that belongs to Move has responsibility only up to CandidatePath
creation." So every Leg carries `waypoints` (§4.1) — its own specialization of
the Move's `technique`, an ordered list of points each serving a claim (the
effect form kogaki#1311 gave them is replaced by kogaki#1326) — written at composition and judged there (§4.12.2); the Leg Packet
renders the waypoints in place of the Move block (§4.14); and nothing after the
Candidate opens a Move file: `draft.mjs` takes no `--moves-dir`, adoption
resolves no Move (§4.12.1), and the figure stage reads its kind off the Leg's
own `figure_roles` (§4.17). Carriers: `src/leg-schema.json`,
`src/compose.mjs`, `src/brief.mjs`, `src/brief-workflow.json`,
`src/draft.mjs`, `src/packet-template.md`, `src/review-draft.mjs`,
`src/review-items.json`, `src/assemble.mjs`. **deferred slots minted by this
amendment: none.**

**Status:** v42, amended 2026-10-08 (kogaki#1307) — **MOVE FIT IS JUDGED INSIDE
THE COMPOSE JOB, PER JOB UNIT, AND THE REVISE PASS IS REMOVED.** The Brief run
of 2026-10-08 ended with no Reader Path and no question: one compose job unit
spent an attempt on malformed output, one ran out of time while still
reasoning, and the one Candidate that finished was excluded after Path Review
by `judge_specialization`, from where nothing re-composed. The owner decided
(2026-10-08): a content judgment made after a verdict-free review is
positioned incorrectly, so §4.12.2's judged half runs per compose job unit —
a `contradicts` or `cannot-determine` on any Leg is a schema refusal of that
unit, re-asked once with the judge's sentence; §4.11's revise pass and its four
Arms, which no state of the Brief table ever ran, leave; a run whose every
Candidate is excluded ends with no question and removes its empty Brief. The jobs'
time settings, the unit count, the judge model and the Persona
file (the Audience file since kogaki#1370) move to `kogaki.settings.json`, the owner's file for values changed
without coding. Carriers: `kogaki.settings.json`, `src/brief-workflow.json`,
`src/brief.mjs`, `src/workflow/detached-job.mjs`, `src/review.mjs`.
**deferred slots minted by this amendment: none; `specialization-judgment-and-
path-review-ordering` is filled (§4.12.2).**

**Status:** v41, amended 2026-09-30 (kogaki#1225) — **§5.1.1: READER START IS
THE PERSONA'S COLD READ OF THE THESIS AS A TITLE, READER TARGET IS THE LAST
LEG'S AFTER-STATE, AND THE OPENING QUESTION HEADING IS REMOVED.** Reading the
first Brief composed under kogaki#1216, the owner found its Reader start
opening from a question — "why did my check pass when the broken thing was
right there in the diff?" — that belongs to a reader who has already lived the
article's problem: the Persona's `reader` field said why they opened the post,
and the `question:` derivation followed from that purpose. The same Brief
rendered the Opening question three times (the first Leg's after-state line,
its own heading, every Leg Packet's fixed-points block), and `reader_target`
was authored per Candidate and compared with nothing. The owner decided
(2026-09-29): (1) Reader start and Reader target each name one reader state
and each appears once in the path, Reader start where it begins and Reader
target where it ends; (2) the Opening question heading is removed — the first
Leg already carries a before-state and an after-state, so a heading repeating
its after-state question was a second Question inside Leg 1; (3) the cold read
is what produces the opening the owner wants — no "does not know what a Check
means" statement is added, and `holds: none` is not made a default rule; (4)
every correction is carried by the Harness. The design: **the stimulus is
pinned** — Reader start is the state of a reader with the declared Persona who
has seen the Thesis, read as if it were the article's title, and nothing else;
the Persona's `reader` field loses its purpose clause; **Reader target is
derived**, the last Leg's `reader_state_after` rendered under the existing
heading, and a Candidate carrying `reader_target` is refused by name; and
**one deterministic refusal** — a Reader start line containing a term any Leg
lists under `introduces:` is refused at adoption naming the term and the Leg.
Carriers: `readers/dev-to-zenn.md`, `src/differentiation-schema.json`,
`src/leg-schema.json`, `src/candidate-schema.json`, `src/brief-workflow.json`,
`src/compose.mjs`, `src/brief.mjs`, `src/assemble.mjs`, `src/draft.mjs`,
`src/packet-template.md`, `checks/check-brief-compose.sh`.

**Status:** v40, amended 2026-09-29 (kogaki#1216) — **§5.1.1: READER START IS
A COLD READ FROM THE PERSONA AND THE THESIS, THE FIRST LEG BINDS A MOVE THAT
DOES NOT CONTRADICT IT, AND THE OPENING QUESTION IS THE FIRST LEG'S OWN.**
Reading the first Draft produced end to end, the owner found its first
paragraph expensive: the Brief's Reader start read like a reader who had
already read the article several times, because the verbatim first-Leg
binding (§5.2, `reader_start_binds_first_leg`) together with the
specialization rule (§4.12.2) forced Reader start to be written BACKWARDS
from the Move the first Leg binds — the Move's `before` with the article's
nouns substituted. The owner decided (2026-09-28): (1) Reader start is the
stance a reader with the declared **Persona** holds toward this Thesis before
reading — authored from the Persona and the Thesis, never from a Move; (2) the
first Leg's Move is chosen by **exclusion, not optimization** — a Move is
excluded when its `before` contradicts Reader start on a dimension it
declares, survivors are not ranked, and the check is the existing
specialization verdict applied to Leg 1 against Reader start; the verbatim
binding is removed; (3) the Opening question is not a separately authored
field — it is the `question:` line of the first Leg's `reader_state_after`,
rendered under the existing heading; (4) Reader start and Reader target stay
in the Move library's reader-state schema. The Persona is one owner-authored
file, `readers/dev-to-zenn.md` (the Audience file `audiences/dev-to-zenn.md`
since kogaki#1370), with two fields (`reader`, `prior_knowledge`),
named by the workflow table and read at the `differentiation` state, which
now authors Reader start once per Brief and lists the first-Leg survivors;
the Brief records the survivor count. Where an Extraction records the question
before the passage as none, ingestion writes `holds: none` (§6.9). Carriers:
`readers/dev-to-zenn.md`, `src/differentiation-schema.json`,
`src/leg-schema.json`, `src/candidate-schema.json`,
`src/specialization-schema.json`, `src/brief-workflow.json`,
`src/compose.mjs`, `src/brief.mjs`, `src/assemble.mjs`,
`tools/move_ingest.py`.

**Status:** v39, amended 2026-09-24 (kogaki#1176) — **§5.1.1: READER START IS
A STANCE IN THE MOVE LIBRARY'S OWN FIVE DIMENSIONS, NOT A KNOWLEDGE STATE.**
Reader start was authored as what the reader *knows*, so the first Leg's
`reader_state_before` — matched against it verbatim (§5.2) — was forced onto a
Move whose `before` (§4.2) reads as an in-subject understanding, and a Reader
start with no such Move to bind is inert data: this is the defect the owner
named on 2026-09-21. The repair is not a new field but a narrower reading of
the existing one: `reader_start` is written in the same five dimensions
(knowledge, question, expectation, orientation, trust) and the same
`dimension: value` line §4.2's `before`/`after` already use, so a Move whose
`before` opens on a reader who holds no question — arrives indifferent — is a
legal binding for the first Leg exactly as one whose `before` opens on an
in-subject understanding is. The dimension set is not fixed by this amendment;
it is read from whatever `src/leg-schema.json`/the Move library's schema
carries, which kogaki#1175 derived from the Corpus and which the five named
here are the tested hypothesis for (owner amendment, 2026-09-23). No `Position`
field is added — the five dimensions carry the whole of a stance (owner
ruling, 2026-09-23). `opening_question` is reviewed against the same
redefinition: it is authored once, as what the first Leg hands the reader, and
is never a restatement of `reader_start`'s own `question:` dimension, which
states only what the reader arrives holding (`holds: none` for the opening the
owner wants). The verbatim match at §5.2 and `reader_start_binds_first_leg` in
`src/compose.mjs`/`src/leg-schema.json` is unchanged in mechanism — both sides
were already opaque strings — and refuses on the same shape it always did; what
changes is what a caller is expected to have put in that string.
`consulted: kogaki@eac9ab381e5efaf97374a7773427eaee8f7f89cd specs/spec-draft-pipeline/SPEC.md:1717`

**Status:** v38, amended 2026-09-14 (kogaki#1116) — **§5.3: BRIEF TAKES ITS
STRAND SET ON THE COMMAND LINE AND READS NO TERRAIN RUN.** The arguments are
served Lesson addresses resolved against the Package's own enumeration; a Full
Report coordinate (`G<n>`, `L<n>`, `D<n>`) is refused by name, because the Model
resolves one into addresses from the Full Report before the skill is invoked.
This REVERSES v36's ground rather than drifting from it: kogaki#1108 removed the
argv because an id list a Model retypes is one a Model can retype wrong, and the
unstated cost was that reading the set off Terrain's run record coupled Brief to
that run's internal progress — a Terrain run wedged before its ID gate made every
Brief start refuse for six days from 2026-09-12. The owner accepts opportunistic
Model resolution (2026-09-13/14) on the condition this flow already meets: the
resolved set is rendered at the thesis gate before anything under `theses/` is
written. Carried with it: the commit pin is deprecated, and a Strand's cite is
the served address at its own content hash.

**Status:** v37, amended 2026-09-07 (kogaki#904) — **§1: the scope limit is
carried by the general rule, and the defence citing a removed clause is
DELETED.** The sentence defended the limit by pointing at
`specs/spec-terrain/SPEC.md`'s WA baseline, a clause SPEC-terrain v36 (kogaki#857,
PR #903) removed on merge — so a reader checking whether this pipeline inherits
WA design followed a citation and landed nowhere, which is worse than an absent
one. The premise it guarded against is unassertable: `specs/SPEC.md` §4.5.1
clause 2 states flatly that Kogaki inherits no `writing-assistant` baseline
unless one is declared per subject, and §4.5.2's finding aid already carries this
subject's row. Deletion rather than a repoint, because a per-subject restatement
is a second carrier of one rule and each carrier would then owe a cite to the
other at the point of the rule — `consulted: product-lab@32852644 LESSONS.md:68`
— which widens the change to `specs/SPEC.md` for a defence the general rule
already makes. Owner selection at the pickup gate. No code change and no case.
**deferred slots minted by this amendment: none.**

**Status:** v36, amended 2026-09-06 (kogaki#915) — **§5.3/§6: the run state's
`gate` key IS the declaration, and the run-declaration FILE is a derived
artifact that is not the barrier.** v32's acceptance item 2 read *"`adopt`
refuses when no declaration for this run state was rendered"* while `cmdAdopt`
checked `state.gate`; `cmdAdoptCandidate` had the same shape. The code and v32
were internally consistent and the acceptance wording was not, so the wording is
what is corrected: the file is composed FROM `state.gate` by the same actor the
barrier guards against, so a check on it refuses nothing a forged capture could
not also forge, and what holds is `--capture`'s own refusal, which adoption
requires transitively. The consequence is now stated and tested rather than
discovered — an adoption whose declaration file was removed is **admissible**,
and `check-brief-compose` case (z) exercises it, together with the reason
`check-gate-carrier` legitimately answers the opposite about the same run
(SPEC-gate-carrier §4.1's registry fallback). No code change; a CASE, never a
member. Recorded as an owner selection over a served recommendation. **deferred
slots minted by this amendment: none.**

**Status:** v35, amended 2026-09-06 (kogaki#914) — **§6: free text at the
Candidate-selection gate is a COMMENT, and adoption refuses it by name.** The
gate offers a free-text channel and the capture act accepts one, so the answer
was reachable while adoption had no branch for it — it fell through to the id
match and told an owner who typed their own words that they had selected a
candidate named `undefined`. The disposition is now chosen rather than
inherited from the matcher: a Candidate is a composed sequence of Legs with
Move bindings, so there is no Reader Path in prose to adopt and the runtime
composes none. The refusal quotes the owner's words back and routes to
`none-of-these` or to a re-raised gate. A CASE in `check-brief-compose`, never
a member, so no admission record is owed. **deferred slots minted by this
amendment: none.**

**Status:** v34, amended 2026-09-06 (kogaki#878) — **§4.17: the figure record,
the instance of the Move's form, filled AFTER the Leg's prose.** §4.16 landed
the Brief's figure decision and its grammar, and nothing on the realization side
read it — a Brief could declare a figure perfectly and the Draft would render
none, with every check green. The record is filled from the Leg's Packet plus
one appended block and from nothing else, its kind is the form's, and each
element is bound to the claim **the Brief** bound that role to; `emit` refuses
while a figure-carrying Leg owes its record, exactly as it refuses a Leg that
owes its prose. The mechanical half is validated and the wording is judged
nowhere, per §4.6. **deferred slots minted by this amendment: none.**

**Status:** v33, amended 2026-09-06 (kogaki#909) — **Candidate-level
disclosure evidence gets ONE test instead of a paragraph per field.** Evidence
that BEARS ON THE CHOICE the owner is making is decision-grade and reaches the
selection gate, because a pending human verdict's carrier is the render layer;
evidence that is a post-hoc report or approval rides the minted Brief's slot,
because nothing is owed about a path that was not taken. `revise_residue` is
decision-grade and now renders at the gate — kogaki#859's own one-item-at-a-time
reversal, never the list restored — and `bridges` stays post-hoc where
kogaki#864 put it. The grading is carried by `src/disclosure-fields.json`, and a
declared field that reaches no surface is refused at the write rather than
discovered a field at a time. **deferred slots minted by this amendment: none.**

**Status:** v32, amended 2026-09-05 (kogaki#891) — **the owner's answer at the
thesis-determination gate (§5.3) and at the Candidate-selection gate (§6) is
READ from a Harness-written capture, never received as an argument.** Both
answers reached the runtime as `adopt --thesis` and `adopt-candidate
--candidate`, composed by the model from the question-UI answer and carrying no
evidence field of any kind — so the Harness's most consequential write in this
pipeline, the Brief's Thesis and the name it is minted under and then its
sequence, was authorised by the model's account of what the owner chose. A model
that adopted a Candidate the owner declined, or passed its own sentence as the
owner's free text, minted a tracked `theses/<slug>/brief.md` with no refusal.
`§6` now registers `brief-candidate-selection`, which it had been raising since
it existed while carrying no registry row. **deferred slots minted by this
amendment: none.**

**Status:** v31, amended 2026-09-05 (kogaki#894, PR #910 round 1) — §4.11 gains
the damaged-read bullet its retention clause already pointed at and which did
not exist, now stating all three doors: the third — an `attaches` entry that is
not an array of round records — degrades the count to zero with no unparseable
byte in the file, and was open behind a container-shaped check.
**deferred slots minted by this amendment: none.**

**Status:** v30, amended 2026-09-05 (kogaki#894, PR #908 round 1) — §4.11's
carrier clauses gain three statements the round found missing: the ledger's one
relocation seam is named (a seam nothing declares cannot be told from the
caller-chosen home the same bullet rules out), the ledger's lifetime is stated
as the lane's retention bound, and the residue's disclosure is scoped to what
the payload supports — it rides the reviewed set and does not reach the owner,
the same hole this section already records for the bridge disclosure.
**deferred slots minted by this amendment: none.**

**Status:** v29, amended 2026-09-05 (kogaki#894) — **§4.11's "one revise round
per Candidate" gains its carrier.** The bound was prose with its count outside
the Harness — nothing counted an attach, so a Candidate re-reviewed three times
reached assembly with no refusal and no disclosure. `src/review.mjs attach` now
records each Candidate's attaches in the Brief's own run workspace, refuses a
third by name, and writes the residue entry itself rather than accepting a
model-declared one. **deferred slots minted by this amendment: none.**

**Status:** v28, amended 2026-09-05 (kogaki#893) — **§4.12 gains a THIRD half,
§4.12.3: a passing specialization record is no longer the sole unlock, and
adoption additionally requires the owner's ratification of that record.** The
two halves §4.12 declared governed the record's shape and its refusal, and
neither reached the thing that actually opened the write — a record whose every
verdict reads `consistent`, composed by the same sitting that wanted the path
adopted. **deferred slots minted by this amendment: none.**

**Status:** v27, amended 2026-09-05 (kogaki#859, PR #863 round 2) — §6's
retention clause names the check case that carries it, after the claim it made
was found carrier-less. v26, re-cut 2026-09-03 (kogaki#784) under kogaki#743's
four criteria; no clause was amended by that re-cut, which took carrier-held
prose, version narrative and ratification quote-trail. **Governs** port manifest
item 2 — its structure half.

## What this file is for, and what it is not

No runtime reads this file. The Brief and Draft lanes are driven by their own
carriers — `src/compose.mjs`, `src/brief.mjs`, `src/assemble.mjs`,
`src/draft.mjs`, `src/packet-template.md`, `src/specialization-schema.json`,
`src/gate-registry.json`, `src/figure-kinds.json`, `src/figure-schema.json`,
`specs/move-extraction-contract.md` and the registered
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
Brief.

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
| journey incorporation | **bound** — Journeys are admissible leg materials (§4), §4.8 binds arc integrity, and the register choice rides Candidate differentiation (§6.1). **No incorporation gate is registered, and none is owed.** |
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

## 4. A Leg, the Move it binds, and what neither may be

**Two shapes, not one.** The Brief's structure section is a sequence of Legs;
a Leg **binds** a Move from the library (§7). A Leg and a Move are separate
types and **binding changes the type of neither**. A Leg is *this article's*
sequence element, authored per article and discarded with it; a Move is a
durable, source-specific precedent that outlives any one article. Collapsing
them makes every Move an article's private property and every Leg a library
entry, which is neither.

`necessity:` a type distinction with no runtime representation — nothing in the
records forces it, and the collapse is a convenience that reads as tidiness.

### 4.1 The Leg — the Brief's sequence element

**RENAMED FROM "THE STEP" (kogaki#1177), and the rename is recorded rather
than left to a reader who remembers the old name.** The Move concept is
recorded as following Swales' move analysis, where a Move is **realized by**
one or more Steps; kogaki's binding ran the other way, one Step binding one
Move, so the two usages were inverted and a reader who knew the source read
the hierarchy backwards. Leg carries no meaning in Swales, in the knowledge
hub, or elsewhere in kogaki, and is one segment of the route a traveler
covers — which is what this element is on the Reader Path. The owner chose
it over Beat and Turn. The rename lands at every carrier in one act: the
prose name, `step_id` (now `leg_id`), the Step Packet (§4.14, now the Leg
Packet), the `packet --step` argument (now `--leg`), and every heading and
template that named it. **`draft.mjs section`'s subcommand name is untouched
by this rename**, exactly as kogaki#825 left it standing through the Packet
rename above — that decision is not reopened here.

**THE DISPOSITION FOR STORED BRIEFS AND PACKETS IS A ONE-TIME REWRITE, AND NO
READER ACCEPTS BOTH KEYS.** Acceptance item 1 of kogaki#1177 is that no field
carries the retired name, and a reader holding `step_id` open for one release
is exactly such a field — so the two candidate dispositions were not equally
available, and the rewrite is the only one consistent with the Issue that
licensed the rename. The stored artifacts it applies to are **machine-local**:
`theses/` is untracked and `runs/*` is gitignored (`runs/README.md` excepted),
so the population is per checkout and no repository-wide claim about it is
verifiable from a clone. **That is why the disposition is stated as an act
rather than as an absence** — a run that found nothing to migrate and a run
that never looked are indistinguishable from here, and the first draft of this
note asserted the absence from a worktree `git worktree add` had not populated
those paths into.

- **`leg_id`** — the Leg's identity within this Brief.
- **`move`** — a binding to a Move library entry (§7). **Required.**
- **`materials`** — which Strands, which Journeys, the Thesis, a reader
  premise, or `constructed_material` it works on. **Many-to-many** with Legs.
  The reader premise is the Brief's **Reader start**, named here in words
  rather than by the retired `reader_assumption` token: that token was a
  CLAIM type, it left the grammar at §4.4, and leaving it standing as this
  field's one surviving use would hand a reader a term with nothing left
  defining it (kogaki#1095). Reader start is a **stance**, written in the same
  five dimensions and the same `dimension: value` line as a Move's `before`/
  `after` (§4.2, §5.1.1) — not the knowledge-only field it was before
  kogaki#1176.
- **`purpose`** — what the Leg does to the reader.
- **`reader_state_after`** — what the reader holds when the Leg ends, judged
  against the Move's `after` (§4.12.2).
- **`reader_state_before`** — **derived, never composed** (kogaki#1325, owner
  decision 2026-10-10: "The proposal for `specializes` seems to have returned
  to the original design. I approve."). It is the previous Leg's
  `reader_state_after`, verbatim, and the Brief's Reader start for the first
  Leg; `validateLegs` writes it and refuses a Candidate whose Leg carries the
  field, by name. So a before-state can hold nothing no earlier text stated:
  the reader arrives at a Leg holding exactly what the Leg before it left them
  holding. **What replaced it** was a composed before-state judged a
  "consistent specialization" of its Move's `before`, or of Reader start for
  the first Leg (kogaki#1216). Nothing defined a specialization beyond the
  word, and in the Brief run of 2026-10-09 the first Leg's before-state moved
  the Thesis out of Reader start's `question` line into `knowledge` — "holds
  the sentence as a slogan" — and the judge accepted it; the Move's `before`
  then held a general claim no text had stated, and the Draft's opening left
  the reader without the rule. The Brief still renders the derived value as
  the Leg block's `reader_state_before:` line, so every reader of the file
  keeps working until the record writes each state once (kogaki#1328).
- **`waypoints`** — **required** (kogaki#1311). The ordered route from
  `reader_state_before` to `reader_state_after`: this Leg's own
  specialization of its Move's `technique`, written when the Leg is composed.
  Each waypoint carries a `point` and the claims it `serves`, by Strand id.
  - **A point, never an effect** (kogaki#1326, owner decision 2026-10-10:
    "Let us revise the boundary so that a Waypoint describes what should be
    written rather than being a Move itself"). `point` is the proposition the
    paragraph makes, in the article's subject, one sentence, in route order:
    what the paragraph establishes, never how the reader is to feel or what
    they are "handed". The effect form kogaki#1311 introduced — what a step
    does to the reader — was narrated by the writer: on the 2026-10-09 Draft
    the stage directions became topic sentences, and a Leg's waypoints were
    its Move's technique with the subject filled in. The point is not quoted;
    its wording stays the writer's.
  - **It serves a claim.** A point need not restate the claim; it is
    obtainable from the claim it serves, and a reinforcing point — an
    example, a consequence, an answer to an objection — names the claim it
    reinforces.
  - **The composer writes the points from the Move's Segments** where the
    Move carries them, and from its `technique` until it does.

  **The count is the composer's**, decided from the Move's prose, and the
  composer need not reproduce a Move's internal structure element for
  element, even where the Move describes a fixed number. One waypoint per
  paragraph is "a strong tendency rather than a guarantee", and no mechanism
  refuses a mismatch. `validateLegs` refuses an empty list, a waypoint with an
  empty `point` or `serves`, a waypoint still carrying `effect` (by name), a
  `serves` entry naming a Strand the Leg carries
  no claim for, and a claim no waypoint serves — each naming the Leg and the
  waypoint; `draft.mjs resolve` refuses a Brief Leg carrying none, by name. **No
  information of the Leg's Move is copied onto the Leg**: `breaks` is part of
  the Move and its responsibility ends when the Candidate is produced, and no
  paragraph Move reaches the waypoint at all.
  - **A Leg Waypoint carries `point` and `serves`, and nothing else**
    (kogaki#1375, owner decision 2026-10-14: "Move information may be used up
    to Paragraph Waypoint generation and nowhere after it"). The paragraph
    Move is bound after the Brief, by the ParagraphPlan stage (§4.19), and
    which Move it bound stays in that stage's run directory; nothing of it
    reaches the Brief. `waypointsRefusal` (`src/compose.mjs`) refuses a
    waypoint carrying `move` or `segments` by name, as it refuses `effect`, so
    a Brief carrying either — one composed while kogaki#1359's second pass
    copied them onto the waypoint — is refused at every read, by `/brief`'s
    own validation, by `/paragraph-plan` and by `draft.mjs resolve`, and is
    recomposed by a new `/brief` run, never patched. `src/leg-schema.json`
    declares neither field.
- **`depends_on`** — the earlier Legs whose conclusions this Leg stands on.
- **`rationale`** — why *this article's* materials make this the next Leg.
- **`introduces`** — optional; §4.13.
- **`bridges`** — optional; §4.11.
- **`opens_section`** — optional; §4.15.
- **`figure`** and **`figure_roles`** — optional, and they travel together; §4.16.
  The record the pair eventually produces is §4.17's.

**Why `move` is required.** `Leg = Input + State`. The inputs are the Strands,
the Thesis and previous Leg output; **the Move is the State**, and
`reader_state_before`/`after` are that framework's result. So `move` is not a
candidate carrier for some property that could be delivered another way — it is
what a Leg is made of, and a Leg without one has no defined reader-state
transition type rather than an undertested one.

The shape is enforced by `validateLegs` in `src/compose.mjs`, so a Move-less
Leg is unwritable rather than discouraged.

**A defined term reaches a Leg only after the Leg that introduces it**
(kogaki#1331, owner decision 2026-10-10). `validateLegs` refuses a Candidate
in which a term the Brief's `defined_terms` (§5.1) classifies `defined`
appears — whole-word, case-insensitive — in a claim's `proposition`, a
waypoint's `point` or an `opens_section` of any Leg before the Leg whose
`introduces` carries it, naming the Leg, the field and the term; a defined
term no Leg introduces is before every Leg. The Thesis is exempt as the
title, so its defined words are carried by the `introduces` of the first Leg
whose claim uses them. The refusal rides the compose unit's own re-ask: the
composer adds the `introduces` entry or rewords, and the Candidate is not
discarded. Which words are `defined` is decided once, at mint; the test is on
the sense the article gives a word, never on whether the word is common —
"check", "guard", "list" and "pass" in a CI sense are everyday English and
still defined.

**Reopen trigger.** The declined `move: none` arm — every Leg declaring either
a library entry or a typed absence with a reason — costs nothing while no
untypeable transition has been observed. **The first genuine transition that
cannot be typed against the library, forcing a filler entry minted only to
satisfy the validator, re-costs that arm**, as its own fork, one instance,
never a silent skip.

`necessity:` the field list is enforced by a carrier; what is not is *why* the
Move is mandatory, which is a claim about what a Leg is. Deleting the reason
leaves the requirement looking like an arbitrary strictness, which is how it
gets relaxed.

### 4.2 The Move library entry — rebuilt from the Corpus (kogaki#1175)

**This schema replaces the eight-field one in full.** The prior schema was
decided without a corpus behind it (kogaki#1173): every one of the 22 Moves it
produced began `requires` with "the reader understands X", so a change in the
reader's question, expectation, orientation or trust had no place in it. This
one is derived by running `passages/DERIVATION.md` over a Corpus of Extractions of
Passages and ruled on by the owner as a document (kogaki#1173) before anything
was written. The schema authority remains
`specs/move-extraction-contract.md`.

**Origin.** The Move concept follows Swales' move analysis in genre studies: a
text is coded as a sequence of communicative purposes, each a move. The
reader's question, the `question` dimension of `before`/`after` below, follows Minto's
Situation-Complication-Question-Answer pattern, read through
question-under-discussion analysis (Roberts 1996): a text opens a question and
either settles it, or replaces it with a narrower one taken up in its stead.

**Two levels, one schema, one library (kogaki#1358, kogaki#1359, kogaki#1366;
design on kogaki#1329, owner decisions 2026-10-10, 2026-10-12 and 2026-10-13).**
A Move serves one of two levels and no third: a **Leg Move** is the
transformation a Leg performs over a Passage, and a **paragraph Move** is the
transformation one paragraph of that Passage performs. Both are records of
this section's schema, and a Move record says nothing about which level it
serves — the two live together in **one directory, `moves/`**, with one
`INDEX.md` and one `ROLES.json`, and the same adapter reads every record. The
difference between the levels stays where the 2026-10-12 decision put it, in
the fit judgment: a Leg's successor is chosen freely, a waypoint's successor
is fixed by the next waypoint. The Leg Move's Segments give the composer the
*order of the Leg Waypoints*, and a paragraph Move's Segments give the
ParagraphPlan stage (§4.19) the *order of one Leg Waypoint's Paragraph
Waypoints*; neither level reaches the Brief, the Packet or the writer
(kogaki#1375). **`segments` holds the generalized clauses only** (kogaki#1367):
each Segment's content clause is written about the original paragraph and
stays in the Extraction for the owner's reading and the derivation tooling, but
`tools/move_ingest.py` copies the generalized clause — subject-free the way
`technique` is written — into the Move record, never the content clause,
since a Move reaches any article it is bound into and a content-bearing
Segment clause would carry its source paragraph into every one of them. A
paragraph Move is read off a written paragraph Extraction
(`passages/FORMAT.md` "The paragraph unit") by `tools/move_ingest.py
passage --from-extraction`, with no model call, and lands in `moves/` like any
other accepted Move (§6.9). **Populating the library with paragraph-derived
Moves is the owner's act**, one Extraction at a time; a Brief run binds from
whatever `moves/` holds — a ParagraphPlan run binds from it (§4.19), and a
Leg Waypoint no Move in it fits refuses `no_paragraph_move_fits` with no
fallback — there is no start-time
refusal on an empty directory.

**Five fields are always present; three are optional.** `status` is retired —
a Move enters observed and nothing here licenses a later generalization claim,
so no field carries one. `order` and `presupposes` (kogaki#1247), `draws_on`
(kogaki#1280) and `question` (kogaki#1324) are retired too, each by owner
ruling, and a record still carrying one is refused by name at §6.9.0
condition 3.

| field | present | what it holds |
|---|---|---|
| `id` | always | verb phrase naming the transformation, snake_case |
| `before` | always | one line per reader dimension the Move starts from |
| `after` | always | one line per reader dimension the Move leaves the reader in |
| `technique` | always | what the Move does, subject-free |
| `breaks` | always | the three tests a correct performance must survive |
| `continues_from` | optional | a prior Move's `id`, when this one picks up from it |
| `evidence` | optional | the source work and where the Passage sits — no quotation |
| `figure` | optional | a Figure spec's `kind`, `positions` and `relations`, never its content |
| `segments` | added by the tool | the Extraction's ordered Segments, copied in by `tools/move_ingest.py`, never authored by the model |

**`before` / `after`.** One line per reader dimension the Move changes;
unchanged dimensions are omitted. The dimension set — knowledge, question,
expectation, orientation, trust — is the hypothesis the derivation tested
against the Corpus (Property 1, below); all five survived (kogaki#1173,
2026-09-23: trust is never the *strongest* change in the Corpus, but no
disagreement was raised against dropping it, since a slower-moving dimension
is still a dimension).

**The reader's question lives in `before`/`after`.** Its `question:` line
states the question the reader holds (`holds: none` where the reader arrives
with no live question), and `after`'s line states whether the Move settled
it, replaced it with a narrower one taken up in its stead, or raised a new
one beside it — question-under-discussion analysis treats a sub-question
taken up in place of a larger one as a strategy distinct from answering it.

**`question` retired (kogaki#1324, owner ruling 2026-10-10).** The record
carried a separate `question` field (`holds:` / `settles:` / `replaces:` /
`raises:`), and the composer was never handed it: the Move it reads is
`before`, `after`, `technique` and `breaks`. Its one reader was the question
chain — `validateLegs`' refusal and Path Review's `question_chain` item
(§4.12.2) — which therefore judged a Candidate against a field the composer
never received, depending on the Move rather than on what the Composer
produced. The field was also redundant by construction: the ingest check
that guarded it already required its `raises:` to appear as a `question:`
line in `after`. The field, that ingest check and the compose-side refusal
are removed together; the question chain reads the Legs' own question lines
only.

**`order` and `presupposes` retired (kogaki#1247, owner ruling).** No
composer, judge or Packet read either.

**`draws_on` retired (kogaki#1280, owner ruling).** No composer, judge or
Packet read it; the Leg Packet's Move block was then `technique`,
`question`, `breaks` (and left the Packet with kogaki#1311), so the field carried nothing downstream and was removed
from the record contract.

**`continues_from`.** Optional. A prior Move's `id`, when this Move picks up
directly from it. About half the Corpus's Extractions name a specific antecedent
in their own notes; the rest are true openings and carry no value.

**`technique`.** What the Move does, written subject-free — replaces
`intent`. Subject-free is the general rule (below); `technique` is where the
Corpus already wrote it that way without being told to. A Leg specializes it
in its own `waypoints` (§4.1) and the writer never reads it (kogaki#1311).

**`breaks`.** The three tests a correct performance must survive — remove,
reorder, extend — one line each, replacing `constraints` and `failure_modes`.
Read by the Move-fit judgment, which asks whether a Leg's waypoints survive
each test (§4.12.2), and by the composer choosing a Move; not rendered to the
writer and not read by Reverse Outlining, which compares the prose to the
Leg's waypoints instead (kogaki#1311 — the sentence this replaces said the
reverse, and stopped being true when the Move left the Packet).

**`evidence`.** Optional, typically empty until source metadata is captured
upstream. A source line naming the work and where the Passage sits — never a
quotation. Replaces `excerpt`, which held the extractor's own account rather
than an exemplar in the few-shot sense since the 2026-09-02 amendment
(kogaki#751), and whose benefit as an exemplar was never verified. **The one
field written with the text's subject as its grammatical subject** — see
subject-independence, below.

**`figure`.** Optional. Replaces `visual_form` — §6.9.3, amended in place to
this name. Carries a Figure spec's `kind`, `positions` (roles) and
`relations`, drawn from `passages/FIGURE.md`, never the spec's `content`.
`src/figure-kinds.json` remains the closed set the mechanical validator
checks against; a kind FIGURE.md's classification names that is not yet in
that set is a widening owed to `src/figure-kinds.json` under its own
amendment, never a silent admission. **Absent by default**, admitted the same
way `visual_form` was: added only when the Move's transformation has a
relational shape, which is the admission act's judgment, never a rule here.

**`segments` (kogaki#1320, owner ruling 2026-10-10).** Not one of the eight
keys the model authors. `tools/move_ingest.py`'s `passage` mode copies the
Extraction's `## 3. The order inside the Passage` into the admitted record's
own `segments`, entry for entry, in the same order, so a human can check a
Leg's waypoint order against something other than the prose of `technique`.
A record is refused, naming `segments`, where the Extraction carries no
section 3 to copy from, or where the model's own record already carried a
`segments` value that disagrees with the copy.

**Subject-independence is the default for every field (owner ruling,
2026-09-23: "a fundamental principle of the design from the beginning").** No
field is written with the text's own subject as its grammatical subject unless
the field is *defined* as subject-bound — the sole exception is `evidence`,
which is a claim about a specific work and cannot be written any other way.

**The three Properties.** Decided over the whole Corpus by the derivation act,
never per Move, and never re-asked per Move (`passages/DERIVATION.md`). A
fourth candidate — position in the text (opening/body/closing) — was tried and
dropped: it had no ground in Swales' method and collapsed with prior-text
dependence in the first Corpus round. The three that remain are not
themselves stored fields; each fixes the value set or the descriptive range of
a field above:

1. **The reader dimension most changed** fixes `before`/`after`'s dimension
   set — read off which dimension recurs as the strongest change across the
   Corpus.
2. **The source of the material the Move draws on** fixed the retired
   `draws_on` field's kind set (kogaki#1280) — read off the footholds that
   recur across the Corpus. No field carries this Property any longer.
3. **The length the Move typically occupies** is a corpus fact, carried from
   each Extraction's `length` line, never an axis: the derivation reports the
   range and the typical size, and proposes no field for it unless the Corpus
   itself clusters into visibly distinct bands. None does yet, so no field
   carries it.

**Field roles — the pipeline reads roles, never field names (kogaki#1175,
owner question 2026-09-23).** A schema declares, for every field, the role
the pipeline reads it by; a second schema with different field names runs
through the same Packet by declaring the same roles. **`moves/ROLES.json` is
the one carrier of this mapping** (kogaki#1349): `tools/move_ingest.py`
validates an ingested record against it and `src/compose.mjs` builds the
per-Leg Move input through an adapter that reads it, rather than either
reading a Move's fields by name, so a schema that renames a field changes
nothing downstream of the declaration. The table below is this file's own
reading of the same roles, kept beside the declaration rather than inside it
because a role's *reader* is prose this file states and the JSON does not:

| role | field (current schema) | read by |
|---|---|---|
| `identity` | `id` | `tools/move_ingest.py`'s dedupe and filename derivation (§6.9) |
| `state-before` | `before` | Path Review's specialization judgment (§4.4) |
| `state-after` | `after` | Path Review's specialization judgment (§4.4) |
| `specialized-by-the-Leg` | `technique` | the composer and the per-unit Move-fit judgment, against the Leg's `waypoints` (§4.12.2); for a paragraph Move, the ParagraphPlan stage, as the Paragraph Waypoints' order where the Move carries no `segments`, and as a criterion of its judge (§4.19, kogaki#1378) |
| `tests` | `breaks` | the per-unit Move-fit judgment, against the Leg's `waypoints` (§4.12.2); for a paragraph Move, the ParagraphPlan stage's judge, against the Paragraph Waypoints (§4.19, kogaki#1378) |
| `segments` | `segments` | the composer and the per-unit Move-fit judgment, as the waypoints' order where the Move carries it (§4.12.2, kogaki#1320); for a paragraph Move, the ParagraphPlan stage, as the Paragraph Waypoints' order (§4.19, kogaki#1375); no stage after it |
| `figure-roles` | `figure` | a Leg's `figure:` declaration (§4.16) |
| `continues-from` | `continues_from` | nothing downstream; kept for the record's own sake |
| not read downstream | `evidence` | nothing; kept for the record's own sake |

`identity`, `state-before` and `state-after` are the roles every schema must
map; the rest are optional, null where a schema has nothing to map them to
(`moves/ROLES.json`). No Move field has a role read after the Candidate: the
`rendered-to-writer` role left this table with kogaki#1311, when the Packet
stopped carrying the Move. The multi-schema manifest itself — one library,
several declared schemas — is not built by this Issue; it is deferred,
productization work, and this table is what a later reopen builds on.

**Moves ↔ Strands are many-to-many.** A Move may bind no Strand, several, a
Journey, the Thesis, or an earlier Leg's conclusion.

**Names describe, never generate.** A Leg may carry a descriptive name,
written **after** the Leg is composed: admissible in a Candidate's
*rendering*, inadmissible in the material that *produces* it. A `move` binding
is not a name read before a rationale — the rationale is authored from this
article's materials, and the binding records which durable precedent that
reasoning turned out to instance. **A composer that selected a Move first and
then wrote a rationale to fit it has generated from a name.** The order is the
invariant, not the vocabulary's absence.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:13`

**Deliberately absent from the Leg's shape**, each because it would be the
generating half in another costume: any **adjacency table** of which Leg may
follow which, any **fit rule** proposing a shape from the material, and any
`material_roles` typing of what a material is *for*. A stored flowchart is the
declined article-framework menu one level down.

`necessity:` the absent fields are the load-bearing half and no carrier can
hold an absence. The order invariant is invisible in the finished Brief, which
is exactly why §4.5 has to make it observable.

### 4.3 Reader Path is the ARTIFACT; the five blocks are the workflow

**Reader Path names the artifact only** — the ordered sequence of Legs inside
one Candidate. The workflow blocks have their own fixed names:

    path composition → Move binding → Candidate assembly → Path Review → Candidate selection

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:20`

**Block 4 is named Path Review**, one term (kogaki#1151, owner decision
2026-09-19: "the Candidate review mechanism gets a specific name; leaving it as
'Review' will cause naming collisions"). It names the artifact reviewed and the
mechanism — `src/path-review-agent.md`, the agent that applies it — and is used
everywhere the block is named, superseding the bare word "review" as this
block's name.

**Every MUST below names the block that judges it.** A MUST with no named judge
is a rule with no occasion, and the occasion is the scarce resource. **Where
this spec states an obligation without naming its block, the obligation is
defective, not merely unhomed.**

A Strand may support multiple Legs and is never consumed by first use.

`necessity:` a vocabulary rule plus a self-binding completeness test. Nothing
executes "every MUST names its judge", and this spec has already failed it
against itself once (§5.1.1), which is the argument for keeping it stated.

### 4.4 What a Leg claims, and the `entailed` flag

**A claim is the one proposition a Leg asserts on behalf of one Strand, for
this reader at this point in the path** (owner ruling, 2026-09-13; kogaki#1113).
A Leg's `claims` are **specific propositions**, each traceable to sentences in
the material and each naming the Strand it is asserted on behalf of.

**The claim is what is asserted; its ground is the pinned Lesson.** In Toulmin's
layout the *claim* is what is asserted and the *ground* is the data it rests on,
and the field carried claims under the name of their evidence until 2026-09-13 —
which is why it read two ways across its life, sometimes as the Lesson's own
Claim sentence and sometimes as prose already transformed for the Leg. The
ground is held as an **address** in the Brief's Strands section and is **never
copied**: the Leg Packet renders the Leg's claims and no Lesson text, which is
what keeps *assert nothing beyond* checkable, and the Lesson's original Claim
sentence stays at the pin.

**The field belongs to the Brief because Document Planning is content
determination.** Three mechanisms read the Brief's decision about what each Leg
says as their declared side: Path Review's entailment and arc checks over the
sequence of assertions, the grounds test of §4.5, and Reverse Outlining's
comparison of what the passage asserts against what the Brief declared. A Brief
holding only addresses and purposes would defer content to Draft, which has the
least context in the pipeline, and would leave all three without a declared
side.

**The boundary against the Leg's other fields is one of grammatical kind.**
`purpose` is a verb about the reader and contains no proposition from the
material; a **claim is a proposition about the world and names no reader**;
`reader_state_after` is the reader's condition afterwards; `rationale` is the
order argument. A claim that mentions the reader, or a purpose that could be
true or false of the world, is in the wrong field.

**A Lesson and a Journey are not treated alike, and the asymmetry is the
principle.** A Lesson's Claim is a proposition, its transformation into this
Leg's claim is the planning decision, and the Brief carries the result; a
Journey is a Strand that supplies a concrete example, how much of it the Leg
draws on depends on the Move and the prior prose, and the Brief carries only
its address and its use (kogaki#1111; kogaki#1323).

**The set was three, and the two that left are named with where their content
belongs.** A `leg_effect` entry was inherited reader state and a
`reader_assumption` entry was a presupposed premise; the Leg Packet renders
every claim under one instruction — *these are what this Leg may assert* — and
neither of those is an assertion, so a passage that realizes its Leg correctly
never states them and the Blind Reader, asked for one line per thing the passage
asserts, never recovers them. The first full review run failed `claims-unused`
on 8 of 8 Legs against premise-type entries alone: a comparison whose declared
side carries a category its reverse side cannot produce measures nothing.
**Inherited state stays where it already lives** — `reader_state_before` and the
computed `already knows` ledger, which were already carrying it twice over — and
**a reader premise belongs to the Brief's Reader start**.

**One claim per Strand named in `materials`**, and a Strand that serves several
Legs carries a **different** claim in each — that is what makes the path a
sequence rather than a restatement.

**The carrier is `validateLegs` in `src/compose.mjs`**, which holds the type
set, the one-per-Strand refusal and the `claim (strand L<n>): <proposition>`
serialization together. That is what makes a non-Strand claim **unwritable**
rather than discouraged: removing this spec and the brief skill from the tree
leaves the refusal standing.

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
Leg, revise the path, or leave the Strand unused** — and inventing material is
not among them. Judged at **Path Review**.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:17`

`necessity:` a closed list of prohibited inferences, each of which produces
well-formed output. No schema can tell a reconstructed reading from an invented
one; only a reader holding the material can.

### 4.5 The grounds test — the observable form of describe-never-generate

The composition order is **Strand information → concrete Leg reasoning → Move
binding**, and the order is **invisible in the finished Brief**: a Move-first
and a grounds-first composition can produce identical text. So the invariant is
carried by a test on the artifact rather than by a claim about how it was made.

**Delete the Move name from the Leg's rationale. If what remains does not
stand on its grounds, the Leg was composed Move-first.** Judged at **path
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
- **The five-warrant sentence test.** Every sentence outside `evidence` is
  warranted by exactly one of: the operation, the required prior reader state,
  the produced reader state, a valid-vs-invalid application distinction, an
  observable failure form. **A sentence whose removal changes none of them is
  removed.**
- **One proposition, one field.** A proposition appearing in two fields is a
  defect in both.
- **`evidence` carries the source work and where the Passage sits, and nothing
  else** — no quotation, no reader-movement account; that account lives in
  `before`/`after` and `technique` (§4.2).
- **A `breaks` line never paraphrases another**, and a Move never describes
  an article position, a sequence of Moves, a whole-article outcome, or the
  materials an article must supply.

**Reader states are article-specific propositions, never a global list.** A
Move's own `before`/`after` (§4.2) are written at the dimension level — which
of knowledge, question, expectation, orientation or trust moves, and how, in
terms that generalize — and the **concrete, article-specific** before/after
states live **only on the Leg**, as the instance forms §4.12 names. A Move
whose `before`/`after` name this article's own facts rather than a reusable
reader movement is a global vocabulary growing quietly, wearing the general
field's shape.

**A Move enters the library carrying no generality claim** — `status` is
retired (§4.2, §7) — so nothing here licenses importing a literature-derived
Move as more validated than an observed one; a claim of that kind is a later
act with its own grounds, not a field a record can set on entry.

Judged at **Move ingestion's agent review** (§6.9) for a Move entering the
library, and at **Path Review** for a Move edited in place. **The removal test
is applied as judgment and is never mechanized** — §4.6 clause 3 exists for
this sentence specifically.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:14`
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:10`

`necessity:` an authoring discipline applied by a reader to prose. Every clause
is a judgment about meaning, and §4.6 clause 3 forbids the mechanization that
would otherwise be the obvious carrier.

### 4.8 Journey integrity — the arc, not the layout

**A Journey is material for a concrete example, in any form** (kogaki#1323,
owner ruling 2026-10-10) — not fundamentally different from a Claim, apart
from allowing more detailed specification through Waypoints. What follows is
about its **arc** once a Leg draws on it, never a license to tell it.

- **A Lesson's claims and evidence project freely into multiple Legs.** No
  budget, no once-per-Strand rule.
- **A Journey may support multiple Legs and NEED NOT STAY CONTIGUOUS.**
  Adjacency is not what its integrity is made of.
- **The Strand's boundaries remain PROVENANCE.** They record where material
  came from and never dictate where it lands; one section per Strand is the
  source-shaped block §4.3 exists to dissolve.
- **The temporal and causal relations — initial understanding → turning point →
  outcome — are never reversed or severed.**

So the constraint is on the **arc**, not the layout: a Journey scattered across
four non-adjacent Legs in its own causal order is conformant; two adjacent
Legs that put the outcome before the turning point are not. Judged at **path
review**.
`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:18`

`necessity:` three permissions and one constraint, all about meaning. A layout
rule could be checked; an arc's causality cannot.

### 4.9 The analysis document — where observed sequences live

Recording observed sequences is ratified, and a Move's record may not hold
them. They get **one home**: `analysis/<source-slug>.md`, one file per source
passage, the slug the whole stem — mirroring `moves/<id>.yaml`.

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

**A Move's `evidence` may point at an analysis document, and the prose
contains the literal path.** Without the path the pointer leaves no trace, and
a Move that points is byte-identical to one that does not.

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
Candidate-selection gate, and conformance is judged at **Path Review**.

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

### 4.11 The Bridge Leg

Once the Thesis is decided and the Leg sequence is being composed, a causal
gap between adjacent Legs is repaired by inserting a **Bridge Leg**.

**An insertion contract, not a type.** A Bridge Leg is an ordinary §4.1 Leg
whose placement is constrained by its neighbours: its `reader_state_before` is
the predecessor's `reader_state_after`, as every Leg's is (§4.1); its `reader_state_after` supplies what
the successor's `reader_state_before` requires; `depends_on` is updated across
the splice. It may use Strands or not, and bind a Move or not; where its
connecting claim is not traceable to Strand material it carries the flags every
Leg already has (§4.4).

**`bridges` marks; it never constrains.** The placement constraints above make a
Leg *well-placed*, and an ordinary Leg is equally well-placed — so nothing in
them distinguishes an **inserted** Leg from one composed in the first pass.
Insertion is a fact about the Brief's history, not about its shape, and a
disclosure computed from an unrecoverable fact must read it from a record. So
`bridges` is an optional array of exactly two Leg ids, validated on
composition and carried through the recorded serialization. It mints no Move.

**No special Move class exists for a bridge.** A bridge-shaped Move enters the
library as an ordinary Move through §6.9 when a reference passage yields one.

**The Brief workflow never proposes or creates a Move.** `/brief` completes the
Brief from the **existing** library and the selected Strands; minting is not
this workflow's act. A transition typing against no entry raises §4.1's reopen
trigger rather than composing anyway.

**The revise pass is removed** (kogaki#1307, owner decision 2026-10-08). It
routed a Candidate with a continuity gap or an open Closure row back to path
composition once after Path Review, under four Harness-declared Arms and a
round count kept in an attach ledger — and no state of the Brief table ever
ran it, so the bound counted a loop that did not exist. What it was for is now
done earlier and once: a Candidate whose Legs do not fit their Moves is
recomposed once inside the compose job (§4.12.2), and Path Review carries its
reasoning onto every finished Candidate and counts nothing. An open Closure row
is reasoning the owner reads at the Candidate gate, never a withdrawal.

**Disclosure-class evidence gets ONE test, applied per field** (kogaki#909,
owner ruling 2026-09-06). Disclosure-class evidence that bears on the pending
selection is **decision-grade** and reaches the **selection gate**; evidence
that is a post-hoc report or approval is **post-hoc** and rides the **minted
Brief's slot** (this section's own disclosure surface, kogaki#864, built at
kogaki#866). `bridges` is post-hoc and stays exactly where kogaki#864 put it.
`revise_residue`, the one decision-grade field, left with the revise pass, so
no field is decision-grade at present and the table declares that grade no
longer; a field that bears on the choice joins by its own ruling.
`consulted: product-lab@172ede395a5d74ef9a8b2c7b2031f79fda2fc930
topics/archive/knowledge-architecture.md:172` — "a **pending human verdict**
is violated by not being acted on, and the human acts on what they SEE rather
than on what the authoritative file contains, so its carrier is the render
layer."

**THE CARRIER IS `src/disclosure-fields.json`, and a declared field reaching
no surface is refused at the WRITE.** The table names each disclosure-class
field's grade, the grade names the surface, and `src/assemble.mjs` derives the
gate's rendering **from the table** rather than enumerating the fields it
knows — so a field added to the table reaches the owner with no code naming
it, and a renderer that regressed to an enumeration is refused by name at the
composition site. **What this does NOT claim, stated rather than left to be
trusted past:** a field **nobody declared** is outside the table's reach — no
reading of it bears on a key that was never entered. What is closed is the
defect the class was found by, a *declared* piece of evidence with no surface.

**Routing a finding does not make an evaluation level a check.** Transition
continuity is observed inside Path Review's `evaluation_levels` area
(`src/review.mjs`) — there is no area by that name. It registers no check
member, computes no score and produces no verdict.

**Approval is post-hoc disclosure.** No per-Bridge question: each Candidate's
evidence carries its inserted bridges — how many, between which Legs, and each
bridge's reasoning. Three grounds: per-Candidate machine-side work must never
multiply owner questions; the flags already expose every bridge's reasoning at
the one gate that exists; and a per-Bridge stop would be a default mid-workflow
stop with no inspection need.

**THE SECOND GROUND WAS FALSIFIED AND IS NOW REPAIRED** (falsification
kogaki#859, repair kogaki#864, owner ruling 2026-09-04). "The flags already
expose every bridge's reasoning at the one gate that exists" was true while the
gate rendered the evidence; §6's reduction emptied that rendering, and its
amendment stopped the payload copying the evidence at all — so for one release
the bridges were derivable on demand and disclosed nowhere. Post-hoc disclosure
with no disclosure surface is not post-hoc approval; it is no approval.

**THE DISCLOSURE SURFACE IS THE MINTED BRIEF, and the second ground is restated
against it:** the adopted Candidate's bridges are written into the Brief at
adoption — how many, between which Legs, and each bridge's reasoning — in a
slot of its own, and the Brief is a tracked document the owner reads directly.
The three grounds now read: per-Candidate machine-side work must never multiply
owner questions; **the adopted path's bridges reach the owner in the Brief they
are adopted into**; and a per-Bridge stop would be a default mid-workflow stop
with no inspection need.

**Why a post-hoc surface rather than the gate.** The competing arm — restoring a
bridge line above the selection question — was declined, and not on cost. The
served position binding a disclosure to a *gate surface* rests on a person being
unable to leave that surface without abandoning the act: `consulted:
product-lab@dbe745dca3ed930e1cad5b5504b01bb13f602cb0
topics/knowledge-architecture.md:285` — "an auditor asking *did we ask?* can
follow a pointer, and a person holding a four-option screen cannot leave it
without abandoning the act, so the obligation sits on the SURFACE and no amount
of capture discharges it." Bridge approval is **post-hoc by this section's own
design**: there is no surface the owner is held on, so the pointer arm is the one
the position licenses, and putting the line back above a question §6 has just
cleared would spend the surface §6 was reduced to protect.

**THE SCOPE IS THE ADOPTED CANDIDATE ONLY, and that is the property the move
buys rather than a limitation of it.** The gate rendering carried every
Candidate's bridges, including the two the owner did not choose; approval is
about what was adopted, so a per-Candidate disclosure was always wider than the
thing being approved. Nothing is owed about a path that was not taken.

**What the repair does NOT claim.** Until its carrier lands, this clause names a
surface that does not yet exist — which is the defect one level over, so the
carrier is named rather than assumed: **kogaki#866**, filed in the same sitting
that ratified this and carrying the whole of the build (the slot, its fill at
adoption, and the assertions). A clause promising a disclosure with no carrier
is exactly what kogaki#859 recorded, and naming a followable one is what keeps
this from repeating it.

**The third arm is declined and recorded so it is not re-proposed blind:**
ratifying that bridges need no owner disclosure at all. It is legitimate only
with a stated account of what makes an unannounced insertion safe, and no such
account was offered; `LESSONS.md:78@dbe745dc` names the shape it would have to
answer — a control that is installed, current, fires, and does not **act**.

**deferred slot: `bridge-approval-shape`** — escalation to explicit per-Bridge
approval, if dogfooding shows bridges misbehaving. Owed on its own licensing
issue with choice, alternatives and receipt before any gate embeds it.
**UNCHANGED BY kogaki#864, and the distinction is stated rather than left to a
reader who finds two bridge-approval decisions side by side.** This slot's
trigger is *bridges misbehaving*; #864's question was *the disclosure surface
was withdrawn*. Different triggers, different questions — #864 restored a
surface for the approval this section already declares, and decided nothing
about escalating to a per-Bridge question. A sitting reaching for this slot
still owes it its own ruling.

`necessity:` an insertion contract whose marking field is validated by a
carrier, and whose *reason* — insertion is history, not shape — is what stops
the field being deleted as redundant with the placement constraints. The
disclosure shape is conduct at a judgment point.

### 4.12 The Leg↔Move instantiation contract

A Leg **instantiates** a Move: `move` names a record in the library (§7), and
the Leg's `reader_state_after` is the **instance form** of that Move's
`after`, specialized to this reader and these Strands. Its
`reader_state_before` instantiates nothing: it is derived (§4.1, kogaki#1325),
and what is asked of the Move's `before` is whether it requires anything that
derived state does not hold. §4.1
makes the binding required; this section governs **the relationship the binding
asserts**.

**Three halves, carried by different machinery on purpose** — two until v28,
which added the third for the reason §4.12.3 states:

| half | the question | who answers | where it is carried |
|---|---|---|---|
| mechanical | does the id resolve? | the runtime | a set-membership test over the library |
| judged | does the Leg fit its Move — the `before` requiring nothing the derived state lacks, the after-state and the points specializing the rest? | the composing sitting | a typed record the runtime validates and never composes |
| ratified | does the owner accept that judgment as the ground for writing this path? | the owner | a capture at a declared gate, bound to the Candidate and to the record |

`necessity:` that the contract HAS these halves, and that which half a property
belongs to is not a matter of convenience. The table above is the division;
§4.12.1, §4.12.2 and §4.12.3 each state why their own half sits where it does.

**Why "three halves" and not a renaming.** The word is kept because the
two-half division was ratified and is unchanged — v28 adds a half rather than
recutting the existing ones, and a reader meeting "three parts" here would have
no way to tell an addition from a re-division.

#### 4.12.1 The mechanical half — move id resolution

Every `move:` resolves to a record in the library, and a Candidate binding a
dangling id is refused **at composition** (`validateReaderPathUnit`), naming
**the Leg and the id**, where the unit's re-ask can still repair it.

**One seat, since kogaki#1311.** There were two: adoption stopped a dangling id
entering a Brief, and `resolve` stopped a Brief whose library moved underneath
it. Both read the Move after the Candidate was composed, which the owner's
2026-10-09 decision ends — "Information that belongs to Move has
responsibility only up to CandidatePath creation." A Move renamed after a
Brief was composed no longer reaches realization at all: the Leg carries its
own `waypoints`, and nothing in the Draft lane opens the Move it names.

`necessity:` the seat's position is a claim about where the Move's
responsibility ends, which no call site states.

#### 4.12.2 The judged half — the specialization verdict

1. **A mandatory occasion with no skip**, inside the compose job — every job
   unit's Candidate is judged before the unit finishes (kogaki#1307) — and the
   record rides to adoption, the act that writes a path into a Brief, which
   validates it again.
2. **A typed record the harness VALIDATES AND NEVER COMPOSES.** The carrier is
   `src/specialization-schema.json`. No default verdict exists, none is
   inferred from a Leg's fields, and a missing record is a refusal rather than
   a blank to fill.
3. **A deterministic refusal naming the failing Leg**, in the path's own
   order, **quoting the sentence the judging sitting wrote** rather than
   paraphrasing a judgment the runtime did not make.

**What is judged, per Leg** (kogaki#1311, replacing #1276's second and third
clauses; the first clause split by kogaki#1325). Four things, all against the
Move the Leg binds, whose contract the input carries beside the Leg's own
`waypoints` and its derived `reader_state_before`:

- **one question of the Move's `before`**: does it require, on any dimension,
  something the derived before-state does not hold? A Move whose `before`
  needs a stated claim that no earlier Leg's claims or `introduces` entries
  carry does not fit — `contradicts`, with the `why` naming the dimension —
  and at the first Leg, where nothing has been stated, that is any stated
  claim at all. The before-state itself is never judged: it is derived, so
  there is nothing in it a composer could have specialized well or badly;
- whether `reader_state_after` is a consistent specialization of the Move's
  `after`;
- whether the Leg's **points, read in order, follow the Move's order** as its
  `segments` give it, or as its `technique` gives it where the Move carries
  no `segments` (kogaki#1320 — the 21 Moves ingested before the field
  existed carry none, and the judgment falls back rather than refusing),
  each point obtainable from the claim it serves (kogaki#1326). The points
  are judged, not the claims and not the state lines: on 2026-10-08 the
  judgment read Leg 4's state lines, which the composer had written to
  mirror the Move, and passed a Leg the writer then could not perform;
- whether the waypoints **survive each test in the Move's `breaks`**.

**Count fidelity is not a criterion.** A Leg whose `technique` names "twice"
and whose waypoints number three is not refused on that ground. The verdict
vocabulary is unchanged, and a refused unit is asked again while it has an
attempt left (below).

**Why not Path Review.** Path Review's output is reasoning surfaced for a human
gate — never a verdict, never a score — and `src/review.mjs` refuses any
verdict-shaped field by key. A specialization verdict recorded there would be
**unattachable by construction**. The judgment is sited where a verdict is a
legitimate output.

**One Path Review item carries a verdict, and it is named rather than
admitted by shape** (kogaki#1283, owner decision of 2026-10-06). `discharge`
judges, per Obligation record and Leg closing any of its items (kogaki#1612),
whether every item that Leg closes is explained by its Waypoints and claims
(`holds` / `fails`).
It compares two carriers rather than reading the writing, so a closed
two-value verdict is its legitimate output. `src/review.mjs` exempts exactly
that key from the verdict scan; every review-area entry stays prose and is
still refused a verdict-shaped field by key. The verdict is carried to the
human gate and refuses nothing. The specialization verdict is still not sited
there: it judges one Leg against its own Move, which `discharge` does not.
**`question_chain` was the second such item and is retired** (kogaki#1325): it
judged whether Leg N's after-state question line and Leg N+1's before-state
question line named the same question (kogaki#1283, narrowed to the Leg lines
by kogaki#1324). With the before-state derived from the previous after-state
the two lines are one line, so a record carrying it is refused by name; the
Move's `after` question against the state is the fit judge's after-state
comparison.

**The record is bound on both axes** — the **Candidate** it was composed
against, and per verdict the **Move** the Leg binds. Without the first a
sitting judges the Candidate it likes and adopts the one it wants; without the
second a verdict certifies a relationship that is not the one in the Leg.

**One verdict per Leg, exactly, in both directions.** A short record is the
skip this occasion exists to prevent, arriving one Leg at a time; a long one
means the record was composed against a different path than the one adopted.

**The vocabulary is closed and three-valued** — `consistent` | `contradicts` |
`cannot-determine`, exactly one passing. **`cannot-determine` is first-class,
not an escape hatch:** under a two-valued read an honest non-answer must render
as one of the two answers, and the value that absorbs it is the passing one. It
does not weaken the gate — it refuses exactly as `contradicts` does — and it
buys a refusal that says **which**, because an unjudgeable Move contract and a
contradicted one need different repairs.

**The judged half is rendered once, at composition, and is not re-derived at
realization.** `resolve` reads no Move at all since kogaki#1311 — it checks
that every Leg carries waypoints that serve its claims, which is shape;
re-deriving the verdict would be the runtime composing one, which clause 2
forbids.

**The first Leg's before-state IS Reader start** (kogaki#1325, owner decision
2026-10-10), derived like every other Leg's before-state, so the question asked
of Leg 1's Move is the one question above, against Reader start. Reader start
is a cold read from the Persona and the Thesis (§5.1.1), never from a Move, so
an opening Move whose `before` needs a claim the reader could only hold from
the article is refused at the first Leg, naming the dimension. The judgment
input carries each Leg's derived before-state and the question itself
(`src/specialization-schema.json`, `before_state`); the vocabulary, the
one-per-Leg rule, the path-order refusal and the unit's re-ask are unchanged.
**What this replaces** is kogaki#1216's arrangement, under which Leg 1's
composed before-state was judged a consistent specialization of Reader start —
the arrangement that let the 2026-10-09 run move the Thesis into `knowledge`.
kogaki#1216's own ground still holds: Reader start is never written backwards
from the first Leg's Move, because the judgment now runs from the state to the
Move's `before` rather than from a composed before-state back to Reader start,
and the first Leg still binds a Move whose `before` merely does not contradict
Reader start.

**The judged half runs per compose job unit, before Path Review** (kogaki#1307,
owner decision 2026-10-08; this fills the deferred slot
`specialization-judgment-and-path-review-ordering`). kogaki#1276 had moved the
judgment after Path Review and widened it to every Candidate in one call, so a
Candidate excluded there could not be repaired: nothing re-composes after
review. The owner ruled that a content judgment made after a verdict-free
review is positioned incorrectly. Each compose job unit is a headless session
(a `claude -p` child that runs with no tools); once its record passes the
schema, the supervisor runs one more headless session over that record alone,
from the `reader_path_fit_unit` row of `src/brief-workflow.json`, with each
Leg's Move contract and the Brief's Reader start. A `contradicts` or
`cannot-determine` on any Leg is a **schema refusal** of the unit. The record
is written beside the unit's Candidate and adoption renders it as the one
sentence kogaki#1108 made it. When every unit is refused, the Brief ends with no
question, its empty `theses/<slug>/` is removed, and the closing report names
each Candidate's failing Legs and says the Brief was removed.

**The fit pass asks one more question, at the marked Leg only** (kogaki#1330).
Beside each Leg's Move-fit judgment, `reader_path_fit_unit` asks whether the
Leg marked `reaches_target`'s `reader_state_after` holds the Thesis as a claim
the reader can state in their own words — Thesis attainment is judged where
the Reader target is reached (§5.1), never at the review of the finished
Draft. The fit input carries the Thesis beside the Candidate, read from the
Brief record (`readerPathFitInput`, `src/brief.mjs`). A marked Leg whose
after-state does not hold the Thesis is `contradicts`, with a `why` naming the
Thesis — the same schema refusal as above, re-asked with the refusal text
until the unit's attempts are spent. Legs before the mark and closing Legs
after it owe nothing on the Thesis, and this adds no rule about which Leg is
last: the closing-Leg rules (`closing_leg_introduces_nothing`,
`closing_leg_state_fixed`) and `readerTargetLegRefusal` are unchanged.

**A job unit is bounded per call and per attempt count** (kogaki#1355, owner
decision 2026-10-13, replacing kogaki#1273's one retry that fits). Two
settings in `kogaki.settings.json` bound every unit of the compose job and of
the path-review job, and each is written onto the job record when the job
starts:

- `brief.call_limit_s` — how long one headless session (one compose call, one
  fit call, one review call) may run before it is stopped. The stall bound
  stays beneath it as the no-progress guard.
- `brief.unit_attempts` — how many attempts a unit gets. A compose unit makes
  two calls per attempt (compose, then fit); a review unit makes one.

What spends an attempt: a **schema refusal** — the validator's, or the fit
judge's — is asked again with the refusal spliced in verbatim, until the
attempts are spent, and the unit then ends refused with every attempt's
refusal on its row. A **call stopped at the per-call limit** is asked again
with the same prompt and its row records it as timed out; it is a time bound,
not a defect, so the Brief does not end. A **malformed output** (not JSON, or
no record in it) spends no attempt and is asked again with the same prompt, at
most `brief.unit_attempts` times per attempt, past which the unit ends refused
naming the count. A **system failure** (`died`, `stalled`, `other`) still ends
the Brief at once. Whether to ask again reads the attempt count alone, and
no other time bound applies: a job's longest run is the attempts, times the
calls per attempt plus the malformed-output bound (each respawn is a full call
that spends no attempt), times the per-call limit — with the defaults, a
compose unit's 3 × (2 + 3) × 900 seconds — and the owner sets both numbers
without an Issue. A settings file or a `job` row still carrying either retired
time setting of kogaki#1307 is refused naming it, as a missing setting is.

**The status line shows the attempt and an estimate.** `job status`, and
`job await` each time it returns at its 30-second bound, print a header
naming both settings — `each unit gets up to <N> attempts of at most <s>s per
call` — and one line per unit: `unit <id>: attempt <n> of <N>,
<compose|fit>, <status>, <bytes> byte(s) so far`, followed from attempt 2 on
by `about <m>s to go`, where `<m>` is attempt 1's own duration, written onto
the unit's row by the supervisor as `attempt_1_s`, less the time the current
attempt has already run.

`necessity:` the split between what a runtime may decide and what only a
reading sitting can. The schema holds the record's shape; nothing but prose can
say why the verdict may not be composed by the thing that validates it.

#### 4.12.3 The ratified half — the owner gate over a passing record

**A passing record is not the sole unlock.** §4.12.2's every clause is about
the record's SHAPE — its version, its binding, one verdict per Leg, a closed
vocabulary, a `why` long enough to quote back — and a record satisfying all of
them, every verdict reading `consistent`, wrote the path into the Brief with
nothing beside it. That verdict is composed by the same sitting that wants the
path adopted, so the test is exact and was run: **a record of shape-valid
`consistent` verdicts with no judgment behind them adopted a Candidate with no
refusal** — the right act with the guard silently disabled.

**So adoption additionally requires an owner ratification of that record**,
recorded at a declared gate. The record is rendered — every Leg, the Move it
instantiates, the verdict, and the sentence the judging sitting wrote — and the
owner ratifies it or does not. Without a ratification, nothing is written.

**THE REFUSING ARMS ARE UNCHANGED, and the ordering is what makes that true.**
A `contradicts` or `cannot-determine` record refuses at §4.12.2, above this
half, with the same message in the same path order, and **never reaches the
gate**. An owner is asked to ratify a record that already passes and nothing
else: carrying a failing record to a gate would ask them to approve a refusal.

**WHAT THIS HALF DOES NOT DO, stated because the tempting alternative was
declined here** (kogaki#893, owner selection 2026-09-05). It renders no verdict
on a specialization, reads no Move's `before`/`after`, and compares nothing
to anything. **§4.6 clause 3 and §7.5 are untouched** — and more than
untouched, they are what this arm rests on: §7.5 already says `requires`/
`effect` matching is *"surfaced as gate evidence (§6)"*, and §4.6 clause 2
already sites the human gate at approving results. **This is the arm those
sections already licensed.**

**The declined arm, recorded so it is not re-proposed blind.** The alternative
was a mechanical check anchoring each `consistent` verdict's `why` in the
Move's `before`/`after` and the Leg's reader states by string match. It
would have owed this spec an amendment: the runtime reads the library as a set
of ids **and nothing else**, precisely so that nothing is one edit away from
comparing `before`/`after`, and §7.5 holds that matching judgment-class and
*"never type-checked"*. The served position discriminated toward it — an
observer is warranted where the predicate is mechanically decidable at the act
and the cost of not observing has been measured, and both conjuncts hold here —
and the owner selected against it at the gate. Recorded as an owner selection
over a served recommendation, not as an unconsulted fork.
`consulted: product-lab@5f31e8503581da23bc212b8909f2dc8dcc1ef22b topics/knowledge-architecture.md:57`
`consulted: product-lab@5f31e8503581da23bc212b8909f2dc8dcc1ef22b topics/archive/knowledge-architecture.md:162`

**THE CARRIER IS THE ONE THAT ALREADY EXISTS.** The gate is declared in
`src/gate-registry.json` like every other gate this repository raises, its run
declaration and its capture ride SPEC-gate-carrier's own shapes, and the answer
is an `AskUserQuestion` row carrying its `tool_use_id`. No new store and no new
hook. **A free-text answer is not a ratification**: the gate offers free text
because the carrier requires it, and an answer given there is a comment — a
write unlocked by arbitrary prose is unlocked by anything.

**The gate owes a first-class premise negation, and here that is sharper than
the usual reason.** Every option is composed on the premise that the record's
`consistent` verdicts hold, and **that premise is exactly what is being asked
about**. A gate with no first-class way to say it does not hold would be
unfalsifiable at the one moment a human is present to falsify it. The decline
is **recorded**, not discarded, and adoption then refuses **naming it** — an
owner who said no and an owner who was never asked are different facts and must
read differently.

**THE BINDING IS TWO-AXIS, matching the record's own (§4.12.2), and for the
same reasons one level out.** A capture certifies **this Candidate** and **this
record**: without the first an owner ratifies one Candidate and a sitting
adopts another; without the second the record is editable after ratification
and adopts under a capture that judged different verdicts. The second axis is
the one the first cannot cover — same Candidate, same shape, a verdict's own
sentence rewritten — so the capture binds a digest **over the verdicts as
judged, in the adopted path's order**. A record whose verdicts are merely
reordered digests identically; a record whose judgment changed does not.

`necessity:` that a judgment which unlocks a write owes something beside it,
and that the something is a human at a gate rather than a check. The schema
holds the capture's shape and the registry holds the gate's declaration;
nothing but prose can say why the unlock may not rest on the judgment alone,
or why the check that would look decidable here is the arm that was declined.

### 4.13 The reader-knowledge ledger — `introduces` on a Leg

A Leg may carry **`introduces`**: the terms it puts in front of the reader for
the first time, each bare or with a one-line meaning anchor. Authored at Brief
composition, by the composer, like every other Leg field.

The harness **derives** what a reader arriving at Leg N already knows: the
union of Legs 1..N−1's entries. **Always computed, never stored** — a stored
copy would be a second answer to a question the path already answers, and would
be wrong the moment a Leg moved.

**What the field buys.** An unintroduced term becomes **addressable**:
responsibility traces to the first Leg carrying it, or to the Brief when no
Leg does. That is a fact about the path, not a judgment about the prose, which
is what lets it be mechanical at all.

**First introducer wins, and that IS the addressability rather than a
tie-break.** A second declaration is not an error and is not dropped; it simply
moves nothing.

**One line per entry.** A term may contain a comma and its anchor almost always
does, so a comma-joined field cannot be parsed back. Write and read are one
round trip, asserted at both ends; a malformed entry refuses **naming the
Leg**, on both sides, through one shared grammar.

**An empty ledger is a reading, never a failure.** The field is optional, and a
requirement would have refused the whole existing corpus rather than adding
anything to it.

**Shape only.** Whether a term is genuinely new here, whether its anchor
explains it, and whether the Leg's claims already carry it are judgments.
Nothing in this section reads meaning.

**An introduced term is one the article gives its meaning to** (kogaki#1528,
owner decision 2026-10-23). An entry keeps `term` and `meaning` and drops
`kind`: the `coined` / `established` split is retired, because a term the
reader already holds is not introduced at all. **A term a Leg names and
defers** — its meaning given by a later Leg rather than where it first
appears — is not an `introduces` entry of the naming Leg alone: it is an
Obligation, raised by the naming Leg and owed by the Legs that give its
meaning, under §5.2's rules. *Status: stated ahead of the executables*, as
§5.2 states; `introduces_item` still carries `kind` until an Issue removes it.

`necessity:` that an unintroduced term is ADDRESSABLE — a fact about the path
rather than a judgment about the prose, which is the property that lets any of
this be mechanical. §4.13.1 states the exemplar predicate's own reason.

#### 4.13.1 The Move exemplar predicate — RETIRED (kogaki#1175)

**This section used to make `excerpt` the Packet's exemplar: a record whose
`excerpt` carried text served as what a later writer imitates, and an empty one
rendered a stated absence.** `excerpt` is gone (§4.2), and `evidence` — the
field a reader might reach for in its place — **does not inherit the role**.
Ruling 7 (kogaki#1173, 2026-09-23) states why: since the 2026-09-02 amendment
(kogaki#751) `excerpt` had held the extractor's own account rather than text of
the target kind, so it had not served as a few-shot exemplar since then, and
that benefit was never verified. `evidence` is typed accordingly — optional,
typically empty, **read by nothing downstream** (§4.2's role table) — rather
than reopening a predicate whose value this Issue found no ground for.

**The Leg Packet carries no Move block** (kogaki#1311). It carried
`technique`, `question` and `breaks` until then; the Move's prose left the
Packet with that Issue, and the writer works from the Leg's own waypoints
(§4.14).

`necessity:` a retirement recorded at the section that used to carry the
mechanism, so a reader who remembers "exemplar" finds why it is gone rather
than a silently vanished heading.

### 4.14 The Leg Packet

The **harness-assembled input from which the model realizes one Leg's prose** —
the one LLM judgment of the Draft lane. `draft.mjs packet --leg <id>` renders
it; the session realizes the prose; `section` validates it.

**RENAMED FROM "THE SECTION PACKET" (kogaki#825), and the rename is recorded
rather than left to a reader who remembers the old heading.** §4.15 makes
*Section* a **grouping of Legs**, so an artifact rendering exactly one Leg was
a per-Leg packet named for a grouping — in a served spec heading, in a
registered member's admission record, and at the top of the template the model
reads. The rename lands at **every** site carrying the proper noun in one act:
this heading, `specs/spec-brief-draft-design/DESIGN.md` §2.1 and §3,
`checks/registry.json`'s `draft-runtime` contract, `src/draft.mjs`, and
`src/packet-template.md`. **A subset was refused**: renaming the served heading
without the registry contract that quotes it would put two names on one artifact,
which is the defect one level worse than the one being fixed.

**THE `section` SUBCOMMAND KEEPS ITS NAME, and that is a decision rather than an
oversight.** `draft.mjs section` accepts one Leg's realized prose, so after
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

**The Writer is spawned with no tools** (kogaki#1383, owner decision
2026-10-15), so that the Packet's standing as the model's entire input is
enforced by the spawn and not only by instruction. `callWriter` runs it with
the same five hardening arguments `src/workflow/detached-job.mjs` already
spawns the ParagraphPlan and Brief job units with — `--tools ""
--disable-slash-commands --strict-mcp-config --setting-sources ""
--no-session-persistence` — beside `--model` and `--output-format`. A
session with its default tools, run from the repository root, could open the
Brief, the Move library or, in a Proof Sheet run, the Extraction holding the
original paragraph; removing the reach is what makes that unreadable rather
than merely undocumented. The Packet stays the Writer's whole input; nothing
is added to it.

**Block order is fixed**, heavy prose late and the instruction last: global
anchors → **the Leg's waypoints** → the Leg's fields → the §4.13 ledger →
every previously realized Leg's prose in recorded order → the write
instruction.

**No Obligation row renders** (kogaki#1584, owner decision 2026-10-25): the
Obligations ledger is the Plan's at both scales, and the Packet carries no row
and no line derived from one (§5.2 rule 6). The Obligations block of
kogaki#1151 and kogaki#1529 is retired with it.

**No Move field renders, and the waypoints block takes the Move block's place**
(kogaki#1311). The Move's `before`/`after` were excluded from the start, for
the reason that now covers every Move field: the Leg carries the instance form
of each — its states for `before`/`after`, its waypoints for `technique` — so
rendering the Move beside it would put the general and the specialized
statement of one thing side by side and leave the model to choose. The block
renders the points as a **numbered list**, each point once and in route order,
with the claim it serves in the claim's own words (kogaki#1326), under a fixed
usage header: the point is not quoted and its wording is the writer's, and
the paragraphs that carry it are the Paragraph Waypoints beneath it. The header carries no sentence about what a
step does to the reader. Reverse Outlining reads the points back: the Blind
Reader writes the point each paragraph makes, and the `waypoints` row asks
whether each declared point is among them. `draft.mjs` opens no
Move file to render it.

**Under each point, its Paragraph Waypoints — and nothing of a Move**
(kogaki#1375, owner decision 2026-10-14). `draft.mjs` reads the ParagraphPlan
file beside the Brief (§4.19) and the block renders each Leg Waypoint's
Paragraph Waypoints as an **indented numbered sub-list** of the point's own
line, one line per Paragraph Waypoint, its `point` and the Strand ids it
serves: the points the Leg Waypoint's one paragraph makes, in order, and not
one sentence each. No Segment, Move id or other Move field
renders, and `draft.mjs` opens no Move file — the ParagraphPlan file holds
none. `draft.mjs resolve` refuses a Brief with no ParagraphPlan file beside
it, and a ParagraphPlan file whose recorded Brief hash is not the Brief's,
naming both files; it refuses a Brief whose waypoint carries `move` or
`segments` by name (§4.1). `checks/check-draft-packet.sh` carries the
rendering and every refusal.

**A `performs` Paragraph Waypoint renders as an italic operation line, and
its realisation brings in nothing the points do not give** (kogaki#1448,
kogaki#1492). The line names the operation alone and carries no Serves; the
template tells the Writer to perform it in the paragraph's own words, to assert
nothing, and to bring in no part of the subject that the paragraph's points do
not give. No Segment, Extraction content or Move field reaches the Writer to
fill it. *Status: a bound under test* (owner decision 2026-10-21): it is a
sentence the Writer reads, with no judge behind it, adopted to observe whether
the Writer's constraints were the cause. The case to re-read after the next run
is the 2026-10-20 Leg run, paragraph 2, whose operation line was realised with
a reason and a description of the cases that no point gave.

**The Journey block renders material for a concrete example** (kogaki#1323,
owner ruling 2026-10-10), in whatever form this Leg's waypoints need — one
clause or several sentences. Nothing here is a claim, and nothing here is a
narrative to tell merely because it is named a Journey.

**An established term crosses with its name and, where the Brief gives one,
its meaning — never its `source`** (kogaki#1404, owner ruling 2026-10-16).
`introduces_item`'s `source` (§4.13) is a Brief-side justification for why a
term counts as `established`, not Writer material, and the crossing block
never renders it: the defect this closes is exactly `source` text composed as
provenance reaching the write instruction and, from there, the prose.

> **Status (kogaki#1491, owner decision 2026-10-21):** the crossing line
> carries a term and its meaning and nothing on how the prose presents it.
> The words `coined` and `established` no longer reach the Writer: the
> `kind` stays on the Brief's record, where the claim-register judge and the
> adoption refusals read it, and where a term is introduced is fixed by the
> Paragraph Waypoint whose `point` first uses it.
> `checks/check-draft-packet.sh` (i) carries the rendering.
> Both kinds render `- <term> — <meaning>`; `nearest` and `differs` are
> retired (owner decision 2026-10-24): what an article says about an existing
> term is a paragraph's content, which no Move validates in advance.

**Every block the template renders is a Harness contract; every rule of how
the prose reads is the Audience's Register** (kogaki#1321, kogaki#1370). The
heading rule, the budget, the round trip, the refusal form, the waypoints and
claims blocks, the Journey block and the reader's own world are fixed,
identical for every Audience, because each changes model behaviour at
generation and is this file's own concern. A rule that instead governs how
the prose reads — the first-sentence preference, the paragraph anaphora rule,
the enumeration bound — carries no runtime check and belongs to the
reader the article is written for, so it lives in the Audience's `register`
(§4.14, `{{register}}`) and nowhere else: an Audience whose `register` is
empty asks the template for no register rule at all. The "article so far"
block follows the same line: it carries the Leg's own Section's prose and one
fixed header naming what it is, never an instruction, because continuity is a
question of register the Audience's `register` already answers.

**The Register governs inside the plan's structure, never over it**
(kogaki#1493). Every rule the Register carries governs how the sentences read
inside the structure the Packet's numbered lines and italic lines give — the
points and operations the Brief and the ParagraphPlan fixed — and adds,
removes or reorders none of them. Where a Register rule and one of those lines
conflict, the line holds and the rule yields for that sentence. The template
states this in one paragraph directly before `{{register}}`, outside the
rendered Register, so no edit to an Audience file removes it. The yield is the
Writer's: no refusal is raised for the conflict, and no judge or check reads
it.

**Deterministic** means the same inputs render the same bytes: no timestamp, no
run id, and prior Legs' prose in the **Brief's recorded order** rather than from
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
`terrain-workflow.json`. **Template content is operational text only** — rules that
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

### 4.15 The Section — a grouping of Legs, declared on `opens_section`

**A Leg is one unit of realization; a Section is one promise to the reader that
the question changes here.** They are different units, and binding the heading to
the Leg produced both drafts the owner rejected on 2026-09-03 — one heading per
Leg read as fragmented, none read as unscannable. A **Section is a grouping of
Legs declared in the Brief**: the Harness renders one heading per Section and
none inside it.

**The carrier is `opens_section: <title>`** on the Leg that opens a Section,
absent on a Leg that continues one. One key, not two: its **presence** marks the
opening and its **value** carries the title. A separate `section_title` key was
declined at kogaki#822 because two keys can disagree — a Leg opening with no
title, a title on a continuing Leg — and neither state has a meaning.

**Filled at composition, validated at composition.** Judging which Legs open is
composition-time judgment and belongs where the Legs are already judged: the
Brief. The four rules below are the Harness's **validation of that judgment**,
not a second judge — so a Brief that opens a Section on every Leg, or on none,
is refused **naming the rule it broke and the Leg**.

**THE SITE IS COMPOSITION, NOT `mint`, AND THE CORRECTION IS RECORDED RATHER
THAN MADE SILENTLY (kogaki#822).** The 2026-09-03 owner ruling and kogaki#822's
acceptance both say *validated at `brief.mjs mint`*. That is not reachable:
`mint` consumes the adopted (Thesis, name) pair and writes a Brief **shell** —
its own output states that the Reader Path, coverage and obligations are filled
in later — so **no Leg exists at mint for any rule to read**. The Legs arrive
at composition, where `validateLegs` (`src/compose.mjs`) already refuses every
other §4.1 and §4.13 shape, and that is where these rules run. Same class as the
rule-4 split below, one level up: a rule stated at a stage its subject does not
reach. The ruling's intent — refuse before the Brief is adopted, naming the rule
and the Leg — is unchanged and is satisfied here; only the named act moves.

1. **A Leg opens a Section when it changes the reader's question** — its
   `purpose` answers a question the previous Leg did not pose, or its
   `introduces` (§4.13) names a term later Legs use.
2. **A Leg continues the current Section when it develops the previous one** —
   its `depends_on` is the immediately preceding Leg and its `materials`
   overlap that Leg's.
3. **The first Leg always opens.** A Section never closes on a Leg that only
   sets up the next one, so a heading never lands on a transition paragraph.
4. **Length is a check, not the rule.** A Section running past roughly a display
   and a half of prose without a heading is refused with a request to split; two
   consecutive Sections that are each one short Leg are refused with a request
   to merge. **Article length enters as a bound on the grouping, never as its
   reason** — the ordering is load-bearing, because a length rule promoted to the
   reason is a heading budget, which is the fragmented draft again with a number
   attached.

**RULE 4 SPLITS BY WHERE ITS PROPERTY EXISTS, and composition validates only
the half it can compute (kogaki#822).** The rule as ratified carries two clauses and they
measure different things:

- *"two consecutive Sections that are each one short Leg"* — the **Leg count**
  is a fact about the Brief, present as soon as the Legs are.
  **`validateLegs` refuses it**: two adjacent Sections holding exactly one Leg
  each refuse with the request-to-merge, naming rule 4 and both Legs. The word
  *short* is dropped from the composition-time form deliberately — it qualifies
  prose that does not exist yet, and a check that guessed at it would be
  refusing on an estimate.
- *"a Section running past roughly a display and a half of prose"* — this
  measures **realized prose**, which the Brief does not contain. Mint cannot
  evaluate it and does not pretend to.

**A composition-time proxy was the declined alternative**, and the ground is this
section's own: a Leg's `purpose` length predicts its realized prose length
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

**What this section does not decide.** How a Section title is *worded*, beyond
§4.15.1's three rules, is composition judgment; this says a title exists and
where it is declared, never the whole of what it should say. Packet timing and
location stay §3's and kogaki#809's.

**BUILT AT THIS HEAD, and the halves are still named separately because they
landed at different times.** The DECLARATION half landed at kogaki#822: the
field is admitted by `validateLegs`, the grouping rules above refuse at
composition, and `renderLeg` serializes it. The RENDERING half landed at
**kogaki#823** — `parseBrief` reads `opens_section` back through the same
refusal the composition side applies, `emit` writes one `## <title>` per Section
at its opening Leg, and the frontmatter trace carries the Leg→Section mapping.
The round trip is whole.

**THE RENDERING HALF NEEDED A SECOND ACT, which the unbuilt note did not
anticipate and which is recorded because the note's own reading of the head was
wrong.** That note said `emit` "still writes one heading per Leg". It wrote
**none**: `assembleBody` joined the realized prose, and the headings in the
2026-09-03 specimen were written **by the model into the prose**. So heading
authorship was **unowned** rather than misplaced, and *one per Leg* described
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

#### 4.15.1 The Thesis is the title, and a heading states a destination (kogaki#1327, owner decision 2026-10-10)

**The ground.** A rendered Draft carried no title at all — the Brief carries
no field for one (kogaki#1225) — and the Section headings a composer did write
carried no rule about their content: "A list that worked, until it didn't" and
"The check that was handed nothing" are headings this gap produced. The owner:
"Poetic expressions remain in the titles alone, and they convey almost no
information." Striking titles wait until the prose carries one; they do not
return here.

**Three rules, the first built at this head and the other two stated for the
composition and validation sides to build against:**

1. **The article's title is the Thesis, verbatim.** No field is composed for
   it: `src/draft.mjs` renders the Brief's own `## Thesis` section (the durable
   home and the entry point) as the Draft's first line, a level-one heading,
   read by the same parser the Brief side exports for it (`briefThesis`,
   `src/brief.mjs`) rather than a second reader that could disagree with it
   about what the Thesis says.
2. **A Section heading states the Section's destination, in everyday words.**
   `opens_section`'s value is one plain sentence or phrase stating what the
   reader holds at the Section's end, drawn from the after-state of the
   Section's last Leg — not a restatement of the Leg's `purpose`, and not a
   term coined for the occasion: "I want readers to be able to skip directly
   to any Section and still understand its heading."
3. **No heading carries a term the article introduces anywhere in it** — not
   just a term introduced within that Section. `validateLegs`
   (`src/compose.mjs`) refuses a Candidate whose `opens_section` contains,
   whole-word and case-insensitive, the `term` of any Leg's `introduces` entry
   anywhere on the path, naming the heading and the term — the same mechanical
   test §4.13's reading of Reader start already runs (kogaki#1225,
   `introducedTermInReaderStart`), because a reader may enter the article at
   any Section and a term that Section's own Legs did not introduce is still
   one the reader does not yet hold.

**Rule 3 is mechanical; rule 2's "states the destination" is judgment, read
beside the after-state it is judged against** — one more item at the fit
judge, the Leg that opens the Section, the same site §4.12.2's specialization
verdict already runs at.

**BUILT AT THIS HEAD.** Rule 1 alone: `src/draft.mjs`'s `assembleBody` pushes
the title ahead of every Section, asserted by `checks/check-draft-packet.sh`.
Rules 2 and 3 are stated here as the contract `validateLegs`, `src/leg-schema.json`
and the fit judge's input build against; this subsection does not claim their
build.

**What this subsection does not decide.** Whether a given heading's wording
states the destination well enough is the fit judge's judgment, not a second
mechanical test; rule 3 is the one deterministic refusal rule 2's content
admits, the same relationship §4.13 holds between Reader start's content and
the one term-match it refuses on.

### 4.16 The figure decision — `figure:` and `figure_roles` on a Leg

**The Brief decides whether a Leg carries a figure, and the decision is the
composer's.** §6.9.3 admitted the closed kind set and the Move's optional
`figure` field (renamed from `visual_form`, kogaki#1175); that field names a
**schema of roles** and obliges no Leg to use it. **Two fields share the name
`figure` by the owner's own ruling, and context is what tells them apart**: the
Move's `figure` (§4.2, §6.9.3) is the schema a Move offers; the Leg's `figure:`
below is the one-line reason a composer takes it up. This section is where a
Leg *takes it up*: at path composition (judgment point 2) the composer may
declare on a Leg

    figure: <one line — what the figure lets the reader hold that the prose alone leaves hard to hold>
    figure_roles: endpoint_a=g1, endpoint_b=g2, criterion=g3

where `g<n>` addresses the Leg's **own** claim lines in order, from 1.

**The default is NONE.** A Leg without `figure:` has no figure and nothing asks
about it — the hub's 2026-08-01 D8 disclosure-never-slot ruling carried as a
field that may simply be absent. This is also the mechanism by which every Brief
composed before this section composes unchanged: the serializer writes neither
line for a Leg that declares none, so the bytes do not move.

**Three conditions, and only two of them are mechanical.**

1. the Leg's Move carries a `figure`;
2. every role of that form binds to one of **this Leg's** claims — a role
   bound to a claim of another Leg is refused;
3. the figure carries something.

The third is the composer's one judgment and is stated in the `figure:` line
itself. **Nothing reads that line for meaning**, on §4.6's standing rule: a
missing field is refused, a weak one is not.

**The two mechanical halves refuse at different seats, and the split is the one
`move` already has.** The grammar — the two fields travelling together, a
non-empty line, a binding of the form `role=g<n>`, an address inside this Leg's
claim count — is decidable from the Leg record alone and refuses at
`validateLegs`. Whether the Move declares a form at all, and whether the
bindings are exactly that form's roles, needs the Move library open and refuses
at composition, beside §4.12.1's move-id resolution (it sat at adoption until
kogaki#1311 ended the Move's reads after the Candidate). Both are "at composition" in
§4.15's sense: the Brief is being authored and the refusal can still be fixed.

**A binding to another Leg's claim is unreachable rather than separately
refused.** The address space is this Leg's claims and has no syntax for anyone
else's, which removes the possibility instead of enumerating what to catch.

**An unreadable Move record is not a formless one.** §4.12.1's distinction
governs here unchanged — a store fault refuses as a store fault, naming the
record, and never as a composition the composer must go and re-bind.

#### 4.16.1 Disclosure at the Candidate gate

**Each Candidate's option label gains one clause: how many Legs carry a figure,
and which.** Above three the clause carries the hub's soft warning
(topics/articles.md 2026-08-01 D11) — **a warning with no target, which refuses
nothing and leaves the Candidate selectable**. An empty set renders an explicit
none rather than nothing: an absent clause and a clause reading none are the
same silence to a reader and different silences to a check.

**Why the label and not the disclosure table.** kogaki#909's
`src/disclosure-fields.json` grades **Candidate-level** fields the Harness writes
onto a Candidate and reads `c[field]`. `figure` is a **Leg** field, so an entry
there would be permanently absent and its obligation permanently vacuous — the
degrades-to-zero shape that table itself refuses. The table's grading **test** is
which surface the evidence is owed at, and applied here it grades `decision`: the
figure set is a property of the Candidate the owner is choosing between, so it is
owed **before** the choice. The label **is** that surface. The grade and the seat
agree; only the rendering mechanism differs, because this evidence is per-Leg
and the table's is per-Candidate.

`necessity:` §6.9.3 admitted the vocabulary and explicitly declared that nothing
in the draft pipeline reads it to decide anything — so the field that makes a
form load-bearing needs its own site, and §4.1 names every other optional Leg
field's subsection. What no carrier holds: why the figure decision belongs to the
Brief rather than to realization, and why the count reaches the owner before
adoption rather than after it.

### 4.17 The figure record — the form's instance, filled after the prose

**§4.16 decides WHETHER a Leg carries a figure; this decides what the figure
IS, and it is a different moment on purpose.** The hub's 2026-07-31 and
2026-08-01 rulings sort figures into three moments — direction at the Brief as a
disclosure, placement anchored to structure, **concrete design after the prose**
— and the third is the one this section carries. A record filled before the text
is a figure the text then has to match, which inverts the whole arrangement: the
prose is the article and the figure carries what the prose leaves hard to hold.

**The input is the Packet plus one block, and the block arrives only after
`section`.** `section --leg <id>` for a Leg carrying `figure:` records the
prose and then renders the **figure input**: the Leg's Packet exactly as it was
served, plus a block carrying

- **the form** — its kind and roles, and the kind's relation line from
  `src/figure-kinds.json`. The kind is read off the Leg's own `figure_roles`:
  every kind's role set is distinct and composition bound exactly one form's
  roles, so no Move is opened (kogaki#1311);
- **the binding** — each role with the claim text the Brief bound it to,
  quoted verbatim, licence included;
- **the `figure:` reason line** from the Brief;
- **the Leg's realized prose**, verbatim;
- **the instruction** — every element is one of the bound claims worded for the
  reader; the caption says what the reader holds after looking, in the terms of
  `reader_state_after`; no element the claims do not carry.

**The block lives in `src/packet-template.md` behind a marker the Packet render
splits away.** One model-facing template file, two consumers: a second file
would be a second carrier for one surface, and the marker is what keeps the
figure block out of every ordinary Packet. A template with no marker is refused
rather than treated as having none — a template that cannot say where the Packet
ends is one whose two halves nothing distinguishes.

**The Packet stays the only input.** Nothing the model reads at realization is
outside it: the form and the binding travel in the appended block, which the
Harness composes from the Leg and the closed kind set, never from a Move
record. This
is the owner's 2026-09-04 rule applied to figures.

**The record is one JSON object, the instance of the form** in the sense a Leg
is the instance of a Move:

    { "kind": "axis",
      "elements": { "endpoint_a": {"text": "…", "claim": "g1"}, … },
      "relations": [ … ],
      "emphasis": "endpoint_b",
      "caption": "…",
      "position": "after" }

`draft.mjs figure --leg <id> --file <record.json>` validates it against
`src/figure-schema.json` and the kind, stores it at
`runs/draft/<slug>/figures/<id>.json`, and records its path and sha in
`run.json`. The stored bytes are serialized in the **schema's** field order and
not the input file's, because the sha is pinned downstream and a sha that moves
without its content moving is a pin that answers for nothing.

**The mechanical half, enumerated — and it is the whole of what is refused:**

1. every role of the kind is present, and no role that is not;
2. `kind` equals the **form's** kind — the record is the instance, so its kind
   is the Move library's and the Brief's, never a choice made at realization;
3. every element's `claim` is the address **the Brief** bound that role to — a
   record that moves a role to another claim words it from material the
   composer did not put under that position;
4. `position` is one of the closed pair `before` / `after`;
5. `emphasis`, where present, names a role of the kind;
6. `relations` is non-empty and `caption` is non-empty.

**Nothing here judges wording.** Whether an element's text is a fair wording of
its claim, and whether the relations instantiate the kind's `relation` line,
are judgments — §4.6's rule that a missing field is refused and a weak one is
not. That is also why kogaki#880 reviews the figure by a **Round Trip** rather
than by a lint here: the check that an element is entailed by its claim is
owed against the *rendered* figure a reader meets, not against the record the
renderer was given.

**The form that Round Trip takes is this record's own fields (kogaki#1018).** A
passage is written from a Brief Leg, so its Reverse Outline is a Brief Leg
block; a figure is written from the record above, so its Reverse Outline is a
block in the fields declared here — the same rule, one artifact down, and no
second schema at either level. `element`, `caption` and `position` are declared
**reconstructible** and compared, because a reader who met the rendered block
can say each of them. `kind`, `relations` and `emphasis` are declared **not
reconstructible** and are REFUSED rather than merely unasked: the kind is the
Move form's and the relations are the form's, and a reader cannot infer the form
a structure was produced from — which is the same ruling that keeps `move` out of
a passage's Reverse Outline. It is filed as its own fenced block and its own
file, because `figure` IS a Brief Leg field and is refused inside the passage's
outline; one file per vocabulary is what keeps either reading from acquiring a
key belonging to the other.

**`emit` refuses while a figure-carrying Leg owes its record**, naming the
Leg, exactly as it refuses a Leg that owes its prose. A Draft emitted without
it would silently drop a decision the owner made at the Candidate gate, and
nothing downstream would report the drop.

**A Brief that declares no figure is untouched by every clause above** — the
default is NONE (§4.16), the appended block is never rendered, and `figure` on
such a Leg refuses by that fact rather than by a missing file.

`necessity:` §4.16 carries the decision and its grammar and stops at the Brief;
`src/figure-kinds.json` carries the closed kind set and explicitly declares that
nothing in the draft pipeline reads it to decide anything. Neither says when the
record is filled, from what, or what is refused about it — and the moment is the
load-bearing part, because the ruling this section carries is about **order**.
What no carrier holds: why the record is filled after the prose rather than
beside it, and why the binding is the Brief's to make and the record's to
honour rather than to re-open.

### 4.18 The renderer and the anchor — markup from the record, at the Leg

**§4.17 makes the record; this makes the markup, and they are separate acts on
purpose.** The record is a *design* — the owner's decision about what the figure
holds, judged at kogaki#880's round trip. The markup is a *transcription* of it,
and a transcription is exactly the kind of work that must not be done twice the
same way by two different authors. So `src/render-figure.mjs` maps a validated
record to markup with **no model call**: axis, chain, tree and threshold to
Mermaid source in a fenced block, matrix to a Markdown table.

**Same record, same bytes.** Every branch is a pure function of the record and
`src/figure-kinds.json`. In particular the diagram's nodes are emitted in the
**kind's declared `roles` order** and never in the record's own key order — a
record whose bytes depended on how its author happened to order `elements` would
render differently on two runs that agree about every reader-facing word, and
the trace pins the record's sha downstream, so a renderer whose output moved
under a fixed sha would make that pin answer for nothing.

**The model never writes Mermaid, and that is what makes the refusal fair.** A
syntax defect in a rendered figure is a defect of this file, fixed once, rather
than of the sitting that happened to produce the record. A seat is only
legitimately closed to one author where another actually fills it — which is why
the refusal below arrives *with* the renderer and not before it.

**Emphasis is carried by shape, not by colour.** Plain Mermaid defaults hold
until a portfolio theme is adopted (out of scope, kogaki#875): the emphasised
node renders in the subroutine form `[[…]]`, which every Mermaid renderer draws
distinctly with no stylesheet at all, and `matrix` bolds the emphasised column
head. Nothing here emits `classDef`, `style`, or a theme directive.

**Every relation reaches the output.** `relations` is a non-empty list (§4.17
clause 6) and each kind's shape has a fixed edge count; the two do not line up
in general. Relations attach to edges in order, and anything past the last edge
**joins** the last edge's label rather than being dropped. A figure that
silently rendered three of five relations would drop the owner's design with no
report, which is the shape §4.17 already refuses one act earlier.

**A kind with no seat here is refused by name.** `src/figure-kinds.json` is what
admits a kind, and a kind admitted there with no rendering in this file is a
refusal rather than an empty block — the closed set and the renderer are joined,
not two lists that agree until one is edited.

#### The anchor

**`emit` places the rendered figure at its Leg, inside the Section that Leg
belongs to**, before the Leg's prose or after it per the record's `position`.
The Section heading is pushed first either way: a figure never precedes the
heading of the Section it sits in.

**No Leg structure becomes visible.** The block is a rendered element the Brief
declared, in the same standing as a heading — it carries no id, no key line and
no marker a reader could read the trace off, so §5's guard against record
rendered as structure is untouched by it.

**The trace entry for that Leg gains**

    "figure": {"position": "after",
               "record": "../../runs/draft/<slug>/figures/a1.json",
               "record_sha": "…",
               "lines": [<start>, <end>]}

`record` is relative to the draft, the convention `brief:` and `packet:` already
use, so two machines emit identical bytes; `record_sha` is the sha `figure`
recorded **at validation**, read and never recomputed, for the reason the Packet
record already states — recomputing answers for the file as it stands rather
than for the record the figure was validated as. A Leg declaring no figure
carries **no `figure` key at all**, an absent field rather than a null one.

**The Leg's own `lines` span the prose alone (kogaki#868), and the figure's own
lines are `figure.lines`.** This is the load-bearing half of the entry rather
than a formatting choice: kogaki#870's Reverse Outlining quotes a Leg at exactly
its `lines`, and a range that swallowed the block would hand the Blind Reader
markup to re-derive prose from. One range carrying both would answer for neither.

**A recorded figure that will not render stops the artifact.** §4.17's guard
answers *is a record owed*; this answers *does it render*, and the two are
separable — a record can exist, resolve and validate and still name a kind this
runtime has no seat for, or be edited outside the Harness after validation.
Emitting the Draft with the block silently absent is the drop-with-no-report
shape §4.17 refuses, so it is refused here for the same reason.

#### What is refused at `section`

**A body carrying a figure fence the renderer did not produce is refused,
naming the Leg** — beside the heading refusal (§4.15) and for the same reason
one element over: the figure seat is the Brief's, and a second author on it is
the same defect as a second heading author. Prose that draws its own diagram is
a figure the Brief never declared, rendered by nobody, pinned by no record, and
invisible to kogaki#880's Round Trip.

**Refused on every Leg, not only on figure-carrying ones.** A Leg that
declares none has the strongest claim of all to draw none — the default is NONE
(§4.16) — and a Leg that declares one already has its block coming from the
record. Neither seat is the prose's.

**Keyed on the fence language the renderer emits**, read from the renderer
rather than spelled at the guard, so the two cannot drift about what a figure
fence is. **An ordinary code fence is untouched**, and the Markdown table
`matrix` renders as is deliberately *not* refused: a table is prose the article
may legitimately need, and refusing every table to close this seat would be an
over-refusal against material that has nothing to do with figures. The cost is
stated rather than discovered — a hand-drawn `matrix`-shaped table is reachable,
and the instrument that finds it is kogaki#880's review, not this guard.

**A Brief that declares no figure is untouched by every clause above**, and that
is asserted rather than assumed: the fixture pass re-emits a figureless Brief
and compares bytes.

`necessity:` §4.17 carries the record — what it is, when it is filled, and what
is refused about it — and stops at the stored JSON. `src/figure-kinds.json`
carries the closed kind set and declares that nothing in the draft pipeline
reads it to decide anything. Neither says what markup a record becomes, that the
markup is the Harness's and not the model's, where in the body it lands, or that
the Leg's line range must exclude it. What no carrier holds: why the
transcription is a fixed function rather than a judgment, and why the figure's
lines are recorded beside the prose's rather than inside them.

### 4.19 The ParagraphPlan stage — Paragraph Waypoints, after the Brief (kogaki#1375)

**What it is.** The Brief's Reader Path plans an article down to Leg Waypoints,
the points a Leg's paragraphs make. **ParagraphPlan** refines that document plan
one level down, to paragraphs: for every Leg Waypoint the Composer generates
its **Paragraph Waypoints**, through the same kind of feedback loop as the
Brief's, and hands them to the Packet through a planning record, never directly
(owner decision 2026-10-14). It is its own stage after the Brief, with its own
owner command `/paragraph-plan` (`.claude/skills/paragraph-plan/SKILL.md`), its
own module `src/paragraph-plan.mjs` and its own workflow rows
(`src/paragraph-plan-workflow.json`), and it runs on an adopted Brief before
`/draft`: `/terrain → /brief → /paragraph-plan → /draft`.

**It is not Reiter and Dale's microplanning.** It refines the document plan
down to paragraphs; word choice, reference and sentence shape stay inside the
one Writer call.

**The Move boundary, moved.** Move information may be used up to Paragraph
Waypoint generation and nowhere after it. This stage is the last reader of a
paragraph Move: it binds one and builds from its Segments, or its `technique`
where the Move carries none, and what it writes for the Packet holds nothing
of a Move. The 2026-10-09 boundary ("Information
that belongs to Move has responsibility only up to CandidatePath creation")
holds for the Leg Move; the paragraph Move's responsibility ends here, and the
Writer never reads a Move (2026-10-12).

**And its converse: the Brief selects Moves and composes Waypoints, and hands
everything else forward as material** (kogaki#1496, owner decision 2026-10-21:
"Brief is responsible for Move selection and Waypoint creation, but has no
authority to add explanatory prose outside the Move"). The boundary above says
how far a Move reaches; this says what else may fix a paragraph's structure,
and the answer is nothing beside the Paragraph Waypoints and the italic lines.
Everything else the Brief hands the Writer arrives as **material** — a term
with its meaning, a claim as a restatement, a Journey as its served text — and
never as an instruction on what to add or how to present it. A line that asks
the Writer for a sentence the plan does not carry competes with the plan, the
way the retired Voice paragraph's hedge did (kogaki#1488), and the paragraph
it touches is rebuilt around it while the Move's Segments are still honoured.
A concern the Brief has about the prose acts through Move selection, the
waypoints it composes and the noun phrases inside them.

Every block of the Leg Packet (§4.14), sorted under that rule:

| Packet block | sorted as |
|---|---|
| the waypoints, with their Paragraph Waypoints, *Opens from* and italic lines | **structure** — the plan; the only lines that fix what a paragraph says and in what order |
| the claims this Leg asserts | material — each claim as its proposition |
| the Journey material | material — the served text, edited, never a claim to recover |
| the Section, and the reader-target line | material — where the Leg sits and whether it may still introduce anything |
| what crosses into this Leg | material — a term with its meaning, a claim as its restatement, a Journey as its served text |
| the article so far | material — the prose already recorded |
| Write: budget, heading, language, the reader's own world, the register | how sentences read inside the plan, never what they add; the register yields to a planned line (kogaki#1493) |
| Write: the round trip | each claim recoverable from what is written; a loss the Writer cannot restore is a refusal, never a concession the plan does not carry (kogaki#1496 retired "concede it explicitly in the prose") |
| Write: when a step cannot be performed | the refusal — the one exit, and it is not prose |

A Packet line added later is sorted into this table in the act that adds it,
and a line sorted as anything but structure that asks the Writer to add a
sentence is the defect this paragraph names.

**The loop.** One Detached Job unit per Leg, in Reader Path order, on the shared
supervisor (`src/workflow/detached-job.mjs`), each prompt rendered by the shared
`judgePrompt`. Each attempt makes two calls:

1. `paragraph_plan_unit` binds one paragraph Move from `moves/` to each Leg
   Waypoint — its `before` against the state the reader is in when the Leg
   Waypoint begins, its `after` toward the next Leg Waypoint's point, with that
   point in view — and generates the Paragraph Waypoints of the one paragraph
   carrying that Leg Waypoint: one per Segment of the bound Move, in the
   Move's order, or, where the Move carries no Segments, the points its
   `technique` gives — the Leg composer's own rule (§4.1) — from four inputs
   and nothing else: the Leg Waypoint's own `point`, the bound
   Move's Segments or `technique`, the Audience's `persona`, and the Leg's
   `introduces`, each term with its meaning. A Leg
   Waypoint no Move fits refuses the unit as
   `no_paragraph_move_fits`, naming the Leg and the Waypoint; there is no
   fallback paragraph shape.
2. `paragraph_plan_judge_unit` judges the generated Paragraph Waypoints against
   the bound Move, the four things the Leg judge judges (§4.12.2, owner
   decision 2026-10-14: "I had assumed that ParagraphPlan would use the same
   generation and validation conditions as Leg Waypoint generation"): whether
   they begin from a state the Move's `before` holds; whether they end where
   its `after` leaves the reader, toward the next Leg Waypoint's point; whether,
   read in order, they follow the Move's order as its Segments give it, or as
   its `technique` gives it where the Move carries no Segments; and whether
   they survive each test in the Move's `breaks`. A `does-not-fit` on any of
   the four refuses the attempt.

A refused attempt is asked again with the refusal text verbatim until
`brief.unit_attempts` is spent; a call is bounded by `brief.call_limit_s`;
there is no limit on the whole job — the Brief's own settings and rules, read
by name. A unit that spends its attempts stops the stage naming the Leg and the
Waypoint, writing nothing and leaving the Brief unchanged, and the work resumes
from the same Brief by running `/paragraph-plan` again; the Reader Path is not
composed again. **A bound paragraph Move that does not fill a role the stage
needs (`before`, `after`, `breaks`, and neither `segments` nor `technique`) is
a fatal stop naming the Move and the role**, never a default.

> **Status (kogaki#1497, owner decision 2026-10-21):** the plan call reads
> the Leg's `introduces` as its fourth input, each term with its meaning
> read by `introducedMeaning`, the rule the Packet's crossing line reads
> (`null` where the Leg gives none, and the planner then gives it in its own
> words; an established term's `source` never rides), beside the persona. Where a Leg Waypoint's `point` is the first in
> the Leg to use an introduced term, the planner binds a fitting Move with a
> Segment whose `does` defines or names, and the Paragraph Waypoint on that
> Segment carries the term with its meaning in its noun phrase; where no
> fitting Move has such a Segment, the Paragraph Waypoint that first uses the
> term carries its meaning in apposition, in the planner's words. A `coined`
> and an `established` term are treated alike. The judge's FIFTH gains the
> complement: a Paragraph Waypoint that first uses an introduced term and
> gives no meaning for it does not fit, naming the term; the judge reads
> whether a meaning is given, never whether it matches the input's.
> `checks/check-paragraph-plan.sh` (r) carries both.

> **Status (kogaki#1533, owner decision 2026-10-23):** the judge no longer
> judges the four things above, the FIFTH, the SEVENTH, or any criterion
> written here. Its criteria are the axes `src/paragraph-plan-axes.json`
> keeps, rendered in order into `paragraph_plan_judge_unit`: one sentence
> and one responsibility each, an axis kept only where an ablation bench run
> (`src/proof-sheet/judge-bench.mjs`) shows its defect fixture refused with
> it and rarely without it, and its clean fixture passed, at the rates the
> file's `retention` names. Two axes are kept:
> PERFORMS IS BARE and TERM MEANING. The two countable rules are refusals of
> the plan-record validator (`src/paragraph-plan.mjs`), not of the judge: the
> Paragraph Waypoint count equals the bound Move's Segment count, and every
> entry carries exactly one of `performs` and `point`.
> `checks/check-paragraph-plan-axes.sh` carries the registry.

**A Leg Waypoint is one paragraph, and a Paragraph Waypoint is one Segment of
the bound Move.** These are different kinds of Waypoints and the two rules
carry no contradiction: the Leg Waypoint's own rule (§4.1) concerns its
output into paragraphs, one per Leg Waypoint; the Paragraph Waypoint's rule
concerns its input from the Move's Segments. A Paragraph Waypoint has the
shape of a Leg Waypoint: `point`, the proposition its paragraph makes, and
`serves`, the Strand ids of Claims its parent Leg Waypoint serves. It writes
one Paragraph Waypoint per Segment of the bound Move, in the Move's order,
or, where the Move carries no Segments, the points its `technique` gives;
every Claim the parent serves is served by at least one of them. A Segment's
`operation`, `relation` and `manner` are inputs to the ParagraphPlan call and
are copied onto no Paragraph Waypoint; a Move is an input to the Composer and
to nothing else (kogaki#1585, owner decision 2026-10-25).

**Two contributions, not one (kogaki#1403).** The Leg Waypoint's `point`
supplies a Paragraph Waypoint's content; the bound Move supplies its order and
its shape. A Segment reaches the plan call as its number, its function
(raises | advances | settles) and its relation to the Segment before it —
never its description, the Extractor's analysis of the original paragraph's
technique, written for a reader of the Move and not for the planner. A
Paragraph Waypoint is a part of the Leg Waypoint's `point`, placed and shaped
by its Segment; one that instead states what the paragraph does to its reader
— announcing, defining rather than arguing, closing a list, leaving nothing
open — is refused rather than accepted as a stylistic variant. The `technique`
fallback is unaffected, since it is the Move's only order where `segments` is
empty, and `before`, `after` and `breaks` are unaffected.

> **Status (kogaki#1533, owner decision 2026-10-23):** no judge axis
> carries this refusal; the judge judges only the axes
> `src/paragraph-plan-axes.json` keeps (the Status block under the judge
> clause above).

**The ParagraphPlan file.** `theses/<slug>/paragraph-plan.yaml`, beside the
Brief, one YAML record: `version`; `brief`, the `path` and `sha256` of the
Brief it was made from; and `legs`, one entry per Leg in order, each carrying
one entry per Leg Waypoint in order with its `paragraph_waypoints` (`point`,
`serves`). **It holds no Move id, no Segment and no Move field**; a key outside
those is refused by name when it is read. Which Move was bound to which Leg
Waypoint stays in the stage's run directory
(`paragraph-plan-bindings.json`), a record of the run that no later stage
reads. **The stage never writes the Brief, and the Brief names nothing
downstream**: the ParagraphPlan file names the Brief, not the reverse.
`/draft` reads the file beside the Brief and refuses a missing one or one whose
Brief hash is not the Brief's (§4.14). Its writer and reader
(`paragraphPlanRecord`, `readParagraphPlanBeside`) live in `src/compose.mjs`,
shared code, since two commands touch the file and a command module never
imports another's (kogaki#1302).

**The join is a typed relation (kogaki#1477, owner decision 2026-10-20).**
Every Leg Waypoint entry after the first carries a `join`, and the first
carries none: the connection between Legs is the Brief's (kogaki#1282). A join
is **one word from a closed set**, never a sentence:

| word | this paragraph's first point, against the paragraph before it |
|---|---|
| `consequence` | follows from what the previous one established |
| `grounds` | gives the reason for what the previous one asserted |
| `contrast` | sets its matter against the previous one's |
| `elaboration` | carries the previous one's matter further or in more detail |
| `summary` | draws the preceding paragraphs together |
| `none` | opens on its own matter, and no connective is owed |

The set is Halliday and Hasan's conjunctive classes (additive, adversative,
causal, temporal) laid over the top-level senses of the Penn Discourse
TreeBank (expansion, comparison, contingency, temporal), cut to the relations a
paragraph opening realises as a connective; temporal is omitted because the
plan's order already carries it. The planner chooses the word from the previous
Leg Waypoint's bound Move's `after`, the previous Paragraph Waypoints, this
Leg Waypoint's bound Move and its first Paragraph Waypoint; the judge's SEVENTH
asks whether the type is one that `after` admits and the first Paragraph
Waypoint bears, and admits `none` and `contrast` where the paragraph defers
what the `after` leaves open — a paragraph may answer a question later than
the reader raised it. The plan reader and the plan call's validator
(`joinRefusal`) refuse a sentence, an empty value and a word outside the set by
name. The Packet renders the word as `*Opens from:* <type>`, and the Writer
realises it with a connective or clause of the register's own, or with nothing
where the order of the sentences already carries it, never as a proposition of
its own. **Why a word and not a sentence**: the join was one sentence
(kogaki#1411), and it is the one plan field whose reader is the Writer; a
sentence the Writer must realise in its own text is content to the Writer, and
on the 2026-10-19 Proof Sheet run every paragraph after the first opened on its
join paraphrased as a clause. A Segment's `relation` stays prose, because the
planner consumes it and it never reaches the Writer.

> **Status (kogaki#1533, owner decision 2026-10-23):** no judge axis
> carries the SEVENTH; the judge judges only the axes
> `src/paragraph-plan-axes.json` keeps (the Status block under the judge
> clause above).

**Obligations at the Paragraph scale** (kogaki#1528, owner decision
2026-10-23). A Leg Waypoint's Paragraph Waypoints carry the same Obligation
record §5.2 states for Legs — `{opened_by, items}`, each item `{item,
closed_by}` (kogaki#1612) — with `opened_by` and every `closed_by` naming
Paragraph Waypoints of that one Leg Waypoint, and the record lives in the
ParagraphPlan file, on the Leg Waypoint entry it belongs to. §5.2's rules bind
it as they bind the Leg scale, except the Section rule: a slot is raised by
the bound paragraph Move's `obligation` and by nothing else, and its record's
`items` carry what this article leaves unexplained at that paragraph, in the
article's own words and as many items as the article raises there, never
counted against the slot (kogaki#1577, kogaki#1603); at most one record is
open at any Paragraph Waypoint, its items close after `opened_by` in the order
named, none is open at the Leg Waypoint's last Paragraph Waypoint, and a
record open here may be open while a Leg-scale record is open too. **Closing
is planning, never prose**: an item is closed by the Paragraph Waypoint the
plan generates for it, the record lives in the ParagraphPlan file and reaches
no Packet (kogaki#1584), and no stage inserts a paragraph or a sentence for
it. Whether a closing Paragraph Waypoint explains its items is the
ParagraphPlan judge's to judge, beside the plan it already judges. A Brief
record with an item a Leg closes is handed to that Leg's plan call, carrying
those items alone, and the plan lays it into the `discharges` of the Leg
Waypoint whose Paragraph Waypoint explains them (kogaki#1530).

**The Audience.** Paragraph Waypoint generation reads the Audience's `persona`;
the Packet reads its `register`, which says nothing about paragraph structure.

`checks/check-paragraph-plan.sh` carries the stage end to end over a fake judge;
`checks/check-draft-packet.sh` carries `/draft`'s read.

`necessity:` §4.1 says what a Leg Waypoint is and §4.14 what the Packet renders
from it; neither says where a paragraph's point comes from, which stage may
read a paragraph Move, or what file carries the plan between the Brief and the
Packet. kogaki#1359 answered by copying the bound Move's Segments onto the
Brief and rendering them for the writer, which broke the 2026-10-09 and
2026-10-12 boundaries; this section is the carrier of the answer that replaced
it.

## 5. The Brief's centre, and Obligations inside it

`necessity:` a container for §§5.1–5.3. The grouping is what makes the Brief's
centre readable as one thing rather than three fields and a file path.

### 5.1 The settled structure section

**The Brief is one YAML record** (kogaki#1328, owner decision 2026-10-10):
`theses/<slug>/brief.yaml`, and no Markdown rendering of it is written at any
state. Its keys are declared in `src/candidate-schema.json` under
`brief_record`, in the order the file writes them, each with the caption the
file carries above it as a comment for the owner. The mint writes the header
keys (`slug`, `compose_path`), the closed `strands` list,
the adopted `thesis` and its `defined_terms`, and every key below it as `null` — a slot awaiting
composition; adoption fills them in one write. Every reader of the Brief —
`src/draft.mjs`, `src/review-draft.mjs`, `src/assemble.mjs`, `src/compose.mjs`
— loads the record and none parses a rendering: the three parsers that read a
Markdown Brief back (`parseBrief`, `parseLegBlockBody`, `closureRowsForLeg`)
are removed. The Draft's `brief_pin` is the hash of the record file.

**What the owner reads is what the machine is handed.** The file is the
record, so the owner reading it reads the same tree the Packet is built from;
the owner's words: "If a file is intended for human review, it should also
contain the information supplied to the machine", and "Unless the rendering
format is properly organized, Markdown can be far less readable than JSON or
YAML." The record's native tree is that organization — waypoints and claims
as lists of maps, each reader state as a five-key map, `introduces` as a list
— and no line of it exceeds 120 characters.

- **`reader_start`**, **`reader_target`** — the two reader keys, each naming
  one reader state that appears once in the path (kogaki#1225):
  `reader_start`, where the path begins, a five-key map authored once per
  Brief at **Differentiation** from the Persona and the Thesis;
  `reader_target`, where it ends, **names the Leg marked `reaches_target`**
  (kogaki#1231), whose `reader_state_after` it is. Both land at **Candidate
  selection**. No Opening question is written: `opening_question` and
  `reader_target` are retired Candidate fields, refused by name. **This is
  the Leg Thesis attainment is judged at** (kogaki#1330, §4.12.2): the fit
  pass asks, at this Leg alone, whether its `reader_state_after` holds the
  Thesis as a claim the reader can state in their own words, never at the
  review of the finished Draft.
  `reader_start` is a **stance**, not a knowledge state: §5.1.1 defines it.
- **`thesis`** — read from Terrain (§3), never invented here.
- **`defined_terms`** — the article's **Defined Terms** (kogaki#1331, owner
  decision 2026-10-10): every noun of the Thesis and of each Strand's claim,
  one `{ term, class }` entry per term, where a term is one or more words in
  the form an `introduces` entry's `term` takes and `class` is `defined` (used
  in a sense this article gives it) or `ordinary` (used in the sense the
  reader already holds). Written **once, at mint**, from the
  `defined_terms_unit` judgment the `mint` state asks before the file exists,
  and never again; an entry occurring whole-word in neither the Thesis nor a
  claim is refused naming it. Its readers are composition (§4.1), path
  review's claim register, and the Draft review's `defined-term-order` item.
  **It lives in the Brief and its boundary ends there**: nothing of it reaches
  `src/packet-template.md` or a rendered Packet — information whose boundary
  is planning is not copied downstream "just a little", because each copy then
  needs its own assessment. A Brief minted before the field carries none and
  defines nothing.
- **`renderings`** — the article's **renderings record** (kogaki#1494, owner
  decision 2026-10-21): the source terms the article will not keep, each with
  the plain phrase it uses instead. Composed at Differentiation and written
  into the Brief at adoption; §5.1.4 states it.
- **`reader_path`** — the ordered Legs of §4.1. **Each reader state is written
  once per boundary**: a Leg carries its `reader_state_after` and no
  before-state, which is the previous after-state (or `reader_start`) and is
  derived on read (kogaki#1325).
- **`strand_coverage`** — per selected Strand: `used_by_legs`,
  `role_in_thesis`; and **`journey_coverage`** — per Journey-bearing Strand,
  the Legs that place it or why it was omitted.
- **`closure`** — the Leg-level rows of **Obligations**, §5.2. The Thesis row is
  not written: it is derived from `strand_coverage` (§5.2).
  `reasoning.thesis_closure` is a retired Candidate field, refused by name.
- **`tradeoffs`** and **`bridged`** — the adoption record: what adopting this
  path gave up, and what the composer inserted to carry the reader across a
  gap. Nothing after adoption reads them; they stay in the file because the
  owner reads it.

`necessity:` the field list is carried by `src/candidate-schema.json`
(`brief_record`) and read by `src/compose.mjs`. What no carrier holds is which
block authors which field, which the subsections below state one at a time.

#### 5.1.1 The three reader fields, and the block that authors them

**`reader_start` is a stance in the Move library's own dimensions (owner
ruling, 2026-09-21, kogaki#1176), not the knowledge state it was written as
before.** A knowledge-only Reader start forced the first Leg onto a Move whose
`before` (§4.2) reads as an in-subject understanding — the only kind a bare
knowledge sentence can specialize — which is a Reader start with no Move able
to act on it, and inert data. `reader_start` is written in the same
`dimension: value` lines §4.2's `before`/`after` already use, over the same
dimension set: knowledge is one of the five, not the whole of the field. The
dimension set itself is not restated here — it is read from whatever the Move
library's own schema carries (`src/leg-schema.json`, §4.2), which kogaki#1175
derived from the Corpus; the five named at §4.2 (knowledge, question,
expectation, orientation, trust) are the hypothesis that derivation tested, not
a second, independent declaration (owner amendment, 2026-09-23). No `Position`
value is added to a Move or to `reader_start` — the five dimensions are the
whole of a stance (owner ruling, 2026-09-23).

**Reader start is a COLD READ, and its stimulus is pinned: the state of a
reader with the declared Persona who has seen the Thesis, read as if it were
the article's title, and nothing else** (owner decision 2026-09-28,
kogaki#1216; stimulus pinned 2026-09-29, kogaki#1225). A Brief carries no Title
at composition, so the Thesis stands in for it, and the substitution is stated
where the composer reads it (`src/differentiation-schema.json`, the
`differentiation` row of `src/brief-workflow.json`). It is authored from the
Persona and that Thesis, never from the Move the first Leg binds, and never
from a problem the reader is assumed to have lived. What stood here let it be written backwards: the
verbatim binding at §5.2 forced the first Leg's `reader_state_before` to equal
Reader start, and §4.12.2 forced that same field to specialize the Move's
`before`, so Reader start became the bound Move's `before` with the article's
nouns substituted — in `theses/set-automatic-rules-only-sees/brief.md` the
Move said "the explanation will choose among familiar motives" and the Brief
said "expects the explanation to pick among those familiar failings". The
owner's reading of why: a model fills the schema it is given and is poor at
deciding a field is absent, so a question was manufactured for passages that
had none; the exemplar Extraction in `passages/FORMAT.md` records the question
before the passage as `none, or "should I read this?"`, and the Move ingested
from it recorded an unanswered question. No Move in the library held no
question, so the `holds: none` opening below was legal and unreachable.

**The Persona is declared once, in one owner-authored Audience file the
workflow table names** — `audiences/dev-to-zenn.md`, in an `audiences/`
directory beside `moves/` and `passages/`, content rather than a schema, its
first value the current Dev.to and Zenn reader (kogaki#1370). The Audience
holds two keys: `persona`, who is read to, and `register`, how they are
addressed — word choice, referent rules, the anaphora rule —
which the Leg Packet alone reads (§4.14) and which carries no rule on
structure (kogaki#1350). The `persona` key carries **two fields**, one or two
sentences each, and stays far smaller than a Move:

- **`reader`** — who they are by what they do and in which genre they are
  reading. Grounding: Swales's discourse community (genre analysis, 1990).
  kogaki#1225 dropped the purpose clause ("why they opened it"): why the reader
  opened the post is not observable at the title, and "to fix or avoid a
  problem in their own work soon" is what steered the first Brief to a reader
  who had already lived the article's problem.
- **`prior_knowledge`** — what can be used without explanation, and what
  cannot. Grounding: prior knowledge as the determinant of how much a text must
  make explicit (Kintsch; McNamara & Kintsch 1996), and audience analysis in
  technical communication. **Its one reader is Reader start**: it grants a
  claim no word (kogaki#1331, owner decision 2026-10-10 — "Let us remove
  Persona's permission to use specialized terminology"), and neither
  composition nor path review reads it. Which words a Leg must introduce is
  the Brief's `defined_terms` (§5.1).

Nothing about attitude, trust or the reader's question: those are Reader start
dimensions, and holding them in the Persona would duplicate it. **The Persona
constrains Reader start without duplicating it** (Ede & Lunsford 1984: the
Persona is the audience *addressed*, stable across articles; Reader start is
the audience *invoked* for this Thesis). Each Reader start line is derived
from a named field plus the Thesis, and the Persona is never copied into the
Brief: `knowledge` from `prior_knowledge` (a term the Persona lists as unknown
may not appear, which the vocabulary guard §5.1.2 already reads); `question`
is `holds: none`, or this reader's reaction to the wording they saw, in their
own words — never a question in the article's terms, and never a problem they
are assumed to have lived (kogaki#1225; `holds: none` is not a default rule —
it is what a properly established cold read comes out as when the wording
raises nothing for this reader); `expectation`, `orientation` and `trust` from
`reader` plus the Thesis as a title. **What the reader saw at the title
enters the `question` dimension only** (kogaki#1325): the Thesis may appear in
`question`, as the reader's reaction to the wording, and never in `knowledge`,
because no text has stated it yet — and Reader start is the first Leg's
before-state verbatim (§4.1), so whatever it holds is what the opening Move's
`before` is judged against. One part of that is mechanical and refused at the
`differentiation` record: a `knowledge:` line containing the Thesis
(`readerStartThesisRefusal`). The rest of the
derivation is composition judgment stated to the composer, not linted (§4.6).
Selecting a Persona per article is out of scope; the `compose_path` row of
`src/brief-workflow.json` names the Audience file it reads, as it names its
schema files, and there is no per-article selection.

**The first Leg binds a Move by EXCLUSION, not optimization** (owner
amendment, 2026-09-28). A Move is excluded when its `before` contradicts
Reader start on a dimension it declares; a Move that omits a dimension is not
excluded on it. Survivors are not ranked and no score exists anywhere. Leg 1
binds a survivor by the same composition order every Leg uses — Strand
information, Leg reasoning, then the Move (§4.5) — and the grounds test
applies. The check is the existing specialization verdict applied to Leg 1
against Reader start (§4.12.2): `specializes` passes, `contradicts` refuses.
Where Reader start's `question:` line reads `holds: none`, a Move whose
`before` holds no question, or declares no `question` line at all, survives;
the Move's `after` is what first hands the reader a question. **Convergence is
made visible:** the Brief records how many Moves survived the exclusion for
Leg 1, and a count of one names the library, not the rule, as the cause of a
repeated opening — the fix is a Move extracted from an opening passage.

**No Opening question is rendered** (owner decision 2026-09-29, kogaki#1225).
kogaki#1216 read it off the first Leg's after-state `question:` line and
rendered that line under an `Opening question` heading; the first Brief
composed that way rendered it three times — the Leg's own line, the heading,
and every Leg Packet's fixed-points block. The first Leg already carries a
before-state and an after-state, so a heading repeating its after-state
question was a second Question inside Leg 1. The heading, the Packet line and
the first-Leg `question:` requirement are removed together; whatever question
the opening leaves the reader holding lives in the first Leg's after-state, in
the reader's own words, and nowhere else. `opening_question` stays a retired
Candidate field, refused by name.

**The block is DIFFERENTIATION for Reader start, and Reader target is
DERIVED.** Reader start depends on the Persona and the Thesis and on no path,
so it is authored once per Brief at the `differentiation` state (§6.1), which
also lists the first-Leg survivors, and the Harness sets it on every
Candidate; three units authoring it would author one fact three ways, and the
exclusion could be checked against none of them. Reader target is where *this*
path leaves the reader, which is exactly the last Leg's `reader_state_after`:
the Brief renders that state, whole and line for line, under the existing
`Reader target` heading (`lastLegAfterState`, `src/assemble.mjs`), per
Candidate, since the last Leg is. A Candidate carrying a `reader_target` field
is refused by name (kogaki#1225): authored apart from the Leg it was a second
statement of one fact that the Harness compared with nothing — it checked only
that the string was non-empty. Both land at adoption beside `closure`
and `tradeoffs`.

- **No new gate.** They ride the Candidate-selection gate §6 already carries,
  as `journey_coverage` does.
- **Two Candidates may differ on Reader target**, because their last Legs
  do, and the difference is composition information rather than noise; they
  no longer differ on Reader start, because a Reader start that varied with
  the path was the defect.
- **The mint is still not the site for Reader target:** a Thesis states a
  claim, not where the reader is left. Reader start is derived from the
  Thesis *and* the Persona, which is the material the mint lacked.

**One deterministic refusal where judgment cannot be** (kogaki#1225). Whether
a Reader start is a good cold read is judgment and is linted nowhere; but a
Leg's `introduces:` entry is the composer's own declaration that the reader
does not hold that term, and a declaration can be read. A Reader start line
that contains a term any Leg of the path lists under `introduces:` is refused
at adoption, naming the term and the Leg (`validateLegs`, `src/compose.mjs`;
whole word, case-insensitive; the check carrier is
`checks/check-brief-compose.sh`). A term the path introduces is by definition
one the reader does not hold on arrival.

**An absent value REFUSES at adoption**, naming what is missing: a Reader start
absent from the differentiation record, or a last Leg stating no after-state
for Reader target to be read from. It does not fill a default and does not
render a typed absence and proceed. The contrast with §6.1 MUST 1 is the
argument: a Journey's absence is a *fact about the served material*, which a
composition sitting cannot conjure; Reader start is the differentiation
state's to author, and a last Leg with no after-state is a composition fault
named by Leg.

`necessity:` an authoring site and a refusal, both judgments about where a
value comes from. A default would satisfy every mechanical property here.

#### 5.1.2 The vocabulary guard's reach

`theses/<slug>/brief.yaml` is a tracked document the owner reads directly, and a
guard refuses spec-internal vocabulary in it. **It governs the composer's own
text** — the key captions and the header comment the record carries, the
reader-facing definition, the frame. The record's keys are machine-facing names
and are not captions. It
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

#### 5.1.4 The renderings record and recoverability

**Origin: kogaki#1494, owner decision 2026-10-21.** Two sources can bring
vocabulary into an article: the Audience and the Strands. A Strand carries the
source's own technical terms and expressions, and until this record the Brief
chose which of them the article keeps one claim at a time, in its own words.
Renaming a term and rewording a proposition were the same act, so neither could
be judged: on the two 2026-10-20 Proof Sheet runs over one passage, the same
material produced two Briefs whose points differed in vocabulary alone, a word
in no served material ("registers") reached the Paragraph Waypoints, and every
paragraph of the Draft followed it.

**The record.** The Brief carries `renderings`: one entry per source term the
article will **not** keep, `{ term, as }` — `term` the served material's word,
`as` the plain phrase the article uses in its place — and nothing else. **A term
absent from the record keeps the served word.** A term the Thesis carries is
always kept, because the Thesis is the article's title. The record is the
terminology mapping table the owner placed **at or before the Candidate stage**:
it is composed once, at the `differentiation` state and before any reader-path
unit runs, by the `renderings_unit` judgment over the settled Strands' claims,
the Thesis and the Defined Terms (§5.1). Its shape is declared in
`src/candidate-schema.json` beside the defined-terms record, and an entry
carrying another key, no `as`, a term rendered as itself, a term in no Strand
claim or a term the Thesis carries is refused by name.

**Composition under it.** Every reader-path unit receives the record and the
served claims beside it, and composes its claims and points under it: a served
word is used as served or as its declared rendering, and no third form.

**Recoverability.** The Path Review's claim judgment gains one criterion: a
claim's `proposition` and a waypoint's `point` are **recoverable from the
Claim's served material under the renderings record**. A word in the point that
is neither in the material, nor a declared rendering of a word in it, nor in the
`introduces` of its Leg or an earlier one, nor a function word, **fails, naming
the word** — "registers" on the 2026-10-20 run fails it; "existing technology"
for "bamboo shoots" passes under its entry. The entry is one per Leg and rides
the review beside the claim register; words compare across regular inflection,
so a served word's own forms are recovered from it.

**It is computed, and it gates nothing.** The Harness computes the entry at the
`review_path` state from each Candidate's claims and points, the run's served
claims and the record, and attaches it beside the judged review — the review
judge is not asked it. That is the Issue's own design: a word either occurs in
the material, its renderings or the ledger or it does not, and the 2026-10-20
drift went unnamed precisely because only a reading judged it. It stops no
Candidate: like the review areas of §4.6, it is evidence carried to the human
gate, and pin resolution stays the sole mechanical instrument that refuses on
grounding.

**`introduces` carries only terms the article keeps.** An `introduces` entry
whose term is the `term` of a renderings entry is refused at adoption, naming
both: a term the article does not keep has nothing to introduce.

**What this does not reach.** Editing the record after adoption without
re-composing the Brief is deferred by the owner, who named the cost — an
incomplete record means completing the Brief once before revising it. The
Writer's lexical choices stay the Writer's: the vocabulary is fixed from the
Strand through the plan, and the Writer alone realises it. The Move-boundary
statement (§4) is untouched — no Move information enters the record.

`necessity:` the record's shape is carried by `src/candidate-schema.json` and
refused by `src/compose.mjs`; the criterion is computed by
`src/compose.mjs` `recoverabilityOf` and asserted by
`checks/check-brief-path-rules.sh`. What no carrier holds: why the table sits at
Differentiation rather than at the Writer, and why a term the Thesis carries is
kept.

### 5.2 Obligations

**The term is Obligations** (kogaki#1528, owner decision 2026-10-23,
superseding "Closure", which superseded "Landing" and the rendered heading
"Unresolved obligations" on 2026-09-19). A Question raised in one Leg and a
term named in one Leg and explained in a later one occupy the reader's
attention alike, so they are one mechanism with one capacity rather than two
carriers that cannot see each other. Below, "Closure" names the Leg-scale
ledger as the executables still carry it. **An obligation** is a promise
the prose makes to the reader that a later passage must keep: a question
raised, an analogy introduced, a limitation conceded — this is the definition,
stated where the Brief's Closure section renders it, above the ledger, so a
reader of the document meets it before the rows that instantiate it.

**The Obligation record** (kogaki#1528). An Obligation is
`{opened_by, items}`, each item `{item, closed_by}` (kogaki#1612, owner
decision 2026-10-26, beside kogaki#1529 and kogaki#1530; kogaki#1568 before
it). Discharge is out of the design: the record opens once and closes item by
item, so a later unit sees which items an earlier one already closed — a
promise of three items closed two in one unit and one in the next leaves the
third unit knowing the first two are kept. The two terminal fields, the
raising and owing fields, and the three fields a set-aside row carried
(kogaki#1263, never approved) are retired and refused by name. These rules
govern it:

1. **One record, two scales.** `opened_by` names the unit that opens the
   promise, and `items` lists one or more items in the order that unit names
   them, each `item` one line — a term or a question the opening unit leaves
   unexplained — and each `closed_by` the unit that explains it, or `null`
   while it is still open. A list is non-empty and names no item twice. At
   the **Leg scale** the units are Legs, and the record lives on the Brief.
   At the **Paragraph scale** they are Paragraph Waypoints of one Leg
   Waypoint, and the record lives in the ParagraphPlan file (§4.19). Both
   scales carry the same fields and the same rules, except rule 5, which has
   no Paragraph counterpart. The items are the article's, as many as the
   composer finds in the Strand, and an item is closed by being explained,
   never by being named (kogaki#1603, beside kogaki#1549 and kogaki#1577,
   owner reading 2026-10-26).
2. **One source.** A Move whose `obligation` names items it leaves
   unexplained raises a **slot** — items derived from the Move's own
   Segments and from nothing of any source text, so the inference holds no
   state and its boundary is one Move (kogaki#1583, owner decision
   2026-10-25) —: its items, general as every Move field is. The items
   take two forms and never a count (kogaki#1618, owner reading
   2026-10-26, retiring the count forms of kogaki#1602 and the `counts`
   trigger of kogaki#1590 and kogaki#1613): a question a Segment's
   `operation` poses that no later Segment's `operation` answers, and a
   term a Segment's `operation` introduces that no later Segment's
   `operation` defines, glosses or grounds — one item per question or term,
   in the order the Segments raise them. Because the Segments are the
   call's whole input, the same call re-judges an admitted Move record
   (`extract.mjs rejudge --library <dir>`), rewriting its `obligation` and
   `obligation_triggers` from its own `segments` and nothing else. The composer
   fills the slot with ONE record opened by that unit whose `items` carry
   what this article leaves unexplained at that place, in the article's own
   words and in the order the article names them. The record has no direct
   relationship with the Move's items, which it is never counted against
   (kogaki#1603, beside kogaki#1549 and kogaki#1577). No other record
   exists: a promise the Strand material raises and no bound Move signals is
   not written, and the composer binds a Move that carries it or does not
   promise. The Obligations ledger is written by the Planner and by nothing
   else: the Proof Sheet, which replays the production stages from fixed
   text, writes no record, because a description of an existing article
   cannot be refused, only recorded (kogaki#1582, owner decision 2026-10-25).
   An Obligation and an `introduces` entry are two registers, and no check
   compares them (kogaki#1577, owner decision 2026-10-24).
3. **Capacity.** At most ONE Obligation is open at any unit of one scale. A
   record is open from its `opened_by` unit up to, and not including, the
   unit that closes its last item. Obligations at different scales may be
   open at once.
4. **Closing.** The four rules the validators hold at both scales
   (kogaki#1612): the items close in the order named, so an item closed
   before an earlier one, or while an earlier one is still open, is refused
   naming both; every `closed_by` is a unit after `opened_by`, and one equal
   to it is refused, since a promise kept where it is made is the unit's own
   structure and not a promise; at most one record is open at any unit (rule
   3); and a record whose item is still `null` at the last unit of its scale
   is refused naming the item. A unit that only names an item does not close
   it (kogaki#1603): whether a `closed_by` unit explains its item is judged
   where rule 6 says; the shape is checked here.
5. **Section.** No Leg after a record's `opened_by`, up to and including the
   Leg closing its last item, carries `opens_section`; the opening Leg opens
   the Section, under the Section grouping's rule 1 (§4.15).
6. **Closing is planning, never prose, and the records never leave the
   Plan.** An item is closed by the closing unit's Waypoints and its Move
   binding: at the Leg scale by the Leg's Waypoints, at the Paragraph scale
   by the Paragraph Waypoints the plan generates. An open record's items
   reach the units inside it as material — each unit after the opening one,
   up to the one closing the last item, is handed the items still open when
   it begins — asking for no sentence. The Writer's Packet carries no record
   and no line derived from one, and no stage inserts a paragraph or a
   sentence for a record (kogaki#1584, owner decision 2026-10-25). Whether a
   closing unit explains its items is judged where Path Review judges
   `discharge` (§4.12.2) and where the ParagraphPlan judge judges the plan
   (§4.19).
7. **Terms.** `introduces` keeps `term` and `meaning` and drops `kind`: every
   introduced term is one the article gives its meaning to, and a term the
   reader already holds is not introduced. A term named and deferred is an
   Obligation item, its meaning given by the unit its `closed_by` names
   (§4.13).
8. **The Thesis row** stays derived (kogaki#1328, below) and is outside the
   capacity rule, as it was.

`src/leg-schema.json`'s `path_rules` states rules 1, 3, 4 and 5 to the
composer as checked entries, and `obligationLedgerRefusal`
(`src/compose.mjs`) refuses over them naming the record and the Leg; at the
Paragraph scale `paragraphObligationsRefusal` refuses over the same rules.
*Status: both scales are carried by the executables* (kogaki#1529,
kogaki#1530, kogaki#1612): the Brief's `obligations` records and a Leg
Waypoint's `obligations` in the ParagraphPlan file carry `opened_by` and
`items`, the retired `closure` key, `introduced_by` field and every field
kogaki#1612 retired are refused by name, `introduces_item` carries no `kind`,
and a Move's deferred slot reaches the composer's input. An Issue that changes
it reads its rule here, and an Issue that changes a rule changes it here
first.

**One ledger at two levels.** The **Thesis row** is the Thesis's own promise,
and it is **derived, never written** (kogaki#1328): rendered from each placed
Strand's `strand_coverage.role_in_thesis` and handed to the one Leg marked
`reaches_target`, whose after-state is the Reader target, and to no other Leg.
It was the Candidate's free-text `reasoning.thesis_closure`, copied into the
Brief whole — one line of 1934 characters in the 2026-10-09 Brief, restating
what the coverage already carried per Strand. The **Leg rows** are the
obligations ledger — the owner's proposed name is *Legs closure* — the record's
`obligations` list (the `closure` list until kogaki#1529), each record carrying
`opened_by` and its `items`.

**Every item is closed by a Leg, written by the composer** (kogaki#1612): its
`closed_by` names the Leg that explains it. **"Unresolved" is not a state the
finished ledger can hold** — `validateLegs` (`src/compose.mjs`) refuses a
Brief carrying an item still open at the path's last Leg, naming the record
and the item. No item is set aside: the conceded state is retired with its
three fields.

- **The Strand cover is counted in placements, after composition**, and an
  unplaced selected Strand discloses.
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:75`

**The ledger is a key of the Brief record**, not a sidecar and not a
projection assembled at gate time. The same record carries the obligations and
the coverage the Thesis row is derived from, so the gate reads one artifact
and a sidecar cannot drift from it. The entries are **authored judgments** —
"this Leg opens this question" — not something a computation reveals from data
already kept, so they need a record and the record belongs where its consumer
reads it.

**Reader start no longer binds the first Leg verbatim** (kogaki#1216, owner
decision 2026-09-28). `validateLegs` used to refuse a path whose first Leg's
`reader_state_before` was not the Brief's Reader start as an opaque string,
and that match — beside §4.12.2's specialization rule — is what wrote Reader
start backwards from the first Leg's Move. The verbatim check is retired from
`src/compose.mjs` and from `src/leg-schema.json`'s `path_rules`
(`reader_start_binds_first_leg`); what `validateLegs` still refuses is Reader
start's own shape. The first Leg still opens from Reader start, and since
kogaki#1325 its `reader_state_before` IS Reader start, derived rather than
composed (§4.1): the verbatim equality returns by construction, without the
backwards authoring, because what is judged is whether the opening Move's
`before` requires anything Reader start does not hold (§4.12.2). The Move it
binds is one the exclusion of §5.1.1 did not remove — stated to the composer
as the judgment-class `first_leg_binds_a_survivor` path rule.

**A row that needs a sentence of its own gets a waypoint** (kogaki#1496, owner
decision 2026-10-21: Closure "should influence Move selection, Waypoint
creation, and noun phrases within Waypoints rather than independently adding
prose"). The records never reach the Packet (rule 6, kogaki#1584), so a
record reaches the prose only through the plan. Where explaining an item needs
a sentence the closing Leg's other points do not already make, the Brief's
reader-path unit composes a waypoint of the closing Leg for it, and the item
reaches the prose through that waypoint and its Paragraph Waypoints. The Path
Review's `discharge` item (§4.12.2) already names each record's items beside
the claims of the Leg closing them (kogaki#1612), which is where an item no
point explains is read; it is unchanged by this paragraph.

**There is no mechanical judge of the CONTENT of any of this.** Whether an
obligation is worth entering, and whether a closing Leg explains its items, is
judged at Path Review (§4.3); Kogaki guarantees citations and the substrate
guarantees facts. What the runtime enforces is SHAPE alone: every item closed
in order after its opening Leg, and Reader start in its line-per-dimension
shape.

`necessity:` the field is in the record shape and the fill is carried by
`src/compose.mjs`; the siting argument is not. "Why not a sidecar" is the
question a later implementer asks, and the answer is a claim about drift that no
code expresses.

### 5.3 The durable home and the entry point

**The flow.** Entry resolves the settled Strand set (served Lesson **addresses**
supplied on the command line, against the Package's own enumeration) → the
**thesis-determination gate** → the **mint**.

**THE STRAND SET ARRIVES ON THE COMMAND LINE, AND BRIEF READS NO TERRAIN RUN
(v38, kogaki#1116; owner ruling 2026-09-13/14).** Brief and Terrain are
**independent**. The brief skill's one `!` line carries `$ARGUMENTS`, each
argument is a **served Lesson address** — `<package>::<kind>/<local-name>`, or a
bare local name resolved against the Lesson kind — and `enter` resolves every
one of them through the gateway's enumeration, refusing by name an address the
Package does not serve. **A start with no argument refuses and names the
argument form.** Nothing in this lane reads a Terrain run record, a survey
record, or anything under `runs/terrain`.

**A human-facing reference is resolved BEFORE the skill is invoked.** `G<n>`,
`L<n>` and `D<n>` are Full Report coordinates — Terrain mints them by **position
in the served enumeration at survey time**, so the same token names a different
Lesson after a pin advance, and the identity the Package serves is the address
(product-lab#263 R1, which declined a per-kind number). The **Model** translates
a report coordinate into addresses from the Full Report; the runtime **refuses
such a token by name** and says so.

**This reverses v36's ground rather than drifting from it.** kogaki#1108 removed
the argv because an id list a Model retypes is one a Model can retype wrong. The
cost was unstated and immediate: reading the set off Terrain's run record coupled
Brief to that run's **internal progress**, so a Terrain run wedged before its ID
gate made every Brief start refuse — which it did, for six days from 2026-09-12.
The owner **accepts opportunistic Model resolution** on one condition this flow
already meets: **the resolved set is rendered to the owner at the thesis gate**,
marked as supplied on the command line, before anything under `theses/` is
written. That rendering is the mis-resolution's catch point, which is what makes
the accepted risk bounded rather than silent.

**The display id is minted from the argument order, and it is a within-document
token rather than an identity.** The first address takes `L1`. The Brief's
`strands` list carries each `id: L<n>` beside that Strand's slug and served cite, so
the mapping travels with the document that uses it and no second carrier can
drift from it — which is what lets the Leg grammar, the Packets and the Draft
keep addressing material as `L<n>` while the identity everywhere else is the
served address.

**The Strand cite is the served address at its content hash, and the commit pin
is deprecated** (hub decision staged 2026-09-14). A response-wide commit said the
same thing about every member of a set and nothing about whether any one
Strand's material had moved; the content hash the gateway returns per line
answers exactly that, per member. **No Brief output carries `@<commit>`**, and
the minted Brief carries no survey-pin line at all.

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

**THE ANSWER IS READ FROM A CAPTURE, NEVER RECEIVED AS AN ARGUMENT (v32,
kogaki#891).** Both halves above — the adopted Thesis and the optional name —
reach the runtime through a `*.gate-capture.json` row in the shape
`specs/spec-gate-carrier/SPEC.md` §4 binds, carrying the AskUserQuestion
`tool_use_id` and bound to the option set it was offered against. Three
consequences, and they are the whole of the amendment:

1. **`adopt --thesis` and `--slug` are REMOVED**, not deprecated. A channel
   that still exists is a channel, and leaving it beside the capture would make
   the capture optional in exactly the runs that skip it. The act refuses the
   removed flags by name rather than ignoring them, because a silently dropped
   `--thesis` adopts whatever the capture says while its caller believes it
   passed the answer.
2. **`adopt` refuses when no declaration for this run state was rendered.** A
   run state carrying no gate was never put in front of an owner, so there is
   no question for an answer to be an answer TO. The capture act refuses the
   same state, so neither entry point can mint a declaration out of band —
   `specs/spec-gate-carrier/SPEC.md` §4.1's *an answer is admitted at the wait
   that declared it*, which §4.12.3 already applies one gate over.
3. **Free-form Thesis text reaches the run state through the captured answer
   and through nothing else.** This is the sharpest of the three: the owner's
   own words are exactly the value that must not arrive as a model-composed
   argument, since nothing downstream can tell the owner's sentence from the
   session's.

**WHAT "DECLARATION" NAMES IN ITEM 2, AND WHY THE FILE IS NOT THE BARRIER
(v36, kogaki#915).** The declaration for a run **is the run state's `gate`
key**, written by `enter`. The `*.run-declaration.json` file that
`gate-thesis --declare` writes is a **derived artifact**: it is composed FROM
`state.gate`, the two are bound by the same option-set digest, and it holds
nothing the run state does not already hold. So `adopt`'s barrier reads
`state.gate`, and that IS the barrier item 2 names rather than a weaker
stand-in for it. **This is said in the spec's own words rather than left to
v32's redefinition**, because a barrier whose strength is discoverable only by
reading the code against the acceptance wording is one a later reader
re-derives from scratch, or trusts wrongly.

**The file is not the barrier because of WHO WRITES IT.** It is written by the
same actor the barrier guards against, at the same moment and out of the same
material as the capture beside it — so a check on its existence refuses nothing
a forged capture could not also forge, and would read as strength while adding
none. What holds instead is `gate-thesis --capture`'s own refusal: *an answer
is admitted only at the wait that declared it*
(`specs/spec-gate-carrier/SPEC.md` §4.1), and adoption requires a capture, so
the rendering is established **transitively** rather than re-asserted at
adoption.

**The consequence is stated rather than left to be discovered: an adoption
against a run state whose declaration file was REMOVED is admissible**, and
`checks/check-brief-compose.sh` exercises exactly that case — so the
admissibility is a tested property rather than the absence of a test.

**Two surfaces answer differently about that run, and both are right.**
SPEC-gate-carrier §4.1 makes a capture with no sibling declaration fall back to
the **registry** as its comparison target, so for a `dynamic_options` gate —
which this one is — a removed file leaves `check-gate-carrier` red while
adoption is green. The two are not one question answered twice: the check asks
whether these options were ever declared **anywhere**, adoption asks whether
**this run's** gate was composed and answered, and §4.1's registry fallback is
that behaviour "by design rather than by exemption". A reader who expects the
two to agree is owed this sentence rather than the rediscovery.

**Recorded as an owner selection over a served recommendation, not an
unconsulted fork (2026-09-06).** The alternative — raising `cmdAdopt` and
`cmdAdoptCandidate` to check the rendered file — was the arm the served surface
discriminated toward, on the ground that a detector's unit is derived from how
the property is violated and never inherited from the neighbouring gates, and
the owner selected against it at the gate.
`consulted: product-lab@f9a6d0f54f94c1ab54ca4223c4c4b75811105dcf LESSONS.md:146`
`consulted: product-lab@f9a6d0f54f94c1ab54ca4223c4c4b75811105dcf LESSONS.md:35`

**The binding is the OPTION SET, and that is chosen rather than inherited.**
§4.12.3 binds its capture on two axes (which Candidate, which record digest)
because it ratifies a machine record. This gate's answer IS the decision, so
what it must not drift against is *what was offered*: the same option id beside
different alternatives is a different question. The declaration and the capture
are keyed on the **run state**, not on the directory holding it — two entries
over the same settled set compose identical candidates and therefore an
identical digest, so a directory-keyed name would let one run's answer be
admitted at another's adoption precisely when the two are least
distinguishable.

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
gate, the mint, path composition with its per-unit Move fit (§4.12.2), Path Review,
Candidate assembly, the Candidate-selection gate, §4.12.3's ratification gate,
adoption — and ends only at a
**filled** Brief, or at an owner answer that ends it.

**A human gate is not a stop.** What is abolished is the **default** stop.

**A mid-workflow stop is legitimate only when NAMED, and only on an
inspection-need** — a point where the owner must leave the conversation to read
another surface before the next gate can be answered honestly. **This flow has
no such point**, and **all three gates** are answerable from what the runtime
renders into them. A later sitting that finds one adds the named stop there,
with its ground; it does not restore the default.

**Three since v28** (kogaki#893), and the third is the one whose count this
clause has to be read against: §4.12.3's ratification gate is answerable from
what the runtime renders into it — `ratify-specialization --declare` prints the
record verdict by verdict, byte-for-byte as the validator read it — so it adds
a gate and **not** an inspection-need. That is the property this clause is
about, and it is why the gate could be added without reopening the abolished
default stop.

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

**No check is registered by this spec.** A new check would owe an admission
record, a removal signal and a typed observing instrument, and a check admitted
ahead of its subject is the shape this repository refuses.

**THIS SECTION NOW REGISTERS ITS GATE, AND THE GAP IS THE FINDING RATHER THAN
AN OVERSIGHT (v32, kogaki#891).** The sentence here read *"no gate is registered
by THIS SECTION"* while §6 had been RAISING a Candidate-selection gate since it
existed — so the gate was live, owner-facing, and carried no row in
`src/gate-registry.json`. That is exactly the uncovered-by-default shape the
registry exists to close: `check-gate-carrier`'s coverage number is a fraction
OF the registry and of nothing else, so it read as complete over the other gates
while this one was invisible to it. `brief-candidate-selection` is registered
now, and the two clauses that survive unchanged are stated so the narrowing is
legible: §6 still mints **no new record class** and still adds **no check
member**.

**ADOPTION READS THE OWNER'S ANSWER (v32, kogaki#891).** `adopt-candidate`
requires the §6 capture and refuses without it; `--candidate` NAMES the
Candidate being adopted and is **checked against** that answer rather than
standing in for it — a selector the model composes is admissible exactly
because the evidence beside it is not. The negation `none-of-these` routes to a
**refusal, not a state**: the capture is recorded, the Brief's sequence stays
unwritten, and every Candidate is adoptable again once the Thesis or the
settled set changes. The refusal is sited **below** the two clauses that
establish the Candidate is a Candidate at all and **above** every judgment
clause: a malformed Candidate was never offerable and its own refusal names the
repair, while judging a specialization record about a path nobody chose — and
carrying it to an owner to ratify — is wasted work ending in a refusal that
names the wrong thing. §4.12.3's own ordering property is untouched: a
`contradicts` record still refuses above the ratification gate. **The
ratification act takes the selection capture too**, because it establishes its
subject through the same adoption call, and a ratification raised without one
would ask an owner to ratify a record about a Reader Path nobody selected.

**THE SAME READING OF "DECLARATION" BINDS HERE, AND ITS SUBJECT IS DIFFERENT
(v36, kogaki#915).** §5.3 states that a run's declaration is the run state's
`gate` key and that the `*.run-declaration.json` file is a derived artifact
which is not the barrier. `adopt-candidate` has no run state, so the same
principle lands on the material it does have: **its barrier is the captures and
what they bind to** — the §6 selection capture checked against the reviewed
Candidate set, and §4.12.3's ratification capture checked against the record
digest — never the existence of a declaration file beside them. The file is
read where it is written, at `--declare`/`--capture`, and adoption establishes
the rendering transitively through the captures it requires.

**So the acceptance wording is what was corrected, and the barrier is
unchanged.** kogaki#915 found `cmdAdopt`'s and `cmdAdoptCandidate`'s barriers
weaker than the sentence naming them, and the fork was whether to raise the
barriers or to say plainly what they actually guard. It is the second: the file
is written by the same actor the barrier guards against, so a check on it
refuses nothing a forged capture could not also forge. **An adoption whose
declaration file was removed is admissible here too**, and
`checks/check-brief-compose.sh` states so rather than leaving the case untested.

**The first half was narrowed at v28 (kogaki#893) and narrowed again at v32
(kogaki#891).** §4.12.3 registered `brief-specialization-ratification`, and v32
registers `brief-candidate-selection` here — so the claim that survives is the
one §6 actually rests on: Candidate selection rides the gate carrier this
repository already ships and mints **no record class**. What v28's wording still
got wrong is now visible: it said the old claim "is still true of §6", and it
was not — §6 was raising an unregistered gate at the time the sentence was
written. The version trail is kept rather than rewritten so the correction is
readable as a correction. And the check half stands unchanged: §4.12.3 adds a CASE to
`check-brief-compose`, never a member, so no admission record and no removal
signal is owed.

**FREE TEXT AT THIS GATE IS A COMMENT, NOT A SELECTION (v35, kogaki#914,
owner ruling 2026-09-06).** The payload clause below offers a free-text
channel and `gate-candidate --capture` accepts an answer given there, so the
answer was REACHABLE while adoption had no branch for it: it fell through to
the id match, where the recorded option is absent and the refusal read *"the
owner selected candidate `undefined`"* — a state the owner never produced,
sending them to repair the wrong thing. **Adoption now refuses it by name**,
quoting the owner's words back and routing to `none-of-these` or to a
re-raised gate; nothing is written and every Candidate stays adoptable.

**The disposition is CHOSEN rather than inherited from the matcher, which is
why it is stated here.** The old behaviour was not a decision — it was what
the id comparison happened to do with an answer nobody had considered, and an
enumeration's load-bearing half is what happens to what it does not name. The
ground for choosing refusal over adoption: a Candidate is a **composed**
object — an ordered sequence of Legs, each binding a Move library record,
plus the reasoning that fills the tradeoffs — so there is no
Reader Path in free text to adopt, and admitting one would put the runtime in
the business of resolving prose into a sequence. That is the judgment layer
v32 removed from this seam. §4.12.3's ratification gate reaches the same
disposition on the same ground, one section over: a write unlocked by
arbitrary prose is unlocked by anything.

**The thesis-determination gate is NOT the counter-precedent it looks like.**
It admits free text as `adopted_via: free-form`, and correctly: there the
answer **is** the value, since a Thesis is prose and a free-form one is the
owner's own words reaching the run state verbatim. Here the answer is a
selection among machine-composed structures. The two gates differ in what an
answer *is*, not in how much the owner is trusted.

**An answer carrying both an option and free text is a selection with a
comment beside it** and adopts normally — the refusal reads the option's
absence, never the free text's presence. And the check half stands unchanged:
this adds a CASE to `check-brief-compose`, never a member, so no admission
record and no removal signal is owed.

**The selection payload carries, per Candidate, its id and its
reader-experience label; the premise's negation; free text. Nothing else.**
The composition-time reasoning — Leg validity, transition continuity, Thesis
closure, the obligations ledger's state, the Strand placement count — is
composed where it is composed and stays there: in the reviewed Candidates
(`reviewed.json`, the Candidates file), which this clause does not touch.
**Never an automated verdict**: no machinery renders one, and nothing a checker
passed decides the selection.

**THE EVIDENCE NEITHER REACHES THE OWNER NOR IS COPIED INTO THE PAYLOAD, and
the ruling came in two parts** (owner ruling 2026-09-04, kogaki#859). This
clause read "the evidence is what the owner reads", and the implementation was
faithful to it: sixteen paragraphs per Candidate, measured at ~6,400–7,090
characters each, about **20,000 characters** standing above a question whose
three labels total under 900. The first run to measure whether the owner read
them found they did not, and decided on the labels alone.

**The amendment goes further than the display, and its ground is general rather
than local to this payload:** the reasoning is not retained in the payload "just
in case" either. Quoting the ruling — *"the run record holds what a later act
reads. 'Save everything to the run record just in case' is rejected; an entry
with no reader is unnecessary data and is refused, not tolerated."* So the
payload stops **copying**; the inputs it copied from are untouched, and a later
act that needs the reasoning reads it where it was composed. If it is ever
wanted for debugging it is saved then, by its own decision.

`consulted: product-lab@315feac641735a8cba84408feab15d6bfe57affe topics/archive/articles.md:29`
— "A mechanism is not correct merely because it behaves according to its own
internal rules. If the user experience is bad, then it is a mechanism built on
an incorrect design." A gate conformant to this clause and unreadable is the
clause giving way, not the implementation.

**The reversal is one item at a time, and never the list restored.** If a later
run shows one evidence item is needed to decide, that item is added by its own
ruling — the derivation (`candidateEvidence`) and the plain-label tables that
would render it are retained for exactly this, and `checks/check-brief-compose.sh`
**case (r)** asserts both stay fit to use: `EVIDENCE_LABELS` covers exactly
`REASONING_FIELDS` plus the keys `candidateEvidence` derives, and `REVIEW_LABELS`
exactly `REVIEW_AREAS`, in both directions, with every label non-blank and free of
internal vocabulary. A ruling that restored the list wholesale would reproduce the
defect this one records.

**The case is NAMED here because this sentence previously claimed a guard that did
not exist** (PR #863 round 2, carried finding 2). It asserted that the check
"asserts both stay fit to use" while `REVIEW_LABELS` was asserted **nowhere** — its
only reader was the rendering loop this ruling deleted, leaving an unused import as
the sole trace — and `EVIDENCE_LABELS` for four of its ten keys. The retention
argument above rests on exactly that coverage, so the claim was load-bearing and
carrier-less at once: a contract tested against its own text is green about the
document and silent about the tables. Naming the case is what makes the claim
falsifiable rather than merely written down.

**THE CLAUSE HAS BEEN EXERCISED ONCE, AND ONCE IS THE RECORD** (kogaki#909,
owner ruling 2026-09-06). The item added is **decision-grade disclosure
evidence** — evidence that bears on the choice the owner is making at this gate,
of which `revise_residue` was the first and only member until kogaki#1307 removed
it with the revise pass. The grading test and its carrier live in §4.11 and are
not restated here; what §6
records is that its own reversal route was used as written, by its own ruling,
for one item rather than for a list.

**Why this is not the 20,000 characters coming back by instalments, stated so a
later reader can tell the difference.** What #859 removed was the
composition-time **reasoning**, copied wholesale for every Candidate whether or
not anything had happened — sixteen paragraphs each, present on every run. What
returns is the Harness's own **one sentence** about its own arithmetic, present
only where the arithmetic actually fired, on at most three Candidates. The
distinguishing property is not length but **conditionality**: a Candidate that
spent no revise round renders nothing, so the empty case this ruling
established remains the ordinary case rather than becoming the exception. A
later item proposed for this route is measured against that property and not
against a character count.

**The declined alternative, recorded so it is not re-proposed blind:** a
one-line disclosure at the gate saying the reasoning exists and is available
elsewhere — the disclose-the-count discipline
(`topics/archive/articles.md:26@315feac6`), applied to material leaving a view.
It does not bind, because the record was never an owner surface: nothing is
truncated from a view the owner had, and an unasked-for line is the same defect
one size down.

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

**Differentiation is the named block that decides how the Candidates differ**
(kogaki#1206) — a judgment state run before any reader-path unit composes,
assigning each unit the reader-state dimension it leads with, the opening Move
its first Leg must bind, and (where the Brief carries Journey material) where
that unit places it. Three units composing independently cannot make their
Candidates differ by seeing each other; Differentiation is what makes them
differ BY ASSIGNMENT instead. **Since kogaki#1216 the same state also authors
the Brief's one Reader start** — from the Audience file's `persona` the `compose_path` row
names and the adopted Thesis, never from a Move (§5.1.1) — **and lists the
first-Leg survivors**, every Move whose `before` does not contradict it; each
unit's assigned opening Move is drawn from that list, and the Harness sets
Reader start and the survivor count on every Candidate at the reader-path
job's boundary. **The record `src/differentiation-schema.json`
declares today is this block's CURRENT OUTPUT, and not its definition**: a
later mechanism that decides differentiation a different way keeps the name
Differentiation and the same boundary — before the reader-path units start —
and may reshape the record without this section moving.

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

**Judged as judgment, never as a lint.** Conformance is read at **Path Review**
(§4.8's arc clauses, per Candidate, as `src/review.mjs` runs them). It was
surfaced to the owner as reasoning per §6's evidence rule; kogaki#859 reduced
that gate to its labels and stopped the payload copying the reasoning, so for
one release the figure reached the owner nowhere.

**THE ADOPTED PATH'S JOURNEY COVERAGE RIDES §4.11's BRIEF SLOT** (kogaki#864,
owner ruling 2026-09-04) — the same slot, the same act, filled at adoption from
the adopted Candidate.

**THE MECHANISM IS SHARED AND THE GROUND IS NOT, which is why this clause states
its own.** §4.11's disclosure is an **approval**: remove it and an approval step
is gone with nothing standing in for it. This one is a **report** on a judgment
that Path Review makes and records either way, so its absence cost visibility
rather than a control — and the owner ruled the two are different questions
before ruling that both land in the Brief. Two clauses, distinct grounds, one
carrier. **A later sitting may move one without moving the other**; that is the
property this paragraph exists to keep, because the two were last coupled by
accident and the coupling is what let one clause's amendment silently break the
other's.

**The slot's journey half is vacuous on a Brief with no Journey material**, on
the same terms as this section's four requirements above: the slot still renders
and its bridge half still fills, and the journey sentence simply has nothing to
state. An empty disclosure and an absent one are not the same reading, which is
why this is said rather than left to the reader.

`necessity:` four composition MUSTs applied to prose by a reader. The arc-shape
floor in particular is a judgment about register that no grammar decides.

## 6.9 Move INGESTION — how a Move enters the library

**Where an Extraction records the question before the passage as none, the
ingested Move reads `holds: none`, never a composed question** (kogaki#1216).
The Passage-to-Move path reads the Extraction's `question` row (`passages/
FORMAT.md` §"Reader before and after"): where its BEFORE cell reads `none`,
alone or with a hedge, `tools/move_ingest.py` writes `holds: none` into the
`question:` line of the proposal's `before` (the Move's own `question` field,
which it also rewrote, retired at kogaki#1324) before the selection screen renders, and the screen names the rewrite. The
Extraction is the owner-answered record; a model fills the schema it is given
and manufactured a question where the record held none, which is how the
library came to hold no Move able to open a reader who arrives indifferent.

Input is a **free-form file the owner writes**, conventionally carrying a
`.md` extension. **It is not markdown**, and §6.9.0's grammar refuses markdown
constructs by name: the extension is the owner's filing convenience, not a
promise about the interior. A command reads it and
proposes each Move in exactly §4.2's five required fields, plus whichever of
the three optional ones are present, stripping the excluded draft fields. An
**agent review** applies the authoring discipline as **judgment**: one
transition not an arc, separable from content, an id naming the operation in
established terms, `after` differing from `before`, subject-independence
(§4.2) honoured everywhere but `evidence`, dedupe against existing ids (a
near-duplicate proposes an amendment rather than a new entry), and an
`evidence` line, where present, naming real passages with no fabricated
citations. Then **one accept/decline question**: per-Move accept / decline /
free-form, the owner deciding. Accepted Moves land one file each in `moves/`,
and the command regenerates `moves/INDEX.md`.

**ADMISSION IS THE OWNER'S ACT AT THAT QUESTION, never the command's.** Review may
split or rename, so the reviewed proposal is not the authored file — nothing
self-admits.

**The paragraph path: `--from-extraction` (kogaki#1358, kogaki#1359; design on
kogaki#1329, kogaki#1366, kogaki#1377).** A paragraph Move enters the library by
a second route that calls no model. `tools/move_ingest.py passage
--from-extraction <pNN.md>... --out <dir>` takes one or more written
paragraph Extractions (`passages/FORMAT.md` "The paragraph unit", `unit:
paragraph <N> of <M> in <slug>`) and READS each record off its Extraction: the
`id` from section 7, `before`/`after` from section 2's changed rows,
`technique` from section 6, `breaks` from section 5, and `segments` from
section 3; the model authored the Extraction and authors nothing here. An
Extraction with no section 5 or no section 6, or an empty one, is refused
naming the section, and nothing is proposed for it (kogaki#1377) — the same
Leg Moves and Paragraph Moves are one kind of Move, under one schema (§4.2),
and a derived record missing a role the schema maps is the same defect a
model-authored one would be. It takes no Passage file and requires `--out`. A
paragraph Extraction carrying `contains:` is refused by name — two levels, no
more. The proposals render on the same selection screen and admission is the
same owner act at the same accept/decline question; nothing is written before
`--select accept`. Accepted Moves land in `moves/` like any other accepted
Move, and the command regenerates `moves/INDEX.md` — there is no second
directory and no flag naming one.

`necessity:` the review criteria are judgments about a record's prose, and the
admission boundary is a rule about authority. A tool that admitted its own
proposals would satisfy every mechanical property this spec states.

### 6.9.0 The input grammar

**A record begins at a column-0 `id:` key and runs to the next one or to end of
file; each record is parsed as a YAML mapping under the four conditions below.**
Markdown constructs are **not required** — the `.md` extension is the owner's
filing convenience, not a promise about the interior — and they are **refused
wherever a grammar can see them**.

**`id` MUST be the record's first key.** A record written with `before:` above
`id:` is not seen as a boundary at all: it is absorbed into the record above,
which silently acquires the wrong `before` while the record below loses its own.

**Four conditions admit a record. Together they leave exactly one quiet failure,
which condition 4 names and bounds rather than claiming away:**

1. **Nothing precedes the file's first `id:`.** Any leading text is refused,
   naming the line. This is the condition that catches an out-of-order *first*
   record, which no per-record check can see.
2. **Duplicate keys within a record are refused rather than resolved.**
3. **After the strip step, a record carries exactly §4.2's five required keys,
   plus at most the three optional ones (`continues_from`,
   `evidence`, `figure`) — no more, and none of the five missing.** A
   retired field (`order`, `presupposes`, `draws_on`, `question`) is an
   unexpected key here and is refused naming it. The
   ordering matters: the excluded draft fields are stripped **first**, so
   their presence routes to the strip step rather than to a refusal. A record
   that absorbed its neighbour's `before` leaves that neighbour short a
   required key, and this condition catches it. **The optional set is
   enumerated rather than open (kogaki#876's rule, carried into the rebuilt
   schema, kogaki#1175)**: a key outside the eleven named across §4.2 is
   refused, whether it looks like a ninth key under the old count or a
   twelfth under this one — a widening is the change that can quietly
   remove a condition's catch, so what it admits is enumerated rather than
   loosened. `draws_on` took this same refusal route once retired
   (kogaki#1280): removing a key from the optional set does not widen it.
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

The five required fields render as a **structured block as the file body**,
and `moves/INDEX.md`'s row derives mechanically from two of them. Where the
record carries any of the three optional fields, each renders **after** the
five, `figure` last of all (§6.9.3) — and the INDEX row is unaffected: its
two columns are `id` and `technique`, so no optional field reaches a row.

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

**The file body.** The five required fields in §4.2's order as a YAML
mapping, written by the Brief's one YAML writer (`src/yaml.mjs`) and read back
by its one reader (kogaki#1413) — `before` and `after` as maps keyed by
dimension, one sentence per dimension, never one joined line, and `breaks` as
a list of prose tests. No fence, no `---` delimiters: front-matter delimiters
imply a document below the metadata, and here the block **is** the
document.

**The optional fields render after the five, each when present** (kogaki#876,
carried into the rebuilt schema by kogaki#1175). `continues_from`
and `evidence` render in §4.2's table order (`draws_on` retired, kogaki#1280);
`figure` renders **last of all**,
in the **kind's** role order, which is the order a conforming input already
carries. A record carrying none of the three renders byte-identically to what
a record under the five-field schema always did. **The five remain the
five**: no optional field is in §4.2's required order and none is counted
into it, which is why each renders after the loop rather than inside it.

**The filename.** `moves/<id>.yaml`, the `id` field as the whole stem —
**derived, never composed.** A review that renames a Move renames its file, and
nothing else has to agree because nothing else stores the name. Two accepted
Moves cannot share an `id`; the collision surfaces at the accept/decline question as
the dedupe judgment §6.9 already assigns to review, never as a silent
overwrite. A `moves/<id>.md` record is the retired form: every read refuses it by
name, and a library holding one is refused whole rather than read around
(kogaki#1413), until kogaki#1415 regenerates the committed records.

**The INDEX row.** One row per file sorted by `id`, carrying `id` and
`technique` — **every column read off a file, none composed.** That is the
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

### 6.9.3 The closed kind set and the Move's `figure`

`src/figure-kinds.json` holds the **closed** set of figure kinds. A kind is a
**schema of roles and nothing else**: `roles` names the positions a figure of
that kind has, and `relation` states in one line what holds between them.
**A kind carries no words a reader sees**, and nothing in it is subject matter.
The first version:

| kind | roles | relation |
|---|---|---|
| axis | endpoint_a, endpoint_b, criterion | the two endpoints sit on the criterion |
| chain | stages, bottlenecks | ordered stages, each feeding the next, one bottleneck per stage |
| matrix | cases, relation | one relation held by every case |
| tree | root, branches | the root divides into the branches |
| threshold | successes, failures, line | the line separates the two sets |

**The roles are singular keys, and the plural names are the decision.** The
authoring table proposed `stage[1..n]`, `case[1..n]`, `branch[1..n]`,
`success[1..n]` and `failure[1..n]`. An indexed role has to be filled per
instance, and a per-instance filling is **example content** — the one thing a
form is forbidden to carry. So `stages` takes one line describing what plays
that part in this Move's vocabulary, exactly as `criterion` does, and the
arity stays where it belongs: in the figure a composer eventually draws, never
in the schema.

**The Move's block.** `figure` is an optional field in a Move record — renamed
from `visual_form` (kogaki#1175), reading `passages/FIGURE.md`'s structure
rather than a form authored by hand, but unchanged in shape: one `kind` from
the set, and **per role, one line** mapping it into the Move's own vocabulary
— the terms its `before`/`after`/`technique` already use. The block is
**flat**, so `kind` is reserved and no kind may declare a role by that name;
`tools/move_ingest.py` refuses the *set* on that shape rather than refusing a
Move, because the malformation is this repository's and naming the owner's
record for it would name the wrong party. For a Move whose Passage carries an
axis figure:

    figure:
      kind: axis
      endpoint_a: the first endpoint the Move presents
      endpoint_b: the opposing endpoint
      criterion: the one axis both endpoints clarify

**Absent by default.** A form is added only when the Move's transformation has
a relational shape, and that is the **admission act's judgment** (§6.9's agent
review judges it as it judges the other fields), never a rule here. **A form on
a Move obliges no Leg to use it**, and nothing in the pipeline reads
`src/figure-kinds.json` to decide anything.

**What ingestion validates is exactly three things, and each is refused by
name:** the kind exists in the closed set; every role of that kind is mapped;
no role outside that kind is mapped. A role mapped to an empty line is the
third case wearing the second's clothes and is refused with it. **It judges no
wording** — whether a role's line is a good reading of the Move's vocabulary is
review's judgment, and a rule over that prose would be the lint §6.9.2
excludes.

**The value model gains one nesting, admitted BY NAME.** §6.9.0's model is
deliberately small — plain scalars, `>-` folded scalars, column-0 sequences —
and `figure`, `before` and `after` are the keys whose indented `key: value`
lines are read as a mapping (`before` and `after` admitted by kogaki#1413,
each line one reader dimension). Admitting the nesting by *shape* was declined: it would silently
retype every field whose folded prose happens to begin a line with a word and
a colon.

**The form renders LAST and only when present**, in the **kind's** role order
rather than the order the owner typed. Both halves are load-bearing: rendering
last is what makes a formless record byte-identical to what it has always been,
and rendering in the kind's order is what stops two records of one kind
differing only in typing order. **Nothing about INDEX changes** — its two
columns are `id` and `technique`, so a form reaches no row.

`necessity:` a closed set whose closure is the whole of its value, one optional
field stated as the single exception to §4.2's "nothing added", and a validation
scoped to three mechanical facts with the wording judgment left explicitly
where §6.9 already put it. The plural-role decision and the by-name nesting are
both selections whose declined arm is recoverable from nothing else.

### 6.9.4 `move-sources-derivation-vehicle` — REOPENED

    deferred-slot: move-sources-derivation-vehicle
    status: REOPENED (kogaki#548, 2026-08-19)

**The successor position.** A Move's `evidence` holds **source text only** —
the work this Move came from and where the Passage sits, never a quotation
(§4.2, kogaki#1175 — the field renamed from `excerpt`, its provenance role
unchanged). `git log moves/<id>.yaml` is the audit trail for when and from what
batch a Move was ingested. **No Source/Provenance schema distinction is
defined**, because nothing demands one.

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
**authored** into a proposal's own `evidence` and reaches disk through the
owner's acceptance like every other field. What was retired is a tool writing
into a record after acceptance; what remains is an author writing source
text.

**The carrier of ground 3 is mechanical:** `tools/move_ingest.py` asserts that
`save_accepted` writes every §4.2 field exactly as the owner accepted it.

`necessity:` a reopened slot with its successor position, and one general rule
— nothing changes between acceptance and write — whose violation is invisible
in the artifact, since the mutated record is well-formed.

## 7. The Move library

`moves/` and `moves/INDEX.md` are admitted. Moves are **source-specific
precedents**. `status` — and with it the `observed` → `generalized` →
`proposed` → `validated` promotion chain — is retired (§4.2, kogaki#1175): a
record carries no claim about its own generality, and none is inferred from
its presence in the library.

`necessity:` a field withdrawn because the Corpus gave no ground for the
promotion it licensed — no Extraction in the derivation run made a generality
claim distinct from what `before`/`after` already state.

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
the article's own materials each Leg's rationale tied to, read **across** runs —
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
- **`before`/`after` matching is judgment-class.** It is surfaced as gate
  evidence (§6) and **never type-checked**. **No machinery renders a verdict on
  whether a Move's `before` is met** — §4.12.2's verdict is the composing
  sitting's, validated by the runtime and composed by it never.
- **The describe-never-generate boundary of §4 is untouched** by the library's
  admission.

**Mechanical kills are enumerated rather than capped at one.** A Move-less Leg
is unwritable (§4.1); a dangling move id refuses at adoption and at `resolve`
(§4.12.1); a specialization record that is absent, mis-shaped or non-passing
refuses at adoption (§4.12.2). Pin resolution remains the sole mechanical
instrument **on grounding**, which is a narrower claim than being the sole
mechanical kill.

`necessity:` a list of things that must not be built, plus the boundary between
what a runtime may kill on and what it may not judge. Every member's violation
is the *existence* of machinery, which only prose can forbid.

### 7.6 The ~20 derived Moves — retired (kogaki#1175)

**Historical.** Roughly twenty Moves were derived in the 2026-08-06
consultation and entered under the eight-field schema this section used to
describe. **All 22 records that grew from them were retired in full on
2026-09-23** (kogaki#1175, owner ruling): they were extracted from the same
sections of the reference work the Corpus extracts, so each is superseded by
an Extraction of the same text under the rebuilt schema, and their existence was
not a reason to keep them. They carry no schema-date marker because none is
needed for a retired record — git history is the retention. kogaki#177's
excerpt-backfill question is moot: there is no `excerpt` field to backfill
(§4.2), and no retired record to backfill it on.

`necessity:` a section kept as a pointer into history rather than deleted,
because the commits it describes are still the library's only precedent for
"~20 Moves entered together and were later retired in one act."

## 8. The Japanese realization — evaluation classes, the Terminology List
   Decision, and versioning

**A Japanese realization is a second realization of the SAME Brief Legs,
from the SAME Packet plus one added language block — never a translation of
the reviewed English CanonicalDraft** (the owner's ruling, 2026-09-19 and
2026-09-20, kogaki#1158). The owner's stated ground: translating from the
*reviewed* English Draft would make the later Reverse Outlining evaluation
target expand implicitly to cover two transformations at once — the original
English Draft's own generation and the translation — and the owner wanted to
avoid that coupling. `src/draft.mjs`'s `--lang` renders the language block
into every Leg's Packet and realizes each Leg exactly as the English track
does (§4's Leg-Move instantiation contract, §5's Brief's centre — both
unchanged), writing `theses/<slug>/draft.<lang>.md` (SPEC-draft-command §1's
reconciliation).

### 8.1 Three evaluation classes, each with its own judge

**Round Trip.** `src/review-draft.mjs`, entirely unchanged machinery,
`src/review-items.json` untouched: the same Reverse Outline / Round Trip
comparison the English track runs, over the Japanese Packet and the Japanese
prose it produced.

**Lint.** `src/lint-ja.mjs`, deterministic, no model invoked. Term/prh
conformance and the technical-writing preset's register rules run through
**textlint** (kogaki#1162 — `textlint`, `textlint-rule-preset-ja-technical-writing`
and `textlint-rule-prh` are dependencies of this repository, declared in
`package.json` and installed from the committed `package-lock.json`, with
`.textlintrc.json` at the repository root enabling the preset and pointing
`prh` at `terms/prh.yml`), replacing the native pattern match kogaki#1159
shipped in the same file's place. textlint's Markdown parser checks text
nodes only, so code fences, inline code and link targets are outside the
term and register scan by construction. `src/lint-ja.mjs fix` runs
textlint's fixer wired to ONLY the `prh` rule, so a mechanical correction
replaces exact surface forms and never auto-fixes a preset finding. Also
run, natively (neither is a textlint rule's job): structure identity against
the Brief (realized in practice as identity against the sibling English
CanonicalDraft's Section-heading, code-fence and link counts — both realize
the same Brief structure), a language-confusion detector, and staleness.
Every deviation is named with its Leg, and every textlint-sourced deviation
is also named with its rule id.

**Fluency read.** `theses/<slug>/fluency-notes.md`, read into every Japanese
realization and every bounded correction as a read-only reference note.
**No model evaluator exists for it, and none is added by this issue: nothing
anywhere in this pipeline scores naturalness.** The owner's ground: fluency
"clearly departs from Reverse Outlining in the same way the original Cold
Reading did" (§0's Cold Reading precedent, retired from Round Trip at
kogaki#1133) — a criterion that measures something Reverse Outlining's
reconstruction cannot see is a *different* evaluation act, not a weaker
version of the same one, and the three classes are kept explicit and
separate rather than folded together.

### 8.2 The Terminology List Decision

**`terms/prh.yml` is the ONE repository-wide term carrier.** For each
concept: the prescribed Japanese form, its forbidden variants (leaked
English, a katakana variant, a notation variant), and a note. It is used
TWICE — rendered into the language block at generation, and run as the Lint
after — and **nowhere else**: no second Japanese term list, no per-Brief or
per-Section override of it. **Two carriers for two constraints** (kogaki#1331):
`terms/prh.yml` governs a term's Japanese **surface form**, and the Brief's
`defined_terms` (§5.1) governs its **sense** — which words this article gives
a meaning to, and so which must be introduced before a Leg may use them.
Neither stands in for the other, and the per-Brief list is not an override of
this one: it names no Japanese form at all.

**THE GROUND FOR LINT BEFORE ROUND TRIP.** A term-list deviation is a
surface-form defect a deterministic pass names for free; spending a Round
Trip's model judgment on prose the Lint would have refused anyway is a
judgment call paid for a defect that needed none. So Lint runs first, and
`src/review-draft.mjs` refuses to start on a Japanese Draft whose
`terms_sha_at_lint` does not match the current list's hash — the mechanical
enforcement of the ordering, not merely an instruction about it.

**A term-list change is a CORRECTION, never a regeneration.** The owner does
not require the Draft to be uniquely reproducible ("I do not require the
Draft to be uniquely reproducible"), so a moved list does not obligate
re-deriving the whole Draft from it: only the Legs the Lint names, by Leg
id, are corrected, on the ordinary Leg re-realization path. `src/draft.mjs`
offers no distinct "regenerate this Leg because of a term change" shortcut —
there is exactly one path from a Packet to a realized Leg, used for every
reason a Leg is (re-)realized.

### 8.2.1 The term-list change path (kogaki#1165)

**`src/lint-ja.mjs correct-terms --draft <draft.ja.md>`** is the act 8.2's
decision names and that carried no act until this issue (kogaki#1160
acceptance item 3). It runs in two ordered steps:

1. **The mechanical fix runs first** (kogaki#1162's `fixPrhOnly`, wired to
   the `prh` rule alone). A deviation textlint's fixer can rewrite is gone
   before the next step ever names a Leg for it, so it is never spent on a
   model correction.
2. **The Lint runs over the fixed Draft**, and every Leg its findings still
   name — unique, sorted, excluding an unattributed finding such as a
   structure-identity or missing-sibling defect, which names no Leg to
   correct — is reported. **Nothing else in this pass names them.**

If Lint names no Leg after the mechanical fix, `correct-terms` reports it
had nothing to correct and stops: **no model is invoked**, and a Draft that
needed no correction is left byte-identical.

If Lint names one or more Legs, `correct-terms` reports them and hands off
to **`src/review-draft.mjs open --draft <draft.ja.md> --only-legs
<id[,id...]>`** — the Round Trip's own entry point, scoped. `--only-legs`
filters `run.legs` (and the `sections` derived from it) to exactly the
named Legs at `open`, and every later act — `outline`, `compare`, `correct`,
`check`, `close` — decides which Legs it reviews from `run.legs` alone, so
this one filter is the whole of the scoping: **a Leg not named is never
re-outlined, never re-compared, and never re-realized.** `open`'s ordinary
freshness precondition (§8.3) is skipped for a scoped `open` — the whole
reason the path exists is to correct a Draft `terms_sha_at_lint` calls stale,
and the ordinary gate would refuse to let that correction start. The
correction itself runs on the Round Trip's own correction path (the ordinary
Leg re-realization path 8.2 names), unchanged.

**WHAT THE SCOPE DOES NOT NARROW: the article the Blind Reader is shown.**
`run.legs` answers *which Legs this run reviews*; the "article before this
passage" block answers *what the reader has read by the time they meet it*,
and that is a property of the **Draft**, not of this run's scope. So it is
built from the whole trace even under `--only-legs`, exactly as `outline` and
pass two's re-render already build it. A scoped run whose first named Leg is
not the Draft's first Leg would otherwise hand the reader an article that
begins there — false, and withholding the prose the passage was written to
follow. The distinction is why the two are read from different places rather
than from one convenient array (PR #1169 round 1).

**No flag on this path offers a whole-Draft re-derivation.** `--regenerate`
exists on both `correct-terms` and `open` as a NAMED refusal: it fails,
citing this Terminology List Decision by name, rather than reading as an
ordinary unknown flag. This is 8.2's own "no distinct regenerate shortcut"
restated as an enforced refusal rather than an absence a session could
mistake for an oversight.

### 8.3 The versioning rule

**Conformance is decided by the Lint against the CURRENT term list, never by
what constrained generation.** `terms_sha_at_generation` is a birth record
only — the sha the language block was rendered against — and carries no
authority over whether the Draft conforms now. `terms_sha_at_lint` is what
`src/review-draft.mjs`'s precondition reads, and the Lint always recomputes
it against `terms/prh.yml` as it stands at lint time, regardless of the
generation-time value. This is what collapses versioning to one question:
not "was this Draft generated against a current list" but "does the Lint,
run now, pass now."

`necessity:` an evaluation model and a versioning rule that no code carries as
a stated design: the code enforces the Lint-before-Round-Trip ordering and the
current-list comparison, but nothing in the tree states the ground for either
choice, and a reader meeting the refusal without this section has no way to
tell a deliberate ordering from an arbitrary one.

## 9. Non-goals

Not in this pipeline: a Probe successor; mechanical evidence resolution;
automatic `before`/`after` judgment; a closed structure vocabulary or
framework menu; adjacency data in any form; a second Register artifact.

`necessity:` an enumeration of what was decided against. Absence of code is not
evidence of a decision, and each of these has been proposed at least once.

## 10. Open, with triggers

- **`bridge-approval-shape`** (§4.11) — per-Bridge approval, if dogfooding
  shows bridges misbehaving. **Still open after kogaki#864**, which RATIFIED a
  post-hoc disclosure surface — carrier kogaki#866, still owed — and did not
  touch this trigger.
- **`specialization-judgment-and-path-review-ordering`** (§4.12) — where the
  judgment point sits relative to Path Review's own pass.
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
