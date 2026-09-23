# Passage analysis: the interaction contract

This file is the whole protocol for turning one Passage into one Analysis.
Hand it to a model together with one Passage. The model answers the
first analytical question itself and asks the human the other three,
offering candidate answers it wrote itself; the human picks one per
question or writes their own; the model then writes the Analysis file. It runs unchanged in a Claude Code session and in a chat
session. Nothing else is needed or permitted as context.

It ends at the Analysis. Turning an Analysis into a Move is a separate
contract that will be written once the Move schema has been derived from
the Corpus; this file does not extract Moves.

## Terms

- **Passage** — one contiguous piece of prose the owner selected by hand
  because it forms one meaningful unit. The owner decides the boundaries.
  That selection is the whole of the human's input before analysis.
- **Question** — one of the four analytical questions below, each taken
  from an established framework. Q1 the model answers itself; for Q2, Q3
  and Q4 it writes three candidates and the human chooses. (Q1 left the
  human's screen on 2026-09-23: in the first round of 21 Analyses the human
  chose the model's first candidate 20 times and saw no need for the
  question.)
- **Segment** — one entry of section 3: a sentence or group of sentences
  that does one thing to the reader. The model draws the boundaries. Each
  Segment carries one **function**: it *raises* a question the reader did
  not hold, *advances* toward an answer to a question already open, or
  *settles* one. The functions come from Q2's frameworks (Minto; question
  under discussion). No position in the work is inferred for the Passage
  as a whole: where an earlier form of this contract asked "opening, body
  or closing", the model produced a fourth value, "continuation", for
  Passages that presupposed prior text, which is what Q4 records. A
  Passage may run from an opening to a closing; the Segments carry that,
  and the human never cuts a paragraph out to make it visible.
