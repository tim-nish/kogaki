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
generation, kept minimal. A rule enters here only with a demonstrated change
in what is generated. DESIGN PRINCIPLES ABOUT THIS TEMPLATE DO NOT LIVE HERE — they belong in
the Brief/Draft design record (kogaki#752).

THE WRITE BLOCK'S READER-DEPENDENT RULES ARE THE AUDIENCE'S REGISTER
(kogaki#1251 item 1, kogaki#1261, kogaki#1370). `{{register}}` is filled from
the `register` key of the Audience file the Brief was composed for, so two
Audiences render two Write blocks; the heading rule, the paragraph rule and
the round trip stay here, identical for every Audience. `{{reader_own_world}}`
is HARNESS-OWNED, not the register (kogaki#1285): it renders the Audience's
`persona.prior_knowledge` field verbatim, or a stated absence where the
Persona declares none, before the register — so the Referents rule above can
point at material the Packet actually carries.
`{{language}}` is HARNESS-OWNED too (kogaki#1417): the Audience's `language`
key, rendered as one line, so the writer is told the article's language rather
than inferring it from the words its input happens to carry.

THE PARAGRAPH PLAN OWNS PARAGRAPH STRUCTURE, THE AUDIENCE'S REGISTER OWNS
WORD CHOICE (kogaki#1350, owner ruling 2026-10-12; kogaki#1375): where a
paragraph opens and what it establishes arrive as the Paragraph Waypoints the
ParagraphPlan stage generated from a paragraph Move; the register carries no
rule that dictates either.

LEG LINKING IS DEFAULT-DENY (kogaki#1282, owner ruling 2026-10-06). Only what
the Brief's `introduces` and `re-activate` explicitly admit crosses into this
Leg's Packet; nothing else the reader holds does, and no sentence here is
asked to "link" or "connect" across that boundary — connectedness comes from
the crossing items being used, not from an instruction told to connect.

THIS FILE POINTS AT NO SPECIFICATION, and the prohibition is stated here
WITHOUT WRITING THE SHAPE IT FORBIDS — a comment that spells out the pattern it
bans becomes the first hit of any check grepping for it, which is the
use-versus-mention defect this repository has recorded repeatedly. The check
asserts the absence; this comment says why the absence is deliberate.

Block order is fixed: the waypoints, the Leg's claims, the Journey material,
the Leg's Section, ledger, the article so far, instruction. Heavy prose late,
instruction last. Every block opens with a fixed usage header saying what the
block is FOR, because a block whose use is not stated gets used for whatever
it resembles.

PLANNING BLOCKS DO NOT REACH THE PACKET (kogaki#1247, owner ruling
2026-10-02/04). "Brief = blueprint, Packet = parts" (the document-plan
boundary of the Reiter and Dale generation pipeline): a Brief-level item is
rendered into the Packet only where a sentence-level decision of the writer
depends on it. The fixed-points block (Thesis, Reader start, Reader target)
and the This Leg block (`purpose`, `reader_state_before`,
`reader_state_after`) are retired on that ground — their operational content
for the writer is already carried by the crossing block and
the Closure rows, and review of the prose reads the reader states from the
Brief, never the Packet. The reader-target line is the one piece of that
retired block with a live sentence-level use — it says whether this Leg may
still introduce or raise anything — so it moves into the Section block rather
than leaving with the rest.

THE RELATIONS LAYER IS RETIRED (kogaki#1215; owner ruling 2026-09-28). The
claims block and the crossing list below RENDER AS
FLAT LISTS under their own headings, in ONE convention: every item is a `- `
line at column zero, one line per item, no indentation carrying meaning, no
`key:` prefix, and no relation between one item and another. No list sits
under a bulleted field label. Where the realization of a whole schema category is
fixed — Closure rows, Journey material — that behaviour is stated once,
where the category's own block opens, never as a label attached to each item.

NO MOVE REACHES THE PACKET (kogaki#1311, owner decision 2026-10-09;
kogaki#1375, owner decision 2026-10-14). The Leg's Move's responsibility ends
when the Candidate is composed; what the writer needs from it arrives as this
Leg's waypoints, which the Brief composed as the Leg's own specialization of
the Move and judged there. A paragraph Move's responsibility ends when the
ParagraphPlan stage has generated the Paragraph Waypoints from it; what the
writer needs from THAT arrives as the Paragraph Waypoints, read from the
ParagraphPlan file beside the Brief and rendered under each waypoint -- and
nothing of the Move itself. No Move file is opened here. The *Opens from* line
under a waypoint is the ParagraphPlan's join, composed from the reader state
the previous paragraph leaves, and carries nothing of a Move (kogaki#1411).
-->

# Write one Leg

## The waypoints this Leg takes the reader through

Each numbered line below is a point this Leg makes, in order, and the claim
it serves — one paragraph, carrying that point. Under it, the indented
numbered lines are the points that paragraph makes, in order, each with the
claim it serves: they are not one sentence each, and the paragraph expresses
them in as many sentences as it needs.
The point is not quoted: its wording is yours, and no line here is copied or
announced to the reader.

An *Opens from* line under a numbered line states how that paragraph's first
point follows from the paragraph before it. The paragraph's opening realises
that connection inside its first sentence, in that sentence's connective or
clause, in wording of your choosing and under the Referents rule of the
register: never as a sentence of its own and never in the line's words. The
line is a connection and nothing more. It is not a point of its own, it is not
copied, and it is not announced.

{{waypoints}}

## The claims this Leg asserts

Each line below is one claim, and every line is a claim of this Leg: none is
subordinate to another. Your prose must make every one of them recoverable,
and must assert nothing beyond them: these lines are the whole of what this
Leg may assert.

{{claims}}

## The Journey material this Leg edits — NOT a claim to recover

{{journeys}}

## The Section this Leg sits in

A Section is a grouping of Legs under one heading — one promise to the reader
that the question changes here. This Leg either opens a Section or continues
one, and the line below says which. Where it continues, the heading is already
on the page and you are writing further into it: do not restate the heading's
claim, and do not open a new subject.

{{section_placement}}

{{reader_target_line}}

## What crosses into this Leg

This is the whole of what you may speak of as already available: a term you
introduce here, a term or claim re-activated from a Leg you depend on, or a
re-activated Journey. Each line carries what crosses with it — a term with
its meaning, a claim as a plain restatement, a Journey as its served text. An
established term crosses as a name you may hand the reader as such — where it
comes from is the Brief's own record, not material for the prose. Nothing not
listed here is material for this Leg: the reader may hold more, but what they
hold and do not see below is not yours to speak of or rely on.

{{crosses_here}}

## This Leg's Closure

Honor the rows below in the prose rather than restating them as fields.

The Brief's Closure ledger carries the promises the article makes to the
reader — the Thesis's, and each Leg's own. The rows below are the ones THIS
LEG is a party to: where it introduces a promise, discharges one (keeps it),
or concedes one (tells the reader it is left open).

{{closure_rows}}

## The article so far, up to this Leg:

{{prior_sections}}

## Write

Write the prose for this Leg and nothing else. No heading, no leg id, no
label, no commentary about what you are doing.

**Budget.** {{budget}}

**The heading is not yours.** One heading is rendered per Section, by the
Harness, from the title the Brief declared — never per Leg and never by you.
Prose that writes its own heading is refused when the Leg is recorded.

**Language.** {{language}}

**The reader's own world.** {{reader_own_world}}

{{register}}

**The round trip — claims only.** Each claim above must be recoverable from
what you write. Where making one plain loses something, either restore the
loss or **concede it explicitly in the prose**. A concession is part of the
output; a silent omission is not a simplification, it is a loss. This rule
answers for a claim's loss alone: it is not licence for a sentence about what
you could not read or could not perform. A waypoint you cannot reach from
what this Packet gives you is answered below, as a refusal — never as a
concession, and never as prose.

**When a step cannot be performed.** If a waypoint cannot be reached from
the material this Packet gives you, or material it should carry is
missing, do not write around it and do not write a sentence telling the
reader so. Return exactly this instead, as the whole of your response:

    refusal: <reason>

This ends the act as a refusal to the Harness, not as content: the Leg is not
recorded, and it is not re-asked, because the input you were given would not
change.

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

The **form** is the kind's, not yours: the Brief bound its roles. It names the
positions a figure of this kind has; it carries no subject matter and nothing
here is a word the reader sees.

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
- `caption` — one line: what the reader holds after looking at the figure.
- `position` — `before` or `after`: whether the reader meets the figure before
  this Leg's prose or after it.

Assert nothing the claims above do not carry. You are not writing diagram
syntax: the markup is the Harness's, rendered from this record.
