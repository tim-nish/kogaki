---
name: review-draft
description: Review a CanonicalDraft against the Packets that produced it. Use when the owner wants a finished Draft checked — "review the draft", "run /review-draft", "check the draft for <slug>". Reads the Draft, its frontmatter trace and the Packets that trace names, and nothing else — no Brief, no Move file, no Strand. Runs to completion: the run ends when theses/<slug>/review.md exists, after at most two passes, and finishes with residue rather than reaching for a third.
---

# ReviewDraft — invoking the Harness

ReviewDraft is **Reverse Outlining**, the established writing practice, made
mechanical. After the article is drafted, a reader who has not seen the plan
writes the outline the prose actually carries — in the same form as the forward
outline — and the two are compared entry by entry.

Four terms, and the whole of this instrument is said in them:

| term | what it names |
|---|---|
| **Reverse Outlining** | the method: read the finished prose, write the outline it would have been written from |
| **Reverse Outline** | the artifact that reading produces — a Brief Step block, in the Brief's own field names |
| **Forward Artifact** | the original Brief Step, which is what the article was actually written from |
| **Round Trip** | the comparison of the Forward Artifact with the Reverse Outline, entry by entry |

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/review-draft.mjs`), the same ruling
`.claude/skills/draft/SKILL.md` records for /draft: `outline` refuses a Step
whose Reverse Outline input it did not render, `compare` refuses while any Step
outline, Section entry or the cold reader's final claim is missing, `check`
refuses before `compare`, `compare` refuses once a correction has landed (pass
one is over, and re-rendering its join inputs from the corrected article would
lose the reading its verdicts were given on), and `close` is reachable from
`compare` with zero fails or from `check` in every state. A session does not
sequence those acts and cannot get the sequence wrong.

## The closed input set

The Harness reads `theses/<slug>/draft.md`, its frontmatter trace — which
carries each Step's line range and its Packet's path and sha, and for a Step
carrying a figure its record's path, sha and own line range — and the files that
trace names: the Packets, and each figure record. **It reads no Brief, no Move
file and no Strand**, by the owner's 2026-09-04 ruling: the Packet was designed
to be the only source a Step needs, so a check that turns out to need anything
else is evidence the **Packet** is missing information. File that against
`src/packet-template.md`; never satisfy it with a side read here.

## Entry points

    node src/review-draft.mjs open    --draft <draft.md>
    node src/review-draft.mjs outline --draft <draft.md> --step <id> --file <outline.md>
    node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <entry.json>
    node src/review-draft.mjs read    --draft <draft.md> --claim --file <claim.json>
    node src/review-draft.mjs compare --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs correct --draft <draft.md> --step <id> [--file <prose>]
    node src/review-draft.mjs correct --draft <draft.md> --step <id> --figure [--file <record.json>]
    node src/review-draft.mjs check   --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs close   --draft <draft.md>

`open` verifies the inputs, opens `runs/review/<slug>/` and renders both the
first Reverse Outline input and the cold reader's whole input. `outline` records
one Reverse Outline and renders the next. `read` records the cold reader's entry
for one Section, or with `--claim` the one final claim for the whole Draft, and
validates each against what `src/review-items.json` declares. `compare` runs the
Round Trip. `correct` renders a correction input and records the re-realized
Step; with `--figure` the seat it corrects is the Step's figure RECORD rather
than its prose. `check` runs the bounded second pass. `close` writes the owner
record.

## The models, and where each is pinned

**Every spawn this skill makes pins `--model` explicitly.** Never inherit the
interactive default — the owner's 2026-08-05 ruling — and the reason is sharper
here than elsewhere: a ReviewDraft run is over a hundred model calls, and the
two kinds are not close in what they cost or in what they need. The pins, per
role:

| role | model | why this one |
|---|---|---|
| pair judgments — one join Packet each, `compare` and `check` | `claude-haiku-4-5-20251001` | one pair, one fixed question from `src/review-items.json`, an answer from a closed three plus one sentence. Fixed form, no prose, no evidence written |
| Section judgments — the cold reader's ledger against the trace | `claude-haiku-4-5-20251001` | the same form one level up: one declared side, one reverse side, the same three tokens |
| Reverse Outlining — `outline` | `claude-opus-5` | it writes the artifact the whole Round Trip is then run against; a weak Reverse Outline makes every pair downstream of it measure the outline instead of the Draft |
| the cold read — `read` | `claude-opus-5` | it reads the article as a reader and writes what it believes, which is prose about prose |
| corrections — `correct`, passage and `--figure` alike | `claude-opus-5` | it re-realizes a Step, or re-designs a figure record, against everything that must go on holding |

**The split is by what the call produces, not by how hard it looks.** The
judgments answer a fixed question and write a token; the Reverse Outlines, the
cold read and the corrections write the evidence and the prose the rest of the
run is judged against. The first kind is the bulk of the calls and the cheap
half; the second is where a weaker model costs the run its meaning.

**The Harness names no model of its own, and verifies none.** It invokes no
judge, so a pin is something you DECLARE — the same reading terrain's judge pin
carries. What the Harness does is **record what served**: every verdict is
`{step_id, item, pair?, verdict, reason, model}` and one with no `model` is
**refused by name**, the id rides both the verdict and the `model_calls` log in
`join.json` and `check.json`, and each pass emits

    judged by DECLARED model(s) — <ids>; the Harness invoked no model and verified none.

So a pass that answered its pair judgments on the pinned Haiku and its
corrections on the stronger model reads as two ids, which is the intended split;
a **third** id, or the interactive default, is a pin that slipped, and the line
is where that becomes visible.

**The row-level key answers "was a model asked here", and the per-pair one
answers "by what".** A row the Harness decided alone carries **no `model` key at
all** — no call was made, and writing one would claim a call that never
happened. A row with any judged pair carries the key, and its value is the
**chosen** pair's, which is `null` where a Harness-decided pair won the
selection: a hybrid item like `grounds` can render a mechanical `widened` fail
out of a row whose other pairs a model answered. The truth per pair is always in
`pairs`.

## The workspace is split by pass, and every pass's evidence survives

The layout is the Harness's contract, not a convention:

    runs/review/<slug>/pass-1/{outline-input,outline,join,comparison,ledger,
                               corrections,cold-reader.md,join.json}
    runs/review/<slug>/pass-2/{outline-input,outline,join,comparison,check.json}
    runs/review/<slug>/snapshots/     before/after per corrected Step
    runs/review/<slug>/run.json

`outline-input/<step>.md` is what the Blind Reader was handed;
`outline/<step>.md` is the Reverse Outline exactly as it was written, and
`outline/<step>.json` the same reading under the Brief's field names, which is
what the Round Trip compares. A Step whose reader met a figure also has
`outline/<step>.figure.json`.

**A pass writes only under its own directory, and a write that would land on a
file another pass wrote is refused by name.** Until this, pass two re-read the
corrected Steps blind and wrote its inputs and outlines at pass one's paths, so
pass one's reading of the ORIGINAL Draft was overwritten in place — and `runs/`
is gitignored, so nothing else held a copy. The surviving verdicts pointed at
readings that no longer existed. A rule saying "do not overwrite" would be prose
where a refusal belongs.

**`comparison/` is the readable half of `join.json`, and the Harness writes it.**
One file per Step plus `comparison/sections.md`, written at the moment each pass
completes. Every line is one pair and carries the item, its class, its mode, the
verdict, the span, who decided it — a model id, or the Harness — the join Packet
the verdict was given on, and the **consequence in words**:

    - reader-state-after | preserved | judged | fails | lines 12-18 |
      decided by <model id> | sent to correction |
      packet: pass-1/join/s2.reader-state-after.md | <the reason, verbatim>

The four consequence words are a closed set — `sent to correction`, `reported
only`, `carried from pass one`, `decided without a model call` — and a
Harness-decided line says so where the Packet pointer goes, naming the pass's
join record as the place that says how it was decided instead.

**Why it exists.** The surface a person debugs from mid-run was the verdicts file
they handed in, which carries the model's answer and nothing about what the
answer means: not the item's class, and not whether the fail sends the Step to
correction, rides along, or is reported only. Reading `pass-1/verdicts/s1.json`
alone it was impossible to tell why a Step with three fails was never corrected —
all three were best-effort, and no surface said so. While the best-effort class
exists, a file recording both the answer and its consequence is mandatory, and it
is the Harness that writes it.

A Section line's consequence is its **route's**, never its class's: ReviewDraft
corrects at Step granularity only, so a preserved Section fail sends nothing to
correction by itself — it localizes onto a Step, or it reaches the owner with no
target at all, and `comparison/sections.md` ends with where each fail was routed
and why. Pass two re-judges no Section pair, so its `sections.md` is pass one's,
carried, and every line of it says so.

`snapshots/` and `run.json` stay at the root: a snapshot pair spans the
correction that separates two passes, and the run record is the one file every
pass writes. **The correction inputs are pass one's** — `correct` only ever
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction. A later third pass is
`pass-3/` and nothing else moves.

`review.md` points at both pass directories, and every finding and residue line
carries the artefacts behind it: the Reverse Outline the run actually read for
that line (pass one's for a carried line, and for a successor Step's continuity
item judged in pass two, since pass two re-reads only corrected Steps), and the
pair input the judge was handed — or, for a line the Harness decided, a
statement that no Packet was rendered and a pointer at the pass's join record
instead. Every pointer names a file the run wrote.

## The reviewed Draft has its own filename

`close` writes the corrected article to **`theses/<slug>/draft.reviewed.md`**
and restores **`theses/<slug>/draft.md`** to the Draft the run actually read, so
the Draft is byte-identical before and after a run and the diff between the two
files is the review. `review.md` names both. Corrections still land on `draft.md`
while the run is live — the realization lane emits there, which is what makes
each later correction's "article so far" current — so `close` is the act that
ends a run, and **a second `close` over a restored run refuses**: running it
again would copy the restored original back over the reviewed Draft.

## The Round Trip, and what the judging model is not asked

`compare` runs in two phases and the Harness owns both. The first decides every
**mechanical** item — string facts about the Draft and its Packets, no model
call — and renders **one join Packet per judged pair**, each carrying the
declared line, the outlined line, the quoted prose and **one** question. The
second records the answers with `--verdicts` and emits the comparison.

**A judged item whose DECLARED side is empty is decided by the Harness too, and
costs no call.** Where the Packet renders a stated absence — no grounds, no
`introduces` — the item's own table row declares the answer and its sentence, so
nothing is rendered and no model is asked a question quantifying over nothing.
The answer is a fact about the declared side rather than a reading of the prose,
which is why it is the table's to state and not the runtime's to decide; an item
that declares no such arm is still judged on an empty side, because whether the
absence settles the question is per item.

**The item table is `src/review-items.json` and it is fixed in the Harness.**
Which Packet information must be reconstructible is decided there, per item
class, and so is what a `fails` costs: a **preserved** item failing sends its
Step to correction, a **best-effort** one rides along if that Step is
re-realized anyway. **The model never assigns severity** — it sees one pair,
answers one question, and returns one of `holds`, `fails`, `cannot-decide` plus
one sentence. It never sees two pairs at once, so it cannot rank them.

`cannot-decide` is a third answer and is **never rounded**; it is listed with its
pair so a person can look. There are no scores, no ranking and no aggregate, and
the emission holds that mechanically: **a comparison line renders line numbers
and nothing else numeric**, so quoted material is carried as the finding's
*evidence* in the join record and the owner record rather than in the line. A
recorded reason carrying a digit is refused.

`compare` emits one line per (Step, item) **only once every pair is answered**.
There is no fourth token for "not asked yet", and an unfilled join says it is
unfilled rather than rendering an empty findings list; `close` refuses over one.

A Packet block the Round Trip needs and a Packet does not carry is a **Packet
gap**: it refuses by name and is filed against `src/packet-template.md`, never
satisfied by a side read.

## The figure's own Round Trip

**A figure is written from its RECORD, so it gets its own Reverse Outline in the
record's own field names.** That is the same rule the passage half runs under,
one artifact down: a passage is written from a Brief Step and its Reverse
Outline is a Brief Step block, so a figure's is a block in the fields
`src/figure-schema.json` declares. There is no second schema at either level.

**It is its own fence and its own file.** `figure` IS a Brief Step field, and it
is declared not reconstructible — a reader cannot read the Brief's figure
decision off a rendered block — so a `figure:` line inside the Reverse Outline
stays refused. What the reader CAN do is say what they met, and that is an
answer about a different artifact with a different field list. Filing it as one
is what keeps either reading from acquiring a key belonging to the other.

**The disposition rule is the same rule.** Reconstructible is "a reader who met
the rendered block could say this":

| field | disposition | why |
|---|---|---|
| `element` | reconstructible, compared | the reader can name what is on the page |
| `caption` | reconstructible, compared | what they hold after looking is what a caption is for |
| `position` | reconstructible, compared | they met the block above the passage or below it |
| `kind` | **refused** | the kind is the Move FORM's, and a reader cannot infer the form a structure was produced from — the ruling that keeps `move` out of the passage's outline |
| `relations` | **refused** | the relation a form holds between its roles belongs to the form, read out of `src/figure-kinds.json` |
| `emphasis` | **refused** | which element the figure leans on is recorded beside the block; a rendering does not ask its reader to separate that out |

A refused field is **refused rather than merely dropped**, for the reason the
passage half gives: an unasked field a reader supplies anyway is an inference
that reaches the comparison. The refusal lives in the parser and **is not
rendered into the input** — this table is the record of the disposition, not a
description of a section the reader meets.

**A Step whose trace carries a figure gains five rows** — the record's elements
against the ones the reader could name, its caption against what the reader
holds and the Step's `reader_state_after`, each element's wording against the
ground its `g<n>` address points at, the figure's reading against the passage's
prose, and the position the record declares against where the reader met the
block. Three are preserved and two best-effort, same three verdicts, same
consequence rule. **A Step with no figure runs none of them** — not as a vacuous
`holds` but not at all, so a figureless Draft's log carries no figure item
anywhere, and a figure block filed for such a Step is refused as an invention.

**The element-to-ground row is the Harness's alone.** Containment against the
ground the record's address names, above a declared floor: no model call and no
join Packet, and a fail is what sends the Step to `correct --figure`. It does
**not** re-check the binding — §4.17 already refuses a record that moves a role
to a ground the Brief did not bind it to — it asks whether the wording the
element finally got is carried by the material it was licensed from, which is
the one question nothing before the Round Trip can ask.

## The correction path, and what a corrected Step receives

A corrected Step is realized from a **freshly rendered Packet**, never from the
Packet that produced the failing prose. `correct` re-renders it against the
Draft **as it now stands**, so the "article so far" block carries the current
preceding prose — including Steps corrected earlier in the same pass — and the
reader-knowledge ledger and Section block come with it. That block is the
continuity mechanism, and rendering fresh is what keeps a corrected Step
continuous with the article rather than drifting toward being self-contained.

`correct` runs in two phases, like `compare`. With no `--file` it renders the
input: the fresh Packet with **one Correction block** appended after the write
instruction, carrying the previous realization verbatim, the findings that
failed with their pairs and spans, the items that **held** as what the correction
must not break, and the instruction to change what the findings name and nothing
else. With `--file` it records the prose through the realization lane, so the
Draft is re-assembled by the same code that wrote it, and snapshots land in the
review workspace. Its input is filed under `pass-1/corrections/`, beside the
verdicts that sent the Step there.

**A figure fail routes to `correct --figure`, and that is a different act.** What
comes back is a JSON record, not prose: the input carries the Step's Packet as it
now stands, the passage, the block as the reader currently meets it, the previous
record verbatim, what failed and what must go on holding. Recording it hands the
record to `draft.mjs figure`, which re-validates it against
`src/figure-schema.json` and the Move's own form, and to `emit`, which renders
the block from it — **you write no markup**, so a syntax defect in a corrected
figure stays a defect of `src/render-figure.mjs` rather than of the sitting that
corrected it. A Step owing both corrections takes the **passage first**: the
record's caption is stated in what the reader holds after reading that passage,
so a record corrected against prose about to change is corrected against nothing.
`correct` on a Step whose only preserved fails are the figure's refuses by naming
the other seat.

**Corrections run in path order** and a Step out of order refuses — each later one
must see the earlier ones in its own "article so far". Between the render and the
recording the run is **mid-correction** on that Step and every other act refuses
by name; the act that ends it is `correct --file`.

**Drift is reported and never gated.** Per corrected Step the Harness states the
share of sentences changed against the previous realization and the verbatim
overlap with the Packet's ground and state lines, and both reach `review.md`. A
high change share is what the owner reads as the Step becoming self-contained; it
is information, not a refusal.

`check` is pass two and is **bounded**: it re-runs Reverse Outlining for the
corrected Steps, then re-judges their own failed and held preserved items, the
continuity item on each corrected Step's successor, and every mechanical item
over the whole Draft. Every other pair is **carried** from pass one, marked as
carried, at no model call. The bound is recorded in `check.json` rather than only
applied. Pass two answers its own owed pairs through `check --verdicts`, never
`compare`'s. A preserved item still failing after it is **residue**.

## The two readers, and why each is blind to something

**The Blind Reader has never seen the Brief.** It reads the article before one
passage, then that passage, and writes the **Reverse Outline** — the outline
entry it believes the passage was written from, in the Brief's own Step form. An
outline that agrees with the Brief because it guessed at the Brief measures
nothing, which is why the Harness renders prose alone — it carries no thesis, no
grounds, no Move, no reader states and no term list — and refuses an outline for
a Step whose input it did not render.

**The input is fixed, and it is fixed by what a reader can have (kogaki#1099).**
It carries the passage, the article before it, the seven fields with their
definitions, the reader's role and constraints, and the answer form — and
nothing else. In particular it names none of the fields the parser refuses, and
it carries no filing command: naming a field a reader has never heard of creates
the knowledge it withholds, and the command is an instruction to the session
rather than to the reader. The refusal it used to announce is the parser's and
works without the announcement.

**And it sees the figure the reader saw.** For a Step whose trace carries one,
the Reverse Outline input quotes the rendered block — the fence and the caption,
sliced from the Draft at the range the trace records, with its own line numbers,
on the side of the passage the reader met it on — and nothing from the figure
record: no role binding, no ground address, no relation list.

**There is no template file and no second schema.** The input is composed from
the Brief's own field declaration, because there is no second artifact to
describe: the reader fills a fenced `step` block. It is asked for `purpose`,
`reader_state_before`, `reader_state_after`, the `ground ` lines, `introduces`,
`opens_section` and `concession` — the Brief's fields with the Brief's
definitions — and the count in its instruction is computed from that declaration
rather than spelled, so a field joining it cannot leave the sentence saying the
old number. `introduces`, `opens_section` and `concession` are each legitimately
absent; `grounds` is not, because a passage that asserts nothing is not a
passage.

`concession` is the one field that is not a Brief field, and it is declared as
such rather than smuggled in: the Packet's write instruction requires a loss to
be conceded in the prose, so a conceded softening is told from a silent one.

**The block is validated by the Brief's own parser**, `parseStepBlock` — the
function `parseBrief` calls per fenced block — so a Reverse Outline the Brief
could not carry is refused by the code that would refuse it inside a Brief, and
every refusal names what it saw. `move`, `materials`, `rationale`, `depends_on`,
`bridges` and `figure` are declared **not reconstructible** and are **refused
rather than dropped**: a field the reader could not have read off the passage is
an inference, and dropping it silently would leave the inference having steered
the rest of the outline with no trace. The declaration is the parser's refusal
list and **nothing renders it** — the input does not tell the reader which
fields it would refuse, because a reader who has not heard of them cannot supply
one.

**The cold reader reads the body only** — no frontmatter, no trace, no Packet,
and no Step boundary marked — and writes, after each Section, the question it
answered and what they now believe, then one final claim for the whole article.
Its input is `src/cold-reader-template.md`, rendered whole at `open`.

**It answers in the Brief's own top-level field names** — `opening_question` and
`reader_target` per Section, and `thesis` once at the end. They were `question`,
`belief` and `claim`: a third vocabulary for what the plan already names, which
is the same drift one carrier over as the deleted second schema. The reader is
not shown the plan and does not need it — each name says in plain words what to
write — and sharing the names is what lets the answer be laid beside the plan's
without a third vocabulary in between.

The Harness pairs those entries with what the trace and the Packets declare: the
heading against the reader's question, the `reader_target` at a Section's end
against its last Step's `reader_state_after`, the one it arrived with against the
first Step's `reader_state_before`, the `thesis` against the declared thesis, and
what the first Section did with the opening question. The pairs and their classes
are `sections` in `src/review-items.json`.

**A Section fail is routed, never corrected.** ReviewDraft corrects at Step
granularity only, so a Section finding goes one of three ways. It **localizes**
to a Step — one in the Section already fails a preserved item, or its outlined
reader state is the first to fail — and that Step becomes the correction target.
Or every Step in the Section holds and the Section still fails, in which case the
**grouping** is what is wrong: the heading promises what the Steps it groups do
not deliver, which is a **Brief** defect, reaching the owner record as residue
marked `upstream: brief` with **no correction run**. Or a Step carries a
`cannot-decide`, which satisfies neither — no Step fails, and not every Step
holds — and the Section routes **`undecided`**, naming the unsettled Steps. That
is residue too, with no correction and no claim that the Brief is at fault:
settle those pairs and re-run. `cannot-decide` is not rounded into either
neighbour here, for the reason it is not rounded at a pair.

## The owner record

`theses/<slug>/review.md`, one per Draft, overwritten on re-run, headed by the
Draft's body sha and the Packet shas it was reviewed against. It lists the
findings, the corrections, and the **residue** — what survived every pass. Each
residue line carries an empty `classified:` field for the owner to fill with
`packet` or `reviewdraft`. **The tool never fills it**: what a surviving item is
evidence about is the judgment the two-pass bound exists to hand over.

Run `node src/review-draft.mjs` with no arguments for the current usage; that
output is the Harness's own and is never restated here.
