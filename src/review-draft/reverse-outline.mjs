// review-draft/reverse-outline — rendering a Reverse Outline input, the fields it is written in, the figure's round trip and outline validation.
// Cut from src/review-draft.mjs at its named section (kogaki#1458); the
// design and its rulings are stated at the entry and in the Issues each
// block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   the figure record
//       SPEC-draft-pipeline "The figure record — the form's instance, filled after the prose"
//   the renderer
//       SPEC-draft-pipeline "The renderer and the anchor — markup from the record, at the Leg"
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLegBlock, legField, fail } from "./draft-reader.mjs";
import { passPath } from "./workspace.mjs";

// ---------------------------------------------------------------------------
// Rendering a Reverse Outline input. The reviewer is BLIND: it sees the prose
// and never the Packet, which is what makes the Reverse Outline evidence about
// the prose. The RECORD's schema is kogaki#871's.
// THE ARTICLE BEFORE THIS PASSAGE is re-derived from the CURRENT Draft rather
// than read from the Packet (kogaki#871): a later correction may have moved
// the Packet's "article so far", and Packet bytes would reach a reviewer whose
// ignorance is the instrument. Grouped under the Section headings the trace
// declares (kogaki#823), never by scanning the body for `##` lines.
function articleBefore(legs, legId) {
  const idx = legs.findIndex((s) => s.leg_id === legId);
  if (idx <= 0) {
    return "(nothing yet — this is the article's first passage, so nothing precedes it.)";
  }
  const out = [];
  let openSection = null;
  for (const s of legs.slice(0, idx)) {
    if (s.section !== openSection) {
      if (out.length) out.push("");
      out.push(`## ${s.section_title ?? `Section ${s.section}`}`, "");
      openSection = s.section;
    }
    out.push(s.prose, "");
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

// The passage, one line per line, each carrying its DRAFT line number so the
// reviewer's spans and the trace's ranges are in one coordinate system. A
// reviewer counting lines itself would be inventing the join key.
function numberedProse(leg) {
  return numberedRange(leg.prose, leg.lines);
}

// The same rendering for any contiguous draft range, so the figure block and
// the prose are numbered by ONE function rather than by two that agree until
// one is edited. The width comes from the range's own last line, which is what
// keeps a Leg's own listing aligned with itself.
function numberedRange(text, lines) {
  const width = String(lines[1]).length;
  return text.split("\n")
    .map((l, i) => `${String(lines[0] + i).padStart(width, " ")} | ${l}`)
    .join("\n");
}

// THE INSTRUCTION NAMES NO SIDE (PR #946 round 1): "relative to the passage
// BELOW" became false for half the cases once kogaki#945 made the placement
// faithful, and the placement cases assert by slot index, so a case asserts
// the absence directly.
// THE FIGURE AS THE READER MET IT (kogaki#880): the Draft's own bytes over the
// range the renderer records, numbered in the prose's coordinate, and NOTHING
// from the record — its roles, claim addresses, relations, kind and position
// word reach the blind reviewer nowhere, which is what makes the downstream
// element-to-claim join a comparison rather than a restatement.
function numberedFigure(leg) {
  return numberedRange(leg.figure.rendered, leg.figure.lines);
}

// WHERE THE READER MET THE FIGURE, read from the DRAFT'S OWN LINE NUMBERS and
// never from the record's `position` field. The distinction is the whole reason
// this is a function rather than a read of the record (kogaki#945): `position`
// is the DECLARED side, and the Reverse Outline input below must carry nothing
// from the record — arranging that input by `position` would show a blind
// reviewer the very value the `figure-position` item exists to join against
// their independent reading. Line numbers are already on the reviewer's page,
// so ordering by them discloses nothing they were not given.
function figureBeforePassage(leg) {
  return leg.figure.lines[0] < leg.lines[0];
}

// The passage a JUDGING reader is shown: the prose, with the figure quoted
// beside it in draft-line order where the Leg has one. The judging reader is
// not blind — it already sees the declared side — so withholding the block from
// it would leave three of the five figure items asking about something they
// cannot see.
function quotedPassage(leg) {
  if (!leg.figure) return numberedProse(leg);
  const parts = figureBeforePassage(leg)
    ? [numberedFigure(leg), numberedProse(leg)]
    : [numberedProse(leg), numberedFigure(leg)];
  return parts.join("\n\n");
}

// The number of fields the Blind Reader is asked to fill, COUNTED FROM THE
// DECLARATION rather than spelled in the instruction — so a disposition table
// gaining a field cannot leave the sentence the reader reads saying the old
// count.
//
// IT TAKES NO LEG (PR #1022 round 1, finding 5). It took one while the count
// was per Leg — a Leg carrying a figure owed an eighth field — and the figure
// half left under the decline recorded in `src/review-items.json`. A parameter
// nothing reads says the count still varies by Leg, which is the form a
// reader would trust and a later edit would build on.
function reverseOutlineFieldCount() {
  return RECONSTRUCTIBLE_FIELDS.length;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve"];

// A COUNT WRITTEN AS A WORD, because it lands in the reviewer's instruction and
// this Harness's own rule is that a review carries no digit but a line number.
// Past the table it falls back to the numeral rather than refusing: the
// instruction is the reviewer's and a refusal here would withhold the whole
// input over a number nobody reads as a score.
function numberWord(n) {
  return NUMBER_WORDS[n] ?? String(n);
}

// The figure section of the Reverse Outline input. THE HEADING SAYS WHERE THE
// READER MET IT WITHOUT SAYING THE RECORD'S WORD: the draft line numbers on the
// block and on the passage below already carry the placement, and they are the
// article's own facts rather than the record's declaration of intent — which is
// exactly the pair `figure-position` exists to lay against each other.
function renderFigurePassage(leg) {
  return ["## The figure the reader met with this passage",
    "",
    "It is rendered in the Draft, not written by the passage's author. Read it as",
    "the reader does — the numbers are its lines in the Draft, and this section",
    "sits on the side of the passage the reader met it on.",
    "",
    numberedFigure(leg),
    "",
    ""].join("\n");
}

// THE BLIND READER'S INPUT IS THE BRIEF LEG SCHEMA AND THE PROSE (kogaki#1014):
// the reader writes the outline entry the passage would have been written
// from, in the SAME FORM as the forward outline, so the input carries the
// Brief's own field list and definitions and no template file. WHAT IS
// WITHHELD IS WITHHELD DELIBERATELY: the Forward Artifact, the Move, its
// candidates and every not-reconstructible field, whose effect is carried by
// the reader states, which ARE compared. THE ARTICLE'S OWN TEXT GOES IN LAST,
// because an article about this pipeline can quote a field name or a fence as
// its subject matter — nothing below substitutes into it.
function renderReverseOutlineInput(ws, run, draft, leg, legs) {
  const figureBlock = leg.figure ? renderFigurePassage(leg) : "";
  const figureFirst = leg.figure ? figureBeforePassage(leg) : false;
  const fieldLines = RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`);

  // THE FIGURE'S ASK RIDES THE SAME INPUT AND IS OWED ONLY WHERE THE READER MET
  // ONE. A figureless Leg is not asked for a figure block and is refused one:
  // a reader inventing a reading of a block that was never rendered is not
  // annotating harmlessly, it is a reading of nothing reaching the comparison.
  const figureFieldLines = leg.figure
    ? FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => `- \`${f.name}\` — ${f.definition}`)
    : [];
  const figureAsk = leg.figure
    ? ["## The figure you met, in its own terms",
      "",
      "This passage was rendered with a block beside it, and that block was written from a record",
      "of its own. Read it as you read the passage — from what is on the page — and answer in the",
      "record's own fields:",
      "",
      ...figureFieldLines,
      "",
      "Reply with a SECOND fenced block, after the `leg` block:",
      "",
      "````",
      "```figure",
      "element: …",
      "caption: …",
      `position: <${figurePositions().join("|")}>`,
      "```",
      "",
      "One `element:` line per element you can see, in the order they read. The example shows the",
      "FORM of the block and not an answer: how many elements there are, and which side the block",
      "sits on, are what you are being asked.",
      "````",
      ""].join("\n")
    : "";

  const head = [
    `# Reverse Outline — ${leg.leg_id}`,
    "",
    "You are reading one passage of an article, and the article that came before it. You have",
    "not seen the outline the article was written from, and you must not go looking for it:",
    "your reading is the other half of a comparison, and it is worth nothing if it was told the",
    "answer.",
    "",
    "Write the outline entry this passage would have been written from — what it is FOR, what a",
    "reader holds arriving at it and leaving it, and what it asks the reader to accept. Write it",
    `in the form below. Answer from the passage alone; where the passage does not settle a field,`,
    "say what the passage does say rather than what would make it come out well.",
    "",
    "Your outline is evidence about **this prose**. Do not reason about what the",
    "author was probably told — an outline that guessed at what produced the passage measures",
    "nothing.",
    "",
    "Write no verdicts and no advice. Nothing here asks whether the passage is good.",
    "",
    `## The ${numberWord(reverseOutlineFieldCount())} fields`,
    "",
    ...fieldLines,
    "",
    "`introduces` is legitimately absent — a passage that introduces nothing carries no such",
    "line. `claims` is not: every passage asserts something. Nor is `waypoint`: every paragraph",
    "makes a point.",
    "",
    "## The form",
    "",
    "Reply with ONE fenced `leg` block and nothing else:",
    "",
    "````",
    "```leg",
    `leg_id: ${leg.leg_id}`,
    "purpose: …",
    "reader_state_before: …",
    "reader_state_after: …",
    "claim …",
    "claim …",
    "waypoint …",
    "waypoint …",
    "introduces: <term>",
    "introduces: <term> — <where the passage anchors it, only if it does>",
    "```",
    "````",
    "",
    figureAsk,
    "## The article before this passage",
    "",
    "Everything already written, in order, under the Section headings it was written into. It",
    "ends with this passage's own Section so far — the prose immediately above where the passage",
    "begins. Read it as the reader arriving at the passage has read it: it is what they already",
    "know.",
    "",
  ].join("\n");

  // THE ARTICLE'S OWN TEXT GOES IN LAST, and the passage comes after the
  // article that precedes it — the order the reader meets them in, and the
  // order the section prose above describes.
  //
  // THE FIGURE SITS ON THE SIDE OF THE PASSAGE THE READER MET IT ON, and a
  // figure met ABOVE the prose goes above the passage's own HEADING rather
  // than under it: a block the reader met first, rendered below the heading
  // that announces the passage, is the inverted arrangement kogaki#945 removed,
  // one line further down the page.
  const parts = [head, articleBefore(legs, leg.leg_id), ""];
  if (figureFirst && figureBlock) parts.push(figureBlock, "");
  parts.push(
    `## The passage — ${leg.leg_id}, draft lines ${leg.lines[0]}–${leg.lines[1]}`,
    "",
    "Every line is numbered with its line number in the Draft.",
    "",
    numberedProse(leg), "");
  if (!figureFirst && figureBlock) parts.push(figureBlock, "");

  const dest = passPath(ws, run, "outline-input", `${leg.leg_id}.md`);
  const out = parts.join("\n");
  writeFileSync(dest, out.endsWith("\n") ? out : out + "\n");
  return dest;
}

// ---------------------------------------------------------------------------
// THE REVERSE OUTLINE, AND THE FIELDS IT IS WRITTEN IN (kogaki#1013/#1014).
// The Reverse Outline is a BRIEF LEG BLOCK — every field a Brief field under
// its own name — and there is no second schema; `src/outlined-schema.json` and
// `src/outline-template.md` were deleted with this. THE DISPOSITIONS ARE
// DECLARED ONCE, HERE, PER BRIEF LEG FIELD: a field the Blind Reader is asked
// for is one a reader of the prose alone can write. `claims` IS THE `claim `
// LINES (`claimLines`, src/draft.mjs), read off the outline by `outlineClaims`.
// `concession` and `opens_section` left together (owner 2026-09-17,
// kogaki#1132) — their item rows were removed, so nothing compared them;
// `waypoints` joined at kogaki#1311. `opens_section` is on the refused list
// because it IS a Brief Leg field; `concession` is refused by the closed set.
const RECONSTRUCTIBLE_FIELDS = [
  { name: "purpose", kind: "line",
    definition: "what this passage is for — what it does for the reader, in your words." },
  { name: "reader_state_before", kind: "line",
    definition: "what a reader knows and believes as they arrive at this passage." },
  { name: "reader_state_after", kind: "line",
    definition: "what a reader knows and believes once they have read it." },
  { name: "claims", kind: "claim-lines",
    definition: "one `claim ` line per thing the passage ASSERTS — what it asks the reader to accept." },
  // THE ROUTE, READ BACK (kogaki#1311, kogaki#1326). The forward Leg carries
  // `waypoints`, each the point one paragraph makes, and the Packet renders
  // them in place of the Move; Reverse Outlining compares the prose's own
  // route to them. The reader writes one line per PARAGRAPH, since a paragraph
  // is what a reader can point at, and the per-declared `waypoints` row asks
  // whether each declared point is among those lines — at any position, so a
  // passage that spent two paragraphs on one step is not refused on the count.
  // The forward form's `(serves …)` is the Brief's address and the reader
  // cannot know it, so the line is bare, the way `claim ` lines are.
  { name: "waypoints", kind: "waypoint-lines",
    definition: "one `waypoint ` line per paragraph of the passage, in order — the point that paragraph makes: "
      + "the one proposition it establishes, in one sentence, in your words; never what it does to you as a reader." },
  // BOTH ARMS, and the bare one first (PR #1022 round 1, finding 3). This read
  // `introduces: <term> — <anchor>`, which is only half of what
  // `parseIntroducesEntry` accepts: a term may be written BARE, and only a
  // separator with nothing after it is refused. A reader who took the anchor
  // for mandatory would supply one for a term the passage anchors nowhere —
  // an invention reaching the comparison through the one field the blind half
  // exists to keep clean.
  { name: "introduces", kind: "repeated-line",
    definition: "one `introduces: <term>` line per term this passage introduces to the reader. "
      + "There are two forms and both are accepted: write the term BARE, or — where the passage "
      + "also says what the term MEANS — write `introduces: <term> — <anchor>` and let the anchor "
      + "be that meaning, in the passage's own words. Where the passage anchors nothing, write the "
      + "term bare rather than inventing an anchor. A passage that introduces nothing carries no line." },
];

// Declared NOT reconstructible, and REFUSED in a Reverse Outline rather than
// merely unasked. The two differ: an unasked field a reader supplies anyway is
// an invention that reaches the comparison, and the whole point of the blind
// half is that what comes back was read rather than inferred.
const NOT_RECONSTRUCTIBLE_FIELDS = [
  { name: "move", why: "the Move is the Brief's name for the reader-state transition type, and a reader cannot "
      + "infer which library entry produced a passage; the Move's effect is carried by the reader states, which ARE compared" },
  { name: "materials", why: "which Strands licensed the passage is a fact about the Brief, not about the prose" },
  { name: "rationale", why: "why the Leg was placed where it was is the composer's reasoning, not the reader's" },
  { name: "depends_on", why: "which earlier Legs this one stands on is the path's structure, not the passage's content" },
  { name: "bridges", why: "whether this Leg was inserted between two others is a fact about how the Brief was revised" },
  { name: "figure", why: "the figure's own round trip is a separate comparison against the figure record's own fields" },
  { name: "opens_section", why: "whether a Leg opens its Section or continues one is rendered by the Harness out "
      + "of the trace, so it is never information the prose has to carry; the row that compared it left the item table "
      + "at kogaki#1132 and a line nothing reads is a reading the Blind Reader is charged for and nobody looks at" },
];

// ---------------------------------------------------------------------------
// THE FIGURE'S OWN ROUND TRIP (kogaki#880, restated at kogaki#1018). ONE
// LEVEL DOWN, UNDER THE SAME RULE: a figure is written from its RECORD, so its
// Reverse Outline is a block in `src/figure-schema.json`'s own field names,
// with no second schema. ITS OWN BLOCK RATHER THAN A FIELD OF THE LEG'S:
// `figure` is a Brief Leg field declared NOT reconstructible above, so a
// `figure:` line inside the Reverse Outline stays refused; what a reader CAN
// say is what they met, which is a different artifact with a different field
// list. THE DISPOSITION RULE IS THE SAME RULE: reconstructible is "a reader
// who met the rendered block could say this", everything else is REFUSED.
const FIGURE_RECONSTRUCTIBLE_FIELDS = [
  { name: "element", kind: "repeated-line",
    definition: "one `element: <what it is>` line per thing you can name in the block, in your own "
      + "words. At least one. You are naming what is THERE, never judging how well it is put." },
  { name: "caption", kind: "line",
    definition: "what you hold after looking at the block, in your own words — one line." },
  { name: "position", kind: "line",
    definition: "`before` where you met the block above this passage, `after` where you met it below." },
];

// Declared NOT reconstructible, and refused in a figure's Reverse Outline.
const FIGURE_NOT_RECONSTRUCTIBLE_FIELDS = [
  { name: "kind", why: "the record's kind is the Move FORM's, and a reader cannot infer the form a "
      + "structure was produced from — the same ruling that keeps `move` out of the passage's outline" },
  { name: "relations", why: "the relation a form holds between its roles belongs to the form and is "
      + "read out of src/figure-kinds.json; a reader naming one would be naming the source rather "
      + "than the block" },
  { name: "emphasis", why: "which element the figure leans on is a decision recorded beside the block, "
      + "and a rendering does not ask its reader to separate that out" },
];

// The record's `position` vocabulary, and it is the RECORD's rather than a
// second copy: `src/figure-schema.json` declares the closed pair, so a third
// value entering there is refused here without this file being edited.
function figurePositions() {
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "figure-schema.json");
  if (!existsSync(p)) {
    fail(`the figure record's contract is absent — ${p}. The figure Round Trip reads its field `
      + "vocabulary from that file rather than carrying a copy, so this refuses rather than "
      + "validating against a vocabulary it invented.");
  }
  let schema;
  try { schema = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the figure schema at ${p} is not readable JSON (${e.message})`); }
  const one = schema.fields?.position?.one_of;
  if (!Array.isArray(one) || one.length === 0) {
    fail(`the figure schema at ${p} declares no closed set for \`position\`, and the Round Trip `
      + "reads that set from the record's own contract rather than restating it");
  }
  return one;
}

