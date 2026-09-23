# Move schema derivation: the interaction contract

This file is the whole protocol for turning a Corpus of Analyses into a
Move-schema proposal. Hand it to a model together with the whole Corpus —
every Analysis produced by `FORMAT.md`, with its `## Passage` section
already removed. It runs once, over the whole Corpus, never per Analysis:
`FORMAT.md` analyzes one Passage, this file reads all of them and proposes
the fields a Move record must carry. Nothing else is needed or permitted as
context.

It never writes to `moves/` and never changes the extraction contract
(`specs/move-extraction-contract.md`). Its product is a proposal the owner
rules on.

## Origin

The Move concept follows Swales' move analysis in genre studies: a text is
coded as a sequence of communicative purposes, each a move. The reader's
question as the central opening mechanism follows Minto's Situation,
Complication, Question, Answer pattern, read through question-under-
discussion analysis (Roberts 1996): a text opens a question and either
settles it, or replaces it with a narrower one taken up in its stead.

## Why this format exists

The Move schema in `moves/` today has eight fields, decided without a
corpus behind them: all 22 records begin their `requires` with "the reader
understands X", so a change in the reader's question, expectation,
orientation or trust has no place in it. This format starts from analyzed
prose instead and proposes a schema the Corpus actually supports.

## Minimum corpus size: 10 Analyses

Below ten, refuse and say so, naming the count found. Each proposed field
needs two Analyses in the Corpus that fill it differently, and the
sequence reading (below) needs names that recur — neither is meaningful
below ten.

## Input

Every file handed to you is one Analysis written under `FORMAT.md`, with
its `## Passage` section removed before it reached you: this format reads
Analyses and never Passages (the source-text boundary, `FORMAT.md`). Any
`## Figure` block's `positions:` labels are removed the same way — a
Figure spec's `kind`, `relation` and `encoding` lines stay, its printed
`content` does not. If any Analysis in front of you nonetheless contains
what reads like source prose rather than an account of a reader's state,
do not use it as evidence for any field and say so in the working file
under "anomalies".

Each Analysis carries: a header (`source`, `functions`, `prior text`,
`length`, `language`); the four questions with their candidates and the
human's chosen answer (Q1 model-written; Q2, Q3, Q4 with a candidate
number or the human's own words); and the eight numbered sections —
reader before/after, the Segment order with one function per Segment
(raises / advances / settles), presupposition, breakage (remove / reorder
/ extend), the subject-free technique, the candidate name, and notes.

## The three Properties

Decided here, over the whole Corpus, never per Passage. Four were tried in
the first Corpus round; position (opening/body/closing) is dropped — it
had no ground in Swales' method and the model collapsed it with prior-text
dependence (the `continuation` value the first-round contract produced).
The three that remain:

1. **The reader dimension most changed** — read off section 2's "Strongest
   change" line across the Corpus. Propose the values the Corpus shows
   (which of knowledge / question / expectation / orientation / trust
   recurs as the strongest change, and in what mix) and say plainly if the
   Corpus does not yet show enough spread to support this axis.
2. **The source of the material the Move draws on** — read off Q4's
   footholds across the Corpus: the subject, the reader's own world, other
   texts, the author. Propose the values the Corpus shows, the same way.
3. **The length the Move typically occupies** — read off each Analysis's
   `length` line (sentences and paragraphs). This is a fact **carried**
   from the Corpus, not an axis derived from it: report the range and the
   typical size, and do not propose categories for it unless the Corpus
   itself clusters into visibly distinct bands.

For axes 1 and 2, name explicitly any value the Corpus does not yet
support — a value you would expect from the framework but that no Analysis
in front of you fills.

## Sequence

Read the `functions` line of every Analysis (the Segment function
sequence: raises / advances / settles, in order) together with each
Analysis's candidate name (section 7). Report which candidate names recur
across different Analyses **with the same function sequence**, and which
occur only once or with a different sequence each time. A name recurring
with the same sequence is evidence the Corpus supports it as one Move; a
name occurring only once, or with a different sequence each time it
appears, is evidence it may be two Moves wearing one name, or not yet
supported. This replaces a generalization-versus-specialization reading:
it is read off the sequence, not asserted from the name.

## Fields under test

For each of the eight fields the current schema uses (`id`, `status`,
`intent`, `requires`, `effect`, `constraints`, `failure_modes`, `excerpt`)
and for the one optional field (`visual_form`), report whether the Corpus
supports carrying it forward, changing it, or dropping it — as a finding,
never as a carry-forward by default. Nothing is kept because it already
exists.

## The schema proposal

For each field you propose, give:

- **name** — the field's key.
- **what reader-facing fact it holds** — one sentence, about the reader,
  not the text.
- **which Analysis sections it is derived from** — by section number(s).
- **two Analyses that fill it differently** — by slug, with the value
  each would carry, so the field's range is shown rather than asserted.

## Output: two files

**`working.md`** — headed on its first line `NOT READ BY A PERSON — working
file`. Holds the whole derivation in full: every Property value considered
and why, the fields-under-test findings, the sequence reading, anomalies,
and the reasoning behind every proposed field. Internal terminology and
long prose belong here and only here.

**`questions.md`** — the owner's file. A numbered list of **at most ten**
questions. Each question is at most **twelve lines**, in plain words, with
**two or three options**, **exactly one** of them marked
`(Recommended)`. Cite Analyses by slug only; no Passage text, and no line
equal to any line the Corpus's `## Passage` or Figure `positions:` sections
carried, appears in this file. Longer material a question needs to point
at (a section 8's full notes, a longer list of slugs) goes in `working.md`
and the question names where to look.

## Worked example question

```
3. Should `requires` be replaced by a `question` field recording the
   reader's question rather than their knowledge?

   Every Analysis's Q2 answer names a question the reader holds, settles,
   or has replaced — never only a knowledge state. `enter_a_hard_subject`
   and `derive_actor_taxonomy` fill this differently: one records a
   question replaced, the other a question settled outright.

   1. Yes — add `question`, keep `requires` for footing alone.
      (Recommended)
   2. Yes — replace `requires` with `question` entirely.
   3. No — keep `requires` as it is.
```
