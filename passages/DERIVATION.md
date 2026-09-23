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
the prose of its `## Passage` section removed before it reached you: this
format reads Analyses and never Passages (the source-text boundary,
`FORMAT.md`). Where a Passage carried a figure, its `## Figure` spec
(`FIGURE.md`) is kept — `kind`, the role names under `positions:`,
`relations` and `encoding` — and only each position's printed label is
replaced by `(label removed)`, because the label is the figure's content
and the rest is its structure. The short quotations `FORMAT.md` lets an
Analysis keep are removed too: each reads `(quote removed)` followed by its
English gloss, and any other source-language wording reads `(source wording
removed)`. Work from the glosses and the Analysis's own account. If any Analysis in front of you nonetheless
contains what reads like source prose rather than an account of a reader's
state, do not use it as evidence for any field and say so in the working
file under "anomalies".

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

## The ruled answers this run confirms

The owner has already ruled on the ten schema questions below (kogaki#1173,
2026-09-23). Do not re-ask them. Test each against the Corpus: for each,
state in `working.md` whether the Corpus confirms it, citing at least two
Analyses by slug, or where it contradicts it and which Analyses show that.
A contradiction is a **disagreement**: report it in `working.md` under
"disagreements" and name it on the first line of `questions.md` (below).

1. **Reader before and after.** `before` and `after` blocks, one line per
   reader dimension the Move changes; unchanged dimensions omitted. The
   dimension set (knowledge, question, expectation, orientation, trust) is
   the hypothesis this run tests.
2. **Question.** A `question` field recording the question the reader
   arrives with and what happens to it, one line per verb that applies:
   `holds: <A>` (the question the reader arrives with, or `none`);
   `settles: <A>` (A is answered); `replaces: <A> with <B>` (A is set aside
   and B is pursued in its stead as a way into A; A is not answered);
   `raises: <B>` (B is opened, and A, if any, stays open beside it).
   Replacing is neither settling nor adding.
3. **Order.** The Segment function sequence (raises / advances / settles)
   plus one subject-free sentence on why that order.
4. **Footing.** `draws_on`: each foothold by kind (Q4's four sources) and
   what the Move does with it.
5. **Disposition.** No field. Attention is carried by the question and
   expectation dimensions, ability to follow by knowledge and `draws_on`,
   goodwill by trust.
6. **`breaks`** replaces `constraints` and `failure_modes`: the three tests
   (remove, reorder, extend), one line each.
7. **`technique`** (section 6, subject-free) replaces `intent`; `evidence`
   is an optional source line (work and where the Passage sits), never a
   quotation. `excerpt` is removed.
8. **One Move per Analysis**, with the function sequence inside it.
9. **`status`** is retired; provenance, where wanted, is the `evidence`
   line.
10. **`figure`** replaces `visual_form`: an optional block carrying a Figure
    spec's `kind`, `positions` (roles) and `relations`, never its content.
    State how many Analyses in the Corpus carry a figure.

## The schema proposal

The ruled answers above fix most fields. Propose, in the same form, any
field the Corpus shows a need for that they do not cover, and restate each
ruled field in this form so its range is shown from the Corpus. For each
field, give:

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

**`questions.md`** — the owner's file. Its first line reads exactly
`Disagreements with the ruled answers: none` or
`Disagreements with the ruled answers: <the ruled answer numbers, comma-separated>`.
Then a numbered list of **at most ten** questions, covering only what the
Corpus leaves open: a Property value the Corpus does not settle, a field
proposed beyond the ruled answers, and one question per disagreement. Each
question is at most **twelve lines**, in plain words, with **two or three
options**, **exactly one** of them marked `(Recommended)`. Cite Analyses by
slug only; no Passage text and no printed figure label appears in this
file. Longer material a question needs to point at goes in `working.md` and
the question names where to look.

## Worked example of `questions.md`

An illustration of the shape only; the slug and the reading in it are not
findings about any Corpus.

```
Disagreements with the ruled answers: none

1. Which reader change should a Move be filed under?

   Most Analyses name knowledge or question as the strongest change;
   trust is strongest only in `frame_the_present_as_a_long_contest_then_authorize_the_lens`.
   See working.md, "Property 1".

   1. Knowledge, question, expectation, orientation, trust. (Recommended)
   2. Knowledge and question only, until the Corpus shows more.
```
