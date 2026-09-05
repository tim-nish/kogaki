# Move extraction contract

Paste this whole file into the conversation after the model has read the
article. It is self-contained: no other context is needed or permitted.

Amended 2026-09-02 (kogaki#751, owner ruling): the evidence field is
**`excerpt`**, and an excerpt is the extractor's own account of the reader
movement — **never a verbatim quotation**. The first form of this contract
(2026-09-01) named the field `sources` and demanded a quoted passage behind
an `Excerpt:` marker; both are withdrawn, for the reasons stated under the
excerpt rules below.

---

You have just read an article. Your task is to extract its **Moves**.

A Move is a reusable writing technique the article actually performs: a
transformation that carries a reader from one state of understanding to
another. You are not summarizing the article and not judging its claims —
you are naming the techniques it uses and capturing the evidence that it
uses them.

Extract every distinct Move that does real work in the article — typically
3 to 8. Do not invent a Move the text does not perform, and do not extract
the same technique twice because it appears in two places; one record, and
the strongest passage as its evidence.

## Output format

One record per Move, exactly these seven keys, in this order, separated by
one blank line. Multi-line values use YAML folded style (`>-`).

```
id: <snake_case verb phrase naming the transformation>
status: observed
intent: >-
  <what the Move does, one or two sentences>
requires: >-
  <the reader state the Move depends on — what the reader must already
  understand for this Move to land>
effect: >-
  <the reader state the Move produces — what the reader understands after
  it that they did not before>
constraints: >-
  <what a correct performance of this Move must and must not do — the
  conditions under which the transformation is honest>
failure_modes: >-
  <the characteristic ways this Move goes wrong when imitated badly —
  two or three, concrete>
excerpt: >-
  Observed in "<article title>". <A few lines, in your own words, naming
  the specific reader movement you focused on when you identified this
  Move: what the passage establishes first, what it then shows the reader,
  and where the reader ends up.>
```

## The one optional field

`visual_form` is the single field admissible beyond the eight above, and it is
**absent by default**. Its shape, the closed kind set it draws on, and the
three things ingestion validates about it are
`specs/spec-draft-pipeline/SPEC.md` §6.9.3 — cited here and restated nowhere.
**Nothing in this contract's extraction produces one**: an extractor writes the
eight fields, and a form is added later, by the admission act's judgment, only
when the Move's transformation has a relational shape.

## Per-field rules

- **id** — a verb phrase describing the transformation, not the topic:
  `derive_mitigation_from_causal_mechanism`, not `north_korea_diplomacy`.
- **status** — always the literal `observed`.
- **intent / requires / effect** — written about *the reader*, not about
  the article. `requires` and `effect` are reader states: "The reader
  understands X." A Move whose `requires` and `effect` describe the same
  state is not a Move; drop it.
- **constraints / failure_modes** — general to the technique, never
  specific to this article's subject. A person applying this Move to a
  completely different topic must be able to obey them.
- **excerpt** — this field carries the evidence, and its rules are below.

## The excerpt rules

1. **The excerpt is your account of the reader movement, not a quotation.**
   Write, in a few lines, the specific movement of the reader that led you
   to identify this Move: what the passage establishes, what it then shows,
   where it leaves the reader. This is what a later writer imitates — the
   movement, seen at the level you saw it when you named the Move.
2. **Do not paste the source text.** A Move derived at a meta level from a
   long article is not served by the article's own thousand or ten thousand
   characters sitting in the record; that is noise, and a verbatim
   requirement would lower the excerpt's value rather than raise it. A short
   quoted phrase inside your account is fine where it carries the movement;
   a transcribed passage is not.
3. **Name the article in the first sentence** — `Observed in "<title>".` —
   and nothing more about where it lives. There is no separate place in a
   record for the publication or the source document: the title inside the
   excerpt is the whole of the record's provenance, and version history
   holds the rest.
4. **Keep it short.** A few lines; never more than one paragraph. If the
   movement seems to need more, you have selected the Move too broadly —
   narrow the id.
5. **Write it in the article's language of ideas, not its subject.** The
   excerpt may name the article's concrete subject (that is what makes it
   an observation), but the movement it describes must be the one the
   `intent` names, so that a reader of the record can see the technique in
   the instance.

A record whose `excerpt` is empty is incomplete. Do not output it; either
write the account or drop the Move.
