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
| **Reverse Outline** | the artifact that reading produces — a Brief Leg block, in the Brief's own field names |
| **Forward Artifact** | the original Brief Leg, which is what the article was actually written from |
| **Round Trip** | the comparison of the Forward Artifact with the Reverse Outline, entry by entry |

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/review-draft.mjs`), the same ruling
`.claude/skills/draft/SKILL.md` records for /draft: `outline` refuses a Leg
whose Reverse Outline input it did not render, `compare` refuses while any Leg
outline is missing, `check`
refuses before `compare`, `compare` refuses once a correction has landed (pass
one is over, and re-rendering its join inputs from the corrected article would
lose the reading its verdicts were given on), and `close` is reachable from
`compare` with zero fails or from `check` in every state. A session does not
sequence those acts and cannot get the sequence wrong.

## The closed input set

The Harness reads `theses/<slug>/draft.md`, its frontmatter trace — which
carries each Leg's line range and its Packet's path and sha, and for a Leg
carrying a figure its record's path, sha and own line range — and the files that
trace names: the Packets, and each figure record. **It reads no Brief, no Move
file and no Strand**, by the owner's 2026-09-04 ruling: the Packet was designed
to be the only source a Leg needs, so a check that turns out to need anything
else is evidence the **Packet** is missing information. File that against
`src/packet-template.md`; never satisfy it with a side read here.

## Entry points

                            node src/review-draft.mjs open    --draft <draft.md>
    <reverse outline>     | node src/review-draft.mjs outline --draft <draft.md> --leg <id>
    [<verdicts>]          | node src/review-draft.mjs compare --draft <draft.md>
    [<corrected prose>]   | node src/review-draft.mjs correct --draft <draft.md> --leg <id>
    [<corrected record>]  | node src/review-draft.mjs correct --draft <draft.md> --leg <id> --figure
    [<verdicts>]          | node src/review-draft.mjs check   --draft <draft.md>
                            node src/review-draft.mjs close   --draft <draft.md>

**Every reply reaches the Harness on standard input, and no act takes a path to
one.** Pipe the spawn's output straight into the recording act — you name no
file, and `--file` and `--verdicts` are gone and are refused by name if passed.
Where an act has two phases, the stream is what selects one: with nothing piped
in `compare`, `check` and `correct` render what they owe, and with a reply piped
in they record it. `outline` records a reply and nothing else, so an empty
stream is a refusal there rather than a phase.

**`runs/` holds what the Harness wrote and nothing else.** After each act the
Harness already holds the reply verbatim under its own name — `outline/<leg>.md`,
`join.json`, `check.json`, the Draft itself with its before-and-after
pair under `snapshots/` — so a reply file of your own would be a second copy of
those bytes, written into machine state with no owner. Do not write one, inside
the run directory or beside it.

`open` verifies the inputs, opens `runs/review/<slug>/` and renders the first
Reverse Outline input. `outline` records one Reverse Outline and renders the
next. `compare` runs the Round Trip. `correct` renders a correction input and records the re-realized
Leg; with `--figure` the seat it corrects is the Leg's figure RECORD rather
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
| Reverse Outlining — `outline` | `claude-opus-5` | it writes the artifact the whole Round Trip is then run against; a weak Reverse Outline makes every pair downstream of it measure the outline instead of the Draft |
| corrections — `correct`, passage and `--figure` alike | `claude-opus-5` | it re-realizes a Leg, or re-designs a figure record, against everything that must go on holding |

**The split is by what the call produces, not by how hard it looks.** The
judgments answer a fixed question and write a token; the Reverse Outlines and
the corrections write the evidence and the prose the rest of the run is judged
against. The first kind is the bulk of the calls and the cheap
half; the second is where a weaker model costs the run its meaning.

**The Harness names no model of its own, and verifies none.** It invokes no
judge, so a pin is something you DECLARE — the same reading terrain's judge pin
carries. What the Harness does is **record what served**: every verdict is
`{leg_id, item, pair?, verdict, reason, model}` and one with no `model` is
**refused by name**, the id rides both the verdict and the `model_calls` log in
`join.json` and `check.json`, and each pass emits

    judged by DECLARED model(s) — <ids>; the Harness invoked no model and verified none.

So a pass that answered its pair judgments on the pinned Haiku and its
corrections on the stronger model reads as two ids, which is the intended split;
a **third** id, or the interactive default, is a pin that slipped, and the line
is where that becomes visible.

**`judged` answers "was a model asked here", and `model` answers "by what".**
Every row and every entry of `pairs` carries `judged`, a boolean: **true** where
a Judge was asked, **false** where the Harness decided the row alone. It replaced
`decided_by` at kogaki#1134, where `decided_by: "model"` sitting beside `model:
<id>` was one fact spelled two ways. A row the Harness decided alone carries **no
`model` key at
all** — no call was made, and writing one would claim a call that never
happened. A row with any judged pair carries the key, and its value is the
**chosen** pair's, which is `null` where a Harness-decided pair won the
selection — a hybrid row, some of whose pairs the Harness settles while a model
answers the others. No row in the table is hybrid at this head; the rule is live
code with no current specimen, and the truth per pair is always in `pairs`.

## The workspace is split by pass, and every pass's evidence survives

The layout is the Harness's contract, not a convention:

    runs/review/<slug>/pass-1/{outline-input,outline,join,corrections,join.json}
    runs/review/<slug>/pass-2/{outline-input,outline,join,check.json}
    runs/review/<slug>/snapshots/     before/after per corrected Leg, and per restore
    runs/review/<slug>/passes.json    both passes side by side, one row per pair
    runs/review/<slug>/run.json

`outline-input/<leg>.md` is what the Blind Reader was handed;
`outline/<leg>.md` is the Reverse Outline exactly as it was written, and
`outline/<leg>.json` the same reading under the Brief's field names, which is
what the Round Trip compares. A Leg whose reader met a figure also has
`outline/<leg>.figure.json`.

**A pass writes only under its own directory, and a write that would land on a
file another pass wrote is refused by name.** Until this, pass two re-read the
corrected Legs blind and wrote its inputs and outlines at pass one's paths, so
pass one's reading of the ORIGINAL Draft was overwritten in place — and `runs/`
is gitignored, so nothing else held a copy. The surviving verdicts pointed at
readings that no longer existed. A rule saying "do not overwrite" would be prose
where a refusal belongs.

**`join.json` and `check.json` are the surface a person debugs a run from**, and
each pass writes one. Every row carries the item, its class, the verdict, the
reason, the span, `judged` and — where a Judge was asked — the model that
answered, with every pair's own answer under `pairs`.

**There is no `comparison/` directory, and its removal reverses kogaki#1097 by
name.** #1097 wrote one file per Leg rendering those rows as prose, because the
surface a person then debugged from was the verdicts file the session had handed
in, which carried the model's answer and nothing about what it meant — not the
item's class, not whether the fail sent the Leg to correction. kogaki#1100
removed those session-written files the same day and the row grew the missing
fields, so the comparison files became a legend plus one line per pair restating
the record beside them, and were harder to read than it. Their one addition — the
consequence word — follows from the class and the verdict: a **preserved** fail
is what sends its Leg to correction, a **best-effort** one rides along, and a
row pass two carried says `carried: true` on the row itself.

`snapshots/`, `passes.json` and `run.json` stay at the root: a snapshot pair
spans the correction that separates two passes, `passes.json` is the one record
*about* both passes, and the run record is the one file every pass writes. **The correction inputs are pass one's** — `correct` only ever
discharges a verdict pass one recorded, and pass two turns a still-failing item
into residue rather than into another correction. A later third pass is
`pass-3/` and nothing else moves.

`review.md` points at both pass directories, and every finding and residue line
carries the artefacts behind it: the Reverse Outline the run actually read for
that line (pass one's for a carried line, and for a successor Leg's continuity
item judged in pass two, since pass two re-reads only corrected Legs), and the
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
second takes the answers on standard input and emits the comparison.

**`claims` asks one thing, once per DECLARED claim: did the reader recover it.**
The Blind Reader is told no count and writes as many claims as the passage puts
in front of them. The Harness then renders one join Packet per claim the Leg
DECLARES — `join/<leg>.claims.<k>.md`, carrying that claim's own words, every
claim the reader wrote, the passage, and the question "is this declared claim
among them" — so a Leg declaring N claims costs N calls for this item. Whether
a paraphrase counts as recovered is the judge's answer in words and never a
shared-word count. **Surplus is not judged at all**: the Packet renders Journey
material under "NOT a claim to recover" and tells the writer to retell it, so a
correctly realized passage asserts more than its declared claim by design. The
row fails when any declared claim fails, and **the correction is told which
one** — the entry carries the declared claim's text, so `What failed` names the
claim that went missing rather than only the item that did.

**A judged item whose DECLARED side is empty is decided by the Harness too, and
costs no call.** Where the Packet renders a stated absence — no claims, no
`introduces` — the item's own table row declares the answer and its sentence, so
nothing is rendered and no model is asked a question quantifying over nothing.
The answer is a fact about the declared side rather than a reading of the prose,
which is why it is the table's to state and not the runtime's to decide; an item
that declares no such arm is still judged on an empty side, because whether the
absence settles the question is per item.

**The item table is `src/review-items.json` and it is fixed in the Harness.**
Which Packet information must be reconstructible is decided there, per item
class, and so is what a `fails` costs: a **preserved** item failing sends its
Leg to correction, a **best-effort** one rides along if that Leg is
re-realized anyway. **The model never assigns severity** — it sees one pair,
answers one question, and returns one of `holds`, `fails`, `cannot-decide` plus
one sentence. It never sees two pairs at once, so it cannot rank them.

`cannot-decide` is a third answer and is **never rounded**; it is listed with its
pair so a person can look. There are no scores, no ranking and no aggregate, and
the emission holds that mechanically: **a comparison line renders line numbers
and nothing else numeric**, so quoted material is carried as the finding's
*evidence* in the join record and the owner record rather than in the line. A
recorded reason carrying a digit is refused.

`compare` emits one line per (Leg, item) **only once every pair is answered**.
There is no fourth token for "not asked yet", and an unfilled join says it is
unfilled rather than rendering an empty findings list; `close` refuses over one.

A Packet block the Round Trip needs and a Packet does not carry is a **Packet
gap**: it refuses by name and is filed against `src/packet-template.md`, never
satisfied by a side read.

## The figure's own Round Trip

**A figure is written from its RECORD, so it gets its own Reverse Outline in the
record's own field names.** That is the same rule the passage half runs under,
one artifact down: a passage is written from a Brief Leg and its Reverse
Outline is a Brief Leg block, so a figure's is a block in the fields
`src/figure-schema.json` declares. There is no second schema at either level.

**It is its own fence and its own file.** `figure` IS a Brief Leg field, and it
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

**A Leg whose trace carries a figure gains five rows** — the record's elements
against the ones the reader could name, its caption against what the reader
holds and the Leg's `reader_state_after`, each element's wording against the
claim its `g<n>` address points at, the figure's reading against the passage's
prose, and the position the record declares against where the reader met the
block. Three are preserved and two best-effort, same three verdicts, same
consequence rule. **A Leg with no figure runs none of them** — not as a vacuous
`holds` but not at all, so a figureless Draft's log carries no figure item
anywhere, and a figure block filed for such a Leg is refused as an invention.

**The element-to-claim row is the Harness's alone.** Containment against the
claim the record's address names, above a declared floor: no model call and no
join Packet, and a fail is what sends the Leg to `correct --figure`. It does
**not** re-check the binding — §4.17 already refuses a record that moves a role
to a claim the Brief did not bind it to — it asks whether the wording the
element finally got is carried by the material it was licensed from, which is
the one question nothing before the Round Trip can ask.

## The correction path, and what a corrected Leg receives

A corrected Leg is realized from a **freshly rendered Packet**, never from the
Packet that produced the failing prose. `correct` re-renders it against the
Draft **as it now stands**, so the "article so far" block carries the current
preceding prose — including Legs corrected earlier in the same pass — and the
reader-knowledge list and Section block come with it. That block is the
continuity mechanism, and rendering fresh is what keeps a corrected Leg
continuous with the article rather than drifting toward being self-contained.

`correct` runs in two phases, like `compare`, and standard input selects the
phase. With nothing piped in it renders the input: the fresh Packet with **one Correction block** appended after the write
instruction, carrying the previous realization verbatim, the findings that
failed with their pairs and spans, the items that **held** as what the correction
must not break, and the instruction to change what the findings name and nothing
else. With the corrected prose piped in it records it through the realization lane, so the
Draft is re-assembled by the same code that wrote it, and snapshots land in the
review workspace. Its input is filed under `pass-1/corrections/`, beside the
verdicts that sent the Leg there.

**A figure fail routes to `correct --figure`, and that is a different act.** What
comes back is a JSON record, not prose: the input carries the Leg's Packet as it
now stands, the passage, the block as the reader currently meets it, the previous
record verbatim, what failed and what must go on holding. Recording it hands the
record to `draft.mjs figure`, which re-validates it against
`src/figure-schema.json` and the Move's own form, and to `emit`, which renders
the block from it — **you write no markup**, so a syntax defect in a corrected
figure stays a defect of `src/render-figure.mjs` rather than of the sitting that
corrected it. A Leg owing both corrections takes the **passage first**: the
record's caption is stated in what the reader holds after reading that passage,
so a record corrected against prose about to change is corrected against nothing.
`correct` on a Leg whose only preserved fails are the figure's refuses by naming
the other seat.

**Corrections run in path order** and a Leg out of order refuses — each later one
must see the earlier ones in its own "article so far". Between the render and the
recording the run is **mid-correction** on that Leg and every other act refuses
by name; the act that ends it is the same `correct` with the prose piped in.

**Drift is reported and never gated.** Per corrected Leg the Harness states the
share of sentences changed against the previous realization and the verbatim
overlap with the Packet's claim and state lines, and both reach `review.md`. A
high change share is what the owner reads as the Leg becoming self-contained; it
is information, not a refusal.

`check` is pass two and is **bounded**: it re-runs Reverse Outlining for the
corrected Legs, then re-judges their own failed and held preserved items, the
continuity item on each corrected Leg's successor, and every mechanical item
over the whole Draft. Every other pair is **carried** from pass one, marked as
carried, at no model call. The bound is recorded in `check.json` rather than only
applied. Pass two answers its own owed pairs by piping them into `check`, never
into `compare`. A preserved item still failing after it is **residue**.

## `check` refuses a regression (owner, 2026-09-17)

**A corrected Leg that FAILS in pass two a preserved item it HELD in pass one is
RESTORED to its pass-one prose**, through the realization lane that wrote it, and
the item the correction was made for returns to residue as still failing. In the
first full review run this happened and nothing caught it: the regression was
recorded as residue, indistinguishable from an item that failed in both passes,
and the regressed prose stayed in the article — so the run's product was an
article the review had made worse on a dimension the review itself measured.

**Only the regressed Leg is restored.** A later corrected Leg keeps its
corrected prose and carries no continuity mark. Continuity between Legs was
settled at Reader Path design and holds while a Leg is unchanged; ReviewDraft is
not responsible for Leg-to-Leg continuity, so a restore reaching forward would
be this Harness answering a question the Reader Path owns.

**The correction input is unchanged.** The owner weighed an explicit
edit-instruction stage and withdrew it: it would make some role responsible for
repair advice whose quality nothing guarantees. A failure reason from the round
trip is external feedback and stays what the corrector is handed. The remedy for
a correction that breaks something is to undo it, not to coach it.

The restore is recorded in `run.json`, in `check.json`, and in `review.md` under
the Leg it undid, with a snapshot pair of its own. A restored Leg's rows carry
**pass one's** verdicts, because the prose those verdicts were given on is the
prose the Draft carries again.

## `passes.json` — both passes side by side

A completed `check` writes **`passes.json` at the run root**: one row per Leg,
item and pair, carrying pass one's verdict, pass two's, and one outcome word —
**held**, **fixed**, **still-failing**, **regressed**, **carried**. JSON, not
Markdown: it is a derived record read against the two it is derived from, and the
prose surface a person reads is `review.md`.

Comparing the passes meant reading `pass-1/join.json` and `pass-2/check.json`
side by side by hand, and `regressed` is the word neither of them carries. A
restored Leg's `pass_2` is **the answer pass two gave**, not the pass-one answer
the restore put back — showing `holds`/`holds` there would erase the event the
guard fired on.

## The Blind Reader, and what it is blind to

**The Blind Reader has never seen the Brief.** It reads the article before one
passage, then that passage, and writes the **Reverse Outline** — the outline
entry it believes the passage was written from, in the Brief's own Leg form. An
outline that agrees with the Brief because it guessed at the Brief measures
nothing, which is why the Harness renders prose alone — it carries no thesis, no
claims, no Move, no reader states and no term list — and refuses an outline for
a Leg whose input it did not render.

**The input is fixed, and it is fixed by what a reader can have (kogaki#1099).**
It carries the passage, the article before it, the five fields with their
definitions, the reader's role and constraints, and the answer form — and
nothing else. In particular it names none of the fields the parser refuses, and
it carries no filing command: naming a field a reader has never heard of creates
the knowledge it withholds, and the command is an instruction to the session
rather than to the reader. The refusal it used to announce is the parser's and
works without the announcement.

**And it sees the figure the reader saw.** For a Leg whose trace carries one,
the Reverse Outline input quotes the rendered block — the fence and the caption,
sliced from the Draft at the range the trace records, with its own line numbers,
on the side of the passage the reader met it on — and nothing from the figure
record: no role binding, no claim address, no relation list.

**There is no template file and no second schema.** The input is composed from
the Brief's own field declaration, because there is no second artifact to
describe: the reader fills a fenced `leg` block. It is asked for `purpose`,
`reader_state_before`, `reader_state_after`, the `claim ` lines and `introduces`
— the Brief's fields with the Brief's definitions — and the count in its
instruction is computed from that declaration rather than spelled, so a field
joining it cannot leave the sentence saying the old number. `introduces` is
legitimately absent; `claims` is not, because a passage that asserts nothing is
not a passage.

**Two fields left in one act** (owner 2026-09-17). `concession` was the one
field here that was never a Brief field at all, and `opens_section` is a Brief
field whose Round Trip row asked whether a continuing passage restates its
heading — a realization lint, and the heading is rendered by the Harness out of
the trace, so it is never something the prose has to carry. Both rows left the
item table, so neither field had a reader left; a field asked for and compared by
nothing is a reading the Blind Reader is charged for and nobody looks at. A block
carrying either is refused by name, and the two refusals read differently:
`opens_section` is refused as declared **not reconstructible**, and `concession`
by the closed line set, which says it is not a Brief Leg field.

**The block is validated by the Brief's own parser**, `parseLegBlock` — the
function `parseBrief` calls per fenced block — so a Reverse Outline the Brief
could not carry is refused by the code that would refuse it inside a Brief, and
every refusal names what it saw. `move`, `materials`, `rationale`, `depends_on`,
`bridges`, `figure` and `opens_section` are declared **not reconstructible** and
are **refused rather than dropped**: a field the reader could not have read off the passage is
an inference, and dropping it silently would leave the inference having steered
the rest of the outline with no trace. The declaration is the parser's refusal
list and **nothing renders it** — the input does not tell the reader which
fields it would refuse, because a reader who has not heard of them cannot supply
one.

## The cold reader is gone (owner, 2026-09-17)

A second reader of the whole body, a Section ledger recorded through `read`, and
five Section pairs per Section stood here. **Reverse Outlining reconstructs the
elements of a Leg, and the thesis is not a Leg element.** Of the five pairs the
heading was preserved trivially — the Harness renders it from the trace — and
three duplicated the reader-state items one level up. The thesis pair was the one
check no Leg item makes, and it had no act: corrections are Leg-granular, so a
thesis fail could only ever become residue saying the Packets lack something,
which is a **Brief-time** finding. So there is no Section ledger, no Section pair
and no thesis check in ReviewDraft.

**The reopen trigger**, named so a later reader can tell a ruling from an
omission: a Draft whose every Leg holds the round trip and whose **thesis the
owner cannot find on reading it**. If that happens, the check is designed at
**Brief composition**, where the chain of `reader_state_after` values should
reach the thesis — an operation outside the Reverse Outlining item set, and never
a sixth row in `src/review-items.json`.

## The owner record

`theses/<slug>/review.md`, one per Draft, overwritten on re-run, headed by the
Draft's body sha and the Packet shas it was reviewed against. It lists the
findings, the corrections, and the **residue** — what survived every pass. Each
residue line carries an empty `classified:` field for the owner to fill with
`packet` or `reviewdraft`. **The tool never fills it**: what a surviving item is
evidence about is the judgment the two-pass bound exists to hand over.

Run `node src/review-draft.mjs` with no arguments for the current usage; that
output is the Harness's own and is never restated here.
