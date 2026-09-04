<!--
THE RECOVERY INPUT (kogaki#871). Runtime-read by src/review-draft.mjs, the same
arrangement src/packet-template.md has with src/draft.mjs: the wording lives in
a file a person can edit, and the Harness fills its slots.

Slots: {{step_id}}, {{article_so_far}}, {{step_lines}}, {{step_prose}},
{{recover_command}}. The renderer refuses on an unfilled slot rather than
shipping a hole, inherited from the Packet renderer's own rule.

THE REVIEWER'S IGNORANCE IS THE INSTRUMENT. This file holds prose and an
instruction, and NOTHING from the Packet — no thesis, no grounds, no Move, no
reader states, no term list, no exemplar. A reviewer shown the declared record
CONFIRMS it rather than recovering it, and the whole comparison downstream
becomes a check that the article agrees with itself.

That is why the constraint is asserted as STRING ABSENCE in the fixture rather
than promised here: a template edit that pasted a Packet block in would read as
helpful and would silently end the measurement.

This comment is stripped at render and is not part of the reviewer's input.
-->
# Recover the Step record — {{step_id}}

You have not seen the input that produced this passage, and you must not go
looking for it. Read what is below and write down the record you believe the
passage realizes.

Your record is evidence about **this prose**. Do not reason about what the
author was probably told — a recovered record that agrees with the input
because it guessed at the input measures nothing.

Write no verdicts and no advice. Nothing here asks whether the passage is good.

## The article before this passage

Everything already written, in order, under the Section headings it was written
into. It ends with this passage's own Section so far — the prose immediately
above where the passage begins. Read it as the reader arriving at the passage
has read it: it is what they already know.

{{article_so_far}}

## The passage — draft lines {{step_lines}}

Every line is numbered with its line number in the Draft. Cite those numbers in
the spans your record carries.

{{step_prose}}

## The record to write

One JSON object, validated against `src/recovered-schema.json`. Every field is
a fact about the prose above, so every field can be checked by pointing at the
prose.

- `claims` — the atomic assertions the passage makes. One sentence each, with
  the span it rests on: `{"claim": "…", "span": [start, end]}`.
- `reader_state_after` — what a reader believes at the end of this passage. One
  or two sentences.
- `purpose` — what the passage does in the article. One line.
- `terms_introduced` — terms the passage defines, or first uses as if the
  reader now holds them. A list of strings; empty is an answer.
- `shape` — what transformation the passage performs on the reader, in plain
  words. No Move id is available to you and none is wanted; describe the
  movement you observe.
- `concessions` — places where the passage says it is simplifying or leaving
  something out: `{"text": "…", "span": [start, end]}`.
- `restates` — spans that repeat something already said in the article before
  this passage: `{"span": [start, end], "of": "what it repeats"}`.

Every span is a pair of Draft line numbers lying inside {{step_lines}}. A span
outside that range is refused by name, because a record pointing outside the
passage is not evidence about it.

Hand the file back with:

    {{recover_command}}
