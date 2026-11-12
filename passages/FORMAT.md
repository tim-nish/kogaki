# Extraction: the interaction contract

This file is the whole protocol for turning one Passage into one Extraction.
Hand it to a model together with one Passage. The model answers the
first analytical question itself and asks the human the other two,
offering candidate answers it wrote itself; the human picks one per
question or writes their own; the model then writes the Extraction file. It runs unchanged in a Claude Code session and in a chat
session. Nothing else is needed or permitted as context.

It ends at the Extraction. Turning an Extraction into a Move is a separate
contract that will be written once the Move schema has been derived from
the Corpus; this file does not extract Moves.

## Terms

- **Passage** — one contiguous piece of prose the owner selected by hand
  because it forms one meaningful unit. The owner decides the boundaries.
  That selection is the whole of the human's input before extraction.
- **Question** — one of the three analytical questions below, each taken
  from an established framework. Q1 the model answers itself; for Q2 and
  Q3 it writes three candidates and the human chooses. (Q1 left the
  human's screen on 2026-09-23: in the first round of 21 Extractions the human
  chose the model's first candidate 20 times and saw no need for the
  question.)
- **Segment** — one entry of `segments`: a sentence or group of sentences
  that does one thing to the reader. The model draws the boundaries, and
  the human confirms the cut at step 2 before `segments` is written. A
  Segment carries three fields, all prose: **operation**, the step's
  operation, written subject-free so it could be performed on any subject,
  and never its effect on the reader; **relation**, the step's relation to
  the Segment before it; and **manner**, left out unless the step's
  technique is one the other two cannot name (kogaki#1510). Segment 1 has
  no Segment before it, so its relation is left out ("The paragraph unit",
  rule 5). No field draws on a label set. Earlier forms of this contract gave each Segment a
  function and a relation drawn from two closed label sets; no framework
  this file cites defines either set as a complete classification, nothing branched on the function, and a planner handed
  the two labels without the prose lost what the Segment did (kogaki#1414).
  Where a Segment sits is its place in the list. No position in the work is
  inferred for the Passage as a whole, and a Passage may run from an
  opening to a closing; the Segments carry that, and the human never cuts a
  paragraph out to make it visible.
- **Extraction** — the artifact this contract produces from one Passage: the
  Passage verbatim, the three questions (Q1 the model's own, Q2 and Q3 with their candidates) and the
  human's answers, and the filled sections below. One file per Passage.
- **Paragraph** — a unit one level above a Passage: one or more Passages,
  in source order, that the human judges act as a single unit at the
  paragraph grain. A Paragraph is never extracted from the source text
  directly; it names Passages whose own Extractions already exist, and draws
  no Segment of its own (see "The paragraph unit"). Most Extractions are
  Passage-unit and never mention a Paragraph; the `unit`, `contains` and
  `status` fields exist only to carry this one case.
- **Corpus** — the collection of Extractions. It is the input to a later act
  that derives a Move schema; that act has its own format and is not this
  one.

How long the Passage is, what language it is in, and whether it assumes
prior text are inferred by the model from the Passage itself and recorded;
they are never asked of the human. Properties
of a Move are assigned later, at derivation, over the whole Corpus. This
contract never asks for a Move, a schema, or a Property.

## Filing convention

One file per Passage, `<slug>.yaml` — the Extraction record "The
Extraction" below declares — in a private directory the owner names when
the Corpus is started. The slug is the `name` field,
a snake_case verb phrase. The owner may rename it. The Corpus is temporary
design evidence: it exists to derive one Move schema, is never kept in
kogaki, which is public, and is deleted once the schema is settled, because
each Extraction carries its Passage verbatim; see "The source text boundary".

## The source text boundary

Three artifacts touch the source text, and each keeps a different amount.

- **The Extraction keeps the Passage verbatim, in the private, temporary
  Corpus only.**
  Its use is audit and re-extraction: a reader checking an Extraction, or a
  re-run after this contract changes, needs the text. The derivation act
  reads the Extractions, never the Passages, so the verbatim text has no
  downstream reader and never travels. A Passage longer than one section
  of its work is not one unit; split it before extraction.
- **An Extraction that leaves the private Corpus keeps no Passage.** If one
  is published, moved to a public repository, or quoted in an Issue, its
  `passage` is replaced by one line naming the source and where the
  Passage sits, and everything else stays. The short quotations in the
  evidence line and `segments`, a few words each with a gloss, are the
  bounded quotation that survives; they are quoted for commentary and are
  subordinate to it.
- **A Move carries no quotation.** kogaki's extraction contract already
  rules (kogaki#751, 2026-09-02) that a Move's evidence is the extractor's
  own account of the reader movement and never verbatim text; the Extraction
  `what_it_does` and `segments` are written to be that account. Nothing in
  `passage` is ever copied into a Move.

---

## The paragraph unit

A Passage is extracted once as a whole, and each of its paragraphs may be
extracted again on its own. Two levels, no more: a Passage-level Extraction
and the paragraph Extractions it contains. Everything in "The Extraction" below
applies to a paragraph Extraction, except the rules here — rules 1, 2,
4 and 5 are mechanism m2's (kogaki#1348), carried verbatim, rules 3 and 6 are retired with the reader table
(kogaki#1699), rule 7 is kogaki#1440's,
rule 8 is kogaki#1698's (replacing kogaki#1583's obligation), rule 9 is kogaki#1478's and rule 10 is retired:

1. **The unit is one paragraph.** `passage` holds one paragraph of the
   Passage verbatim. A definition list or block quotation announced by the
   paragraph belongs to it. `length` counts this paragraph only. Add
   `unit: paragraph <N> of <M> in <passage slug>`.
2. **The reader enters with the earlier text.** Before extracting paragraph
   N, read paragraphs 1 to N-1 of the same Passage in full, and the end of
   the Passage that precedes it in the work when one is given. What you
   write is written for a reader who has just read all of that.
3. *(retired, kogaki#1699: the before column and the state-bound call that
   judged it, with the Extraction's reader table.)*
4. **The model answers Q2 and Q3 itself**, as it already answers Q1:
   one answer each, recorded as `answer: model — <answer>`, no candidates.
   No human round. The Segment cut is the model's own and is not confirmed.
5. **Segment 1 carries no `relation`**, in the first paragraph and in every
   later one. How the paragraph takes up the one before it is named in
   `what_it_does`, and Segment 1's `content` says which earlier point it
   takes up where it takes one up. Its `operation` follows the normal rule
   — subject-free, naming no term, place, person or claim of the original.
   A Move carries no relation to what precedes it (kogaki#1411), and the
   relation Segment 1 once carried was read by nothing downstream, so it is
   not recorded (kogaki#1510).
6. *(retired, kogaki#1699: where a reader-table row was credited.)*
7. **The whole record is written general.** Segment 1's `operation`
   carries no reference to any earlier step or earlier paragraph. A later
   Segment's `operation` is the operation alone, and its `relation`
   carries the connection to the step before. Every prose field of the
   record, `operation`, `relation`, `manner`, each entry of `breaks` and each `what` of `takes` and `leaves`, names no term, place, person or
   claim of the original, none of `subject_nouns`, and no word in the
   original's language; the record's `content` clause and `opening` are the
   only fields bound to the source (kogaki#1519). A `content` clause opens on
   what the sentence says, never on a verb naming how the paragraph treats it.
8. **`takes` and `leaves` are the Move's constraints** (kogaki#1698, owner ruling 2026-11-06, replacing the obligation of kogaki#1583 and kogaki#1618). `takes` is what Segment 1 takes up on entry, written as what a predecessor could leave; `leaves` is what the paragraph's Segments leave for a later unit to take up. Each is a list, possibly empty, of `{ kind, what }`, `kind` one of four (`MOVE_CONSTRAINT_KINDS` in src/move-validate.mjs, each rendered with its definition: `answer` a question raised, to be answered; `explain` a term or item named, to be explained; `carry` a structure given in a base, to be carried onto the subject; `apply` a principle, division or general statement given, to be put to work on a case) and `what` one line written general, as `operation` is; a `leaves` entry also carries `segment`, the Segment that leaves it. A question the paragraph answers, or a term it explains, in a later Segment of its own is left for nothing. Both are read by judgment, never compared verbatim. After the record passes the content-bound call, a third call (`constraints_unit`) reads the record's `segments`, each `operation` and `relation`, and its two lists, and nothing of the Passage: an entry its Segment does not support, or a question, term, base or principle a Segment leaves that no entry names, refuses the Extraction, and the refusal goes back into the Extractor's next attempt. An empty list is a normal case. `obligation` and `obligation_triggers` are retired from the Extraction: a record carrying either is refused.
9. **`operation`, `content`, `relation` and `manner` describe what the
   sentence does when read aloud.** Anything the reader would know only
   from the page, such as emphasis, bullets, numbering, headings, line
   breaks or a quotation's marks, is layout: it is recorded in `passage`
   and nowhere else, never in `operation`, `content`, `relation` or
   `manner`. "Introduces a bolded term" fails the test; "introduces a term" passes it. The test is the whole
   mechanism, one rule covering the class rather than a list of its members.
10. *(retired, kogaki#1583: `discharges` held state across paragraphs.)*

Three fields carry the two levels:

- `unit: paragraph <N> of <M> in <passage slug>` — on a paragraph Extraction
  only (rule 1). A Passage-level Extraction carries no `unit`.
- `contains: [<slug>, <slug>, ...]` — on a Passage-level Extraction only,
  listing the `name`s of its paragraph Extractions in the order the
  paragraphs run in the Passage. A `contains` on a paragraph Extraction
  would make a third level, and ingestion refuses it naming the field.
- `status: unreviewed model draft (m2)` — the first field of a paragraph
  Extraction no human has read yet. The owner removes it on review; nothing
  writes it back.

A paragraph Extraction is ingested with `tools/move_ingest.py passage
--from-extraction <pNN.yaml> [...]`, which reads the record off the
Extraction rather than asking a model for it, field by field as "Where each
field goes" below states. An Extraction with no `breaks` or no `description` is
refused naming the section, and a Markdown Extraction is refused by name.
The Move lands in `moves/`, the one library, as `<id>.yaml`, like any other
Move.

---

## Where each field goes

Every Move field comes from exactly one Extraction field, and every other
Extraction field becomes no Move field. `tools/move_ingest.py` copies the
fields; nothing in the copy is judged.

| Extraction field | Move field |
|------------------|------------|
| `name` | `id` |
| `segments` | `segments` — each Segment's `operation`, its `relation` on every Segment after the first, and its `manner` where one is filled; never `opening` or `content` |
| `breaks` | `breaks`, the list of prose tests |
| `takes` | `takes`, copied unchanged (kogaki#1698) |
| `leaves` | `leaves`, copied unchanged, each entry with its `segment` (kogaki#1698) |
| `description` | `description` — copied, with no machine role; over 200 characters is refused naming the length |

The `answers` (Q1 to Q3), `what_it_does`, `presupposes`, `notes` and the header fields
fields become no Move field. Of the stages after the Extraction, only the
Move-Extraction Playground's Leg Brief composer reads them: it hands each paragraph's
`what_it_does` and Segment `content` to its Leg call
(`src/move-extraction-playground/leg-brief.mjs`; its reader-start call is retired, kogaki#1699). `technique` is retired (kogaki#1412):
`segments` is the Move's whole structure, and a Move record carrying
`technique` is refused by name.

A Move's fields serve two readers (kogaki#1604). `operation`, `relation`
and `manner`, the three fields of each Segment, and `obligation` shape the
structure of the prose the Move produces. `takes` and `leaves` (kogaki#1698)
are read by judgment, at extraction and by the Composers that move to them,
for what the Move takes up and leaves; `obligation` is carried until the
ParagraphPlan's Issue retires it. `breaks` tells the Composer what the
Move needs of the Strand; it is read for Strand fit and shapes no sentence,
so a `breaks` test that instructs wording or sentence order is refused by
name. No Extraction writes `before` or `after` since kogaki#1699; a Move
admitted before then still carries them, read by the ParagraphPlan stage
alone until its Issue. No other field shapes prose, and no field carries a
condition on how a promise is kept: that condition is the Composer's,
written in the Plan and never in the Move.

---

## The three questions (one answered by the model, two asked)

Each question comes from a framework that has been used in research or
professional practice to ask why a stretch of prose works on its reader.
None is invented here. The sources are named so the set is revised
against them rather than by taste; a Passage none of the three can account
for is a finding against a named framework, recorded in `notes`, never
a reason to improvise a fifth question.

- **Q1. Purpose** (answered by the model, not asked) — *What is the writer
  doing for the reader in this stretch?* Swales' move analysis (genre analysis, 1990 onward): a text is
  coded as a sequence of rhetorical moves, each a communicative purpose.
  A candidate names the purpose as a verb phrase about the reader and says
  in one clause how the Passage carries it out.
- **Q2. Question** — *Which question does this stretch answer, and which
  question does it raise?* Question-under-discussion analysis in discourse
  semantics (Roberts 1996); Minto's Situation, Complication, Question,
  Answer is the same analysis as professional practice. A candidate names
  the question the reader holds on leaving, where it was raised, and
  where, if anywhere, it was answered.
- **Q3. Disposition** — *What has the Passage done to make the reader
  attentive, able to follow, and well-disposed toward the author?* The
  classical theory of the opening (Cicero and the Rhetorica ad Herennium:
  the exordium makes the audience attentum, docilem, benevolum). A
  candidate says which of the three the Passage works on most and by what
  means.
Retired: **Q4. Footing** — *What does the Passage assume the reader already
has, and what does it use it for?* (Ausubel's advance organizers; Bransford
and Johnson 1972). Its one consumer went with kogaki#1280, after which
nothing downstream read the answer, so an Extraction no longer writes it
(kogaki#1414). What a Passage needs the reader to hold already is still
recorded, in `presupposes`. The numbers Q1 to Q3 are kept so that earlier
Extractions read the same.

Considered and left out, with the reason: Aristotle's three appeals
(ethos, pathos, logos) are covered by Q3 and `presupposes`; Loewenstein's
information-gap account of curiosity is the mechanism behind Q2, not a
separate question; Rhetorical Structure Theory is reserved for the Packet,
where it describes how content is arranged rather than why it captivates.

### The five reader dimensions

Used wherever a reader state is written. Since kogaki#1699 no Extraction
and no Leg writes one: the set is read by a ParagraphPlan paragraph's
`reader_state_after` and by the `before` and `after` a Move admitted before
then carries, until the ParagraphPlan's Issue.

- **knowledge** — what the reader knows to be the case.
- **question** — what the reader currently wants answered.
- **expectation** — what the reader believes the text will do next.
- **orientation** — how the reader places this text among other texts,
  views, or kinds of book on the same subject.
- **trust** — how much the reader is prepared to believe this author.

**Their basis, dimension by dimension.** The set has no single source, and
this file does not claim one. The before-to-after transition is the
context-change reading of dynamic semantics: a stretch of text maps one
information state of the reader to another (Stalnaker's common ground;
Heim's context change potential), and Roberts's question under discussion
adds the stack of open questions to that state. **knowledge** and
**question** are the two canonical components of that information state.
**expectation** and **orientation** descend from Swales's genre analysis:
a reader who knows the genre predicts the next move, and orientation is
Swales's establishing of a niche among the other texts on the subject. **trust** is
classical ethos, which Q3 already cites as the disposition the opening
works on, with Hyland's stance and engagement as the modern account. Swales
does not ground the set as a whole: move analysis classifies the writer's
purposes, not the reader's state, and it grounds Q1 and the Move as
Kogaki's unit. The set is not claimed to be exhaustive. It is kept because
it passes the test of its consumers: binding and the judge compare all five,
and the closing-Leg check holds orientation and knowledge fixed after the
target Leg.

---

## The protocol

Three steps. The human acts once, at step 2.

### Step 1 — the model writes candidates

Read the Passage. If the Passage refers to a figure and the figure's image
is given with it, first produce a Figure spec by `FIGURE.md`, which sits
beside this file, and treat the figure as part of the Passage from then
on: it is one entry in the order section, and it counts toward what
`presupposes` says the reader already has. If the Passage refers to a
figure that was not given, record "figure referred to, not given" in the
notes and extract from the prose alone.

Take nothing from the human but the Passage and, where there is one, the
figure's image: do not ask for its title, its author, where it sits in the
work, or anything else about it. What the header needs is inferred from the text, and what
cannot be inferred is written as "not determinable from the Passage".

Answer Q1 yourself; it becomes `what_it_does` and is recorded under Answers
as `answer: model`. For each of Q2 and Q3 write three candidate
answers, each one or two sentences, each a genuinely different answer to
that question and not a rewording of another. Order them with the one you
find best supported first. Do not show working; show candidates. Where you
cannot write three genuinely different answers, write the ones you can:
a padded candidate that nobody would choose is worse than a missing one.

Also list every noun that names this Passage's subject — the thing the
Passage is about, never the reader, the author, or the technique — as the
`subject nouns` Reading. This is one list, not three candidates: there is
no alternative reading of which nouns are the subject, only a judgment the
human may correct.

### Step 2 — the human answers the two questions in one round

Present the two questions together, in the shape under "Step 2 as
rendered" below. Each question offers its three candidates and a fourth
option, write your own. The human answers each question with a candidate
number or with a line of their own text. A question the human finds not
relevant to this Passage is answered "none". Nothing else is asked.

Present the `subject nouns` list alongside the two questions, as given,
for the human to confirm or edit; it is not numbered, because there is no
alternative candidate to choose among, only the one list the model wrote.

Present the Segments as a third item, beside the Passage: the model's
proposed cut, each Segment given as its opening words and its `operation`.
The human answers with one line, either accepting the cut as proposed or
redrawing it (naming the merge, split, or renumbering). `segments` is
written from whichever cut the human confirms, never from the model's
first proposal where the human redrew it.

- In a Claude Code session this is one AskUserQuestion carrying two
  questions, each with the candidates and a fourth option labelled
  "Write my own" as its options. A "Write my own" choice is followed by
  the human's text in the same answer. Render the two questions with
  their candidates in the reply text before the call as well, because a
  long option is clipped in the question widget.
- In a chat session this is one message in exactly the rendered shape,
  and the human replies on one line, for example `2: 1, 3: my own
  text here`.

### Step 3 — the model writes the Extraction

Fill every field of the record under "The Extraction" and write the file.
The human's
answers are the ground truth about what matters: `what_it_does`, `breaks` and `description` are
built on them, above all on the answers to Q1 and to whichever question
the human answered in their own words. Candidates the human did not choose
are kept in the file. The derivation act later reads, across the Corpus,
which questions the human answered in their own words, as a signal about
what a Move schema must carry. The position of the chosen candidate is
not a signal: in the first round 53 of 84 choices were the first
candidate, which measured the candidate format, not the text.

Rules for the writer of an Extraction throughout:

1. Write about the reader's state, not the text's content. "The reader now
   holds the question X" is an answer; "the passage discusses X" is not.
2. Quote the Passage in short phrases where the movement happens. Never
   paste it back in full outside `passage`.
3. Keep every section to the length its field documentation allows. If a
   section wants to be longer, the Passage probably contains more than one
   unit; say so in `notes` rather than expanding.
4. Write everything you produce in English, whatever language the Passage
   is in: the candidates at step 2, every header field, and every section.
   `passage` alone is verbatim in its own language, including
   any emphasis marks it carries. A quotation from a non-English Passage,
   in the evidence line or in `segments`, is given in the original followed
   by a short English gloss in brackets. The Corpus must be readable in
   one language by the derivation act, and the candidates the human chose
   must be recorded in the words they were shown.
5. Ask the human nothing beyond step 2, and nothing about the Passage at
   all. If the Passage is given without a title, the source line says so;
   if you cannot tell where it sits in its work, the position line says
   so. A missing header fact is recorded, never requested.

---

## Step 2 as rendered

```
Two questions about the Passage. For each, pick a number or write your
own answer. Answer "none" if the question does not apply here.

Q2. Which question does this stretch answer, and which does it raise?
  1. <candidate>
  2. <candidate>
  3. <candidate>
  4. Write my own

Q3. What has it done to make the reader attentive, able to follow, and
    well-disposed toward the author?
  1. <candidate>
  2. <candidate>
  3. <candidate>
  4. Write my own

Segments — the proposed cut of the Passage:
  1. "<opening words>" — <does>
  2. "<opening words>" — <does>
  ...
Accept this cut as proposed, or redraw it in one line.

Reply on one line, e.g. "2: 1, 3: my own text, segments: accepted".
```

---

## The Extraction

The Extraction is one YAML record, `<slug>.yaml`, read and written by the
Brief's one YAML reader (`src/yaml.mjs`). Fill every field. Keep the keys
exactly as written; a key the record does not name is refused at ingestion.
A Markdown Extraction — a file whose first heading is `# Extraction:` — is
refused by name: it is the retired form, and the record replaces it.

```yaml
# Extraction: <slug>

name: <slug>
source: <the work, or "not given">
subject_nouns: [<noun>, <noun>]
prior_text: <assumed | not assumed — the textual sign>
length: <N sentences, M paragraphs>
language: <the language as given>
unit: <paragraph extractions only>
contains: [<paragraph slug>, <paragraph slug>]
passage: <the Passage, verbatim>
figure: <the Figure spec, when there is one>
answers:
  q1:
    answer: model — <one sentence>
  q2:
    candidates: [<candidate>, <candidate>, <candidate>]
    answer: <a number, "own: <text>", or "none">
  q3:
    candidates: [<candidate>, <candidate>, <candidate>]
    answer: <as above>
what_it_does: <one sentence>
segments:
  - opening: <the quoted opening words>
    content: <what this Segment does with the Passage's own content>
    operation: <the operation, subject-free>
  - opening: <...>
    content: <...>
    operation: <...>
    relation: <how this Segment relates to the one before it>
    manner: <only where operation and relation cannot name the technique>
why_this_order: <one sentence>
presupposes: <two or three lines>
breaks:
  - <a change a careful writer might make — what the reader loses>
description: <one or two sentences, at most 200 characters>
notes: <anything the contract did not ask for, or nothing>
split_notes:
  - note: <a second unit the Passage may hold>
    dismissed: <the same text, when the human dismisses it>
```

What each field holds:

- `source` — the work, if the Passage or the human's message names it;
  otherwise "not given".
- `subject_nouns` — every noun naming this Passage's subject — the thing
  the Passage is about, never the reader or the technique — offered by the
  model as a list and confirmed or edited by the human at step 2 like every
  other Reading; an empty list for none.
- `prior_text` — whether the Passage relies on text before it, with the
  textual sign in one clause.
- `length` — sentences and paragraphs, counted.
- `language` — the language of the text as given, and "reads as
  translated" with one sign if so.
- `unit` — paragraph extractions only: "paragraph <N> of <M> in <passage
  slug>", see "The paragraph unit"; omitted on a Passage-level Extraction.
- `contains` — Passage-level extractions only: the `name`s of its
  paragraph Extractions, in the order the paragraphs run; omitted until
  they exist, and never on a paragraph Extraction.
- `passage` — the Passage, verbatim, as given.
- `figure` — the Figure spec from FIGURE.md, when the Passage carries a
  figure; omitted otherwise. The image itself is never stored.
- `answers` — Q1 Purpose, Q2 Question and Q3 Disposition, each with the
  candidates shown at step 2 and the answer recorded there.
- `what_it_does` — one sentence. A verb phrase about the reader, with no
  words from the Passage's subject, built on the answers above.
- `reader` and `dimensions_changed` — retired (kogaki#1699): an Extraction
  records no reader state. What the Passage takes up and leaves is `takes`
  and `leaves`.
- `segments` — one entry per Segment, in the cut the human confirmed at
  step 2. `opening` is the quoted opening words of that Segment. `content`
  is one clause saying what the Segment does, written about this Passage's
  own content. `operation` is the Segment's operation in one clause,
  subject-free, naming no term,
  place, person or claim of the original, so that it could be performed on
  any subject, and stating what the step does, never its effect on the
  reader. On every Segment after the first, `relation` is one clause
  stating, in prose, how this Segment relates to the one before it;
  Segment 1 carries none ("The paragraph unit", rule 5). `manner` is left
  out unless the Segment's technique is one `operation` and `relation`
  together cannot name: then it is one clause naming a local realisation
  the Passage shows at that Segment — a brief direct statement that takes
  no elaboration, a quotation, a shift of form — never a point, never a
  reason, never a restatement of the `operation`, and naming no term,
  place, person or claim of the original. Left out is the normal case. No
  label set is used for any of the three. `operation`, `relation` and
  `manner` are written general: none names a term, place, person or claim of
  the original, any of `subject_nouns`, or a word in the original's
  language. `content` and `opening` are the only Segment fields bound to the
  source (kogaki#1519). A Segment with no `operation`, a
  Segment after the first with no `relation`, or Segment 1 carrying one, is
  refused at ingestion, naming the Segment's number.
- `why_this_order` — one sentence stating why this order and not another.
- `presupposes` — two or three lines. What the reader must already have,
  in any of the five dimensions, for this Passage to land. A reader lacking
  it would read the same words and feel nothing; say what they would feel
  instead.
- `breaks` — a list of prose tests, each one line: one specific change a
  careful writer might make to the Passage, a dash, what the reader loses.
  Each test names a change no other test names. The tests are read whole;
  there are no keys and no fixed kinds. Do not leave out the plausible
  addition: a longer version is where density goes wrong, so be specific
  about what it would cost. Each test is written general, as `operation`
  is: it names no term, place, person or claim of the original, none of
  `subject_nouns`, and no word in the original's language, so that it tests
  the Move on any subject (kogaki#1519). A `breaks` that is not a list of
  one-line strings is refused at ingestion.
- `takes` — always present, possibly empty: a list of `{kind, what}`, what
  Segment 1 takes up on entry ("The paragraph unit", rule 8, kogaki#1698).
  `kind` is one of `answer`, `explain`, `carry` and `apply`; `what` is one
  line, written general; no two entries are alike in both. An entry
  carrying `segment` or any other key is refused. The ingest copies it to
  the Move unchanged.
- `leaves` — always present, possibly empty: a list of
  `{kind, what, segment}`, what the paragraph leaves for a later unit, each
  entry naming the Segment that leaves it, under the same rules as `takes`;
  a `segment` outside the record's Segments is refused. The ingest copies
  it to the Move unchanged.
- `obligation`, `obligation_triggers` — retired from the Extraction by
  kogaki#1698. A Move record admitted before it may still carry both; the
  library re-judge (`extract.mjs rejudge --constraints --library <dir>`)
  derives `takes` and `leaves` for such a record from its `segments`,
  `before`, `after` and `obligation`, and `moves/ROLES.json` names the
  fields so the record still loads.
- `description` — one or two sentences telling a person reading the Move
  library what this Passage does, at most 200 characters. It has no machine
  role: no prompt renders it, and the ingest reads only that it is present
  and within the bound (kogaki#1412). The Move's structure is `segments`.
- `name` — a snake_case verb phrase naming the transformation, like the
  slug. Not the topic.
- `notes` — anything the contract did not ask for: a question none of
  whose candidates fit and what the human wrote instead, a resemblance to
  another Extraction in the Corpus by name, or nothing.
- `split_notes` — a note that names a second unit inside the Passage.
  Ingestion refuses on a `split_notes` entry until the Passage is split
  into two Extractions, or the human dismisses it by repeating the note
  verbatim as its `dismissed`.

---

## Worked example

The Passage is the opening of a Japanese trade book on geopolitics, in
English translation.

### Step 2, as rendered

```
Two questions about the Passage. For each, pick a number or write your
own answer. Answer "none" if the question does not apply here.

Q2. Which question does this stretch answer, and which does it raise?
  1. Answers "why is everyone reading about geopolitics now?", raised at
     "something of an anomaly" and answered at "the instability of the
     world"; raises "what is unstable now?" and leaves it for the book.
  2. Answers "is this book different from the others?", raised by the
     survey of formats and answered by "This book, too, will probably be
     placed alongside"; raises nothing further.
  3. Raises "should I read about geopolitics at all?" and answers it with
     the historical pattern that interest surges when the world worsens.
  4. Write my own

Q3. What has it done to make the reader attentive, able to follow, and
    well-disposed toward the author?
  1. Attention from the incongruity of a stagnant industry and a growing
     shelf; ability to follow from promising one cause rather than a
     field; goodwill from an author admitting, against interest, that the
     shelf is already full.
  2. Mostly goodwill: the self-deprecating first sentence and the fair
     survey of rival formats make the author sound honest before any
     claim is made.
  3. Mostly attention: the one-sentence answer arrives so fast that the
     reader is pulled forward to see it justified.
  4. Write my own

Segments — the proposed cut of the Passage:
  1. "It may sound strange..." — names the speaker's own stake
  2. "bookstores are now overflowing..." — hands over one checkable fact
  3. "Some make extensive use of maps..." — surveys the existing approaches
  4. "At a time when the publishing industry..." — states an incongruity
  5. "This book, too, will probably be placed..." — places the present work
  6. "So why has geopolitics attracted..." — states the reader's question
  7. "The biggest reason is the instability..." — answers with one cause
  8. "Throughout history, interest..." — generalizes the answer
Accept this cut as proposed, or redraw it in one line.

Reply on one line, e.g. "2: 1, 3: my own text, segments: accepted".
```

Human's reply: `2: 1, 3: starting from book sales, which needs no
specialist knowledge, makes a difficult subject easy to enter, segments:
accepted`

### Step 3, the file

```yaml
# Extraction: enter_a_hard_subject_through_the_readers_own_world

name: enter_a_hard_subject_through_the_readers_own_world
source: not given
subject_nouns: [geopolitics, book, world]
prior_text: >-
  not assumed — "It may sound strange for someone who..." opens with no
  earlier reference, and "This book" is an object the reader has not yet
  entered
length: 12 sentences, 3 paragraphs
language: >-
  English; reads as translated (Japanese publishing references, "manga or
  novels", "scholars from Japan and abroad")
passage: "It may sound strange for someone who has already published books
  on geopolitics to say this, but bookstores are now overflowing with books
  on the subject.\n\nSome make extensive use of maps and illustrations.
  Others take the form of manga or novels to make them easier to read. Still
  others are academic works in which scholars from Japan and abroad apply
  their specialist knowledge. The formats vary widely. At a time when the
  publishing industry is stagnating, books on geopolitics continue to
  increase their sales, making them something of an anomaly. They are now
  beginning to form an independent genre of their own. This book, too, will
  probably be placed in bookstores alongside many of those other geopolitics
  books.\n\nSo why has geopolitics attracted so much attention? The biggest
  reason is the instability of the world in recent years. The current boom
  in geopolitics did not begin only recently. Throughout history, interest
  in geopolitics has repeatedly surged whenever the international situation
  deteriorated.\n"
answers:
  q1:
    answer: >-
      model — Lowering the reader's guard against a hard subject by opening
      on something that needs no expertise at all.
  q2:
    candidates:
      - >-
        Answers "why is everyone reading about geopolitics now?", raised at
        "something of an anomaly" and answered at "the instability of the
        world"; raises "what is unstable now?" and leaves it for the book.
      - >-
        Answers "is this book different from the others?", raised by the
        survey of formats and answered by "This book, too, will probably be
        placed alongside"; raises nothing further.
      - >-
        Raises "should I read about geopolitics at all?" and answers it with
        the historical pattern that interest surges when the world worsens.
    answer: "1"
  q3:
    candidates:
      - >-
        Attention from the incongruity of a stagnant industry and a growing
        shelf; ability to follow from promising one cause rather than a
        field; goodwill from an author admitting, against interest, that the
        shelf is already full.
      - >-
        Mostly goodwill: the self-deprecating first sentence and the fair
        survey of rival formats make the author sound honest before any
        claim is made.
      - >-
        Mostly attention: the one-sentence answer arrives so fast that the
        reader is pulled forward to see it justified.
    answer: >-
      own: starting from book sales, which needs no specialist knowledge,
      makes a difficult subject easy to enter
what_it_does: >-
  Opens a subject the reader expects to be hard by standing entirely on
  things that need no expertise, and only then hands them the question the
  subject exists to answer.
segments:
  - opening: It may sound strange for someone who...
    content: >-
      puts the author in the room and makes the next sentence an admission.
    operation: >-
      names the speaker's own stake in the subject so the statement that
      follows reads as a concession.
  - opening: bookstores are now overflowing
    content: hands the reader a fact they can confirm.
    operation: states one fact the reader can confirm for themselves.
    relation: the fact is the concession the previous step set up.
  - opening: Some make extensive use of maps... academic works
    content: shows the field is varied and that the author has surveyed it.
    operation: >-
      surveys the range of existing approaches, showing the speaker has
      covered the field.
    relation: widens the one fact into the range of cases behind it.
  - opening: At a time when the publishing industry is stagnating...
    content: builds the incongruity.
    operation: >-
      states an incongruity between a general trend and a specific exception
      to it.
    relation: sets the surveyed growth against the trend it runs counter to.
  - opening: This book, too, will probably be placed...
    content: places this book inside the genre just surveyed.
    operation: places the present work inside the field just surveyed.
    relation: >-
      follows from the exception: the present work is one more case of it.
  - opening: So why has geopolitics attracted so much attention?
    content: names the reader's question for them.
    operation: >-
      states the reader's own question in their voice, naming it directly.
    relation: asks the question the incongruity left open.
  - opening: The biggest reason is the instability of the world
    content: answers it at once.
    operation: answers the question with a single stated cause.
    relation: answers the question just asked.
    manner: a brief direct statement, given with no elaboration.
  - opening: Throughout history, interest... has repeatedly surged
    content: generalizes the answer so it becomes the book's thesis.
    operation: >-
      generalizes the answer into a recurring pattern so it becomes the
      work's thesis.
    relation: extends the single cause into a pattern over time.
why_this_order: >-
  The order works because every foothold is placed before the first
  specialist claim, and the question is asked only once the reader has
  enough to want it.
presupposes: >-
  The reader has been in a bookstore recently and has noticed the shelf. The
  reader has a vague sense that "the world is unstable" without being able
  to say why. A reader with neither would read the same words as a sales
  pitch.
breaks:
  - >-
    drop the author's admission in sentence 1 — the survey of the genre
    reads as promotion, and trust does not rise
  - >-
    put the question before the survey — the reader has no foothold yet and
    no reason to care about the answer
  - >-
    add two paragraphs defining geopolitics before the question — the first
    specialist claim arrives before the footholds are set, and the reader is
    back to expecting a textbook
description: >-
  Before the first claim that needs the subject, the reader gets three
  things that need none; then the subject's central question is named in
  their voice and answered.
notes: >-
  The human answered Q3 in their own words; the closest candidate was 1,
  which named the same means without the point that none of them needs
  expertise. That point is carried into what_it_does and description.
split_notes:
  - note: the Passage may hold two units, sentences 1 to 5 and 6 to 8
    dismissed: the Passage may hold two units, sentences 1 to 5 and 6 to 8
```
