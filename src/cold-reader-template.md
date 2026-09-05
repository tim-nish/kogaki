<!--
THE COLD READER'S INPUT (kogaki#873). Runtime-read by src/review-draft.mjs, the
same arrangement src/recovery-template.md has with the Step half and
src/packet-template.md has with src/draft.mjs: the wording lives in a file a
person can edit, and the Harness fills its slots.

Slots: {{slug}}, {{section_count}}, {{body}}, {{ledger_shape}}, {{read_command}},
{{claim_command}}. The renderer refuses on an unfilled slot rather than shipping
a hole, inherited from the Packet renderer's own rule.

THE COLD READER'S IGNORANCE IS THE INSTRUMENT, and it is a WIDER ignorance than
the Step reviewer's. That reviewer sees one passage and the article before it;
this one sees the whole body and nothing else -- no frontmatter, no trace, no
Packet, no thesis, no reader states, no Move, no Step boundaries. It is asked
what the article did to it, and the Harness is what knows what the article was
supposed to do.

So this file holds the BODY and an instruction, and NOTHING from a Packet. A
template edit that pasted a Packet block in would read as helpful and would
silently end the measurement -- which is why the constraint is asserted as
STRING ABSENCE in the fixture rather than promised here.

STEP BOUNDARIES ARE NOT RENDERED, deliberately. A Section's Steps are the
authoring unit and the reader is not one of their readers; showing them would
tell this reader where the seams are, and half of what the Section pairs measure
is whether the seams show on their own.

This comment is stripped at render and is not part of the reader's input.
-->
# Read the article cold — {{slug}}

You have not seen the plan this article was written from, and you must not go
looking for it. Read the body below, in order, the way a reader meets it.

Your entries are evidence about **what this prose did to you**. Do not reason
about what the author was probably aiming at — an entry that agrees with the
plan because it guessed at the plan measures nothing.

Write no verdicts and no advice. Nothing here asks whether the article is good.

## The article — {{section_count}}

Every line is numbered with its line number in the Draft.

{{body}}

## What to record

**After each Section, before reading on**, one entry:

{{ledger_shape}}

Record the entry for a Section from where the Section left you — not from where
you now are, having read further. If you read ahead first, the entry is about a
reader who does not exist.

Hand each one back, in Section order, with:

    {{read_command}}

**At the end, once**, what the article claimed — one or two sentences, in your
own words, as a claim rather than as a summary of topics:

    {"claim": "…"}

Hand it back with:

    {{claim_command}}