// The fenced form, the Leg block's grammar one artifact over.
function parseFigureBlock(text, path) {
  const m = /^```figure\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`figure\` block — this Leg's reader met a figure, so `
      + "the Round Trip owes a reading of it in the figure record's own field names" };
  }
  if (/^```figure\n/m.test(text.slice(m.index + m[0].length))) {
    return { refusal: `${path} carries more than one fenced \`figure\` block — a Leg renders one figure, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  return { body: m[1] };
}

// The figure's Reverse Outline, validated and projected into the record's own
// field names. EVERY REFUSAL NAMES WHAT IT SAW, for the reason the passage half
// gives: this is the one artifact in the flow a person wrote by hand.
function validateFigureOutline(text, leg, file) {
  const parsed = parseFigureBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const body = parsed.body;
  const problems = [];

  const caption = legField(body, "caption");
  if (caption === null) problems.push("carries no `caption:` line — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);
  else if (caption === "") problems.push("`caption:` is blank — " + FIGURE_RECONSTRUCTIBLE_FIELDS[1].definition);

  const position = legField(body, "position");
  const positions = figurePositions();
  if (position === null) problems.push("carries no `position:` line — " + FIGURE_RECONSTRUCTIBLE_FIELDS[2].definition);
  else if (!positions.includes(position)) {
    problems.push(`\`position:\` reads \`${position}\`, and the record's position is one of `
      + `${positions.map((x) => `\`${x}\``).join(" or ")} — a third value is a placement the article has no seat for`);
  }

  const elements = repeatedLines(body, "element");
  if (elements.length === 0) {
    problems.push("carries no `element:` line — a figure a reader can name nothing in is a figure "
      + "that showed them nothing, and that is the finding rather than a blank side");
  }

  // THE LINE SET IS CLOSED, exactly as the Leg block's is: a name nobody
  // declared carries a judgment the Harness never reads, and admit-by-default is
  // how that arrives with no trace.
  const declared = new Set([...FIGURE_RECONSTRUCTIBLE_FIELDS.map((f) => f.name),
    ...FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name)]);
  const refused = new Set(FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name));
  for (const ln of body.split("\n")) {
    if (ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (!m) continue;
    if (refused.has(m[1])) {
      const why = FIGURE_NOT_RECONSTRUCTIBLE_FIELDS.find((f) => f.name === m[1]).why;
      problems.push(`carries \`${m[1]}:\`, which is declared not reconstructible — ${why}`);
    } else if (!declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a figure record field — a field in a figure's `
        + "Reverse Outline that the record does not declare needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the figure's Reverse Outline for ${leg.leg_id} (${file}) is not a block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  return {
    leg_id: leg.leg_id,
    element: elements.map((t) => ({ text: t })),
    caption,
    position,
  };
}