- **Analysis** — the artifact this contract produces from one Passage: the
  Passage verbatim, the four questions (Q1 the model's own, Q2 to Q4 with their candidates) and the
  human's answers, and the filled sections below. One file per Passage.
- **Corpus** — the collection of Analyses. It is the input to a later act
  that derives a Move schema; that act has its own format and is not this
  one.

How long the Passage is, what language it is in, and whether it assumes
prior text are inferred by the model from the Passage itself and recorded;
they are never asked of the human. Properties
of a Move are assigned later, at derivation, over the whole Corpus. This
contract never asks for a Move, a schema, or a Property.

## Filing convention

One file per Passage, `<slug>.md`, in a private directory the owner names
when the Corpus is started. The slug is the candidate name from section 7,
a snake_case verb phrase. The owner may rename it. The Corpus is temporary
design evidence: it exists to derive one Move schema, is never kept in
kogaki, which is public, and is deleted once the schema is settled, because
each Analysis carries its Passage verbatim; see "The source text boundary".

## The source text boundary

Three artifacts touch the source text, and each keeps a different amount.

- **The Analysis keeps the Passage verbatim, in the private, temporary
  Corpus only.**
  Its use is audit and re-analysis: a reader checking an Analysis, or a
  re-run after this contract changes, needs the text. The derivation act
  reads the Analyses, never the Passages, so the verbatim text has no
  downstream reader and never travels. A Passage longer than one section
  of its work is not one unit; split it before analysis.
- **An Analysis that leaves the private Corpus keeps no Passage.** If one
  is published, moved to a public repository, or quoted in an Issue, its
  Passage section is replaced by one line naming the source and where the
  Passage sits, and everything else stays. The short quotations in the
  evidence line and section 3, a few words each with a gloss, are the
  bounded quotation that survives; they are quoted for commentary and are
  subordinate to it.
- **A Move carries no quotation.** kogaki's extraction contract already
  rules (kogaki#751, 2026-09-02) that a Move's evidence is the extractor's
  own account of the reader movement and never verbatim text; the Analysis
  sections 1, 3 and 6 are written to be that account. Nothing in the
  Passage section is ever copied into a Move.

---

## The four questions (one answered by the model, three asked)

Each question comes from a framework that has been used in research or
professional practice to ask why a stretch of prose works on its reader.
None is invented here. The sources are named so the set is revised
against them rather than by taste; a Passage none of the four can account
for is a finding against a named framework, recorded in section 8, never
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
- **Q4. Footing** — *What does the Passage assume the reader already has,
  and what does it use it for?* Ausubel's advance organizers and the
  schema-theory account of comprehension (Bransford and Johnson 1972). A
  candidate names the footholds, each with its source (the subject, the
  reader's own world, other texts, the author), and what the Passage does
  with them.

Considered and left out, with the reason: Aristotle's three appeals
(ethos, pathos, logos) are covered by Q3 and Q4; Loewenstein's
information-gap account of curiosity is the mechanism behind Q2, not a
separate question; Rhetorical Structure Theory is reserved for the Packet,
where it describes how content is arranged rather than why it captivates.

### The five reader dimensions

Used wherever a reader state is written.

- **knowledge** — what the reader knows to be the case.
- **question** — what the reader currently wants answered.
- **expectation** — what the reader believes the text will do next.
- **orientation** — how the reader places this text among other texts,
  views, or kinds of book on the same subject.
- **trust** — how much the reader is prepared to believe this author.

---

## The protocol

Three steps. The human acts once, at step 2.

### Step 1 — the model writes candidates

Read the Passage. If the Passage refers to a figure and the figure's image
is given with it, first produce a Figure spec by `FIGURE.md`, which sits
beside this file, and treat the figure as part of the Passage from then
on: it is one entry in the order section, and it counts as a foothold
where Q4 asks what the reader already has. If the Passage refers to a
figure that was not given, record "figure referred to, not given" in the
notes and analyze the prose alone.

Take nothing from the human but the Passage and, where there is one, the
figure's image: do not ask for its title, its author, where it sits in the
work, or anything else about it. What the header needs is inferred from the text, and what
cannot be inferred is written as "not determinable from the Passage".

Answer Q1 yourself; it becomes section 1 and is recorded under Answers
as `answer: model`. For each of Q2, Q3 and Q4 write three candidate
answers, each one or two sentences, each a genuinely different answer to
that question and not a rewording of another. Order them with the one you
find best supported first. Do not show working; show candidates. Where you
cannot write three genuinely different answers, write the ones you can:
a padded candidate that nobody would choose is worse than a missing one.

### Step 2 — the human answers the three questions in one round

Present the three questions together, in the shape under "Step 2 as
rendered" below. Each question offers its three candidates and a fourth
option, write your own. The human answers each question with a candidate
number or with a line of their own text. A question the human finds not
relevant to this Passage is answered "none". Nothing else is asked.

- In a Claude Code session this is one AskUserQuestion carrying three
  questions, each with the candidates and a fourth option labelled
  "Write my own" as its options. A "Write my own" choice is followed by
  the human's text in the same answer. Render the three questions with
  their candidates in the reply text before the call as well, because a
  long option is clipped in the question widget.
- In a chat session this is one message in exactly the rendered shape,
  and the human replies on one line, for example `2: 1, 3: my own
  text here, 4: none`.

### Step 3 — the model writes the Analysis

Fill every section under "The Analysis" and write the file. The human's
answers are the ground truth about what matters: sections 1, 5 and 6 are
built on them, above all on the answers to Q1 and to whichever question
the human answered in their own words. Candidates the human did not choose
are kept in the file. The derivation act later reads, across the Corpus,
which questions the human answered in their own words, as a signal about
what a Move schema must carry. The position of the chosen candidate is
not a signal: in the first round 53 of 84 choices were the first
candidate, which measured the candidate format, not the text.

Rules for the analyst throughout:

1. Write about the reader's state, not the text's content. "The reader now
   holds the question X" is an answer; "the passage discusses X" is not.
2. Quote the Passage in short phrases where the movement happens. Never
   paste it back in full outside the Passage section.
3. Keep every section to the length its heading allows. If a section wants
   to be longer, the Passage probably contains more than one unit; say so
   in section 8 rather than expanding.
4. Write everything you produce in English, whatever language the Passage
   is in: the candidates at step 2, every header line, and every section.
   The Passage section alone is verbatim in its own language, including
   any emphasis marks it carries. A quotation from a non-English Passage,
   in the evidence line or in section 3, is given in the original followed
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
Three questions about the Passage. For each, pick a number or write your
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

Q4. What does it assume the reader already has, and what does it use it
    for?
  1. <candidate>
  2. <candidate>
  3. <candidate>
  4. Write my own

Reply on one line, e.g. "2: 1, 3: my own text, 4: none".
```

---

## The Analysis

Fill every section. Keep the headings exactly as written.

```
# Passage analysis: <slug>

source: <the work, if the Passage or the human's message names it;
        otherwise "not given">
functions: <the function of each Segment of section 3, in order, e.g.
        "advances, advances, raises, settles">
prior text: <assumed | not assumed — whether the Passage relies on text
        before it, with the textual sign in one clause>
length: <N sentences, M paragraphs, counted>
language: <the language of the text as given, and "reads as translated"
        with one sign if so>

## Passage

<the Passage, verbatim, as given>

<the Figure spec from FIGURE.md, when the Passage carries a figure;
omitted otherwise. The image itself is never stored.>

## Answers

Q1 Purpose
  answer: model — <the model's one-sentence answer>

Q2 Question
  1. <candidate>
  2. <candidate>
  3. <candidate>
  answer: <as above>

Q3 Disposition
  1. <candidate>
  2. <candidate>
  3. <candidate>
  answer: <as above>

Q4 Footing
  1. <candidate>
  2. <candidate>
  3. <candidate>
  answer: <as above>

## 1. What the Passage does

<One sentence. A verb phrase about the reader, with no words from the
Passage's subject, built on the answers above.>

## 2. Reader before and after

| dimension   | before                         | after                          |
|-------------|--------------------------------|--------------------------------|
| knowledge   | <state or "unchanged">         | <state or "unchanged">         |
| question    |                                |                                |
| expectation |                                |                                |
| orientation |                                |                                |
| trust       |                                |                                |

Strongest change: <one dimension>. Second: <one dimension or "none">.

## 3. The order inside the Passage

<A numbered list, one entry per Segment, in the order they appear. Each
entry: the quoted opening words of that Segment, a dash, its function
(raises | advances | settles), a dash, then what it does to the reader in
one clause. Then one sentence stating why this order and not another.>

## 4. What the Passage presupposes

<Two or three lines. What the reader must already have, in any of the
five dimensions, for this Passage to land. A reader lacking it would read
the same words and feel nothing; say what they would feel instead.>

## 5. Where it would break

<Three tests, one line each:
  remove:  <one element from the answers or section 3> — <what the reader
           loses>
  reorder: <one swap from section 3> — <what the reader loses>
  extend:  <one plausible addition a careful writer might make> — <what
           the reader loses>
The third test is where density goes wrong; be specific about what a
longer version would cost.>

## 6. The technique, subject-free

<Two or three sentences a writer on a completely different topic could
follow. No words from this Passage's subject. If you cannot write it
without the subject, the Passage is not yet understood; say so in 8.>

## 7. Candidate name

<A snake_case verb phrase naming the transformation, like the slug. Not
the topic.>

## 8. Notes

<Anything the contract did not ask for: a second unit inside the Passage,
a question none of whose candidates fit and what the human wrote instead,
a resemblance to another Analysis in the Corpus by slug, or nothing.>
```

---

## Worked example

The Passage is the opening of a Japanese trade book on geopolitics, in
English translation.

### Step 2, as rendered

```
Three questions about the Passage. For each, pick a number or write your
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

Q4. What does it assume the reader already has, and what does it use it
    for?
  1. A bookstore shelf the reader has seen (reader's world), a sense of
     book formats (other texts), and the author's own position (the
     author); used to survey the field, place the book, and earn trust
     before any specialist term appears.
  2. A vague sense that the world is unstable (reader's world); used so
     that the one-line answer feels already known rather than asserted.
  3. The word geopolitics and nothing more (subject); used to promise
     that no more than that will be required.
  4. Write my own

Reply on one line, e.g. "2: 1, 3: my own text, 4: none".
```

Human's reply: `2: 1, 3: 1, 4: starting from book sales, which
needs no specialist knowledge, makes a difficult subject easy to enter`

### Step 3, the file

```
# Passage analysis: enter_a_hard_subject_through_the_readers_own_world

source: not given
functions: advances, advances, advances, raises, advances, raises,
        settles, settles
prior text: not assumed — "It may sound strange for someone who..." opens
        with no earlier reference, and "This book" is an object the reader
        has not yet entered
length: 12 sentences, 3 paragraphs
language: English; reads as translated (Japanese publishing references,
        "manga or novels", "scholars from Japan and abroad")

## Passage

It may sound strange for someone who has already published books on
geopolitics to say this, but bookstores are now overflowing with books on
the subject.

Some make extensive use of maps and illustrations. Others take the form of
manga or novels to make them easier to read. Still others are academic
works in which scholars from Japan and abroad apply their specialist
knowledge. The formats vary widely. At a time when the publishing industry
is stagnating, books on geopolitics continue to increase their sales,
making them something of an anomaly. They are now beginning to form an
independent genre of their own. This book, too, will probably be placed in
bookstores alongside many of those other geopolitics books.

So why has geopolitics attracted so much attention? The biggest reason is
the instability of the world in recent years. The current boom in
geopolitics did not begin only recently. Throughout history, interest in
geopolitics has repeatedly surged whenever the international situation
deteriorated.

## Answers

Q1 Purpose
  answer: model — Lowering the reader's guard against a hard subject by
          opening on something that needs no expertise at all.

Q2 Question
  1. Answers "why is everyone reading about geopolitics now?", raised at
     "something of an anomaly" and answered at "the instability of the
     world"; raises "what is unstable now?" and leaves it for the book.
  2. Answers "is this book different from the others?", raised by the
     survey of formats and answered by "This book, too, will probably be
     placed alongside"; raises nothing further.
  3. Raises "should I read about geopolitics at all?" and answers it with
     the historical pattern that interest surges when the world worsens.
  answer: 1

Q3 Disposition
  1. Attention from the incongruity of a stagnant industry and a growing
     shelf; ability to follow from promising one cause rather than a
     field; goodwill from an author admitting, against interest, that the
     shelf is already full.
  2. Mostly goodwill: the self-deprecating first sentence and the fair
     survey of rival formats make the author sound honest before any
     claim is made.
  3. Mostly attention: the one-sentence answer arrives so fast that the
     reader is pulled forward to see it justified.
  answer: 1

Q4 Footing
  1. A bookstore shelf the reader has seen (reader's world), a sense of
     book formats (other texts), and the author's own position (the
     author); used to survey the field, place the book, and earn trust
     before any specialist term appears.
  2. A vague sense that the world is unstable (reader's world); used so
     that the one-line answer feels already known rather than asserted.
  3. The word geopolitics and nothing more (subject); used to promise
     that no more than that will be required.
  answer: own: starting from book sales, which needs no specialist
          knowledge, makes a difficult subject easy to enter

## 1. What the Passage does

Opens a subject the reader expects to be hard by standing entirely on
things that need no expertise, and only then hands them the question the
subject exists to answer.

## 2. Reader before and after

| dimension   | before                                   | after                                              |
|-------------|------------------------------------------|----------------------------------------------------|
| knowledge   | little; may know the word                | one claim: interest rises when the world is unstable |
| question    | none, or "should I read this?"           | "why is everyone reading about this now?" answered; "what is unstable now?" opened |
| expectation | a definition or a table of contents      | the book will explain instability through geopolitics |
| orientation | this is one more geopolitics book        | this book knows the genre and places itself inside it |
| trust       | neutral                                  | raised: the author admits their own position and names a fact against interest |

Strongest change: expectation. Second: question.

## 3. The order inside the Passage

1. "It may sound strange for someone who..." — advances — puts the author in the
   room and makes the next sentence an admission.
2. "bookstores are now overflowing" — advances — hands the reader a fact they can
   confirm.
3. "Some make extensive use of maps... academic works" — advances — shows the field
   is varied and that the author has surveyed it.
4. "At a time when the publishing industry is stagnating..." — raises — builds the
   incongruity.
5. "This book, too, will probably be placed..." — advances — places this book inside
   the genre just surveyed.
6. "So why has geopolitics attracted so much attention?" — raises — names the
   reader's question for them.
7. "The biggest reason is the instability of the world" — settles — answers it at
   once.
8. "Throughout history, interest... has repeatedly surged" — settles — generalizes
   the answer so it becomes the book's thesis.

The order works because every foothold is placed before the first
specialist claim, and the question is asked only once the reader has
enough to want it.

## 4. What the Passage presupposes

The reader has been in a bookstore recently and has noticed the shelf.
The reader has a vague sense that "the world is unstable" without being
able to say why. A reader with neither would read the same words as a
sales pitch.

## 5. Where it would break

remove:  the author's admission in sentence 1 — the survey of the genre
         reads as promotion, and trust does not rise
reorder: put the question before the survey — the reader has no foothold
         yet and no reason to care about the answer
extend:  add two paragraphs defining geopolitics before the question — the
         first specialist claim arrives before the footholds are set, and
         the reader is back to expecting a textbook

## 6. The technique, subject-free

Before the first claim that needs the subject, give the reader three
things that need none: something they have seen, a map of the kinds of
text on the subject, and an admission by the author that costs something.
Then name the subject's central question in the reader's voice and answer
it in one sentence.

## 7. Candidate name

enter_a_hard_subject_through_the_readers_own_world

## 8. Notes

The human answered Q4 in their own words; the closest candidate was 1,
which named the same footholds without the point that none needs
expertise. That point is carried into sections 1 and 6. The Passage may
hold two units, sentences 1 to 5 and 6 to 8; if the Corpus shows them
recurring separately, split it.
```
