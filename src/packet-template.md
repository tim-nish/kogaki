<!--
The Step Packet template (kogaki#749; owner rulings 2026-09-01; renamed at
kogaki#825).

Runtime-read, like src/report-format.json and src/workflow.json — `draft.mjs
packet` fills the {{...}} slots and prints the result, and the printed result is
the model's ENTIRE input for realizing one STEP. Nothing outside it is read.

ONE WORD, ONE UNIT (kogaki#825). A STEP is one unit of realization —
what this file asks for. A SECTION is a GROUPING of Steps that share one
heading, declared in the Brief on `opens_section`. Before kogaki#825 this
template used "Section" for both, which made `This Section's Step` a category
error and told the realizer to write a whole grouping when it must write one
Step. The Packet is the realizer's entire input, so a word meaning two things
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

Block order is fixed: anchors, Move contract, Step, the Step's Section, ledger,
the article so far, instruction. Heavy prose late, instruction last. Every block opens with a fixed
usage header saying what the block is FOR, because a block whose use is not
stated gets used for whatever it resembles.
-->

# Write one Step

## What the article is doing — hold these fixed

Use these as the article's fixed points. Do not restate them and do not argue
with them; they are settled.

- **Thesis.** {{thesis}}
- **Reader start.** {{reader_start}}
- **Reader target.** {{reader_target}}
- **Opening question.** {{opening_question}}

## The Move this Step performs — its contract

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
shape of the movement and nothing else.

{{move_excerpt}}

## This Step

What this Step must accomplish, in this article, for this reader.

- **Step.** {{step_id}}
- **purpose.** {{purpose}}
- **reader_state_before.** {{reader_state_before}}
- **reader_state_after.** {{reader_state_after}}
- **materials.** {{materials}}
- **rationale.** {{rationale}}
- **grounds.** These are what this Step may assert. Assert nothing else.

{{grounds}}

## The Section this Step sits in

A Section is a grouping of Steps under one heading — one promise to the reader
that the question changes here. This Step either opens a Section or continues
one, and the line below says which. Where it continues, the heading is already
on the page and you are writing further into it: do not restate the heading's
claim, and do not open a new subject.

{{section_placement}}

## What the reader already knows, and what you introduce here

`already knows` was established by earlier Steps — do not re-introduce it.
`introduce here` is this Step's obligation: each term must be usable by the
reader after this Step, and a term with an anchor is anchored because its
meaning is not carried by the grounds above.

- **already knows.** {{reader_already_knows}}
- **introduce here.** {{introduces}}

## The article so far — verbatim

Everything already written, in order, grouped under the Section headings it was
written into. The block ends with **this Step's own Section so far** — the prose
immediately above where you are about to write. Continue from it: do not repeat
what it says, do not contradict it, and match the voice it establishes.

{{prior_sections}}

## Write

Write the prose for this Step and nothing else. No heading, no step id, no
label, no commentary about what you are doing.

**The heading is not yours.** One heading is rendered per Section, by the
Harness, from the title the Brief declared — never per Step and never by you.
Prose that writes its own heading is refused when the Step is recorded.

**Plain register, operationally:** no unexplained term of art; one relation per
sentence; a concrete subject acting. Never write for an imagined audience —
"explain this for beginners" produces condescension rather than clarity, and
what replaces it is the three tests in this paragraph.

**The round trip:** the original claim must be recoverable from what you write.
Where making it plain loses something, either restore the loss or **concede it
explicitly in the prose**. A concession is part of the output; a silent
omission is not a simplification, it is a loss.
