<!--
The Leg Packet template (kogaki#749; owner rulings 2026-09-01; renamed at
kogaki#825).

Runtime-read, like src/report-format.json and src/terrain-workflow.json — `draft.mjs
packet` fills the {{...}} slots and prints the result, and the printed result is
the model's ENTIRE input for realizing one LEG. Nothing outside it is read.

ONE WORD, ONE UNIT (kogaki#825). A LEG is one unit of realization —
what this file asks for. A SECTION is a GROUPING of Legs that share one
heading, declared in the Brief on `opens_section`. Before kogaki#825 this
template used "Section" for both, which made `This Section's Leg` a category
error and told the realizer to write a whole grouping when it must write one
Leg. The Packet is the realizer's entire input, so a word meaning two things
inside it is a defect in the one artifact whose job is to be unambiguous.

TEMPLATE CONTENT IS OPERATIONAL TEXT ONLY: rules that change model behaviour at
generation, kept minimal. A rule enters here only with demonstrated runtime
effect. DESIGN PRINCIPLES ABOUT THIS TEMPLATE DO NOT LIVE HERE — they belong in
the Brief/Draft design record (kogaki#752).

THIS FILE POINTS AT NO SPECIFICATION, and the prohibition is stated here
WITHOUT WRITING THE SHAPE IT FORBIDS — a comment that spells out the pattern it
bans becomes the first hit of any check grepping for it, which is the
use-versus-mention defect this repository has recorded repeatedly. The check
asserts the absence; this comment says why the absence is deliberate.

Block order is fixed: anchors, Move contract, Leg, the Journey material, the
Leg's Section, ledger, the article so far, instruction. Heavy prose late, instruction last. Every block opens with a fixed
usage header saying what the block is FOR, because a block whose use is not
stated gets used for whatever it resembles.

THE RELATIONS LAYER (kogaki#1174). The claims block and the `introduce here`
list below RENDER AS TREES, not lists: an item the Brief marks a SATELLITE of
another renders indented under that NUCLEUS, with the relation between them.
An item with no such marking is a nucleus. The glossary below is the whole
of what a writer needs to read the tree — no outside reference is required.
-->

# Write one Leg

## Relation types

An indented, satellite item names one of these. Realize it as a clause or
phrase attached to its nucleus's sentence, never as its own paragraph — a
paragraph that stands alone restates the tree as a list, which is the defect
this layer exists to remove.

- **background** — the satellite supplies context the reader needs to place the nucleus.
- **evidence** — the satellite is what makes the reader believe the nucleus.
- **elaboration** — the satellite gives more detail of what the nucleus already asserts.
- **concession** — the satellite grants a point that might tell against the nucleus.
- **contrast** — the satellite is juxtaposed against the nucleus to bring out a difference.
- **cause** — the satellite is why the nucleus is so.
- **condition** — the satellite states what must hold for the nucleus to hold.
- **restatement** — the satellite says the nucleus again, in other words.

## What the article is doing — hold these fixed

Use these as the article's fixed points. Do not restate them and do not argue
with them; they are settled.

- **Thesis.** {{thesis}}
- **Reader start.** {{reader_start}}
- **Reader target.** {{reader_target}}
- **Opening question.** {{opening_question}}

## The Move this Leg performs — its contract

This is the transformation you are performing. `intent` says what it does;
`constraints` are what a correct performance must and must not do;
`failure_modes` are how it goes wrong when imitated badly.

- **Move.** {{move_id}}
- **intent.** {{move_intent}}
- **constraints.** {{move_constraints}}
- **failure_modes.** {{move_failure_modes}}

### An exemplar of this Move — FORM ONLY

The passage below demonstrates how this Move is realized. **Do not reuse its
subject matter, facts, entities, terminology, or claims.** Read it for the
form of the movement and nothing else.

{{move_excerpt}}

## This Leg

What this Leg must accomplish, in this article, for this reader.

- **Leg.** {{leg_id}}
- **purpose.** {{purpose}}
- **reader_state_before.** {{reader_state_before}}
- **reader_state_after.** {{reader_state_after}}
- **claims.** Each entry below is a claim this Leg asserts, as a tree — see
  "Relation types" above for how to read an indented one. Your
  prose must make every one of them recoverable, and must assert nothing beyond
  them. A satellite claim is realized fused into its nucleus's sentence, not as
  a sentence of its own. The Lesson each claim rests on is at its pin and is not
  reproduced here: these lines are the whole of what this Leg may assert.

{{claims}}

## The Journey material this Leg edits — NOT a claim to recover

Material, not assertion. Each entry below names a Journey this Leg draws on
and what you are using it for. **Edit it for the Move's purpose**: cut it,
compress it, retell it in this article's voice — the telling is yours, and the
`use` line says what the telling is for.

Nothing here is a claim. The claims above are the whole of what this Leg
asserts, and the round trip asks for those back and never for a fragment of a
Journey. A Journey you use well may leave almost none of its original wording
on the page.

{{journeys}}

## The Section this Leg sits in

A Section is a grouping of Legs under one heading — one promise to the reader
that the question changes here. This Leg either opens a Section or continues
one, and the line below says which. Where it continues, the heading is already
on the page and you are writing further into it: do not restate the heading's
claim, and do not open a new subject.

{{section_placement}}

## What the reader already knows, and what you introduce here

`already knows` was established by earlier Legs — do not re-introduce it.
`introduce here` is this Leg's obligation, also a tree (see "Relation types"
above): each term must be usable by the reader after this Leg, and a term
with an anchor is anchored because its meaning is not carried by the claims
above. A satellite term is realized folded into the sentence that introduces
its nucleus, not given a sentence of its own.

- **already knows.** {{reader_already_knows}}
- **introduce here.** {{introduces}}

## This Leg's Closure

The Brief's Closure ledger carries the promises the article makes to the
reader — the Thesis's, and each Leg's own. The rows below are the ones THIS
LEG is a party to: where it introduces a promise, discharges one (keeps it),
or concedes one (tells the reader it is left open). Honor them in the prose
rather than restating them as fields.

{{closure_rows}}

## The article so far — verbatim

Everything already written, in order, grouped under the Section headings it was
written into. The block ends with **this Leg's own Section so far** — the prose
immediately above where you are about to write. Continue from it: do not repeat
what it says, do not contradict it, and match the voice it establishes.

{{prior_sections}}

## Write

Write the prose for this Leg and nothing else. No heading, no leg id, no
label, no commentary about what you are doing.

**Budget.** {{budget}}

**The heading is not yours.** One heading is rendered per Section, by the
Harness, from the title the Brief declared — never per Leg and never by you.
Prose that writes its own heading is refused when the Leg is recorded.

**Plain register, operationally:** no unexplained term of art; one relation per
sentence; a concrete subject acting. Never write for an imagined audience —
"explain this for beginners" produces condescension rather than clarity, and
what replaces it is the three tests in this paragraph.

**The round trip:** the original claim must be recoverable from what you write.
Where making it plain loses something, either restore the loss or **concede it
explicitly in the prose**. A concession is part of the output; a silent
omission is not a simplification, it is a loss.

<!-- FIGURE-INPUT -->

The block below is NOT part of a Leg Packet. It is appended, filled, to the
Packet of a Leg that carries `figure:` — and only after that Leg's prose is
recorded, which is the whole reason it is separated here rather than rendered
inline: the figure is designed from the text, never before it. `draft.mjs`
splits this file at the marker above; the Packet render never sees what
follows.

## The figure this Leg carries

The Leg's prose is written and recorded. Design its figure now, from the text
above and the material below, and from nothing else.

The **form** is the Move's, not yours. It names the positions a figure of this
kind has; it carries no subject matter and nothing here is a word the reader
sees.

- **kind.** {{figure_kind}}
- **roles.**

{{figure_form_roles}}

The **binding** is the Brief's. Each role above is bound to one of this Leg's
claims, quoted verbatim. An element is that claim worded for the reader — not
a new claim, and not a claim from anywhere else on the page.

{{figure_binding}}

**What the figure is for**, as the Brief stated it: {{figure_reason}}

### This Leg's prose, as recorded — verbatim

{{figure_prose}}

### Write the record

Return one JSON object and nothing else:

- `kind` — exactly the kind named above.
- `elements` — one entry per role above, `{"text": ..., "claim": "g<n>"}`.
  `text` is the bound claim worded for the reader. `claim` is the address the
  binding gives that role: do not move a role to a different claim.
- `relations` — what holds between the elements, one entry per relation the
  figure asserts. The kind's own relation line is what these instantiate.
- `emphasis` — optional; the role the figure leans on, if one does.
- `caption` — one line, in the terms of this Leg's `reader_state_after`: what
  the reader holds after looking at the figure.
- `position` — `before` or `after`: whether the reader meets the figure before
  this Leg's prose or after it.

Assert nothing the claims above do not carry. You are not writing diagram
syntax: the markup is the Harness's, rendered from this record.
