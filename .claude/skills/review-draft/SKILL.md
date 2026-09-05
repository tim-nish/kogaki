---
name: review-draft
description: Review a CanonicalDraft against the Packets that produced it. Use when the owner wants a finished Draft checked — "review the draft", "run /review-draft", "check the draft for <slug>". Reads the Draft, its frontmatter trace and the Packets that trace names, and nothing else — no Brief, no Move file, no Strand. Runs to completion: the run ends when theses/<slug>/review.md exists, after at most two passes, and finishes with residue rather than reaching for a third.
---

# ReviewDraft — invoking the Harness

**This file names entry points and carries no flow ordering.** The ordering
lives in the Harness (`src/review-draft.mjs`), the same ruling
`.claude/skills/draft/SKILL.md` records for /draft: `recover` refuses a Step
whose recovery input it did not render, `compare` refuses while any Step or
Section entry is missing, `check` refuses before `compare`, and `close` is
reachable from `compare` with zero fails or from `check` in every state. A
session does not sequence those acts and cannot get the sequence wrong.

## The closed input set

The Harness reads `theses/<slug>/draft.md`, its frontmatter trace — which
carries each Step's line range and its Packet's path and sha — and the Packet
files that trace names. **It reads no Brief, no Move file and no Strand**, by
the owner's 2026-09-04 ruling: the Packet was designed to be the only source a
Step needs, so a check that turns out to need anything else is evidence the
**Packet** is missing information. File that against `src/packet-template.md`;
never satisfy it with a side read here.

## Entry points

    node src/review-draft.mjs open    --draft <draft.md>
    node src/review-draft.mjs recover --draft <draft.md> --step <id> --file <recovered>
    node src/review-draft.mjs read    --draft <draft.md> --section <n> --file <ledger>
    node src/review-draft.mjs compare --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs correct --draft <draft.md> --step <id> [--file <prose>]
    node src/review-draft.mjs check   --draft <draft.md> [--verdicts <verdicts.json>]
    node src/review-draft.mjs close   --draft <draft.md>

`open` verifies the inputs, opens `runs/review/<slug>/` and renders the first
recovery input. `recover` records one blind recovery and renders the next.
`read` records the cold reader's entry for one Section. `compare` runs the join.
`correct` renders a correction input and records the re-realized Step; `check`
runs the bounded second pass. `close` writes the owner record.

## The comparison, and what the judging model is not asked

`compare` runs in two phases and the Harness owns both. The first decides every
**mechanical** item — string facts about the Draft and its Packets, no model
call — and renders **one join Packet per judged pair**, each carrying the
declared line, the recovered line, the quoted prose and **one** question. The
second records the answers with `--verdicts` and emits the comparison.

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
land in the review workspace.

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

The record it returns is one JSON object validated against
`src/recovered-schema.json`: `claims` (each with the draft line span it rests
on), `reader_state_after`, `purpose`, `terms_introduced`, `shape`, `concessions`
and `restates`. Every field is a fact about the prose, so every field can be
checked by pointing at the prose. A missing field, a span outside the passage,
and a verdict or a piece of advice are each **refused by name** — an empty array
is an answer, an absent key is not.

**The cold reader reads the body only** — no headings taken on trust, no trace,
no Packet — and writes, after each Section, the question it answered and what
they now believe.

## The owner record

`theses/<slug>/review.md`, one per Draft, overwritten on re-run, headed by the
Draft's body sha and the Packet shas it was reviewed against. It lists the
findings, the corrections, and the **residue** — what survived every pass. Each
residue line carries an empty `classified:` field for the owner to fill with
`packet` or `reviewdraft`. **The tool never fills it**: what a surviving item is
evidence about is the judgment the two-pass bound exists to hand over.

Run `node src/review-draft.mjs` with no arguments for the current usage; that
output is the Harness's own and is never restated here.