const RECONSTRUCTIBLE_NAMES = new Set(RECONSTRUCTIBLE_FIELDS.map((f) => f.name));

// The Reverse Outline's own claim lines, read with the Brief's grammar.
function outlineClaims(body) {
  return String(body).split("\n").filter((l) => l.startsWith("claim "));
}

// The Reverse Outline's own waypoint lines (kogaki#1311), in paragraph order.
// A reader may write the line bare (`waypoint …`) or with a colon; neither
// carries the forward form's `(serves …)`, which addresses a Strand the reader
// never saw — a line that does carries it as read, and it is compared as text.
function outlineWaypoints(body) {
  return String(body).split("\n").filter((l) => /^waypoint\b/.test(l))
    .map((l) => l.replace(/^waypoint\b[ \t]*(\([^)]*\))?[ \t]*:?[ \t]*/, "").trim());
}

function repeatedLines(body, field) {
  return [...String(body).matchAll(new RegExp(`^${field}:[ \\t]*(.*)$`, "gm"))].map((x) => x[1].trim());
}

// VALIDATED AGAINST THE BRIEF LEG'S FIELD NAMES: the outline's line set is
// closed below to the fields a Brief Leg carries, so an outline naming a field
// the Brief does not have is refused rather than read.
//
// EVERY REFUSAL NAMES WHAT IT SAW. A Reverse Outline is the one artifact in
// this flow a person wrote by hand, so "invalid" without the field is a refusal
// that costs another read to act on.
function validateReverseOutline(text, leg, file) {
  const parsed = parseLegBlock(text, file);
  if (parsed.refusal) fail(parsed.refusal);
  const outline = parsed.leg;
  const body = outline.body;
  const problems = [];

  if (outline.leg_id !== leg.leg_id) {
    problems.push(`its \`leg_id\` is \`${outline.leg_id}\` and this pass is reading ${leg.leg_id} — `
      + "a Reverse Outline is the reading of ONE passage and is filed against it");
  }

  for (const f of RECONSTRUCTIBLE_FIELDS) {
    if (f.kind === "line") {
      const v = legField(body, f.name);
      if (v === null) problems.push(`carries no \`${f.name}:\` line — ${f.definition}`);
      else if (v === "") problems.push(`\`${f.name}:\` is blank — ${f.definition}`);
      continue;
    }
    if (f.kind === "claim-lines") {
      // AN EMPTY ANSWER IS AN ANSWER AND AN ABSENT ONE IS NOT — but a passage
      // that asserts nothing is not a passage, so `claims` is the one
      // reconstructible field with a floor. `introduces` is legitimately absent.
      if (outlineClaims(body).length === 0) {
        problems.push("carries no `claim ` line — every passage asserts something, and the claims are "
          + "what the Round Trip judges against what the Forward Artifact licenses");
      }
      continue;
    }
    if (f.kind === "waypoint-lines") {
      // A FLOOR, for the reason `claims` has one: every passage does something
      // to its reader, so an outline naming no step at all read nothing.
      const ws = outlineWaypoints(body);
      if (ws.length === 0) {
        problems.push("carries no `waypoint ` line — every paragraph makes a point, and the points are what "
          + "the Round Trip compares against the waypoints the Leg was written toward");
      }
      for (const [i, v] of ws.entries()) {
        if (v === "") problems.push(`\`waypoint\` line ${i + 1} is blank — ${f.definition}`);
      }
      continue;
    }
    if (f.kind === "repeated-line") {
      for (const [i, v] of repeatedLines(body, f.name).entries()) {
        if (v === "") problems.push(`\`${f.name}:\` entry ${i + 1} is blank — ${f.definition}`);
      }
      continue;
    }
  }

  // THE REVIEWER WRITES NO VERDICTS AND NO ADVICE, and a field they could not
  // have read is REFUSED rather than dropped: an ignored field still steered the
  // reading that produced the rest of the outline, so accepting it and
  // discarding the key would keep exactly the contamination the blind half
  // exists to prevent.
  for (const f of NOT_RECONSTRUCTIBLE_FIELDS) {
    if (legField(body, f.name) !== null) {
      problems.push(`carries \`${f.name}:\`, which is declared NOT reconstructible — ${f.why}`);
    }
  }

  // The top-level line set is closed for the same reason the record's key set
  // was: a name nobody declared carries a judgment the Harness never reads, and
  // admit-by-default is how that arrives with no trace.
  const declared = new Set([...RECONSTRUCTIBLE_NAMES, ...NOT_RECONSTRUCTIBLE_FIELDS.map((f) => f.name), "leg_id"]);
  for (const ln of body.split("\n")) {
    if (ln.startsWith("claim ") || /^waypoint\b/.test(ln) || ln.trim() === "") continue;
    const m = /^([a-z_][a-z0-9_]*):/.exec(ln);
    if (m && !declared.has(m[1])) {
      problems.push(`carries \`${m[1]}:\`, which is not a Brief Leg field — a field in the Reverse Outline `
        + "that is not a Brief Leg field needs its own ruling, so it is refused rather than read");
    }
  }

  if (problems.length) {
    fail(`the Reverse Outline for ${leg.leg_id} (${file}) is not a Brief Leg block this Round Trip can read:\n  - `
      + problems.join("\n  - "));
  }

  // THE READING, UNDER THE BRIEF'S OWN NAMES. There is no translation left to
  // do: `field` in the Round Trip table names a Brief Leg field, and this
  // returns that field. What used to sit here was a projection into a second
  // schema's key names, and the column that read it is gone with the schema.
  return {
    leg_id: outline.leg_id,
    purpose: legField(body, "purpose"),
    reader_state_before: legField(body, "reader_state_before"),
    reader_state_after: legField(body, "reader_state_after"),
    claims: outlineClaims(body).map((l) => ({ text: l.replace(/^claim[ \t]+/, "").trim() })),
    waypoints: outlineWaypoints(body).map((t) => ({ text: t })),
    introduces: repeatedLines(body, "introduces").map((t) => ({ text: t })),
  };
}

// The next Leg with no outline yet, in the path's recorded order. `open`
// renders the first; `outline` renders the next, which is what makes the flow
// self-driving rather than a sequence a session has to remember.
function nextOutlineOwed(run) {
  return run.legs.find((s) => !run.outlineFields[s.leg_id]);
}

export { quotedPassage, renderReverseOutlineInput, validateFigureOutline, validateReverseOutline, nextOutlineOwed, numberedProse, numberedFigure };
