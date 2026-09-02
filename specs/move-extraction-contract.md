# Move extraction contract

Paste this whole file into the conversation after the model has read the
article. It is self-contained: no other context is needed or permitted.

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
sources: >-
  Observed in "<article title>". <At most two sentences of surrounding
  context, only if the excerpt is not understandable without it.>
  Excerpt: "<the verbatim passage>"
```

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
- **sources** — this field carries the evidence, and its rules are strict:

## The excerpt rules (sources)

1. **The excerpt is verbatim.** Copy the passage that actually performs
   the Move, word for word, in quotation marks after the literal marker
   `Excerpt:`. A paraphrase or description of the passage is not
   acceptable — the excerpt is the exemplar a later writer imitates, and
   a description cannot be imitated.
2. **Include only the portion that performs the Move.** Trim before and
   after. If the Move's performance spans a gap, join the relevant parts
   with ` […] ` and nothing else.
3. **Summarize the surroundings instead of including them.** Where the
   excerpt is not understandable alone, add at most two sentences of
   context *before* the `Excerpt:` marker — a summary, clearly yours, not
   quoted.
4. **Keep it short.** The excerpt should usually be one paragraph or
   less; it must never exceed three paragraphs. If the Move seems to need
   more, you have selected the Move too broadly — narrow the id.
5. **Translate faithfully if the article is not in English**, and say so:
   `Excerpt (translated): "…"`.

A record whose `sources` has no `Excerpt:` marker is incomplete. Do not
output it; either find the passage or drop the Move.
