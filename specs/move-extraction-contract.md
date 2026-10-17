# Move extraction contract

Paste this whole file into the conversation after the model has read the
article. It is self-contained: no other context is needed or permitted —
by the model. The Extraction beside the Passage is a second input (kogaki#1320),
read by `tools/move_ingest.py` itself, after the model returns its record,
and never handed to the model. See "The `segments` field" below.

Rebuilt 2026-09-23 (kogaki#1175, owner ruling, kogaki#1173's ten schema
questions). The prior eight-field schema (`intent`, `requires`, `effect`,
`constraints`, `failure_modes`, `excerpt`, `status`, plus `visual_form`) is
withdrawn in full: it was decided without a corpus behind it, and its
`requires`/`effect` pair admitted only a change in the reader's *knowledge* —
every one of the 22 Moves it produced began `requires` with "the reader
understands X." This schema is derived by running
`passages/DERIVATION.md` over a Corpus of Extractions of Passages and ruled on by
the owner as a document before this contract was rewritten.

`order` and `presupposes` retired (kogaki#1247, owner ruling): no composer,
judge or Packet read either. `passages/FORMAT.md` and the Extractions are
untouched — the Extraction still records the sequence and the presupposition —
only the authored Move record stops carrying them.

`draws_on` retired too (kogaki#1280, owner ruling): no composer, judge or
Packet reads it either.

`question` retired (kogaki#1324, owner ruling 2026-10-10): the composer is
never handed it — the Move it reads is `before`, `after`, `technique` and
`breaks` — so the one reader it had, path review's question chain, judged a
Candidate against a field the composer never received. The reader's question
is carried where the composer does see it: the `question` entry of `before`
and `after`.

`segments` added (kogaki#1320, owner ruling 2026-10-10): the record carries
the Extraction's ordered Segments, so a human can check a Leg's waypoint order
against something other than the prose of `technique`. The model is never
asked to write it — the keys below are still the whole of what the
model authors — `tools/move_ingest.py`'s `passage` mode copies it from the
Extraction's own `segments`, entry for entry, after the model has returned its
record.

`segments` generalized only (kogaki#1367, owner ruling 2026-10-13): each Extraction
Segment carries two clauses, a content clause written about the original and
a generalized clause, subject-free the way `technique` is written.
`segments` carries the generalized clause of each entry and never the
content clause — a content-bearing Segment clause would let a Move's
structure be reconstructed back to its source paragraph, which the
generalized clause cannot be. An Extraction Segment carrying only the content clause
is refused at ingestion, naming the Segment's number.

`technique` retired and `description` added (kogaki#1412, owner decision
2026-10-17): `technique` restated in prose the structure `segments` already
carries, so the model no longer writes it and a record carrying it is refused
by name. `description` — one or two sentences for a person reading the
library, at most 200 characters, with no machine role — is never written by
the model either: the tool copies it from the Extraction's own
`description`, as it copies `segments`.

**Origin.** The Move concept follows Swales' move analysis in genre studies:
a text is coded as a sequence of communicative purposes, each a move. The
**question** dimension of `before`/`after` follows Minto's Situation-Complication-Question-Answer
pattern, read through question-under-discussion analysis (Roberts 1996): a
text opens a question and either settles it, or replaces it with a narrower
one taken up in its stead.

---

You have just read an article. Your task is to extract its **Moves**.

A Move is a reusable writing technique the article actually performs: a
transformation that carries a reader from one state to another, along one or
more of five dimensions — **knowledge**, **question**, **expectation**,
**orientation**, **trust**. You are not summarizing the article and not
judging its claims — you are naming the techniques it uses and capturing the
evidence that it uses them.

Extract every distinct Move that does real work in the article — typically
3 to 8. Do not invent a Move the text does not perform, and do not extract
the same technique twice because it appears in two places; one record, and
the strongest passage as its `evidence`.

**Subject-independence is the default for every field.** No field is
written with the article's own subject as its grammatical subject unless
the field is subject-bound — the sole exception is `evidence`, which is a
claim about this specific work and cannot be written any other way. A field
that reads "the article shows..." or "in this piece, the reader..." has
failed this rule; rewrite it about the reader and the technique, not about
the article.

## Output format

One record per Move, exactly these seven keys admissible — four always
present, three optional — in this order, separated by one blank line.
Multi-line values use YAML folded style (`>-`). `before` and `after` are
maps keyed by dimension, one entry per dimension, never one joined line;
`breaks` is a list. The saved Move is one `.yaml` record, `moves/<id>.yaml`,
read by the Brief's one YAML reader (`src/yaml.mjs`); a `.md` Move is the
retired form and is refused by name (kogaki#1413).

```
id: <snake_case verb phrase naming the transformation>
before:
  <dimension>: <the reader's state on that dimension before the Move, one
    sentence, e.g. question: holds an unanswered question about X. Omit
    dimensions this Move does not touch.>
after:
  <dimension>: <the reader's state on that dimension after the Move, same
    dimension set as before>
breaks:
  - <one prose test: a change a careful writer might make, and what the
    reader loses>
continues_from: <optional. A prior Move's id, if this one picks up directly
  from it. Omit for a true opening.>
evidence: >-
  <optional, typically empty. The work this Move came from and where the
  Passage sits — never a quotation.>
figure:
  kind: <optional. Present only if the Passage refers to a figure. See
    "The figure field" below.>
```

## Per-field rules

- **id** — a verb phrase describing the transformation, not the topic:
  `derive_mitigation_from_causal_mechanism`, not `north_korea_diplomacy`.
- **before / after** — reader states, one map entry per dimension the
  Move changes, keyed by the dimension's name. `passages/FORMAT.md` states
  the rule once, at the Extraction's `reader`, for the Extraction this Move
  is drawn from: a dimension it records as unchanged is omitted from the
  Move. Written at the **dimension level**, generalizable to another
  article — not this article's own facts. The `question` entry is the one
  question-under-discussion analysis governs: it states the question the
  reader holds, and `after` states whether the Move settled it, replaced it with a narrower
  one, or raised a new one beside it. Write `question: holds: none.` as the
  `before` entry when the reader arrives with no live question.
- **breaks** — general to the technique, never specific to this article's
  subject, replacing the old `constraints` + `failure_modes` pair: what
  removing a step, reordering the Move's parts, or stretching it past its
  reach each does to it.
- **continues_from** — optional; a bare Move id, no article-specific
  prose.
- **evidence** — this field carries provenance, and its rules are below.
  Optional; leave it out rather than write a placeholder.
- **figure** — optional; see "The figure field" below.

## The `evidence` rules

1. **`evidence` names the work and where the Passage sits — never a
   quotation, and never an account of the reader movement.** That account
   belongs in `before`/`after` and the Extraction's `segments`.
2. **Do not paste the source text.** A short quoted phrase naming the
   Passage's location is fine; a transcribed passage is not.
3. **Optional, and typically empty.** Leave it out where source metadata is
   not available to you rather than writing a placeholder line.

## The figure field

Present only when the Passage refers to a figure the article shows. Follow
`passages/FIGURE.md` to recover the figure's **structure** — its `kind` and
the **positions** (roles) it has — and write one line per role into the
Move's own vocabulary, exactly as its Segments' `does` clauses would name it. `relations`
states in one line what holds between the positions. **Never the figure's
content**: no printed label, no data value, nothing that names this
article's own subject inside a role's line beyond what makes the role
legible. `specs/spec-draft-pipeline/SPEC.md` §6.9.3 states what ingestion
validates about it — cited here and restated nowhere. Most articles have no
figure to extract; leave the field out entirely rather than writing an
empty block.

## The `segments` field

Not one of the keys above, and never written by the model — and neither is
`description`, which the tool copies from the Extraction the same way
(kogaki#1412). A record left with no `segments` or no `description` after the
copy is refused, naming the field, and a `description` over 200 characters is
refused naming its length. In
`tools/move_ingest.py`'s `passage` mode, once the model's record is admitted,
the tool reads the Extraction record beside the Passage and copies its
`segments` into the record's own `segments`, entry for entry, in the same
order: one map per Segment, carrying its `does` and, on every Segment after
the first, its `relation` to the one before — the
quoted opening words stay in the Extraction and are not copied, since they
locate a Segment in the Passage and `segments` does not carry the Passage,
and the content clause stays in the Extraction too, since it is written
about the original and `segments` carries only the generalized clause.

A record is refused, naming `segments`, where the Extraction carries no
`segments` for the tool to copy it from, where an Extraction Segment carries no
`does`, naming that Segment's number,
or where the model's own record already carried a `segments` value that
disagrees with the copy — the model is never asked to write or reorder
Segments, so a value it supplied anyway is a defect, not an alternative to
the copy.

A saved Move renders `segments` as a YAML list of maps, in the
Extraction's own order, so a human reads the order as a list.
