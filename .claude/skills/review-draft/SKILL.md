---
name: review-draft
description: Review a CanonicalDraft against the Packets that produced it. Use when the owner wants a finished Draft checked — "review the draft", "run /review-draft", "check the draft for <slug>". Reads the Draft, its frontmatter trace and the Packets that trace names, and nothing else — no Brief, no Move file, no Strand. Runs to completion: the run ends when theses/<slug>/review.md exists, after at most two passes, and finishes with residue rather than reaching for a third.
---

# ReviewDraft — invoking the Harness

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/review-draft.mjs`), the same ruling
`.claude/skills/draft/SKILL.md` records for /draft: `recover` refuses a Step
whose recovery input it did not render, `compare` refuses while any Step
recovery, Section entry or the cold reader's final claim is missing, `check`
refuses before `compare`, and `close` is
reachable from `compare` with zero fails or from `check` in every state. A
session does not sequence those acts and cannot get the sequence wrong.

## The closed input set

The Harness reads `theses/<slug>/draft.md`, its frontmatter trace — which
carries each Step's line range and its Packet's path and sha, and for a Step
carrying a figure its record's path, sha and own line range — and the files that
trace names: the Packets, and each figure record. **It reads no Brief, no Move file and no Strand**, by
the owner's 2026-09-04 ruling: the Packet was designed to be the only source a
Step needs, so a check that turns out to need anything else is evidence the
**Packet** is missing information. File that against `src/packet-template.md`;
never satisfy it with a side read here.

## Entry points

    node src/review-draft.mjs open    --draft <draft.md>
    node src/review-draft.mjs recover --draft <draft.md> --step <id> --file <recovered>
    node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <entry.json>
    node src/review-draft.mjs read    --draft <draft.md> --claim --file <claim.json>
    node src/review-draft.mjs compare --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs correct --draft <draft.md> --step <id> [--file <prose>]
    node src/review-draft.mjs correct --draft <draft.md> --step <id> --figure [--file <record.json>]
    node src/review-draft.mjs check   --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs close   --draft <draft.md>

`open` verifies the inputs, opens `runs/review/<slug>/` and renders both the
first recovery input and the cold reader's whole input. `recover` records one
blind recovery and renders the next. `read` records the cold reader's entry for
one Section, or with `--claim` the one final claim for the whole Draft, and
validates each against the shape `src/review-items.json` declares. `compare`
runs the join.
`correct` renders a correction input and records the re-realized Step; with
`--figure` the seat it corrects is the Step's figure RECORD rather than its
prose. `check` runs the bounded second pass. `close` writes the owner record.

## The models, and where each is pinned

**Every spawn this skill makes pins `--model` explicitly.** Never inherit the
interactive default — the owner's 2026-08-05 ruling — and the reason is
sharper here than elsewhere: a ReviewDraft run is over a hundred model calls,
and the two kinds are not close in what they cost or in what they need. The
pins, per role:

| role | model | why this one |
|---|---|---|
| pair judgments — one join Packet each, `compare` and `check` | `claude-haiku-4-5-20251001` | one pair, one fixed question from `src/review-items.json`, an answer from a closed three plus one sentence. Fixed shape, no prose, no evidence written |
| Section judgments — the cold reader's ledger against the trace | `claude-haiku-4-5-20251001` | the same shape one level up: one declared side, one recovered side, the same three tokens |
| blind recoveries — `recover` | `claude-opus-5` | it writes the record the whole comparison is then run against; a weak recovery makes every pair downstream of it measure the recovery instead of the Draft |
| the cold read — `read` | `claude-opus-5` | it reads the article as a reader and writes what it believes, which is prose about prose |
| corrections — `correct`, passage and `--figure` alike | `claude-opus-5` | it re-realizes a Step, or re-designs a figure record, against everything that must go on holding |

**The split is by what the call produces, not by how hard it looks.** The
judgments answer a fixed question and write a token; the recoveries, the cold
read and the corrections write the evidence and the prose the rest of the run
is judged against. The first kind is the bulk of the calls and the cheap half;
the second is where a weaker model costs the run its meaning.

**The Harness names no model of its own, and verifies none.** It invokes no
judge, so a pin is something you DECLARE — the same reading terrain's judge pin
carries. What the Harness does is **record what served**: every verdict is
`{step_id, item, pair?, verdict, reason, model}` and one with no `model` is
**refused by name**, the id rides both the verdict and the `model_calls` log in
`join.json` and `check.json`, and each pass emits

    judged by DECLARED model(s) — <ids>; the Harness invoked no model and verified none.

So a pass that answered its pair judgments on the pinned Haiku and its
corrections on the stronger model reads as two ids, which is the intended
split; a **third** id, or the interactive default, is a pin that slipped, and
the line is where that becomes visible.

**The row-level key answers "was a model asked here", and the per-pair one
answers "by what".** A row the Harness decided alone carries **no `model` key
at all** — no call was made, and writing one would claim a call that never
happened. A row with any judged pair carries the key, and its value is the
**chosen** pair's, which is `null` where a Harness-decided pair won the
selection: a hybrid item like `grounds` can render a mechanical `widened` fail
out of a row whose other pairs a model answered. The truth per pair is always
in `pairs`.

## The workspace is split by pass, and every pass's evidence survives

The layout is the Harness's contract, not a convention:

    runs/review/<slug>/pass-1/{recovery,recovered,join,ledger,corrections,
                               cold-reader.md,join.json}
    runs/review/<slug>/pass-2/{recovery,recovered,join,check.json}
    runs/review/<slug>/snapshots/     before/after per corrected Step
    runs/review/<slug>/run.json

**A pass writes only under its own directory, and a write that would land on a
file another pass wrote is refused by name.** Until this, pass two re-read the
corrected Steps blind and wrote its inputs and records at pass one's paths, so
pass one's reading of the ORIGINAL Draft was overwritten in place — and `runs/`
is gitignored, so nothing else held a copy. The surviving verdicts pointed at
recovered records that no longer existed. A rule saying "do not overwrite" would
be prose where a refusal belongs.

`snapshots/` and `run.json` stay at the root: a snapshot pair spans the
correction that separates two passes, and the run record is the one file every
pass writes. **The correction inputs are pass one's** — `correct` only ever
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction. A later third pass is
`pass-3/` and nothing else moves.

`review.md` points at both pass directories, and every finding carries the two
artefacts behind it — the recovered record the blind reviewer wrote and the pair
input the judge was handed — so a reader goes from a finding to its evidence in
either pass.

## The reviewed Draft has its own filename

`close` writes the corrected article to **`theses/<slug>/draft.reviewed.md`**
and restores **`theses/<slug>/draft.md`** to the Draft the run actually read, so
the Draft is byte-identical before and after a run and the diff between the two
files is the review. `review.md` names both. Corrections still land on
`draft.md` while the run is live — the realization lane emits there, which is
what makes each later correction's "article so far" current — so `close` is the
act that ends a run, and **a second `close` over a restored run refuses**:
running it again would copy the restored original back over the reviewed Draft.

## The comparison, and what the judging model is not asked

`compare` runs in two phases and the Harness owns both. The first decides every
**mechanical** item — string facts about the Draft and its Packets, no model
call — and renders **one join Packet per judged pair**, each carrying the
declared line, the recovered line, the quoted prose and **one** question. The
second records the answers with `--verdicts` and emits the comparison.

**The figure joins the same table (kogaki#880).** A Step whose trace entry
carries a figure gains five rows — the record's elements against the ones the
reader could name, its caption against what the reader holds and the Step's
`reader_state_after`, each element's wording against the ground its `g<n>`
address points at, the figure's reading against the passage's prose, and the
position the record declares against where the reader met the block. Three are
preserved and two best-effort, same three verdicts, same consequence rule. **A
Step with no figure runs none of them** — not as a vacuous `holds` but not at
all, so a figureless Draft's log carries no figure item anywhere.

**The element-to-ground row is the Harness's alone.** Containment against the
ground the record's address names, above a declared floor: no model call and no
join Packet, and a fail is what sends the Step to `correct --figure`. It does
**not** re-check the binding — §4.17 already refuses a record that moves a role
to a ground the Brief did not bind it to — it asks whether the wording the
element finally got is carried by the material it was licensed from, which is
the one question nothing before the round trip can ask.

**The item table is `src/review-items.json` and it is fixed in the Harness.**
Which Packet information must be recoverable is decided there, per item class,
and so is what a `fails` costs: a **preserved** item failing sends its Step to
correction, a **best-effort** one rides along if that Step is re-realized
anyway. **The model never assigns severity** — it sees one pair, answers one
question, and returns one of `holds`, `fails`, `cannot-decide` plus one
sentence. It never sees two pairs at once, so it cannot rank them.

`cannot-decide` is a third answer and is **never rounded**; it is listed with
its pair so a person can look. There are no scores, no ranking and no aggregate,
and the emission holds that mechanically: **a comparison line renders line
numbers and nothing else numeric**, so quoted material is carried as the
finding's *evidence* in the join record and the owner record rather than in the
line. A recorded reason carrying a digit is refused.

`compare` emits one line per (Step, item) **only once every pair is answered**.
There is no fourth token for "not asked yet", and an unfilled join says it is
unfilled rather than rendering an empty findings list; `close` refuses over one.

A Packet block the comparison needs and a Packet does not carry is a **Packet
gap**: it refuses by name and is filed against `src/packet-template.md`, never
satisfied by a side read.

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
failed with their pairs and spans, the items that **held** as what the
correction must not break, and the instruction to change what the findings name
and nothing else. With `--file` it records the prose through the realization
lane, so the Draft is re-assembled by the same code that wrote it, and snapshots
land in the review workspace. Its input is filed under `pass-1/corrections/`,
beside the verdicts that sent the Step there.

**A figure fail routes to `correct --figure`, and that is a different act.**
What comes back is a JSON record, not prose: the input carries the Step's Packet
as it now stands, the passage, the block as the reader currently meets it, the
previous record verbatim, what failed and what must go on holding. Recording it
hands the record to `draft.mjs figure`, which re-validates it against
`src/figure-schema.json` and the Move's own form, and to `emit`, which renders
the block from it — **you write no markup**, so a syntax defect in a corrected
figure stays a defect of `src/render-figure.mjs` rather than of the sitting that
corrected it. A Step owing both corrections takes the **passage first**: the
record's caption is stated in what the reader holds after reading that passage,
so a record corrected against prose about to change is corrected against
nothing. `correct` on a Step whose only preserved fails are the figure's refuses
by naming the other seat.

**Corrections run in path order** and a Step out of order refuses — each later
one must see the earlier ones in its own "article so far". Between the render
and the recording the run is **mid-correction** on that Step and every other act
refuses by name; the act that ends it is `correct --file`.

**Drift is reported and never gated.** Per corrected Step the Harness states the
share of sentences changed against the previous realization and the verbatim
overlap with the Packet's ground and state lines, and both reach `review.md`. A
high change share is what the owner reads as the Step becoming self-contained;
it is information, not a refusal.

`check` is pass two and is **bounded**: it re-runs the blind recovery for the
corrected Steps, then re-judges their own failed and held preserved items, the
two continuity items on each corrected Step's successor, and every mechanical
item over the whole Draft. Every other pair is **carried** from pass one, marked
as carried, at no model call. The bound is recorded in `check.json` rather than
only applied. Pass two answers its own owed pairs through `check --verdicts`,
never `compare`'s. A preserved item still failing after it is **residue**.

## The two readers, and why each is blind to something

**The recovering reviewer has never seen the Packet.** It reads the article
before one passage, then that passage, and writes down the Step record it
believes the passage realizes. A recovered record that agrees with the input
because it guessed at the input measures nothing, which is why the Harness
renders prose alone — the wording is `src/recovery-template.md`, which holds no
thesis, no grounds, no Move, no reader states and no term list — and refuses a
record for a Step whose input it did not render.

**And it sees the figure the reader saw.** For a Step whose trace carries one,
the recovery input quotes the rendered block — the fence and the caption, sliced
from the Draft at the range the trace records, with its own line numbers — and
nothing from the record: no role binding, no ground address, no relation list.
The reviewer reads the figure exactly as a reader does, which is what makes its
account of it evidence rather than a confirmation.

The record it returns is one JSON object validated against
`src/recovered-schema.json`: `claims` (each with the draft line span it rests
on), `reader_state_after`, `purpose`, `terms_introduced`, `shape`, `concessions`
and `restates`. Every field is a fact about the prose, so every field can be
checked by pointing at the prose. A missing field, an UNNAMED EIGHTH FIELD, a
span outside the passage, and a verdict or a piece of advice are each **refused
by name** — an empty array is an answer, an absent key is not. The top-level key
set is **closed** (kogaki#885): the seven are the whole record, and a key
outside them is refused with the key named rather than accepted and ignored.

**The eighth field is conditional (kogaki#880).** A Step that carries a figure
owes `figure_reading` — what the figure shows, the elements the reader can name,
and what the reader holds after looking — and a Step that carries none is
**refused** it by name. The closed set stays total at every Step; it is computed
from the Step rather than fixed for the Draft. A reading of a figure nobody
rendered is an invention, not a recovery, and the refusal says so rather than
reporting an unnamed key.

**The cold reader reads the body only** — no frontmatter, no trace, no Packet,
and no Step boundary marked — and writes, after each Section, the question it
answered and what they now believe, then one final claim for the whole article.
Its input is `src/cold-reader-template.md`, rendered whole at `open`.

The Harness pairs those entries with what the trace and the Packets declare: the
heading against the reader's question, the belief at a Section's end against its
last Step's `reader_state_after`, the belief it arrived with against the first
Step's `reader_state_before`, the final claim against the thesis, and what the
first Section did with the opening question. The pairs and their classes are
`sections` in `src/review-items.json`.

**A Section fail is routed, never corrected.** ReviewDraft corrects at Step
granularity only, so a Section finding goes one of three ways. It **localizes**
to a Step — one in the Section already fails a preserved item, or its recovered
reader state is the first to fail — and that Step becomes the correction target.
Or every Step in the Section holds and the Section still fails, in which case
the **grouping** is what is wrong: the heading promises what the Steps it groups
do not deliver, which is a **Brief** defect, reaching the owner record as
residue marked `upstream: brief` with **no correction run**. Or a Step carries a
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
