# Move extraction contract

Paste this whole file into the conversation after the model has read the
article. It is self-contained: no other context is needed or permitted.

Rebuilt 2026-09-23 (kogaki#1175, owner ruling, kogaki#1173's ten schema
questions). The prior eight-field schema (`intent`, `requires`, `effect`,
`constraints`, `failure_modes`, `excerpt`, `status`, plus `visual_form`) is
withdrawn in full: it was decided without a corpus behind it, and its
`requires`/`effect` pair admitted only a change in the reader's *knowledge* —
every one of the 22 Moves it produced began `requires` with "the reader
understands X." This schema is derived by running
`passages/DERIVATION.md` over a Corpus of analyzed Passages and ruled on by
the owner as a document before this contract was rewritten.

**Origin.** The Move concept follows Swales' move analysis in genre studies:
a text is coded as a sequence of communicative purposes, each a move. The
`question` field follows Minto's Situation-Complication-Question-Answer
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

One record per Move, exactly these twelve keys admissible — eight always
present, four optional — in this order, separated by one blank line.
Multi-line values use YAML folded style (`>-`).

```
id: <snake_case verb phrase naming the transformation>
before: >-
  <one line per reader dimension this Move starts from, e.g.
  "question: holds an unanswered question about X." Omit dimensions this
  Move does not touch.>
after: >-
  <one line per reader dimension this Move leaves the reader in, same
  dimension set as before>
question: >-
  <one line per verb that applies: "holds: <A>" (the question the reader
  arrives with, or "none"); "settles: <A>" (A is answered);
  "replaces: <A> with <B>" (A is set aside, B is pursued in its stead as a
  way into A — A is not answered); "raises: <B>" (B is opened, A if any
  stays open beside it). Replacing is neither settling nor adding.>
order: >-
  <the Segment function sequence — raises / advances / settles, in order —
  plus one subject-free sentence on why that order>
presupposes: >-
  <background the reader must already hold that `before` does not capture —
  a fact, a reference, a prior text>
technique: >-
  <what the Move does, subject-free, one or two sentences>
breaks: >-
  <the three tests a correct performance must survive — remove, reorder,
  extend — one line each>
draws_on: >-
  <optional. Each foothold by kind — subject / the reader's own world /
  other texts / author — and what the Move does with it. Omit if the Move
  draws on nothing identifiable.>
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
- **before / after** — reader states, one line per dimension the Move
  changes. A Move whose `before` and `after` describe the same state on a
  dimension is not moving that dimension; omit it. Written at the
  **dimension level**, generalizable to another article — not this
  article's own facts.
- **question** — see the format block above; this is the field question-
  under-discussion analysis governs. Write `holds: none` when the reader
  arrives with no live question.
- **order** — the sequence plus one subject-free sentence. "The three
  claims build a chain toward the conclusion" is subject-free; "the reader
  is walked from claim to claim" is not.
- **presupposes** — distinct from `before`: `before` states the reader's
  position on this Move's own dimensions, `presupposes` states what the
  Move assumes without moving it.
- **technique** — subject-free, general to the technique. A person applying
  this Move to a completely different topic must be able to follow it from
  this field alone.
- **breaks** — general to the technique, never specific to this article's
  subject, replacing the old `constraints` + `failure_modes` pair: what
  removing a step, reordering the Move's parts, or stretching it past its
  reach each does to it.
- **draws_on** — optional; omit rather than force an entry.
- **continues_from** — optional; a bare Move id, no article-specific
  prose.
- **evidence** — this field carries provenance, and its rules are below.
  Optional; leave it out rather than write a placeholder.
- **figure** — optional; see "The figure field" below.

## The `evidence` rules

1. **`evidence` names the work and where the Passage sits — never a
   quotation, and never an account of the reader movement.** That account
   belongs in `before`/`after` and `technique`.
2. **Do not paste the source text.** A short quoted phrase naming the
   Passage's location is fine; a transcribed passage is not.
3. **Optional, and typically empty.** Leave it out where source metadata is
   not available to you rather than writing a placeholder line.

## The figure field

Present only when the Passage refers to a figure the article shows. Follow
`passages/FIGURE.md` to recover the figure's **structure** — its `kind` and
the **positions** (roles) it has — and write one line per role into the
Move's own vocabulary, exactly as `technique` would name it. `relations`
states in one line what holds between the positions. **Never the figure's
content**: no printed label, no data value, nothing that names this
article's own subject inside a role's line beyond what makes the role
legible. `specs/spec-draft-pipeline/SPEC.md` §6.9.3 states what ingestion
validates about it — cited here and restated nowhere. Most articles have no
figure to extract; leave the field out entirely rather than writing an
empty block.
