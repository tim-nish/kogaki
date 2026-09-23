# Figure reverse engineering: the extraction prompt

Use this when a Passage refers to a figure, or when a figure is analyzed on
its own. Give the model the image and the prose that refers to it, together
with this file. The model returns one Figure spec in the shape below. It
runs unchanged in a Claude Code session and in a chat session; both accept
an image in the message. Called from `FORMAT.md` when a Passage carries a
figure; usable alone.

Scope: conceptual explanatory figures, such as pyramids, layered
structures, ranked relationships, and simple relationship diagrams. Maps
and statistical charts are out of scope; their content is data, which a
Move never holds.

## Terms

- **Figure reverse engineering** — the act: from an image and its
  accompanying prose, recover a description from which a figure of the
  same structure can be drawn without copying the original (the term is
  the chart-recovery literature's, Savva et al. 2011; Poco and Heer 2017).
- **Figure spec** — the product. Three parts, following the content /
  structure / drawing separation of visualization research (Card,
  Mackinlay and Shneiderman 1999; Penrose's domain / substance / style,
  Ye et al. 2020):
  - **structure** — the positions the figure has and the relations among
    them; kogaki's existing kind, roles and relation.
  - **encoding** — which visual variable carries each relation, in
    Bertin's vocabulary: position, size, orientation, connection,
    containment.
  - **content** — what fills each position in this figure. Recorded here
    only to name the instance; never stored in a Move.
- **Regeneration** — drawing a new figure from structure and encoding plus
  new content. Not part of this prompt.

## Instructions to the model

You are looking at one figure and the prose that refers to it. Your job is
to recover its structure and encoding so that a different figure of the
same shape could be drawn about a different subject. You are not
describing what the figure looks like, not drawing it, and not judging
whether it is right.

Rules, from the long-description practice for complex images (DIAGRAM
Center; W3C accessibility tutorials) and from chart reverse engineering:

1. Classify before you describe. Name the kind first, in one or two
   plain words: pyramid, layers, ranking, cycle, triangle, nested sets,
   two-axis grid. If it is none of these, say "unlisted" and describe the
   shape in one clause.
2. Positions before relations, relations before encoding. List every
   position the figure has with its label exactly as printed, in reading
   order. Then state each relation the figure asserts as a sentence
   naming the positions. Then say, per relation, which visual variable
   carries it.
3. State only what the figure shows. A relation you infer from the prose
   but cannot point to in the image is listed under "in the prose only",
   not under relations.
4. Say what the figure adds. One or two sentences: what a reader takes
   from the figure that the prose alone does not give them.
5. Discard decoration. Colour, icons, typography and ornament are omitted
   unless one of them carries a relation, in which case it is named under
   encoding and nothing more is said about it.
6. Run the regeneration test. Ask whether a person given only your
   structure and encoding lines, and told to draw the figure about a
   different subject, would produce the same shape. If not, the missing
   fact goes into structure or encoding; if it cannot be stated without
   the original's content, say so under notes.
7. Store no image and reproduce no wording from the prose beyond the
   labels printed in the figure.

## The Figure spec

Return exactly this block.

```
## Figure

kind: <one or two words, or "unlisted: <shape in one clause>">
referred to as: <how the prose names it, e.g. "Figure A", or "not named">

positions:
  - <role name in plain words>: <label as printed>
  - ...

relations:
  - <sentence naming positions, e.g. "the first level and the third level
    are joined against the second">
  - ...

encoding:
  - <relation> — <visual variable>: <how, e.g. "vertical position: higher
    is higher-ranked">
  - ...

in the prose only:
  - <relation the prose asserts about the figure that the image does not
    show, or "none">

adds: <one or two sentences: what the reader takes from the figure that
      the prose alone does not give>

regeneration: <"passes" or what a drawer would still need>

notes: <anything the block did not ask for, or "none">
```

## Worked example

A three-level pyramid in a geopolitics primer, labelled with three
countries, with a bracket joining the top and bottom levels. The prose
says the first- and third-ranked powers cooperate to constrain the second.

```
## Figure

kind: pyramid
referred to as: Figure A

positions:
  - top level: <label as printed>
  - middle level: <label as printed>
  - bottom level: <label as printed>

relations:
  - the three levels are ranked, top highest
  - the top level and the bottom level are joined against the middle level

encoding:
  - ranking — vertical position: higher is higher-ranked; width: lower
    levels are wider
  - joined against — connection: a bracket links top and bottom, passing
    the middle

in the prose only:
  - the joining is cooperation intended to constrain the middle power

adds: The reader sees that the constraint comes from an alliance across
      the ranking rather than from the top alone, which the prose states
      but does not make visible.

regeneration: passes

notes: none
```
