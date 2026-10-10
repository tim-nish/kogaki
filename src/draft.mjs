#!/usr/bin/env node
// draft — the /draft runtime and the CanonicalDraft it writes
// (SPEC-draft-command v1, kogaki#573; story 1.80, kogaki#587).
//
// THE THREE-LAYER BOUNDARY IS THE FILE'S OWN STRUCTURE. This module is
// the HARNESS and the SCHEMA half: it resolves the adopted Brief and refuses
// a template, establishes the closed reference set, iterates the Reader
// Path's Legs in their recorded order, keeps per-block snapshots
// machine-local, and writes the CanonicalDraft with its record half. The LLM
// layer — the prose realizing each Leg's reader_state_before →
// reader_state_after transition — arrives through `section` and is judged
// nowhere here: when a Draft comes out strange the first suspect is the Leg
// it realized or the judgment realizing it (the sole mechanical instrument on
// grounding), and neither is reachable by
// this harness.
//
// Six commands, one per harness act:
//   resolve  — parse the Brief; refuse a template BY FIELD NAME (a template
//              is not an input); print the plan (closed Strand set, Legs in
//              order); write the machine-local run record.
//   material — hand back the Brief's own material for one settled Strand.
//              A Strand outside the closed set refuses BY NAME, the same
//              shape `fillBrief` refuses a foreign L-id with: the set closed
//              at mint, and growing it routes back through Terrain (the closed reference set).
//   section  — accept one Leg's realized prose. Refusals: an unknown
//              leg_id names both sides; prose naming a Strand outside the
//              closed set refuses by name. Snapshots the assembled state
//              into the run workspace — no per-block commit and no tracked
//              diff artifact (the kogaki#523 constraint).
//   packet   — render the Leg Packet: the model's ENTIRE input for one
//              Leg (the Leg Packet, kogaki#749), deterministic and stored as served.
//   figure   — accept one Leg's figure record: the INSTANCE of the form
//              its figure_roles bind, filled after that Leg's prose is recorded
//              (kogaki#878). Validated against src/figure-schema.json, the
//              kind's role set, and the BRIEF's own role→claim binding; a
//              record that moved a role to another claim refuses by role.
//   emit     — assemble the CanonicalDraft: body = the sections in the
//              Reader Path's recorded order, prose only; frontmatter = the
//              record half. Repo-visible under a fixed human name
//              derived from the Brief — theses/<slug>/draft.md — one per
//              Brief, overwritten on re-run, `generated_by` immutable across
//              overwrites. Machine identity stays in the run workspace.
//
// THE COMPLETION CONTRACT LIVES IN THE FLOW, NOT HERE: a run ends when
// the CanonicalDraft exists, and the only legitimate earlier stop is a NAMED
// inspection-need. This runtime's half of it is mechanical: `emit` refuses
// while any Leg lacks its section, so a flow cannot end "done" short of the
// artifact without the refusal saying exactly which Legs are owed.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the closed reference set
//       SPEC-draft-command
//   the three-layer boundary
//       SPEC-draft-command
//   the read-not-invented rule
//       SPEC-draft-pipeline
//   the Leg and the Move it binds
//       SPEC-draft-pipeline
//   the Leg-Move instantiation contract
//       SPEC-draft-pipeline
//   the reader-knowledge ledger
//       SPEC-draft-pipeline
//   the Leg Packet
//       SPEC-draft-pipeline
//   the Section grouping
//       SPEC-draft-pipeline
//   the figure decision
//       SPEC-draft-pipeline
//   the figure record
//       SPEC-draft-pipeline
//   the renderer and the anchor
//       SPEC-draft-pipeline
//   the judgment rule
//       SPEC-draft-pipeline
//   the Brief's centre and its obligations ledger
//       SPEC-draft-pipeline
//   the durable home and the entry point
//       SPEC-draft-pipeline
//
// NO MOVE IS OPENED HERE (kogaki#1311, owner decision 2026-10-09: "Information
// that belongs to Move has responsibility only up to CandidatePath creation").
// The Leg carries its own route as `waypoints`, written at composition, and
// the Packet renders those; a figure's kind is read off the Leg's own
// `figure_roles` against src/figure-kinds.json. `--moves-dir` is refused by
// name rather than ignored.
//
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, openSync, closeSync } from "node:fs";
import { join, resolve, relative, dirname, basename, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
// The waypoint grammar is ONE function shared with the composition side
// (src/compose.mjs), never a second copy here: a writer and a reader that
// disagree about what a waypoint is fail silently at the block the writer
// realizes from.
import { waypointsRefusal, introducesRefusal, readerKnowledgeLedger, opensSectionRefusal,
  figureRefusal, parseFigureRoles, figureKinds, figureLegs,
  journeysRefusal, closureRowsForLeg, budgetRefusal, validateLegs, renderLeg,
  reactivateRefusal, parseReactivateEntry, parseIntroducesEntry, readerProse, concededRowFields } from "./compose.mjs";
import { renderFigure, checkMermaid, MERMAID_FENCE } from "./render-figure.mjs";
// THE ONE RESOLVER FOR A DECLARED COMMAND (kogaki#1076): the writer binary is
// resolved exactly as the Terrain and Brief judges are, `KOGAKI_JUDGE_CLI`
// included, so a fixture seam and a shim refusal read the same here.
import { resolveJudgeBinary, settingValue } from "./workflow/judge.mjs";
import { enterRun, laneDir } from "./runs.mjs";
// the Terminology List Decision's ONE carrier: parseTermsYaml and
// renderLanguageBlock live in lint-ja.mjs, which also runs the Lint that
// reads terms/prh.yml the same way — one parser, imported rather than a
// second copy that could disagree with the Lint about what the list says.
import { parseTermsYaml, renderLanguageBlock, sha256 as sha256Terms, DEFAULT_TERMS_PATH } from "./lint-ja.mjs";

function fail(msg) {
  process.stderr.write(`draft: ${msg}\n`);
  process.exit(1);
}

// The omitted-value guard brief.mjs carries (PR #484 round 1 finding 1),
// inherited unchanged: a bare `--brief` parses as boolean true and String(true)
// reaches readFileSync as a filename.
function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// The typed unfilled slot brief.mjs mints (the durable home and the entry point). Its literal presence is
// what makes "template" decidable by field rather than by judgment.
const SLOT = "*(awaiting composition)*";

// A Brief minted since kogaki#1116 carries no survey pin, because the commit pin
// is deprecated and each Strand's cite carries the served address at its own
// content hash. The absence is STATED in the Draft's frontmatter rather than
// rendered as an empty value: a blank `survey_pin:` would read as a pin the
// Draft failed to carry, which is the one thing that is not true of it.
export const NO_SURVEY_PIN = "none — the commit pin is deprecated (kogaki#1116); each Strand's cite carries its own content hash";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------------------
// Brief parsing — pure over the document text, exported for the fixture pass.
//
// The parse reads exactly what the runtime consumes: slug, survey pin, the
// settled Strand set with its cite lines, and the Sequence's leg blocks in
// document order. Everything else in the Brief is reachable material, not
// structure this harness interprets.
// ONE PARSER, AND THIS IS IT (kogaki#1014). A `leg` block's fields are read
// HERE and nowhere else: `parseBrief` calls it once per fenced block, and the
// Reverse Outline a Blind Reader hands back is validated by the same call. A
// second reader for the same block is exactly the two-copy divergence the
// Reverse Outlining rebuild exists to remove — the Reverse Outline is a Brief
// Leg block, so it is parsed by the Brief parser or it is not one.
//
// Returns `{ leg }` or `{ refusal }`. The caller decides what a refusal costs:
// `parseBrief` collects it and keeps reading the document, while a Reverse
// Outline has one block and refuses on it.
export function parseLegBlockBody(body, path) {
  const idM = body.match(/^leg_id:\s*(\S+)\s*$/m);
  if (!idM) return { refusal: `the Brief at ${path} carries a leg block with no leg_id` };
  // `move:` IS READ (the Leg-Move instantiation contract, kogaki#747). It was parsed for `leg_id` only
  // and the Move binding sat here as uninterpreted dead input, so a typo'd
  // or renamed id rode a minted Brief in silence until the Leg Packet
  // assembler joined Leg.move → moves/<id>.md and failed mid-draft. Since
  // kogaki#1311 no realization act opens the Move, so the id is carried for
  // the record and the trace and resolved nowhere on this side.
  const moveM = body.match(/^move:\s*(\S+)\s*$/m);
  // the reader-knowledge ledger's `introduces:` (kogaki#751), read back from the serialized form.
  // ONE LINE PER ENTRY, matching `renderLeg`'s writer — a term may contain
  // a comma and its anchor almost always does, so a comma-joined field could
  // not be parsed back at all. Absent entirely is the ordinary case and is
  // not an absence to report: a Leg that introduces nothing carries no
  // line, and the ledger below simply has nothing to fold in from it.
  const introduces = [...body.matchAll(/^introduces:\s*(.*)$/gm)].map((x) => x[1]);
  // A MALFORMED ENTRY REFUSES NAMING THE LEG (acceptance). The shape
  // grammar is the composition side's, imported rather than re-expressed:
  // the writer and the reader disagreeing about what an entry is would be
  // the round trip failing silently at exactly the field whose value is an
  // accumulation nobody re-derives by hand.
  if (introduces.length) {
    const bad = introducesRefusal(introduces, `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
  }
  // `re-activate` (kogaki#1237), read back from the serialized form
  // `renderLeg` writes: ONE LINE PER ENTRY, matching `introduces`'s own
  // reader for the same reason. SHAPE ONLY — the semantic check (the named
  // Leg is in `depends_on`, the term or Strand exists there) already ran at
  // `validateLegs` before this Brief was minted; re-running it here would be
  // a second copy of a judgment `compose.mjs` already made.
  const reactivate = [...body.matchAll(/^re-activate:\s*(.*)$/gm)].map((x) => x[1]);
  if (reactivate.length) {
    const bad = reactivateRefusal(reactivate, `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
  }
  // the Section grouping's `opens_section:` (kogaki#823), read back from the serialized form
  // `renderLeg` writes. THE PARSE-BACK IS WHAT MAKES THE DECLARATION LIVE:
  // kogaki#822 landed the field, its four grouping rules and its writer, and
  // nothing on this side read it — so a Brief could declare its Sections
  // perfectly and the Draft would still render one heading per Leg, with
  // every check green. The round trip is asserted at both ends through ONE
  // shared shape grammar, imported rather than re-expressed, for the reason
  // `introduces` is: a writer and a reader disagreeing about what a value is
  // fails silently at exactly the field whose value reaches an owner-facing
  // heading.
  // `[ \t]*` and NOT `\s*`: `\s` matches a newline, so a blank value would
  // eat the line break and capture the NEXT field's line as the title — a
  // Section silently headed "purpose: ..." instead of refusing. Caught by the
  // blank-value fixture below; the same idiom `legField` already uses.
  const opensM = body.match(/^opens_section:[ \t]*(.*)$/m);
  let opens_section;
  if (opensM) {
    const bad = opensSectionRefusal(opensM[1].trim(), `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
    opens_section = opensM[1].trim();
  }
  // the figure decision's `figure:`/`figure_roles:` (kogaki#877), read back from the
  // serialized form `renderLeg` writes. THE PARSE-BACK IS WHAT MAKES THE
  // DECLARATION REACH THE PAGE: #877 landed the field, its grammar and its
  // writer, and nothing on this side read it — so a Brief could declare a
  // figure perfectly and the Draft would render none, with every check green.
  // The same round-trip arrangement `introduces` and `opens_section` have,
  // through the SAME shared grammar imported from the composition side: a
  // writer and a reader disagreeing about what a binding is fails silently at
  // exactly the field whose value reaches a rendered figure.
  //
  // `[ \t]*` and not `\s*`, for the reason `opens_section` states: `\s`
  // spans a newline, so a blank `figure:` would capture the NEXT field's line
  // as the figure's reason instead of refusing.
  const figM = body.match(/^figure:[ \t]*(.*)$/m);
  const rolesM = body.match(/^figure_roles:[ \t]*(.*)$/m);
  let figure, figure_roles;
  if (figM || rolesM) {
    let parsedRoles;
    if (rolesM) {
      const r = parseFigureRoles(rolesM[1]);
      if (r.error) return { refusal: `the Brief at ${path}, leg ${idM[1]}: figure_roles — ${r.error} (the figure decision)` };
      parsedRoles = r.roles;
    }
    // THE GRAMMAR IS THE COMPOSITION SIDE'S, not a second expression of it.
    // A blank `figure:` reaches here as the empty string, which is what the
    // shared refusal already calls a half-declaration.
    const bad = figureRefusal(figM ? figM[1].trim() : undefined, parsedRoles,
      `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
    figure = figM[1].trim();
    figure_roles = parsedRoles;
  }
  // the Journey a Leg draws on (kogaki#1111), read back from the serialized form
  // `renderLeg` writes: `journey: <L-id> — <use>`, ONE LINE PER ENTRY. THE
  // PARSE-BACK IS WHAT MAKES THE DECLARATION REACH THE PACKET — the same
  // arrangement `introduces`, `opens_section` and `figure` have, through the
  // SAME shared grammar imported from the composition side, because a writer
  // and a reader disagreeing about what a value is fails silently at exactly
  // the field whose value reaches the model's entire input.
  //
  // `[ \t]*` and not `\s*`, for the reason `opens_section` states: `\s` spans
  // a newline, so a blank `journey:` would capture the NEXT field's line.
  const journeyLines = [...body.matchAll(/^journey:[ \t]*(.*)$/gm)].map((x) => x[1].trim());
  let journeys;
  if (journeyLines.length) {
    // The em dash is the writer's separator. A line carrying none is a
    // half-declaration and reaches the shared refusal as an entry with no
    // use, which is what that refusal already names. The use itself is a
    // single token from the closed set (src/leg-schema.json, `journey.uses`);
    // a trailing ` (<gloss>)` is `renderLeg`'s own gloss (kogaki#1286) and is
    // stripped here rather than carried into `use`, which the closed-set
    // refusal would otherwise reject whole.
    journeys = journeyLines.map((ln) => {
      const m = /^(\S+)\s+—\s+(.*)$/.exec(ln);
      if (!m) return { strand: ln, use: "" };
      const glossM = /^(\S+)\s+\(.*\)$/.exec(m[2].trim());
      return { strand: m[1], use: glossM ? glossM[1] : m[2].trim() };
    });
    const materials = (body.match(/^materials:[ \t]*(.*)$/m)?.[1] || "")
      .split(",").map((x) => x.trim()).filter(Boolean);
    const bad = journeysRefusal(journeys, materials, `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
  }
  // the route (kogaki#1311), read back from the serialized form `renderLeg`
  // writes: `waypoint (serves L<n>[, L<m>]): <point>`, ONE LINE PER WAYPOINT
  // in order. Read here and checked at the realization entry (`loadBrief`),
  // not here: this parser also reads a Reverse Outline, whose `waypoint` lines
  // are a blind reader's and carry no Strand, so a line without the
  // parenthesis reads as a waypoint with an empty `serves` and the caller
  // that needs one refuses it.
  const waypoints = [...body.matchAll(/^waypoint\b[ \t]*(.*)$/gm)].map((x) => {
    const m = /^\(serves[ \t]+([^)]*)\)[ \t]*:[ \t]*(.*)$/.exec(x[1].trim());
    if (!m) return { point: x[1].trim().replace(/^:[ \t]*/, ""), serves: [] };
    return { point: m[2].trim(), serves: m[1].split(",").map((y) => y.trim()).filter(Boolean) };
  });
  // THE RELATIONS LAYER IS RETIRED (kogaki#1215; owner ruling 2026-09-28). A
  // Brief composed before this issue could carry a `relation:` line; letting
  // it parse silently would render no tree — this Packet no longer draws
  // one — while the marking simply vanished, which is a Brief rendering
  // differently from what it declares. Refused by name instead, so an old
  // Brief cannot silently render.
  if (/^relation:[ \t]*.*$/m.test(body)) {
    return { refusal: `the Brief at ${path}, leg ${idM[1]}: carries a \`relation:\` line — `
      + "the relations layer is retired (kogaki#1215): claims and introduce-here entries render as flat lists, "
      + "and a Leg marking a satellite cannot be realized" };
  }
  const budgetM = body.match(/^budget:[ \t]*(\S*)\s*$/m);
  let budget;
  if (budgetM) {
    budget = /^[0-9]+$/.test(budgetM[1]) ? Number(budgetM[1]) : budgetM[1];
    const bad = budgetRefusal(budget, `the Brief at ${path}, leg ${idM[1]}`);
    if (bad) return { refusal: bad };
  }
  // the Reader target Leg's mark (kogaki#1231), read back from the serialized
  // form `renderLeg` writes: `reaches_target: true`, on the one Leg whose
  // after-state IS the Brief's Reader target. THE PARSE-BACK IS WHAT MAKES
  // THE MARK REACH THE PACKET — the same arrangement `opens_section` and
  // `figure` have: `renderPacket` renders the marked Leg's and each closing
  // Leg's own line under `## This Leg` off this field, and without the read
  // every Packet would render as a Leg before the target with every check
  // green. Only `true` is a mark; any other value is a half-declaration and
  // refuses naming the Leg rather than reading as unmarked, because a Brief
  // that says `reaches_target: false` on the Leg the composer meant to mark
  // would otherwise render silently as an unmarked path.
  const reachesM = body.match(/^reaches_target:[ \t]*(.*)$/m);
  let reaches_target;
  if (reachesM) {
    if (reachesM[1].trim() !== "true") {
      return { refusal: `the Brief at ${path}, leg ${idM[1]}: reaches_target reads ${JSON.stringify(reachesM[1].trim())} — `
        + "the mark is `true` on exactly one Leg and absent elsewhere (kogaki#1231)" };
    }
    reaches_target = true;
  }
  return { leg: { leg_id: idM[1], move: moveM ? moveM[1] : null, introduces, "re-activate": reactivate,
    opens_section, journeys, figure, figure_roles, budget, reaches_target, waypoints, body } };
}

// THE READER TARGET LINE OF A PACKET (kogaki#1231, owner decision
// 2026-09-30): rendered under `## This Leg` from the Brief's own mark, never
// from the Leg's position. The marked Leg is told it reaches the target;
// every Leg after it is a closing Leg and is told what a closing Leg may
// still move — the three closing-Leg rules `src/leg-schema.json` declares,
// in the writer's register rather than the schema's. A Leg BEFORE the mark
// renders nothing here, and so does every Leg of a Brief composed before
// the mark existed: the empty string is a filled slot, and the absence is
// deliberate — the earlier Legs owe nothing on this ground, so no line tells
// them so. Exported for the check.
export const REACHES_TARGET_LINE = "This Leg reaches the Reader target.";
export const CLOSING_LEG_LINE = "This Leg follows the Reader target: introduce nothing, raise nothing, "
  + "and move only what the reader asks, expects or trusts.";
export function readerTargetLine(legs, legId) {
  const list = Array.isArray(legs) ? legs : [];
  const targetIdx = list.findIndex((s) => s && s.reaches_target === true);
  if (targetIdx < 0) return "";
  const idx = list.findIndex((s) => s && s.leg_id === legId);
  if (idx === targetIdx) return REACHES_TARGET_LINE;
  if (idx > targetIdx) return CLOSING_LEG_LINE;
  return "";
}

// The fenced form. A Reverse Outline is ONE `leg` block and this is what
// unwraps it: the fence grammar is `parseBrief`'s own, so a Blind Reader who
// writes a block the Brief could not carry is refused here rather than
// downstream at a field nobody declared.
export function parseLegBlock(text, path = "<reverse-outline>") {
  const m = /^```leg\n([\s\S]*?)\n```/m.exec(text);
  if (!m) {
    return { refusal: `${path} carries no fenced \`leg\` block — a Reverse Outline IS a Brief Leg block, `
      + "written in the Brief's own field names, so there is nothing here to compare against the Forward Artifact" };
  }
  const rest = text.slice(m.index + m[0].length);
  if (/^```leg\n/m.test(rest)) {
    return { refusal: `${path} carries more than one fenced \`leg\` block — a Reverse Outline is the reading of ONE passage, `
      + "and two blocks leave the Harness to pick which one the reader meant" };
  }
  return parseLegBlockBody(m[1], path);
}

export function parseBrief(text, path = "<brief>") {
  const lines = text.split("\n");
  const refusals = [];

  // A template is refused BY FIELD (AC1): the slot token's nearest preceding
  // heading names the field the refusal carries.
  let heading = "(document head)";
  for (const ln of lines) {
    const h = ln.match(/^##\s+(.+?)\s*$/);
    if (h) heading = h[1];
    if (ln.includes(SLOT)) {
      refusals.push(`the Brief at ${path} is a template, not an input: the field "${heading}" still reads as an unfilled slot (${SLOT})`);
      break;
    }
  }

  const slugM = text.match(/^# Brief — (.+?)\s*$/m);
  const slug = slugM ? slugM[1] : basename(dirname(resolve(path)));

  // THE SURVEY PIN IS NO LONGER REQUIRED, AND ITS ABSENCE IS TYPED RATHER THAN
  // REFUSED (kogaki#1116). The commit pin is deprecated: a Brief minted since
  // that issue carries no `*Survey pin:*` line at all, because each Strand's
  // cite carries the served address at its OWN content hash — which is the fact
  // the response-wide commit was standing in for, stated per member. A Brief
  // minted before it still carries the line and is still read here, so the two
  // generations are both realizable; what changed is that the absence is a
  // recorded absence rather than a refusal, and the frontmatter says which.
  const pinM = text.match(/\*Survey pin:\*\s*`([^`]+)`/);
  const surveyPin = pinM ? pinM[1] : NO_SURVEY_PIN;

  // Strands: "### L<n> — <slug>" with their cite lines.
  const strands = [];
  const strandRe = /^### (L\d+) — (\S+)\s*$/gm;
  let m;
  while ((m = strandRe.exec(text)) !== null) {
    const tail = text.slice(m.index);
    const block = tail.slice(0, tail.indexOf("\n###", 1) === -1 ? tail.length : tail.indexOf("\n###", 1));
    const cites = [...block.matchAll(/^- (journey cite|cite): `([^`]+)`\s*$/gm)]
      .map((c) => ({ kind: c[1], cite: c[2] }));
    strands.push({ id: m[1], slug: m[2], cites });
  }
  if (strands.length === 0) refusals.push(`the Brief at ${path} settles no Strands — nothing is reachable`);

  // Legs: fenced ```leg blocks, in document order. The order IS the Reader
  // Path (AC3); nothing below re-sorts it.
  const legs = [];
  const legRe = /^```leg\n([\s\S]*?)\n```/gm;
  while ((m = legRe.exec(text)) !== null) {
    const parsed = parseLegBlockBody(m[1], path);
    if (parsed.refusal) { refusals.push(parsed.refusal); continue; }
    legs.push(parsed.leg);
  }
  if (legs.length === 0 && refusals.length === 0) {
    refusals.push(`the Brief at ${path} carries no Reader Path legs — there is nothing to realize`);
  }

  return { slug, surveyPin, strands, legs, refusals, text };
}

// The closed-set refusal, in `fillBrief`'s own shape: name the foreign id AND
// the set it is not in, and say where growing the set belongs.
export function foreignStrandRefusal(id, strands) {
  const set = strands.map((s) => s.id).join(", ");
  return `${id} is not in this Brief's settled set (${set}) — the set closed at mint; growing it is an owner act routed back through Terrain, never a /draft fetch (SPEC-draft-command, the Leg and the Move it binds)`;
}

// Scan LLM-authored prose for Strand tokens outside the closed set (AC2's
// assertion shape: a run whose material names a foreign Strand refuses by
// name). In-set tokens pass — whether internal vocabulary belongs in reader
// prose at all is a register question — carried by src/packet-template.md and
// grounded at specs/spec-brief-draft-design/DESIGN.md, "Plain register, and the round trip" — not the closed set's.
export function scanForeignStrands(content, strands) {
  const set = new Set(strands.map((s) => s.id));
  const seen = new Set();
  for (const t of content.matchAll(/\bL\d+\b/g)) {
    if (!set.has(t[0])) seen.add(t[0]);
  }
  return [...seen];
}

// The trace never renders as visible structure in the article body (AC6):
// refuse a section that carries a leg key line or a heading that is a bare
// leg_id — those are record, and the record's home is the frontmatter.
export function findTraceStructure(content, legIds) {
  const bad = [];
  if (/^\s*leg_id\s*:/m.test(content)) bad.push("a `leg_id:` key line");
  for (const id of legIds) {
    if (new RegExp(`^#{1,6}\\s*${id}\\s*$`, "m").test(content)) {
      bad.push(`a heading that is the bare leg id ${id}`);
    }
  }
  return bad;
}

// ---------------------------------------------------------------------------
// Workspace — machine identity lives here and only here (the three-layer boundary): run record,
// per-block snapshots, section files, Packets. Default under `runs/draft/`
// since kogaki#750 (`~/.kogaki/draft-runs/` before it); --workspace overrides
// for the fixture pass, which never touches either.
//
// PURE: this RESOLVES a destination and creates nothing. Preparing the
// workspace, and pruning the lane before doing so, is `enterWorkspace` below —
// the split `runs.mjs` and `terrain.mjs` both make, and it matters here because
// four of the five commands call this one mid-run, when pruning would be a
// lane act performed by a leg that owns no run.
function workspaceFor(args, slug) {
  const base = typeof args.workspace === "string" && args.workspace !== ""
    ? args.workspace
    : laneDir("draft");
  return join(base, slug);
}

// The lane entry point, called by `resolve` alone: `resolve` is the run's first
// act, so the keep-last-K prune belongs there and nowhere else. A `--workspace`
// caller prunes nothing — they named the directory, so they hold it.
function enterWorkspace(args, slug) {
  if (typeof args.workspace === "string" && args.workspace !== "") {
    const ws = workspaceFor(args, slug);
    mkdirSync(ws, { recursive: true });
    return ws;
  }
  return enterRun("draft", slug);
}

// ---------------------------------------------------------------------------
// THE JAPANESE REALIZATION (kogaki#1158). A second realization of the SAME
// Brief Legs, from the SAME Packet, with one added language block — never a
// translation of the reviewed English Draft (the owner's 2026-09-19/20
// ruling: translating from the reviewed Draft would make the later Reverse
// Outlining target implicitly cover two transformations, the English
// generation and the translation, at once). `--lang` defaults to `en`, and
// AT `en` EVERY PATH BELOW RESOLVES TO EXACTLY THE STRING IT ALWAYS DID —
// `sections`, `packets`, and the `packets` key in run.json — so the English
// path's behaviour is unchanged, which is what acceptance item 1 requires
// ("do not change the English path's behavior").
function langOf(args) {
  const v = args.lang;
  return typeof v === "string" && v !== "" ? v : "en";
}

// A SECOND LANGUAGE GETS ITS OWN SUBDIRECTORY, never a second filename
// scheme in the same one: `sections/<id>.md` and `packets/<id>.md` are the
// English track's own paths, untouched, and a Japanese Leg's realized prose
// and Packet live at `sections/ja/<id>.md` / `packets/ja/<id>.md` instead of
// colliding with the English Leg of the same id.
function sectionsDir(ws, lang) { return lang === "en" ? join(ws, "sections") : join(ws, "sections", lang); }
function packetsDir(ws, lang) { return lang === "en" ? join(ws, "packets") : join(ws, "packets", lang); }
// run.json's packet-record key, for the SAME reason: `packets` is the
// English track's own key, untouched, and a non-English track's records live
// under `packets_<lang>` instead of overwriting the English Leg's record of
// the same id.
function packetsRecordKey(lang) { return lang === "en" ? "packets" : `packets_${lang}`; }

// Per-block snapshot (kogaki#523 shape): the FULL assembled state, into
// the run workspace, before-and-after per section landing. A snapshot failure
// WARNS AND CONTINUES — the trace never gates the write it traces.
function snapshotDraft(ws, phase, seq, content) {
  try {
    const dir = join(ws, "snapshots");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${phase}.md`), content);
  } catch (e) {
    process.stderr.write(`draft: snapshot ${phase} skipped (${e.message}) — the trace never gates the write\n`);
  }
}

function loadBrief(args) {
  const path = argString(args, "brief", "this command needs --brief <path to theses/<slug>/brief.md>");
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { fail(`the Brief at ${path} cannot be read (${e.message})`); }
  const brief = parseBrief(text, path);
  if (brief.refusals.length) fail(brief.refusals[0]);
  // THE LEG'S ROUTE AT THE REALIZATION ENTRY (kogaki#1311). Every Leg carries
  // `waypoints`, and a Brief whose Leg carries none refuses here the way any
  // missing field refuses — by name, naming the Leg — because the Packet
  // renders the waypoints in place of the Move and has nothing else to give
  // the writer. A Brief composed before this field (the 2026-10-08
  // `check-only-good-what-given`) is recomposed by a new `/brief` run, never
  // patched here. The check is the composition side's own `waypointsRefusal`,
  // over the claims this Leg's block names.
  //
  // NO MOVE ID IS RESOLVED HERE ANY MORE. It was (kogaki#747), beside the
  // Packet's and the figure's own Move reads, and all three are gone: the
  // Move is read up to the Candidate and never again, so a Move renamed after
  // a Brief was composed no longer reaches realization at all.
  if (args["moves-dir"] !== undefined) {
    fail("--moves-dir is no longer taken: /draft opens no Move file (kogaki#1311). A Leg carries its own "
      + "waypoints, written when the Brief was composed, and the Packet renders those");
  }
  for (const leg of brief.legs) {
    const strands = claimStrandsOf(leg.body);
    const bad = waypointsRefusal(leg.waypoints, strands, `the Brief at ${path}, leg ${leg.leg_id}`);
    if (bad) fail(bad);
  }
  return { ...brief, path: resolve(path) };
}

// The Strand ids a Leg block's claims name, read off `renderLeg`'s one claim
// form, `claim (strand L<n>): <proposition>` (kogaki#1095).
function claimStrandsOf(body) {
  return String(body).split("\n")
    .map((l) => /^claim\s*\(strand\s+([^)\s]+)\s*\)\s*:/.exec(l))
    .filter(Boolean).map((m) => m[1]);
}

// the Section grouping's SECTION GROUPING, derived from the Brief and from nothing else
// (kogaki#823). ONE derivation, shared by the renderer, the frontmatter trace
// and the Packet: a Section is a run of Legs beginning at a Leg that declares
// `opens_section` and continuing until the next one does. The Brief is the only
// input, so what the Draft renders and what a Packet says about where a Leg
// sits cannot disagree — two derivations of the same grouping is two things
// that can drift about which Section a Leg is in.
//
// A path declaring no `opens_section` at all is the pre-Section-grouping corpus, and it
// derives ONE untitled Section rather than refusing. The refusal for that shape
// is rule 3's and it lives at COMPOSITION (`sectionGroupingRefusal`), where the
// Brief is being authored and can still be fixed; refusing here as well would
// make every Brief minted before this issue unrenderable, which is a migration
// this issue has no licence for and did not ask for.
export function sectionsOf(legs) {
  const sections = [];
  for (const s of legs) {
    if (s.opens_section !== undefined || sections.length === 0) {
      sections.push({ index: sections.length + 1, title: s.opens_section, leg_ids: [] });
    }
    sections[sections.length - 1].leg_ids.push(s.leg_id);
  }
  return sections;
}

// The per-Leg view of the same derivation: leg_id -> its Section, and whether
// this Leg is the one that OPENS it. Both consumers need the mapping keyed
// this way and neither should re-walk the runs to get it.
export function sectionOfLeg(legs) {
  const map = new Map();
  for (const sec of sectionsOf(legs)) {
    for (const id of sec.leg_ids) {
      map.set(id, { index: sec.index, title: sec.title, opens: id === sec.leg_ids[0], leg_ids: sec.leg_ids });
    }
  }
  return map;
}

// THE FIGURE BLOCKS THIS BODY PLACES (the renderer and the anchor, kogaki#879). Read from the run
// record `figure` wrote, rendered by src/render-figure.mjs, and keyed by Leg.
//
// READ, NEVER RE-DERIVED — the same rule the Packet record already holds two
// functions down. `cmdFigure` recorded the path, the sha and the position at
// the moment the record was validated; recomputing any of them here would
// answer for the file as it stands rather than for the record the figure was
// validated as, which is the whole of what the pin is for.
//
// A RENDER FAILURE IS COLLECTED, NEVER THROWN. This function runs inside
// `snapshotDraft` on every `section`, where a half-filled run is the ORDINARY
// state and a throw would take the snapshot down with it. `cmdEmit` is what
// refuses on the collected errors — the trace never gates the write it traces,
// and the artifact does gate.
function figureBlocks(ws) {
  const out = new Map();
  const errors = [];
  let records = {};
  try { records = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).figures || {}; }
  catch { return { blocks: out, errors }; }
  for (const id of Object.keys(records).sort()) {
    const rec = records[id];
    if (!rec || typeof rec.path !== "string" || !existsSync(rec.path)) continue;
    let record;
    try { record = JSON.parse(readFileSync(rec.path, "utf8")); }
    catch (e) { errors.push(`leg ${id}: the figure record at ${rec.path} is not readable JSON (${e.message}) — it was written by \`figure\` and validated then, so a record unreadable now was edited outside the Harness`); continue; }
    const r = renderFigure(record);
    if (r.error) { errors.push(`leg ${id}: ${r.error}`); continue; }
    out.set(id, { markup: r.markup, position: rec.position === "before" ? "before" : "after", path: rec.path, sha256: rec.sha256 });
  }
  return { blocks: out, errors };
}

// THE HEADING IS THE HARNESS'S, WRITTEN HERE AND NOWHERE ELSE (kogaki#823).
// `emit` used to concatenate the realized prose and write no heading at all,
// which left the heading to whatever the model happened to produce — five
// headings for five Legs in the 2026-09-03 specimen, the fragmentation half of
// the pair the owner rejected. Deriving them from the Brief's declaration is
// what makes a heading-per-Leg draft UNPRODUCIBLE rather than detected: there
// is no input to this function from which one could come.
function assembleBody(brief, ws, lang = "en") {
  const parts = [];
  const missing = [];
  // THE RANGE RIDES THE WALK THAT PRODUCES THE PROSE (kogaki#868). Line
  // accounting computed anywhere else is a second derivation of where a Leg
  // sits, and two derivations agree until one is edited; here the range and the
  // bytes it points at cannot disagree, because the same `push` produces both.
  // Body-relative and 1-based; `cmdEmit` offsets by the frontmatter it writes.
  const ranges = new Map();
  let line = 1;
  const push = (text) => {
    const span = [line, line + text.split("\n").length - 1];
    parts.push(text);
    // The `\n\n` join below leaves exactly one blank line between blocks, and
    // that blank line belongs to no Leg.
    line = span[1] + 2;
    return span;
  };
  const sections = sectionsOf(brief.legs);
  const opensAt = new Map();
  for (const sec of sections) opensAt.set(sec.leg_ids[0], sec);
  // THE FIGURE IS ANCHORED TO ITS LEG, INSIDE ITS SECTION (the renderer and the anchor, kogaki#879).
  // It is pushed by the same `push` the prose is, so its range and the bytes it
  // points at cannot disagree — the kogaki#868 property, extended to the one
  // element the body carries that no Leg wrote.
  //
  // NO LEG STRUCTURE BECOMES VISIBLE. The block is a rendered element the
  // Brief declared, in the same standing as a heading: it carries no id, no
  // key line and no marker a reader could read the trace off, so
  // `findTraceStructure`'s subject is untouched by it.
  const { blocks: figures, errors: figureErrors } = figureBlocks(ws);
  const figureRanges = new Map();
  for (const leg of brief.legs) {
    const f = join(sectionsDir(ws, lang), `${leg.leg_id}.md`);
    if (!existsSync(f)) { missing.push(leg.leg_id); continue; }
    const sec = opensAt.get(leg.leg_id);
    // An untitled Section renders no heading rather than an empty one. It is
    // reachable only on a pre-Section-grouping path, whose whole body is one Section.
    // A heading line belongs to the Section, never to the Leg that opened it.
    if (sec && sec.title !== undefined) push(`## ${sec.title}`);
    const fig = figures.get(leg.leg_id);
    // `before` sets the prose up and `after` discharges it (the figure record's closed
    // pair). The heading is pushed above either way: a figure never precedes
    // the heading of the Section it sits in.
    if (fig && fig.position === "before") figureRanges.set(leg.leg_id, push(fig.markup));
    // THE LEG'S OWN `lines` SPAN THE PROSE ALONE (kogaki#868, restated at
    // the renderer and the anchor). The figure's bytes are the Brief's declaration realized by the
    // Harness, not the Leg's realized prose, and kogaki#870's blind recovery
    // quotes a Leg at exactly these lines — a range that swallowed the block
    // would hand the reviewer markup to re-derive prose from.
    ranges.set(leg.leg_id, push(readFileSync(f, "utf8").trim()));
    if (fig && fig.position === "after") figureRanges.set(leg.leg_id, push(fig.markup));
  }
  return { body: parts.join("\n\n"), missing, ranges, figureRanges, figures, figureErrors };
}

// ---------------------------------------------------------------------------
// Commands.

// ---------------------------------------------------------------------------
// FRESH CALL (kogaki#1237, owner decision 2026-09-30). `section` and `figure`
// no longer take the realized text from a file the invoking session wrote.
// Each renders its input -- the Leg Packet; the Packet plus the figure block --
// and hands it, as the ENTIRE stdin, to the command `src/draft-workflow.json`'s
// `writer` block declares, then records the response. The session that invokes
// the act never sees the Packet and never writes the prose, so nothing it read
// for one Leg can be carried into the next: the Packet is the writer's entire
// input by construction, not by the file alone.
//
// THE TABLE IS HARNESS-OWNED AND REFUSES A MISSING KEY BY NAME. The keys are
// the ones `src/brief-workflow.json`'s `judge` block declares, and none is
// defaulted: a bound a table can silently omit is not a bound (kogaki#1030).
const DRAFT_TABLE = join(dirname(fileURLToPath(import.meta.url)), "draft-workflow.json");
export const WRITER_KEYS = ["command", "model", "effort", "output_format", "timeout_s", "retries"];
export const WRITER_ACTS = ["section", "figure"];

// The refusal over a parsed table, or null. EXPORTED AND PURE so a check can
// drive it over a table it builds, without a file seam into the runtime.
export function writerSettingsRefusal(table) {
  const at = "src/draft-workflow.json";
  const w = table && table.writer;
  if (!w || typeof w !== "object" || Array.isArray(w)) {
    return `${at} declares no \`writer\` block — Fresh Call runs the realization through a Harness-declared command, and a table without the block has no writer to call`;
  }
  for (const k of WRITER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(w, k)) {
      return `${at}'s writer block declares no \`${k}\` — the block carries ${WRITER_KEYS.join(", ")}, each required rather than defaulted, so a missing one refuses the act by name`;
    }
  }
  for (const k of ["command", "model", "effort", "output_format"]) {
    if (typeof w[k] !== "string" || w[k] === "") return `${at}'s writer block's \`${k}\` is not a non-empty string`;
  }
  if (!Number.isFinite(w.timeout_s) || w.timeout_s <= 0) {
    return `${at}'s writer block declares no positive numeric \`timeout_s\` — the writer call is bounded per call, and an unbounded child is what the bound exists to refuse`;
  }
  if (!w.retries || typeof w.retries !== "object" || Array.isArray(w.retries)) {
    return `${at}'s writer block's \`retries\` is not an object keyed by act (${WRITER_ACTS.join(", ")})`;
  }
  for (const act of WRITER_ACTS) {
    const n = w.retries[act];
    if (!Number.isInteger(n) || n < 0) return `${at}'s writer block declares no non-negative integer \`retries.${act}\` — how many times a refused response is re-asked before the act fails naming the Leg`;
  }
  return null;
}

function writerSettings() {
  let table;
  try { table = JSON.parse(readFileSync(DRAFT_TABLE, "utf8")); }
  catch (e) { fail(`the draft workflow table at ${DRAFT_TABLE} cannot be read (${e.message}) — it is a runtime-read carrier and the act has no built-in fallback, deliberately: a fallback writer would be a second copy nobody maintains`); }
  const bad = writerSettingsRefusal(table);
  if (bad) fail(bad);
  const w = table.writer;
  // `KOGAKI_JUDGE_CLI` REPLACES THE BINARY, FOR FIXTURES, and is resolved like
  // any other command (kogaki#1076): a stub that cannot answer `--version` is
  // a fixture running something the shipped path would refuse.
  const declared = process.env.KOGAKI_JUDGE_CLI || w.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  return { ...w, binary, stubbed: !!process.env.KOGAKI_JUDGE_CLI };
}

// The response's TEXT. `claude -p --output-format json` wraps the answer in an
// envelope whose `result` carries it; `text` is the answer itself.
function writerText(stdout, outputFormat) {
  if (outputFormat !== "json") return String(stdout);
  let env;
  try { env = JSON.parse(stdout); } catch (e) { return { error: `the writer's json response does not parse (${e.message})` }; }
  if (typeof env === "string") return env;
  if (env && typeof env === "object" && typeof env.result === "string") return env.result;
  return { error: "the writer's json response carries no string `result`" };
}

// ONE CALL, RE-ASKED WITH THE SAME INPUT UP TO THE DECLARED RETRIES. `refuse`
// is the act's own refusal over the response text (returning a message or
// null); a response it rejects is re-asked, and when the retries are spent the
// act fails NAMING THE LEG and the last refusal. The input is never changed
// between asks -- the Packet is the whole input, and re-reading the material is
// not what is wanted.
function callWriter({ settings, act, legId, input, refuse }) {
  const attempts = 1 + settings.retries[act];
  const refused = [];
  for (let n = 1; n <= attempts; n++) {
    const r = spawnSync(settings.binary.path,
      ["-p", "--model", settings.model, "--output-format", settings.output_format],
      { input, encoding: "utf8", timeout: 1000 * settings.timeout_s, maxBuffer: 64 * 1024 * 1024 });
    if (r.error) {
      fail(`leg ${legId}: the writer (${settings.binary.path}) could not be run for \`${act}\` (${r.error.code || "spawn failed"}: ${r.error.message}) — attempt ${n} of ${attempts}`);
    }
    if (r.status !== 0) {
      const said = String(r.stderr || "").trim().split("\n")[0] || "(no stderr)";
      fail(`leg ${legId}: the writer exited ${r.status === null ? `on ${r.signal}` : r.status} for \`${act}\` — ${said}`);
    }
    const text = writerText(r.stdout, settings.output_format);
    // THE WRITER'S OWN REFUSAL (kogaki#1250, owner ruling 2026-10-04). A
    // response opening with `refusal: <reason>` is the writer declaring that
    // this waypoint cannot be reached from the material the Packet gave
    // it, or that material is missing — the act's FAILURE, never content, and
    // never a sentence of meta-commentary reaching the Draft in its place.
    // Checked ahead of `refuse` (which judges prose actually written) and
    // failed WITHOUT a retry: the Packet is the writer's whole input and is
    // not re-sent differently on the next ask, so an unchanged input cannot
    // turn a refusal into prose.
    const declaredRefusal = writerRefusal(text);
    if (declaredRefusal) {
      fail(`leg ${legId}: the writer refused \`${act}\` — ${declaredRefusal} — no ${act} is recorded, and this is not re-asked`);
    }
    const bad = (text && typeof text === "object" && text.error) ? text.error : refuse(text);
    if (!bad) return { text, attempts: n, refused };
    refused.push(bad);
  }
  fail(`leg ${legId}: the writer's \`${act}\` response was refused ${attempts} time(s) and the declared retries.${act}=${settings.retries[act]} are spent — the Leg is not recorded. Last refusal: ${refused[refused.length - 1]}`);
}

// THE DECLARED FORM, pure: a response whose FIRST LINE is `refusal: <reason>`
// is the writer's refusal of the act, not prose — the reason, or null if the
// response does not open with the form (kogaki#1250). First-line only: a
// refusal clause arriving later in otherwise-written prose is not this form,
// exactly as every other Packet field is read from the start of its own line.
export function writerRefusal(text) {
  if (typeof text !== "string") return null;
  const first = text.replace(/^﻿/, "").trimStart().split("\n")[0];
  const m = first.match(/^refusal:[ \t]*(\S.*?)\s*$/);
  return m ? m[1] : null;
}

// THE PROSE REFUSALS, one function, so the re-ask loop and a check read the
// same rule set: empty; a foreign Strand; record rendered as structure; a
// figure drawn in prose; a heading of the prose's own.
export function sectionProseRefusal(content, id, brief) {
  if (typeof content !== "string" || content.trim() === "") {
    return `the section for ${id} is empty — the writer returned no prose`;
  }
  const foreign = scanForeignStrands(content, brief.strands);
  if (foreign.length) return foreignStrandRefusal(foreign[0], brief.strands);
  const structural = findTraceStructure(content, brief.legs.map((s) => s.leg_id));
  if (structural.length) {
    return `the section for ${id} renders record as structure: ${structural[0]} — the per-Leg trace is frontmatter record, never visible structure in the body (SPEC-draft-command, the Brief's centre and its obligations ledger)`;
  }
  const quotable = content.replace(/^`{4,}[\s\S]*?^`{4,}[ \t]*$/gm, "");
  const drawn = quotable.match(new RegExp("^```[ \\t]*" + MERMAID_FENCE + "\\b", "mi"));
  if (drawn) {
    return `the section for ${id} draws its own figure (a \`\`\`${MERMAID_FENCE} fence) — after the renderer and the anchor a figure's markup is rendered by the Harness from the record \`figure --leg ${id}\` validated, and prose that draws one is a second author on a seat the Brief owns, exactly as a heading in the prose is (the Section grouping). `
      + `If this Leg should carry a figure, it is declared with \`figure:\` on the Brief (the figure decision) and designed after this prose; if it should not, remove the fence`;
  }
  const unfenced = content.replace(/^```[\s\S]*?^```[ \t]*$/gm, "");
  const heading = unfenced.match(/^(#{1,6})[ \t]+(\S.*?)[ \t]*$/m);
  if (heading) {
    return `the section for ${id} carries its own heading (${heading[0].trim()}) — after the Section grouping the heading is the Harness's, rendered once per Section at the Leg that declares opens_section, and prose that writes its own produces a second heading the Brief never declared. `
      + `Remove it: the Packet's write instruction says "No heading" for this reason`;
  }
  return null;
}

// A figure record out of a response: the JSON object, fences stripped, or the
// reason it is not one. The mechanical validation (`figureRecordRefusal`) runs
// on what this returns.
export function parseWriterRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; }
  catch (e) { return { error: `the figure record is not readable JSON (${e.message}) — the record is one JSON object, the instance of the Leg's figure form` }; }
}

function cmdResolve(args) {
  const brief = loadBrief(args);
  const ws = enterWorkspace(args, brief.slug);
  mkdirSync(join(ws, "sections"), { recursive: true });
  // Machine identity: run record in the workspace, never in the artifact.
  // A RE-RESOLVE PRESERVES THE PACKET RECORDS WHEN THE BRIEF HAS NOT MOVED.
  // This write is a full overwrite by design — the run record is the run's
  // identity — but `packet` now records path+sha here, and an overwrite would
  // orphan Packet files that are still on disk and still current: the exact
  // unrecorded-artifact defect the recording exists to close, re-created by
  // the other half of the same file. Where the Brief HAS moved, the old
  // entries are correctly dropped: they describe Packets rendered from a
  // Brief that no longer exists.
  const prevRun = join(ws, "run.json");
  let carried;
  try {
    const prev = JSON.parse(readFileSync(prevRun, "utf8"));
    if (prev.brief_sha === sha256(brief.text) && prev.packets) carried = prev.packets;
  } catch { /* no prior record, or unreadable — nothing to carry */ }

  writeFileSync(join(ws, "run.json"), JSON.stringify({
    ...(carried ? { packets: carried } : {}),
    brief: brief.path,
    brief_sha: sha256(brief.text),
    survey_pin: brief.surveyPin,
    strands: brief.strands.map((s) => s.id),
    legs: brief.legs.map((s) => s.leg_id),
    resolved_at: new Date().toISOString(),
  }, null, 2) + "\n");
  process.stdout.write(`brief: ${brief.path}\n`);
  process.stdout.write(`survey pin: ${brief.surveyPin}\n`);
  driveNextPacket(brief, args, ws);
  process.stdout.write(`closed set: ${brief.strands.map((s) => s.id).join(", ")} — the Brief's own text plus these Strands' served renderings at the pin; nothing else is reachable\n`);
  process.stdout.write(`reader path: ${brief.legs.map((s) => s.leg_id).join(" → ")} (recorded order; realized in this order and no other)\n`);
  // the reader-knowledge ledger's ledger is DERIVED here and rendered, never stored: no field is
  // written to the Brief and no key is added to the run record above. A Brief
  // whose path introduces nothing renders the empty ledger AS an empty ledger
  // — that is a true reading of the path, not a failure to compute one.
  // COUNTED FROM THE DERIVATION, never by adding the last Leg's RAW entries
  // to the deduped union before it (PR #775 round 1). The first form
  // double-counted a term a later Leg re-declares — and cross-Leg
  // re-declaration is exactly what the reader-knowledge ledger legalizes, so the wrong case was the
  // one the field explicitly permits. Appending a terminal sentinel makes the
  // final row's snapshot the whole path's union, so the count comes from the
  // same function everything else reads and cannot disagree with it. This
  // line is the ONLY owner-facing rendering of the ledger, which is why a
  // wrong number here is the one a reader has no way to check.
  const ledger = readerKnowledgeLedger([...brief.legs, { leg_id: "(end)" }]);
  const introduced = ledger[ledger.length - 1].reader_already_knows.length;
  process.stdout.write(`reader-knowledge ledger: ${introduced} term(s) introduced across ${brief.legs.length} leg(s), derived from the path at read time and stored nowhere (the reader-knowledge ledger)${introduced === 0 ? " — this path introduces no terms, which is a reading of it and not an error" : ""}\n`);
  process.stdout.write(`waypoints: ${brief.legs.reduce((n, l) => n + l.waypoints.length, 0)} across ${brief.legs.length} leg(s), each serving a claim of its Leg — the route was written and judged at composition, and no Move is opened here (kogaki#1311)\n`);
  process.stdout.write(`workspace: ${ws} (machine-local; snapshots and run identity live here, never in the artifact)\n`);
}

function cmdMaterial(args) {
  const brief = loadBrief(args);
  const id = argString(args, "strand", "material needs --strand <L-id>");
  const strand = brief.strands.find((s) => s.id === id);
  if (!strand) fail(foreignStrandRefusal(id, brief.strands));
  process.stdout.write(`${strand.id} — ${strand.slug}\n`);
  for (const c of strand.cites) process.stdout.write(`${c.kind}: ${c.cite}\n`);
  // The Brief's own text is the material: every claim line naming this
  // Strand, quoted as the Brief carries it.
  const claims = [...brief.text.matchAll(new RegExp(`^claim \\(strand ${id}\\): (.+)$`, "gm"))];
  for (const g of claims) process.stdout.write(`claim: ${g[1]}\n`);
}

// ---------------------------------------------------------------------------
// THE SECTION PACKET (the Leg Packet, kogaki#749; owner rulings 2026-09-01).
//
// The harness-assembled input from which the model realizes ONE Leg's prose —
// the one LLM judgment of the Draft lane. `packet --leg <id>` renders it
// DETERMINISTICALLY from the template plus the Brief plus
// the workspace's realized Sections plus the derived ledger; the session
// realizes the prose; `section` validates it as before.
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT. Nothing outside it is read, which is
// why every block opens with a fixed usage header saying what the block is FOR:
// a block whose use is not stated gets used for whatever it resembles.
//
// DETERMINISTIC means the same inputs render the same bytes. No timestamp, no
// run id, no ordering that depends on a directory read: the Sections come in
// the Brief's recorded order and the ledger is recomputed from the path.

// NO MOVE FIELD IS RENDERED (kogaki#1311, owner decision 2026-10-09). The
// Packet carried the bound Move's `technique`, `question` and `breaks` until
// this issue, and the writer instantiated the Move's general route alone —
// the instantiation the 2026-10-05 and 2026-10-08 runs refused at Leg 2 and
// Leg 4. The Leg now carries that instantiation itself, as `waypoints`
// written at composition and judged there against the Move, and the Packet
// renders the waypoints in the Move block's place. No Move file is opened
// to render a Packet.

// The leg block's fields, read off the recorded form `renderLeg` writes.
// A field's CONTINUATION LINES — two-space-indented lines immediately below
// it (kogaki#1224) — are read back and rejoined by `\n`, never folded into
// one line: `reader_state_before`/`after` are `dimension: value` lines
// (kogaki#1176) and `readerStateDimensionLine` reads them apart by line, so
// folding here would erase the boundary that reader needs.
export function legField(body, field) {
  const m = body.match(new RegExp(`^${field}:[ \\t]*(.*)\\n((?:  .*(?:\\n|$))*)`, "m"));
  if (!m) {
    const inline = body.match(new RegExp(`^${field}:[ \\t]*(.*)$`, "m"));
    return inline ? inline[1].trim() : null;
  }
  const rest = m[2].split("\n").filter((l) => l !== "").map((l) => l.slice(2));
  return [m[1].trim(), ...rest].join("\n");
}

// ---------------------------------------------------------------------------
// the figure record — its realization-side machinery (kogaki#878).
//
// THE PACKET IS THE MODEL'S ENTIRE INPUT, AND THE FIGURE INPUT IS THAT PACKET
// PLUS ONE BLOCK. The block is appended only for a Leg carrying `figure:`,
// and only AFTER that Leg's prose is recorded — the hub's third moment,
// concrete design after the text. It travels in the same template file as the
// Packet, behind a marker the Packet render splits away, because a second
// template file would be a second carrier for one model-facing surface.

const FIGURE_INPUT_MARKER = "<!-- FIGURE-INPUT -->";

// ONE SPLIT, TWO CONSUMERS. `renderPacket` takes the first half and would
// otherwise refuse on the figure block's unfilled slots; `renderFigureInput`
// takes the second. Both read the same file, so the marker cannot drift out
// from under one of them.
export function splitPacketTemplate(text) {
  const at = text.indexOf(FIGURE_INPUT_MARKER);
  if (at === -1) {
    return { error: `the Packet template carries no ${FIGURE_INPUT_MARKER} marker — the figure block lives behind it (the figure record), and a template without it cannot say where the Packet ends` };
  }
  return { packet: text.slice(0, at).trimEnd() + "\n", figure: text.slice(at + FIGURE_INPUT_MARKER.length) };
}

// The Leg's claim lines, in the order they are declared. `g<n>` addresses
// this list 1-based (the figure decision), and the address space is THIS Leg's claims —
// which is what makes a role bound to another Leg's claim unreachable rather
// than refused by a rule.
export function claimLines(leg) {
  return leg.body.split("\n").filter((l) => l.startsWith("claim "));
}
// VERBATIM, THE WHOLE LINE. The binding block quotes what the Brief recorded,
// including which Strand or Leg effect licensed it: an element is that claim
// worded for the reader, and a reader of the record who cannot see the licence
// cannot tell a wording from an invention.
export function claimAt(leg, addr) {
  const m = /^g([1-9][0-9]*)$/.exec(String(addr));
  if (!m) return null;
  return claimLines(leg)[Number(m[1]) - 1] ?? null;
}

// The form for one figure-carrying Leg, with its roles in the CLOSED SET'S
// declared order rather than the record's key order — the same record must
// render the same bytes, and object key order is an accident of how the file
// was written.
//
// THE KIND IS READ OFF THE LEG, NOT THE MOVE (kogaki#1311). Every kind in
// src/figure-kinds.json has its own role set, and the Leg's `figure_roles`
// binds exactly the roles of its Move's form — composition refused anything
// else while the Move was still in reach (`resolveFigureForms`). So the kind
// whose role set equals the Leg's bound roles IS that form's kind, and the
// figure is designed without opening the Move. What a role means is the
// kind's `relation` line and the claim it is bound to; the Move's own wording
// for a role stays with the Move, whose responsibility ends at the Candidate.
export function figureFormFor(leg) {
  const kinds = figureKinds().kinds || {};
  const bound = Object.keys(leg.figure_roles || {}).sort();
  const matches = Object.entries(kinds).filter(([, k]) => {
    const roles = [...(k.roles || [])].sort();
    return roles.length === bound.length && roles.every((r, i) => r === bound[i]);
  });
  if (matches.length !== 1) {
    return { error: `leg ${leg.leg_id}: figure_roles binds ${bound.length ? bound.map((r) => `"${r}"`).join(", ") : "no role"}, `
      + `which is ${matches.length ? "the role set of more than one kind" : "the role set of no kind"} in src/figure-kinds.json `
      + `(${Object.entries(kinds).map(([n, k]) => `${n}: ${(k.roles || []).join(", ")}`).join("; ")}) — composition binds exactly `
      + `one form's roles, so this Brief has been edited since it was adopted` };
  }
  const [kind, decl] = matches[0];
  const roles = decl.roles || [];
  return { kind, roles, relation: decl.relation, lines: Object.fromEntries(roles.map((x) => [x, decl.relation])) };
}

// The figure input: the stored Packet, unchanged, plus the filled block. The
// Packet is passed in as the BYTES THAT WERE SERVED rather than re-rendered,
// for the reason `cmdSection`'s backstop already gives — the record is what the
// prose was realized from, and a fresh render answers for the file as it stands.
export function renderFigureInput({ figureTemplate, packetText, leg, form, prose }) {
  const missing = form.roles.filter((r) => !form.lines[r]);
  if (missing.length) {
    return { error: `leg ${leg.leg_id}: the ${form.kind} form carries no line for ${missing.map((x) => `"${x}"`).join(", ")} — src/figure-kinds.json declares a relation for every kind, so the file has been edited since` };
  }
  const binding = [];
  for (const role of form.roles) {
    const addr = (leg.figure_roles || {})[role];
    const g = claimAt(leg, addr);
    if (g === null) {
      return { error: `leg ${leg.leg_id}: figure_roles binds "${role}" to ${JSON.stringify(addr ?? null)} and this Leg has no such claim — composition refuses this (the figure decision), so the Brief has been edited since it was adopted` };
    }
    binding.push(`- **${role}** — bound to \`${addr}\`:\n\n  ${g}`);
  }
  const fields = {
    figure_kind: form.kind,
    figure_form_roles: form.roles.map((r) => `- **${r}**`).join("\n") + `\n\nWhat holds between them: ${form.relation}.`,
    figure_binding: binding.join("\n"),
    figure_reason: leg.figure,
    figure_prose: prose.trim(),
  };
  let out = figureTemplate;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the figure block's slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the figure record)` };
  return { input: packetText.trimEnd() + "\n" + out };
}

// THE RECORD'S VALIDATION, and it is the MECHANICAL half only (the figure record). Every
// role present, no extra role, the kind equal to the form's, each element bound
// to the claim THE BRIEF bound that role to, a position from the closed pair,
// a non-empty caption and at least one relation. Whether an element's wording
// is fair to its claim, and whether the relations instantiate the kind's
// relation line, are judgments — the judgment rule's rule that a missing field is refused
// and a weak one is not, which is also why kogaki#880 reviews the figure by a
// round trip rather than by a lint here.
export function figureRecordRefusal(record, leg, form, schema) {
  const at = `the figure record for leg ${leg.leg_id}`;
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return `${at} is not a JSON object — the record is the instance of the Leg's figure form, one object (src/figure-schema.json)`;
  }
  for (const key of schema.required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      return `${at} carries no ${key} — src/figure-schema.json requires ${schema.required.join(", ")}`;
    }
  }
  const known = new Set([...schema.required, ...(schema.optional || [])]);
  const extra = Object.keys(record).filter((k) => !known.has(k)).sort();
  if (extra.length) {
    // REFUSED RATHER THAN IGNORED, the rule a closed key set states
    // for its own forbidden keys: an ignored field still shaped the reading
    // that produced the rest of the record.
    return `${at} carries ${extra.map((x) => `"${x}"`).join(", ")}, which src/figure-schema.json does not define — the record's fields are ${[...known].sort().join(", ")}`;
  }
  if (record.kind !== form.kind) {
    return `${at} declares kind ${JSON.stringify(record.kind)} and leg ${leg.leg_id}'s figure_roles bind the ${JSON.stringify(form.kind)} form — the record is the INSTANCE of that form (the figure decision), so its kind is the form's and never a choice made at realization`;
  }
  if (record.elements === null || typeof record.elements !== "object" || Array.isArray(record.elements)) {
    return `${at}: elements is one entry per role of the ${form.kind} form (${form.roles.join(", ")}), keyed by role`;
  }
  const have = new Set(Object.keys(record.elements));
  const missing = form.roles.filter((r) => !have.has(r));
  if (missing.length) {
    return `${at} leaves ${missing.map((x) => `"${x}"`).join(", ")} unfilled — every role of the ${form.kind} form carries an element (the form's roles are ${form.roles.join(", ")})`;
  }
  const surplus = [...have].filter((r) => !form.roles.includes(r)).sort();
  if (surplus.length) {
    return `${at} fills ${surplus.map((x) => `"${x}"`).join(", ")}, which is not a role of the ${form.kind} form — the form's roles are ${form.roles.join(", ")} (src/figure-kinds.json)`;
  }
  for (const role of form.roles) {
    const el = record.elements[role];
    if (el === null || typeof el !== "object" || Array.isArray(el)) {
      return `${at}: element "${role}" is an object carrying text and claim (src/figure-schema.json)`;
    }
    if (typeof el.text !== "string" || el.text.trim() === "") {
      return `${at}: element "${role}" carries no text — an element is its bound claim WORDED FOR THE READER, and an empty one is the position left open rather than filled`;
    }
    const want = (leg.figure_roles || {})[role];
    if (el.claim !== want) {
      // AC2. The Brief bound the role; the record may not move it. A swapped
      // claim is an element licensed by material the composer did not put
      // under that position, which is exactly the join kogaki#880 checks and
      // exactly the one nothing downstream could re-derive.
      return `${at}: element "${role}" is bound to ${JSON.stringify(el.claim ?? null)} and the Brief bound "${role}" to ${JSON.stringify(want ?? null)} — the binding is the Brief's decision (the figure decision), and a record that moves a role to another claim words it from material the composer did not put under that position`;
    }
  }
  if (!Array.isArray(record.relations) || record.relations.length === 0
      || record.relations.some((x) => typeof x !== "string" || x.trim() === "")) {
    return `${at}: relations is a non-empty list of lines — the kind's whole content is the relation it holds (${form.kind}: ${form.relation}), so a record asserting none is a list rather than a figure`;
  }
  if (typeof record.caption !== "string" || record.caption.trim() === "") {
    return `${at}: caption is one line in the terms of this Leg's reader_state_after — what the reader holds after looking`;
  }
  if (Object.prototype.hasOwnProperty.call(record, "emphasis")
      && !form.roles.includes(record.emphasis)) {
    return `${at}: emphasis is ${JSON.stringify(record.emphasis)}, which is not a role of the ${form.kind} form (${form.roles.join(", ")}) — emphasis names which element the figure leans on`;
  }
  const positions = schema.fields.position.one_of;
  if (!positions.includes(record.position)) {
    return `${at}: position is ${JSON.stringify(record.position ?? null)} and the closed pair is ${positions.join(", ")} — within its Leg a figure either sets the prose up or discharges it`;
  }
  return null;
}

// the Section grouping's Section, as the Packet says it (kogaki#825). The Packet is the
// model's ENTIRE input, so "which Section am I in" is answerable only if the
// Packet answers it — an opening Leg is told the title it is opening, and a
// continuing Leg is told the heading it sits under. Both forms name a title
// that is ALREADY ON THE PAGE or about to be, so neither invites the model to
// write one.
//
// The untitled case is the pre-Section-grouping corpus, which derives one untitled
// Section: it is STATED rather than left blank, for the same reason every other
// absence in this renderer is stated — a hole in the model's whole world is not
// a gap the model notices, it is a hole the model fills by invention.
export function sectionPlacement(sec) {
  // DEFENSIVE ONLY, and said so rather than advertised as a rendered form (PR
  // #844 round 1, finding 3). No Packet render reaches it: `sectionsOf` derives
  // one untitled Section for a path declaring nothing, and
  // `renderAndStorePacket` refuses an unknown Leg before the lookup. It is
  // kept so the function is total and removed from the assertions and from the
  // admission record, because a contract field claiming unreachable behaviour
  // is re-read at every later judgment on the member.
  if (sec === undefined) return "(no Section could be derived for this Leg.)";
  if (sec.title === undefined) {
    // The untitled form STILL SAYS WHICH (finding 3, second half): the block
    // above it promises "the line below says which", and a form that says
    // neither breaks that promise for the whole pre-Section-grouping corpus, which is the
    // only corpus that reaches it.
    // NO ORDINAL HERE (PR #847 round 1, nit 2). The arm that built one was
    // dead: `sectionsOf` pushes a new Section only where `opens_section` is
    // declared or where none exists yet, so an UNTITLED Section is always the
    // first and only one — the "th" branch was unreachable, would have rendered
    // "2th" if it ran, and told a later reader that untitled Sections beyond
    // the first exist. The single Section is named as such instead.
    return sec.opens
      ? "- **This Leg OPENS the article's one Section.** This Brief declares no Section titles, so no heading is rendered above your prose."
      : "- **This Leg CONTINUES the article's one Section.** This Brief declares no Section titles, so no heading is rendered, and prose you are writing further into sits above.";
  }
  const others = sec.leg_ids.length - 1;
  return sec.opens
    ? `- **This Leg OPENS a Section.** Its heading is **"${sec.title}"**, rendered by the Harness immediately above your prose.\n`
      + `- **Your prose is what the heading promises.** ${others === 0
          ? "This Leg is the whole Section."
          : `${others} further Leg${others === 1 ? "" : "s"} continue${others === 1 ? "s" : ""} under it, so open the question rather than closing it.`}`
    : `- **This Leg CONTINUES the Section headed "${sec.title}".** That heading is already on the page, above prose you are writing further into.\n`
      + `- **No new heading is rendered here.** Develop what the Section has established; a new subject belongs to a Leg that opens its own.`;
}

// PRIOR PROSE, SCOPED TO THE CURRENT SECTION ONLY (kogaki#1282, owner ruling
// 2026-10-06). A Section is a closed discourse segment (Grosz & Sidner): a
// referent sitting in an earlier Section is not reachable from here by
// pronoun or demonstrative, so an earlier Section's prose is never carried
// into this block, not even verbatim. What this Leg may read is its own
// Section's prose so far, and nothing from before it.
export function priorProseInSection(priorSections, sections, currentIndex, currentLegId) {
  const sec = (sections || []).find((s) => s.index === currentIndex);
  if (!sec) return null;
  const have = new Map(priorSections.map((p) => [p.leg_id, p.text]));
  const parts = sec.leg_ids.filter((id) => have.has(id)).map((id) => have.get(id));
  // AN EMPTY SECTION DOES NOT MEAN THIS LEG OPENS IT (PR #847 round 1,
  // finding 1). It means the Legs above it in that Section are not realized
  // yet, and the two states are distinguished by the Section's own recorded
  // path — which is what stops the Packet contradicting its own
  // `section_placement` block, where a continuing Leg is told the heading is
  // already on the page above prose it is writing further into.
  const opensIt = sec.leg_ids[0] === currentLegId;
  if (parts.length) return parts.join("\n\n");
  return opensIt
    ? "(nothing yet — this Leg opens the Section, so its prose is the first in it.)"
    : "(nothing yet — the Legs that open this Section are not realized, so no prose stands under this heading. You are NOT opening it: write as the Section's heading and your own Leg promise.)";
}

// ---------------------------------------------------------------------------
// JOURNEY TEXT RESOLUTION (kogaki#1250, owner ruling 2026-10-04). Since
// kogaki#1111 the Packet rendered a Journey as an ADDRESS ONLY — "Its prose
// is the served record at `<cite>`" — and handed the writer nothing to read.
// Since Fresh Call (kogaki#1237) the writer is a separate `claude -p` process
// with no permission grant of its own, so that address was never reachable
// FROM INSIDE the realization: the writer had no Journey, and said so in the
// article, which is the defect this issue closes. The Packet now carries the
// Journey's served TEXT, resolved through the kit's gateway query BEFORE any
// writer is called — and a Journey that does not resolve refuses the whole
// Packet build, naming the Leg and the address, rather than reaching the
// writer as a hole for it to fill by invention.
//
// THIS IS A STATED EXCEPTION to "the gateway is an enhancer, never a
// dependency" (policy/CAPABILITIES.md): every OTHER seam in this repository
// degrades and continues on an unreachable gateway. A Journey the writer
// cannot read is not a degraded instruction, it is a Leg the Harness cannot
// build — so resolution here fails the build rather than falling back.

// The identity a journey cite addresses — the SAME two forms a Draft's own
// cites are judged against (kogaki#1116/#600 — src/cite-check.mjs): the
// address form `<package>::journey/<local-name>@<content_hash>` and the
// identity form `gloss/ELEMENTS.jsonl slug=<slug> kind=journey @<sha>`. A
// local copy rather than an import: cite-check.mjs is not among this issue's
// licensed files.
const JOURNEY_IDENTITY_RE = /^gloss\/ELEMENTS\.jsonl slug=([A-Za-z0-9._-]+) kind=(lesson|journey) @([0-9a-f]{7,40})$/;
const JOURNEY_ADDRESS_RE = /^([A-Za-z0-9._-]+)::(lesson|journey)\/([A-Za-z0-9._-]+)@([0-9a-f]{7,64})$/;

export function parseJourneyCiteRef(cite) {
  const m = (cite ?? "").match(JOURNEY_IDENTITY_RE);
  if (m) return { slug: m[1], kind: m[2] };
  const a = (cite ?? "").match(JOURNEY_ADDRESS_RE);
  return a ? { slug: a[3], kind: a[2] } : null;
}

export function journeyIdentityKey(slug, kind) { return `${kind} ${slug}`; }

// THE PURE HALF: cite × served survey → the Journey's text, or why it does
// not resolve. `served` is Map<journeyIdentityKey(slug, kind), record>,
// exactly as `fetchJourneySurvey` below builds it — kept separate from the
// transport so a fixture can drive every resolution outcome without spawning
// anything (`checks/check-brief-compose.sh` is a light member: pure calls and
// text reads, no runtime spawn).
export function journeyTextFromSurvey(cite, served) {
  const ref = parseJourneyCiteRef(cite);
  if (!ref) {
    return { error: `the cite \`${cite ?? "(none recorded)"}\` is in neither the address form `
      + `<package>::journey/<local-name>@<content_hash> nor the identity form `
      + `gloss/ELEMENTS.jsonl slug=<slug> kind=journey @<sha>` };
  }
  const rec = served.get(journeyIdentityKey(ref.slug, ref.kind));
  if (!rec) return { error: `resolves nowhere — the served survey holds no record slug=${ref.slug} kind=${ref.kind}` };
  const body = typeof rec.body === "string" && rec.body.trim() !== ""
    ? rec.body
    : (typeof rec.text === "string" ? rec.text : null);
  if (body === null || body.trim() === "") {
    return { error: `no Gloss shard the record's renderings name carries prose for slug=${ref.slug} kind=${ref.kind}` };
  }
  return { text: body.trim() };
}

// ONE REFUSAL, naming the Leg and the address (acceptance). Shared by the
// live path and the check fixture, so the wording a reader sees for a
// dangling Journey is asserted in one place.
export function journeyResolutionRefusal(legId, journey, cite, result) {
  if (!result || !result.error) return null;
  return `leg ${legId}'s Journey ${journey.strand} (${cite || "(no journey cite recorded in the Brief)"}) does not resolve: ${result.error} — `
    + `a Journey the writer cannot read is a refusal to the Harness, never a sentence in the Draft (kogaki#1250), `
    + `so the Packet is not built and no writer is called`;
}

// THE SHARD READ, pure. `element_survey` serves MANIFESTS only — slug, kind,
// tags, `renderings`, `content_hash` — never prose: a Journey's text lives in
// the Gloss shards its record's `renderings` name, each served by
// `gloss_index` as `{cite, text}` lines, one record after another. A record's
// lines are its `## <slug>` heading, its prose, and a closing `Source:` line;
// the prose is what lies between. Kept pure so a fixture drives it with
// shard-shaped lines and spawns nothing.
export function journeyProseFromShardLines(lines, slug, kind) {
  const own = (lines || []).filter((l) => {
    const ref = parseJourneyCiteRef(typeof l?.cite === "string" ? l.cite : "");
    return ref && ref.slug === slug && ref.kind === kind;
  }).map((l) => (typeof l.text === "string" ? l.text : ""));
  if (own.length && own[0].trim() === `## ${slug}`) own.shift();
  while (own.length && own[own.length - 1].trim() === "") own.pop();
  if (own.length && /^Source: /.test(own[own.length - 1])) own.pop();
  const prose = own.join("\n").trim();
  return prose === "" ? null : prose;
}

// THE TRANSPORT — the only function in this section that spawns, following
// the same capture-through-a-file-descriptor discipline src/terrain.mjs's own
// `gatewayQuery` uses (kogaki#23/kogaki#597): a pipe would work under the
// kit's drain guarantee, but a file write does not depend on it.
function gatewayCall(tool, args) {
  const bin = join(dirname(fileURLToPath(import.meta.url)), "..", "policy", "kit", "bin", "gateway-query.mjs");
  const outPath = join(tmpdir(), `draft-${tool}-${process.pid}-${Date.now()}.json`);
  const fd = openSync(outPath, "w");
  let res;
  try {
    res = spawnSync(process.execPath,
      [bin, "--consumer", "kogaki", "--tool", tool, "--args", JSON.stringify(args)],
      { stdio: ["ignore", fd, "pipe"], encoding: "utf8" });
  } finally { closeSync(fd); }
  let stdout = "";
  try { stdout = readFileSync(outPath, "utf8"); } catch { /* nothing captured */ }
  try { rmSync(outPath, { force: true }); } catch { /* best effort cleanup */ }
  if (res.error) return { ok: false, reason: `the gateway query could not be run (${res.error.code || "spawn failed"}: ${res.error.message})` };
  if (res.status !== 0) {
    const detail = [res.stderr, stdout].map((x) => (x || "").trim()).filter(Boolean).join(" | ");
    return { ok: false, reason: detail || `gateway-query exited ${res.status}` };
  }
  let payload;
  try { payload = JSON.parse(stdout); }
  catch (e) { return { ok: false, reason: `the ${tool} payload is not readable JSON (${e.message})` }; }
  if (!Array.isArray(payload.lines)) return { ok: false, reason: `miss-shaped ${tool} payload — no lines array` };
  return { ok: true, lines: payload.lines };
}

// `kind: "journey"` is the one filter declared — the manifest of every
// Journey, bounded to the one family this Packet ever renders, never the
// whole ELEMENTS manifest. Each record a Leg needs then has its prose read
// from the shards its `renderings` name, first one carrying it wins, each
// shard fetched at most once per build.
function fetchJourneySurvey() {
  const r = gatewayCall("element_survey", { kind: "journey" });
  if (!r.ok) return r;
  const served = new Map();
  for (const l of r.lines) {
    try {
      const rec = JSON.parse(l.text);
      if (typeof rec?.slug === "string" && typeof rec?.kind === "string") {
        served.set(journeyIdentityKey(rec.slug, rec.kind), rec);
      }
    } catch { /* an unparseable line resolves nowhere for any cite naming it, which journeyTextFromSurvey already reports */ }
  }
  return { ok: true, served };
}

function withServedProse(served, cite, shardCache) {
  const ref = parseJourneyCiteRef(cite);
  const rec = ref && served.get(journeyIdentityKey(ref.slug, ref.kind));
  if (!rec || (typeof rec.body === "string" && rec.body.trim() !== "")) return;
  for (const shard of Array.isArray(rec.renderings) ? rec.renderings : []) {
    if (!shardCache.has(shard)) shardCache.set(shard, gatewayCall("gloss_index", { tag: shard }));
    const got = shardCache.get(shard);
    const prose = got.ok ? journeyProseFromShardLines(got.lines, ref.slug, ref.kind) : null;
    if (prose) { rec.body = prose; return; }
  }
}

// THE DRIVEN CALL: a Leg's declared Journeys × the Brief's own cite lines →
// the SAME Leg with each `journeys[].resolvedText` filled, or the FIRST
// refusal, named by Leg and address. Called once per Leg that declares any
// Journey, before `renderPacket` runs — resolution happens or the build never
// reaches the renderer, let alone the writer.
// A RE-ACTIVATED JOURNEY RESOLVES THE SAME WAY (kogaki#1261): each
// `<leg_id> journey <strand>` entry names a Journey the depended-on Leg drew
// on, and its scene is served text the writer restores under `Active here`,
// so it is fetched here, by the same survey, and carried on the Leg as
// `reactivatedJourneys` — `{leg_id, strand, use, resolvedText}` per entry.
export function reactivatedJourneyEntries(leg, brief) {
  return (leg["re-activate"] || [])
    .map((raw) => parseReactivateEntry(raw))
    .filter((e) => !e.error && e.kind === "journey")
    .map((e) => {
      const target = (brief.legs || []).find((l) => l.leg_id === e.leg_id);
      const j = (target?.journeys || []).find((x) => x.strand === e.value);
      return { leg_id: e.leg_id, strand: e.value, use: j ? j.use : null };
    });
}

export function resolveLegJourneys(leg, brief) {
  const reactivated = reactivatedJourneyEntries(leg, brief);
  if (!(leg.journeys || []).length && !reactivated.length) return { leg };
  const survey = fetchJourneySurvey();
  const shardCache = new Map();
  const resolveOne = (j) => {
    const cite = (brief.strands.find((st) => st.id === j.strand)?.cites || [])
      .find((c) => c.kind === "journey cite");
    if (survey.ok) withServedProse(survey.served, cite?.cite, shardCache);
    const result = survey.ok
      ? journeyTextFromSurvey(cite?.cite, survey.served)
      : { error: `the gateway could not be read — ${survey.reason}` };
    const refusal = journeyResolutionRefusal(leg.leg_id, j, cite?.cite, result);
    return refusal ? { error: refusal } : { text: result.text };
  };
  const resolved = [];
  for (const j of leg.journeys || []) {
    const r = resolveOne(j);
    if (r.error) return { error: r.error };
    resolved.push({ ...j, resolvedText: r.text });
  }
  const reactivatedJourneys = [];
  for (const j of reactivated) {
    const r = resolveOne(j);
    if (r.error) return { error: r.error };
    reactivatedJourneys.push({ ...j, resolvedText: r.text });
  }
  return { leg: { ...leg, journeys: resolved, reactivatedJourneys } };
}

// THE PERSONA THE BRIEF WAS COMPOSED WITH (kogaki#1251 item 1, kogaki#1261).
// The Brief's own `compose_path:` line names it once the mint records it
// (kogaki#1262); a Brief minted before that line existed reads the one
// Persona the Brief workflow table names at its `compose_path` row's
// `reader_file`, which is the file every such Brief was composed with -- since
// kogaki#1307 the row names the setting `brief.persona_file` in
// `kogaki.settings.json`, read here as the workflow reads it. A relative path
// resolves against the repository root, as the workflow's does.
const DRAFT_REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
export function packetPersonaPath(brief) {
  const m = /^compose_path:[ \t]*(\S+)[ \t]*$/m.exec(brief?.text || "");
  if (m) return resolve(DRAFT_REPO, m[1]);
  let table;
  try { table = JSON.parse(readFileSync(join(DRAFT_REPO, "src", "brief-workflow.json"), "utf8")); }
  catch (e) { return { error: `src/brief-workflow.json cannot be read (${e.message}) — the Brief names no compose_path, and the workflow's compose_path row names the Persona otherwise` }; }
  const row = (table.states || []).find((s) => s.id === "compose_path");
  const readerFile = row ? settingValue(row.reader_file) : undefined;
  if (typeof readerFile !== "string" || readerFile === "") {
    return { error: "the Brief names no compose_path and src/brief-workflow.json's compose_path row names no reader_file — the Packet has no Persona to render the prose rules from (kogaki#1261)" };
  }
  return resolve(DRAFT_REPO, readerFile);
}

// The Brief header's `external_authority: on | off` (kogaki#1251 item 3,
// set at the mint by kogaki#1262). Absent reads as `on`, the mint's default.
export function externalAuthorityOf(brief) {
  const m = /^external_authority:[ \t]*(on|off)[ \t]*$/m.exec(brief?.text || "");
  return m ? m[1] === "on" : true;
}

// ONE `Introduce here` LINE (kogaki#1261). A typed item renders its kind, so
// the writer names a coined term as coined and brings an established one in
// under the name its source gives it; a coined term's authority line —
// `nearest` and `differs` — renders on the same line where the item carries
// it and the Brief has not switched the external authority off. A bare or
// anchored term renders as it always did.
export function introduceLine(raw, authorityOn) {
  const p = parseIntroducesEntry(raw);
  if (p.error || !p.kind) return `- ${typeof raw === "string" ? raw : JSON.stringify(raw)}`;
  if (p.kind === "established") {
    return `- ${p.term} — established: the term already has a home outside this article, in ${p.source}; bring it in under that name. meaning: ${p.source}`;
  }
  let line = `- ${p.term} — coined: this article names it for the first time; present it as a name this article gives. meaning: ${p.meaning}`;
  if (authorityOn && p.nearest) {
    line += ` nearest existing term: ${p.nearest}.`;
    if (p.differs) line += ` differs: ${p.differs}`;
  }
  return line;
}

// THE MEANING A CROSSING TERM CARRIES (kogaki#1282, owner decision
// 2026-10-06): a typed `coined` entry names its own `meaning`; a typed
// `established` entry's `source` stands as its meaning (src/leg-schema.json,
// `introduces_item`); the legacy bare/anchored form's anchor IS its meaning
// anchor (the form `parseIntroducesEntry` refuses with no text after the
// separator). A bare term with no anchor carries none, stated rather than
// invented.
function introducedMeaning(p) {
  if (!p || p.error) return null;
  if (p.kind === "coined") return p.meaning;
  if (p.kind === "established") return p.source;
  return p.anchor || null;
}

// THE READER'S OWN WORLD (kogaki#1285, owner ruling 2026-10-06): the
// Persona's `prior_knowledge` field, read directly here rather than through
// `readerProse` — that reader refuses by name on an absent block, and an
// absent or empty `prior_knowledge` is a STATED CASE this one must render,
// never a refusal. `compose.mjs`'s scalar-field reader is module-private, so
// this reads the same `key: >-`/`key: |` block-scalar shape it does, over
// the one field this slot needs.
export function personaPriorKnowledge(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch { return null; }
  const lines = text.split("\n");
  const head = /^prior_knowledge:[ \t]*(.*)$/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const marker = m[1].trim();
    if (marker !== "" && !/^[>|][-+]?$/.test(marker)) {
      const inline = marker.replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
      return inline === "" ? null : inline;
    }
    const folded = marker === "" || marker.startsWith(">");
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") { body.push(""); continue; }
      if (!/^[ \t]/.test(l)) break;
      body.push(l.trim());
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    const joined = folded ? body.join(" ").replace(/\s+/g, " ") : body.join("\n");
    return joined.trim() === "" ? null : joined.trim();
  }
  return null;
}

// THE STATED ABSENCE (kogaki#1285 acceptance): rendered in place of
// `prior_knowledge` where the Persona declares none, so the Referents rule
// in `{{prose_rules}}` is never left pointing at a block the Packet does not
// carry, and nothing here refuses on the absence.
export const READER_OWN_WORLD_ABSENT =
  "(the Persona declares no prior knowledge; a referent comes from the Journey block alone)";

// The waypoints block's lines (kogaki#1311, kogaki#1326): a NUMBERED list,
// `<i>. <point> *Serves:* <claim>[; <claim>]`, one per waypoint, in order —
// each point once, since the point is what its paragraph makes and the
// number is its place in the route. A `serves` entry is resolved to the proposition
// of this Leg's claim for that Strand; one naming no claim never reaches here,
// because the realization entry refused it. Returns null on an empty route so
// the caller's `need` names the hole.
export function waypointLines(leg) {
  const ws = leg.waypoints || [];
  if (!ws.length) return null;
  const byStrand = new Map();
  for (const l of String(leg.body || "").split("\n")) {
    const m = /^claim\s*\(strand\s+([^)\s]+)\s*\)\s*:\s*(.*)$/.exec(l);
    if (m) byStrand.set(m[1], m[2].trim());
  }
  return ws.map((w, i) => `${i + 1}. ${w.point.trim()} *Serves:* ${w.serves.map((x) => byStrand.get(x) ?? x).join("; ")}`).join("\n");
}

export function renderPacket({ template, brief, leg, priorSections, section, sections }) {
  const missing = [];
  const need = (label, v) => { if (v === null || v === undefined || v === "") missing.push(label); return v; };

  // THE STRAND ID IS THE BRIEF'S, NOT THE PACKET'S (kogaki#1094). The Brief
  // serializes one form, `claim (strand L<n>): <proposition>` (kogaki#1095),
  // and the id in it addresses material the realizer cannot open. The Packet
  // renders the proposition alone, so every claim line it carries is a claim
  // and nothing else — which is also what keeps a Strand id's digits out of a
  // review comparison line.
  const claimTexts = leg.body.split("\n")
    .filter((l) => l.startsWith("claim "))
    .map((l) => l.replace(/^claim\s*\([^)]*\)\s*:\s*/, ""));
  // A FLAT LIST, ONE LINE PER CLAIM (kogaki#1215; the relations layer this
  // rendered as a tree is retired). No indentation carries meaning here: the
  // Leg's claims are unambiguous peers, and the writer's realization owes
  // every one of them a recoverable line rather than a fused clause. The list
  // convention is the Packet's ONE convention — a `- ` line under the block's
  // own heading, exactly as `already knows` and `introduce here` render — so no
  // `claim:` prefix sits under a bulleted field label for the reader to parse.
  const claims = claimTexts.map((text) => `- ${text}`).join("\n");
  const intro = (leg.introduces || []);
  // WHAT THIS LEG RE-ACTIVATES (kogaki#1237, owner decision 2026-09-30):
  // parsed the same way `validateLegs` parsed it before this Brief was
  // minted — a bad entry never reaches here, because `parseLegBlockBody`
  // refused the Brief on it. Each valid entry resolves to the NAMED LEG's
  // own material: a `term` entry to that Leg's own `introduces` line,
  // crossing WITH ITS MEANING (kogaki#1282); a `claim` entry crosses as the
  // plain restatement composed at Brief time (`e.as`), never its own
  // proposition. Nothing here is composed — the composer already selected
  // the reference and, for a claim, the restatement; this only resolves it.
  const reactivateEntries = (leg["re-activate"] || [])
    .map((raw) => parseReactivateEntry(raw))
    .filter((e) => !e.error);
  const active = reactivateEntries.map((e) => {
    const target = (brief.legs || []).find((l) => l.leg_id === e.leg_id);
    // A RE-ACTIVATED JOURNEY RENDERS ITS SCENE (kogaki#1261): the served text
    // `resolveLegJourneys` fetched, under the Strand and the use the named
    // Leg drew on it for. A caller that skipped resolution gets the `need()`
    // refusal below rather than an address the writer cannot open.
    if (e.kind === "journey") {
      const j = (leg.reactivatedJourneys || []).find((x) => x.leg_id === e.leg_id && x.strand === e.value);
      if (!j || typeof j.resolvedText !== "string" || j.resolvedText.trim() === "") {
        need(`${leg.leg_id}'s re-activated Journey ${e.value} text`, null);
        return "";
      }
      const cite = (brief.strands.find((st) => st.id === e.value)?.cites || [])
        .find((c) => c.kind === "journey cite");
      return `- **${e.value}'s Journey** (re-activated from ${e.leg_id})${j.use ? ` — used there for: ${j.use}` : ""}. `
        + `Its scene, served at \`${cite ? cite.cite : "(no journey cite recorded in the Brief)"}\`:\n\n${j.resolvedText.trim()}`;
    }
    if (e.kind === "term") {
      const found = (target?.introduces || [])
        .map((raw) => parseIntroducesEntry(raw))
        .find((p) => !p.error && p.term === e.value);
      const meaning = found ? introducedMeaning(found) : null;
      const text = found ? `${found.term}${meaning ? ` — meaning: ${meaning}` : ""}` : e.value;
      return `- ${text} (re-activated from ${e.leg_id})`;
    }
    return `- ${e.as} (re-activated from ${e.leg_id}, strand ${e.value})`;
  });
  const authorityOn = externalAuthorityOf(brief);
  // THE PERSONA'S PROSE RULES (kogaki#1261): read from the Persona the Brief
  // was composed with, refused by name where it cannot be read.
  const personaPath = packetPersonaPath(brief);
  const prose = typeof personaPath === "string" ? readerProse(personaPath) : personaPath;
  if (prose.error) missing.push(`the Persona's prose rules (${prose.error})`);
  // THE READER'S OWN WORLD (kogaki#1285): read from the same Persona, on
  // the same path — but NEVER pushed onto `missing`, because an absent or
  // empty `prior_knowledge` is the stated case `READER_OWN_WORLD_ABSENT`
  // renders, not a hole in the Packet's input.
  const priorKnowledge = typeof personaPath === "string" ? personaPriorKnowledge(personaPath) : null;
  const conceded = concededRowFields(brief.text || "", leg.leg_id);

  const fields = {
    // THE ROUTE (kogaki#1311, kogaki#1326): one numbered line per waypoint, in
    // the Leg's order, each the point and then the claim or claims it serves, quoted as this Leg's
    // claims block quotes them — the Strand id is the Brief's address and the
    // writer cannot open it, so the claim's own words stand in for it. A Leg
    // with no waypoint never reaches here (`loadBrief` refuses it), and
    // `need` refuses the render rather than leave the block empty.
    waypoints: need(`${leg.leg_id}'s waypoints`, waypointLines(leg)),
    // THE READER TARGET LINE (kogaki#1231; moved into the Section block at
    // kogaki#1247): the marked Leg's, a closing Leg's, or nothing — off the
    // Brief's own `reaches_target:` mark, read by `parseLegBlockBody` above.
    // Not passed through `need`: an earlier Leg renders the empty string here
    // by design, and that is a filled slot.
    reader_target_line: readerTargetLine(brief.legs, leg.leg_id),
    // `budget` — a LIMIT the writer sees, never a target: rendered in the
    // write instruction, and its absence states so rather than rendering a
    // blank the writer could read as zero.
    budget: leg.budget !== undefined && leg.budget !== null
      ? `${leg.budget} words. This is a ceiling, not a target — write what this Leg needs, up to it.`
      : "(none declared — no word bound applies to this Leg.)",
    claims: claims || "(none recorded)",
    reader_own_world: priorKnowledge || READER_OWN_WORLD_ABSENT,
    prose_rules: prose.error ? "" : prose.prose,
    // WHAT CROSSES INTO THIS LEG (kogaki#1282, owner ruling 2026-10-06):
    // LEG LINKING IS DEFAULT-DENY — the whole of what this Leg may speak of
    // as already available is this Leg's own introduced items (each with
    // its meaning) and what it explicitly re-activates (a term with its
    // meaning, a claim as its `as` restatement, a Journey as its served
    // text). Nothing the reader merely holds otherwise renders here. A
    // STATED ABSENCE, never an empty slot (acceptance item 2): a Leg that
    // introduces and re-activates nothing still gets the block, saying so,
    // on the same one-word-one-unit ground `closure_rows` states.
    crosses_here: (intro.length || active.length)
      ? [...intro.map((raw) => introduceLine(raw, authorityOn)), ...active].join("\n")
      : "(nothing — this Leg introduces and re-activates nothing; speak of nothing as already available.)",
    // CLOSURE (kogaki#1151): the rows this Leg is a party to, read from the
    // Brief's own rendered "## Closure" section (`closureRowsForLeg`) rather
    // than recomputed here — fillBrief already wrote the one true rendering.
    // EMPTY RENDERS EMPTY, NEVER ABSENT (acceptance item 3): a Leg that
    // introduces, discharges and concedes nothing still gets the block, saying
    // so, on the same one-word-one-unit ground `reader_already_knows` states.
    // THE ROW THIS LEG CONCEDES renders its three fields (kogaki#1261): what
    // stays open, why this article does not close it, and what the reader
    // keeps — the concession the prose makes, not a bare sentence.
    closure_rows: closureRowsForLeg(brief.text, leg.leg_id).length
      ? closureRowsForLeg(brief.text, leg.leg_id).map((t) => {
        if (!conceded || conceded.text !== t) return `- ${t}`;
        return `- ${t} — conceded in this Leg. Left open: ${conceded.open ?? "(not recorded)"}. `
          + `Why this article does not close it: ${conceded.why_not_here ?? "(not recorded)"}. `
          + `What the reader keeps: ${conceded.reader_keeps ?? "(not recorded)"}.`;
      }).join("\n")
      : "(nothing — this Leg carries no Closure row)",
    // the Journey a Leg draws on (kogaki#1111). THE PACKET NOW RENDERS THE
    // SERVED TEXT ITSELF, the address kept beside it as citation — not the
    // address alone (kogaki#1250, owner ruling 2026-10-04). Since Fresh Call
    // (kogaki#1237) the writer is a separate `claude -p` process with no
    // permission grant of its own, so an address-only rendering handed it
    // nothing it could read: the writer had no Journey, and said so in the
    // article, which is the meta-commentary this issue closes. Resolution
    // happens in `renderAndStorePacket`, BEFORE this function is ever called —
    // a Journey that does not resolve refuses the whole Packet build, naming
    // the Leg and the address, and this renderer never runs for it. By the
    // time `leg.journeys` reaches here every entry already carries its
    // `resolvedText`; a caller that skips resolution and calls this renderer
    // directly (as a fixture may, to drive the render in isolation) gets the
    // same `need()` refusal an absent block gets anywhere else in this
    // function — a hole in the model's entire input is a hole the model fills
    // by invention, resolved text included.
    //
    // A JOURNEY-LESS LEG RENDERS THE HEADING AND THE ABSENCE LINE ONLY
    // (kogaki#1224; owner decision 2026-09-29), unchanged by this issue: the
    // instruction paragraphs below are instructions on HOW to use Journey
    // material, and a Leg that draws on none has nothing for them to
    // instruct.
    journeys: need(`${leg.leg_id}'s Journey text`, (leg.journeys || []).length
      ? ((leg.journeys.some((j) => typeof j.resolvedText !== "string" || j.resolvedText.trim() === ""))
        ? null
        : "Material for a concrete example serving this Leg's waypoints — use as much or as "
          + "little of it as the waypoints need, in any form, from one clause to several "
          + "sentences. It is material, never a claim, and earns no paragraph of its own by "
          + "being present.\n\n"
          + "Material, not assertion. Each entry below names a Journey this Leg draws on, "
          + "and its served prose, quoted in full. **Edit it for "
          + "this Leg's waypoints**: cut it, compress it, use as much or as little as they need.\n\n"
          + "Nothing here is a claim. The claims above are the whole of what this Leg "
          + "asserts, and the round trip asks for those back and never for a fragment of a "
          + "Journey. A Journey you use well may leave almost none of its original wording "
          + "on the page.\n\n"
          + leg.journeys.map((j) => {
            const cite = (brief.strands.find((st) => st.id === j.strand)?.cites || [])
              .find((c) => c.kind === "journey cite");
            return `- **${j.strand}'s Journey**. `
              + `Served at \`${cite ? cite.cite : "(no journey cite recorded in the Brief)"}\`:\n\n`
              + `${j.resolvedText.trim()}`;
          }).join("\n\n")
      )
      : "(none — this Leg draws on no Journey material, and nothing here asks for any.)"),
    section_placement: sectionPlacement(section),
    // SCOPED TO THE CURRENT SECTION ONLY (kogaki#1282, owner ruling
    // 2026-10-06): `sectionsOf` always derives at least one Section, so this
    // always resolves through the Section path rather than a whole-article
    // fallback — the old "this is the article's first Leg" / "this is NOT
    // the article's opening" strings are retired with it, subsumed by
    // `priorProseInSection`'s own opens-it / continues-it absence messages.
    prior_sections: priorProseInSection(priorSections, sections || [], section?.index ?? 1, leg.leg_id)
      ?? "(nothing yet — this Leg opens the Section, so its prose is the first in it.)",
  };
  if (missing.length) {
    return { error: `the Packet for ${leg.leg_id} cannot be rendered: ${missing[0]} is absent. `
      + `A Packet is the model's entire input, so a missing block is a hole the model fills by invention — `
      + `it refuses by NAME rather than rendering an empty slot (the Leg Packet).` };
  }
  let out = template;
  for (const [k, v] of Object.entries(fields)) out = out.split(`{{${k}}}`).join(v);
  // The HTML comment is authoring guidance for the template's maintainer and
  // is NOT part of the model's input — stripped here so the rendered Packet is
  // exactly what the ruling describes and nothing more.
  out = out.replace(/^<!--[\s\S]*?-->\n*/, "");
  const left = out.match(/\{\{(\w+)\}\}/);
  if (left) return { error: `the template slot {{${left[1]}}} was not filled — the renderer and the template disagree about the slot set, which is the round trip failing silently (the Leg Packet)` };
  return { packet: out };
}

// THE PACKET RENDER, FACTORED SO THE HARNESS CAN DRIVE IT (kogaki#811,
// DESIGN.md, "The Packet architecture"). `cmdPacket` prints it on demand; `resolve` and `section`
// call it to hand the NEXT Leg's input forward without the session asking.
// One implementation, so the on-demand and the driven renders cannot diverge
// in what they write or what they record.
function renderAndStorePacket(brief, id, args, ws) {
  const lang = langOf(args);
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) return { error: `no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it` };
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { return { error: `the Packet template at ${tplPath} cannot be read (${e.message}) — it is a runtime-read carrier and the command has no built-in fallback, deliberately: a fallback template would be a second copy nobody maintains` }; }
  // THE FIGURE BLOCK IS NOT PART OF A PACKET (the figure record, kogaki#878). Split before
  // the render: `renderPacket` refuses on any unfilled slot, so the block's own
  // slots would make every Packet refuse if it reached that check.
  const split = splitPacketTemplate(template);
  if (split.error) return { error: split.error };
  template = split.packet;

  // PRIOR SECTIONS IN THE BRIEF'S RECORDED ORDER, never a directory read —
  // the order is the Reader Path's and a readdir would make the Packet's bytes
  // depend on the filesystem.
  const prior = [];
  for (const s of brief.legs) {
    if (s.leg_id === id) break;
    const f = join(sectionsDir(ws, lang), `${s.leg_id}.md`);
    if (existsSync(f)) prior.push({ leg_id: s.leg_id, text: readFileSync(f, "utf8").trim() });
  }
  // The SAME derivation the renderer and the trace use (kogaki#823's
  // `sectionsOf`/`sectionOfLeg`), never a second one: what the Draft renders
  // and what the Packet says about where this Leg sits cannot disagree.
  const sections = sectionsOf(brief.legs);
  const section = sectionOfLeg(brief.legs).get(id);

  // JOURNEY TEXT RESOLUTION (kogaki#1250) — BEFORE the render, and before any
  // writer is ever invoked: a Journey that does not resolve refuses the whole
  // Packet build, naming the Leg and the address, and `renderPacket` never
  // runs for it.
  const journeysResolved = resolveLegJourneys(leg, brief);
  if (journeysResolved.error) return { error: journeysResolved.error };

  const r = renderPacket({ template, brief, leg: journeysResolved.leg, priorSections: prior, section, sections });
  if (r.error) return { error: r.error };

  // THE LANGUAGE BLOCK (kogaki#1158): rendered into every Packet when
  // realizing at a non-English `--lang`, and nothing else added — the
  // owner's 2026-09-19 ruling is "the term list and the register, and
  // nothing else until a Round Trip failure names what is missing." The term
  // list is terms/prh.yml, the ONE repository-wide carrier (the Terminology
  // List Decision), parsed by the SAME reader lint-ja.mjs's Lint uses.
  let packetText = r.packet;
  if (lang !== "en") {
    const termsPath = typeof args["terms-path"] === "string" && args["terms-path"] !== "" ? args["terms-path"] : DEFAULT_TERMS_PATH;
    let termsText;
    try { termsText = readFileSync(termsPath, "utf8"); }
    catch (e) { return { error: `leg ${id}'s Japanese Packet needs the term list at ${termsPath} and it cannot be read (${e.message})` }; }
    const parsedTerms = parseTermsYaml(termsText);
    if (parsedTerms.error) return { error: `the term list at ${termsPath} is not readable as the prh.yml shape: ${parsedTerms.error}` };
    const termsSha = sha256Terms(termsText);
    let block = renderLanguageBlock(parsedTerms.rules, termsSha, lang);
    // FLUENCY NOTES (acceptance item 5): read, if present, into every
    // Japanese realization as a READ-ONLY REFERENCE NOTE. Nothing evaluates
    // it — it is appended to the model's input and never graded by any
    // automated pass, here or in lint-ja.mjs.
    const fluencyPath = join(dirname(brief.path), "fluency-notes.md");
    if (existsSync(fluencyPath)) {
      const notes = readFileSync(fluencyPath, "utf8").trim();
      if (notes) {
        block += `\n\n## Fluency notes (read-only reference — theses/${brief.slug}/fluency-notes.md; never graded by any automated pass)\n\n${notes}`;
      }
    }
    packetText = packetText.trimEnd() + "\n\n" + block.trimEnd() + "\n";
  }

  // RETENTION: stored EXACTLY AS SERVED, overwritten on re-render, with the
  // path and sha announced beside the Section it will produce.
  //
  // THE PATH IS `runs/draft/<slug>/packets/` (kogaki#750, landed). #749 ruled
  // this destination and could not write it — there was no runs/ tree, and
  // minting one as a side effect of the Packet command would have built #750's
  // design at a seat that had no license for it. The expression is UNCHANGED:
  // the Packet has always joined the run record, the snapshots and the sections
  // in the workspace, and it is the WORKSPACE that moved. The debt is
  // discharged by the lane's default resolving there, not by a second path
  // expression here — a relocation that also re-routes its consumers changes
  // two things and can only be half-verified.
  const dir = packetsDir(ws, lang);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${id}.md`);
  writeFileSync(out, packetText);
  const sha = sha256(packetText);

  // RECORDED IN THE RUN RECORD, not only printed (PR #780 round 1). #749 rules
  // "path+sha recorded in the run record beside the Section it produced", and
  // the first form wrote both to stderr and nothing to run.json — a print is
  // read by whoever is watching and a record is read by whoever comes after,
  // which is the difference the ruling is about. the Leg Packet restated the ruling as
  // "announced", which substituted the printing for the recording without
  // saying it had.
  //
  // MERGED rather than overwritten: run.json is written at `resolve` and holds
  // the run's identity, so the packet entry joins it under its leg id and a
  // re-render replaces that one entry. A missing or unreadable run.json is not
  // a failure of the render — the Packet is already written and printed — so it
  // warns, exactly as the snapshot path does.
  const runFile = join(ws, "run.json");
  try {
    let rec = {};
    if (existsSync(runFile)) rec = JSON.parse(readFileSync(runFile, "utf8"));
    const key = packetsRecordKey(lang);
    rec[key] = { ...(rec[key] || {}), [id]: { path: out, sha256: sha } };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`draft: the packet's path and sha were not recorded in ${runFile} (${e.message}) — the Packet itself is written and printed; the record is the trace, and the trace never gates the write it traces\n`);
  }

  return { packet: packetText, out, sha };
}

function cmdPacket(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "packet needs --leg <leg_id>");
  const ws = workspaceFor(args, brief.slug);
  const r = renderAndStorePacket(brief, id, args, ws);
  if (r.error) fail(r.error);
  const { out, sha } = r;

  process.stdout.write(r.packet);
  process.stderr.write(`\npacket ${id}: ${out}\n`);
  process.stderr.write(`packet sha256: ${sha}\n`);
  process.stderr.write(`stored exactly as served — the file above is byte-identical to what was printed (the Leg Packet)\n`);
  // The owed-path line is GONE rather than reworded (kogaki#750). It announced
  // a debt on every render, and the debt is paid: the workspace default IS
  // `runs/draft/<slug>/`. A line that keeps naming a discharged obligation is
  // the same defect as one that never named it — both leave a reader unable to
  // tell the current state from the state when the line was written.
}

// THE HARNESS HANDS THE NEXT LEG'S INPUT FORWARD (kogaki#811, DESIGN.md, "The Packet architecture").
// `resolve` calls this at run start and `section` after recording a Leg, so a
// Packet exists for the Leg about to be realized WITHOUT the session running
// a command. That is the render-within arm: it makes the Packet architecture's "one Leg, one
// input" true by construction rather than by a session remembering.
//
// It never fails the act it rides on. A Packet that cannot be rendered here is
// reported and the run continues, because `section`'s own refusal is the
// backstop that catches the absence at the moment it matters — and a driver
// that could fail `resolve` would make a template read gate the run's start.
function driveNextPacket(brief, args, ws) {
  const lang = langOf(args);
  const next = brief.legs.find((s) => !existsSync(join(sectionsDir(ws, lang), `${s.leg_id}.md`)));
  if (!next) return null;
  const r = renderAndStorePacket(brief, next.leg_id, args, ws);
  if (r.error) {
    process.stderr.write(`draft: the Packet for the next Leg (${next.leg_id}) was not rendered — ${r.error}\n`);
    process.stderr.write(`draft: run \`packet --leg ${next.leg_id}\` to see the failure in full; \`section\` will refuse this Leg until its Packet exists\n`);
    return null;
  }
  process.stderr.write(`packet ${next.leg_id}: ${r.out}\n`);
  process.stderr.write(`packet sha256: ${r.sha}\n`);
  return next.leg_id;
}

function cmdSection(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "section needs --leg <leg_id>");
  // `--file` IS REMOVED, not ignored (kogaki#1237, Fresh Call): prose handed in
  // by the invoking session is prose that session wrote from something it
  // read, and the Packet is the writer's entire input only if nobody else
  // writes. Named as removed so a caller on the old entry point is told the
  // route rather than shown a silent change of author.
  if (Object.prototype.hasOwnProperty.call(args, "file")) {
    fail(`section no longer takes --file — the realization is written by the declared writer (src/draft-workflow.json) from the Packet and recorded here; \`section --leg ${id}\` is the whole invocation (kogaki#1237, Fresh Call)`);
  }
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) {
    fail(`no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  // ONE NAME FOR THE WORKSPACE (PR #814 round 1, finding 3). The backstop's
  // refusal depends on this path, so a second binding for the same value is a
  // divergence hazard in exactly the function that must not drift.
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  // THE BACKSTOP (kogaki#811, the Packet architecture). Render-within supplies the Packet;
  // this catches what render-within structurally cannot see — a Packet deleted
  // or gone stale between the render and the realization. Checked BEFORE the
  // section file is read, so a run that owes a Packet is told that rather than
  // a read error about prose it should not be recording yet.
  //
  // STALENESS IS THE SHA, not the timestamp: run.json records the sha the
  // Packet was served with, so a file edited after the render disagrees with
  // its own record. A Packet whose record is missing is the SAME refusal —
  // "rendered" means recorded, and an unrecorded file cannot be shown to be
  // the one this Leg was realized from.
  const packetPath = join(packetsDir(ws, lang), `${id}.md`);
  if (!existsSync(packetPath)) {
    fail(`leg ${id} has no rendered Packet at ${packetPath} — the Packet is a Leg's ENTIRE input, so realizing one without it means the prose was written from something else. `
      + `The Harness renders it at \`resolve\` and after each \`section\`; if it was deleted, \`packet --leg ${id}\` restores it`);
  }
  let recordedSha = null;
  try { recordedSha = (JSON.parse(readFileSync(join(ws, "run.json"), "utf8"))[packetsRecordKey(lang)] || {})[id]?.sha256 || null; }
  catch { /* no run record — handled as unrecorded below */ }
  const packetText = readFileSync(packetPath, "utf8");
  const onDiskSha = sha256(packetText);
  if (recordedSha === null) {
    fail(`leg ${id} has a Packet file at ${packetPath} that no run record accounts for — a Packet is "rendered" when the run records its sha, and an unrecorded file cannot be shown to be the one this Leg was realized from. Re-render with \`packet --leg ${id}\``);
  }
  if (recordedSha !== onDiskSha) {
    fail(`leg ${id}'s Packet changed after it was rendered — recorded ${recordedSha.slice(0, 12)}, on disk ${onDiskSha.slice(0, 12)}. `
      + `The prose may have been realized from either, and nothing here can tell which. Re-render with \`packet --leg ${id}\` and realize again`);
  }

  // THE WRITER IS CALLED WITH THE PACKET AS ITS ENTIRE STDIN, and the response
  // is judged by the SAME refusals the file route carried (foreign Strand,
  // record as structure, a drawn figure, a heading) plus emptiness, each a
  // re-ask up to the declared retries and then a failure naming the Leg.
  const settings = writerSettings();
  const written = callWriter({ settings, act: "section", legId: id, input: packetText,
    refuse: (text) => sectionProseRefusal(text, id, brief) });
  const content = written.text;
  mkdirSync(sectionsDir(ws, lang), { recursive: true });
  let seq = 0;
  try { seq = readdirSync(join(ws, "snapshots")).length; } catch { /* first snapshot */ }
  snapshotDraft(ws, `before-${id}`, seq, assembleBody(brief, ws, lang).body);
  writeFileSync(join(sectionsDir(ws, lang), `${id}.md`), content);
  snapshotDraft(ws, `after-${id}`, seq + 1, assembleBody(brief, ws, lang).body);
  process.stdout.write(`section ${id} recorded (${brief.legs.findIndex((s) => s.leg_id === id) + 1} of ${brief.legs.length} legs)\n`);
  // THE FIGURE IS DESIGNED FROM THE TEXT (the figure record, kogaki#878). A Leg carrying
  // `figure:` gets its figure input here — after its prose is recorded and
  // before the next Leg's Packet — so the ordering the hub ruled is the
  // HARNESS'S, not a step a session may remember to take. The next Packet is
  // driven by `figure`, not here: two inputs printed at once would leave the
  // realizer choosing which to answer.
  if (leg.figure !== undefined && leg.figure !== null) {
    const form = figureFormFor(leg);
    if (form.error) fail(form.error);
    const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
    let template;
    try { template = readFileSync(tplPath, "utf8"); }
    catch (e) { fail(`the Packet template at ${tplPath} cannot be read (${e.message}) — the figure block lives in it and the command has no built-in fallback`); }
    const split = splitPacketTemplate(template);
    if (split.error) fail(split.error);
    // THE FIGURE INPUT IS RENDERED HERE ONLY TO REFUSE EARLY: it is not
    // printed. `figure --leg <id>` renders the same input from the same stored
    // Packet and prose and hands it to the writer; nothing reaches the session.
    const r = renderFigureInput({ figureTemplate: split.figure, packetText, leg, form, prose: content });
    if (r.error) fail(r.error);
    process.stdout.write(`leg ${id} carries a figure — record it with \`figure --leg ${id}\`; the next Leg's Packet follows that\n`);
    return;
  }
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered to the run's packets directory, never printed here; realize it with \`section --leg ${nextId}\`\n`);
}

// the figure record's entry point (kogaki#878). ONE LEG, ONE RECORD, AFTER ITS PROSE.
function cmdFigure(args) {
  const brief = loadBrief(args);
  const id = argString(args, "leg", "figure needs --leg <leg_id>");
  if (Object.prototype.hasOwnProperty.call(args, "file")) {
    fail(`figure no longer takes --file — the record is written by the declared writer (src/draft-workflow.json) from the figure input and recorded here; \`figure --leg ${id}\` is the whole invocation (kogaki#1237, Fresh Call)`);
  }
  const leg = brief.legs.find((s) => s.leg_id === id);
  if (!leg) {
    fail(`no leg "${id}" in this Brief's Reader Path (${brief.legs.map((s) => s.leg_id).join(", ")}) — the path is the Brief's, and /draft never re-opens it`);
  }
  if (leg.figure === undefined || leg.figure === null) {
    fail(`leg ${id} declares no figure: — the default is NONE (the figure decision), so there is no form for a record to be an instance of. `
      + `A figure enters at composition, on the Brief, and never here`);
  }
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  // THE PROSE FIRST, AND THE REFUSAL SAYS WHY. The record's caption is stated
  // in what the reader holds after reading this Leg, and its elements are
  // worded against prose that must already exist — the hub's third moment.
  // A record filled before the text is a figure the text then has to match.
  const sectionFile = join(sectionsDir(ws, lang), `${id}.md`);
  if (!existsSync(sectionFile)) {
    fail(`leg ${id} has no realized prose at ${sectionFile} — the figure is designed FROM the text (the figure record), so the record cannot be filled before \`section --leg ${id}\` records it`);
  }
  const form = figureFormFor(leg);
  if (form.error) fail(form.error);

  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "figure-schema.json");
  let schema;
  try { schema = JSON.parse(readFileSync(schemaPath, "utf8")); }
  catch (e) { fail(`the figure schema at ${schemaPath} cannot be read (${e.message}) — it is a runtime-read carrier and this command has no built-in fallback, deliberately: a fallback schema would be a second copy nobody maintains`); }

  // THE FIGURE INPUT: the stored Packet, as served, plus the filled figure block
  // (the figure record, kogaki#878), rendered here from the run's own files and
  // handed to the writer as its ENTIRE stdin (Fresh Call, kogaki#1237). The
  // response is the record; its mechanical validation is the re-ask condition.
  const packetPath = join(packetsDir(ws, lang), `${id}.md`);
  if (!existsSync(packetPath)) {
    fail(`leg ${id} has no rendered Packet at ${packetPath} — the figure input is the served Packet plus the figure block, and a Packet that is gone cannot be served again as the one the prose was realized from; \`packet --leg ${id}\` restores it`);
  }
  const packetText = readFileSync(packetPath, "utf8");
  const prose = readFileSync(sectionFile, "utf8");
  const tplPath = join(dirname(fileURLToPath(import.meta.url)), "packet-template.md");
  let template;
  try { template = readFileSync(tplPath, "utf8"); }
  catch (e) { fail(`the Packet template at ${tplPath} cannot be read (${e.message}) — the figure block lives in it and the command has no built-in fallback`); }
  const split = splitPacketTemplate(template);
  if (split.error) fail(split.error);
  const rendered = renderFigureInput({ figureTemplate: split.figure, packetText, leg, form, prose });
  if (rendered.error) fail(rendered.error);

  const settings = writerSettings();
  let record = null;
  callWriter({ settings, act: "figure", legId: id, input: rendered.input,
    refuse: (text) => {
      const parsed = parseWriterRecord(text);
      if (parsed.error) return parsed.error;
      const bad = figureRecordRefusal(parsed.record, leg, form, schema);
      if (bad) return bad;
      record = parsed.record;
      return null;
    } });

  // STORED IN THE SCHEMA'S FIELD ORDER, not the input file's. The record is
  // read back by `emit` and by kogaki#880's review, and a stored artifact whose
  // bytes depend on how the model happened to order its keys is one whose sha
  // moves without its content moving.
  const ordered = {};
  for (const k of [...schema.required, ...(schema.optional || [])]) {
    if (Object.prototype.hasOwnProperty.call(record, k)) ordered[k] = record[k];
  }
  const dir = join(ws, "figures");
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${id}.json`);
  const text = JSON.stringify(ordered, null, 2) + "\n";
  writeFileSync(out, text);
  const sha = sha256(text);
  // THE SAME ARRANGEMENT THE PACKET RECORD HAS, and for the same reason: a
  // print is read by whoever is watching and a record is read by whoever comes
  // after. `emit` reads this, never the directory — an unrecorded file cannot
  // be shown to be the one this Leg's figure was validated from.
  const runFile = join(ws, "run.json");
  try {
    let rec = {};
    if (existsSync(runFile)) rec = JSON.parse(readFileSync(runFile, "utf8"));
    rec.figures = { ...(rec.figures || {}), [id]: { path: out, sha256: sha, kind: form.kind, position: ordered.position } };
    writeFileSync(runFile, JSON.stringify(rec, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`draft: the figure record's path and sha were not recorded in ${runFile} (${e.message}) — the record itself is written; the record is the trace, and the trace never gates the write it traces\n`);
  }
  process.stdout.write(`figure ${id} recorded (${form.kind}, position ${ordered.position}) — ${out}\n`);
  const nextId = driveNextPacket(brief, args, ws);
  if (nextId) process.stdout.write(`next: ${nextId} — its Packet is rendered to the run's packets directory, never printed here; realize it with \`section --leg ${nextId}\`\n`);
}

function cmdEmit(args) {
  const brief = loadBrief(args);
  const ws = workspaceFor(args, brief.slug);
  const lang = langOf(args);
  const { body, missing, ranges, figureRanges, figures, figureErrors } = assembleBody(brief, ws, lang);
  if (missing.length) {
    fail(`the run is not at completion: leg(s) ${missing.join(", ")} have no realized section${lang !== "en" ? ` in lang ${lang}` : ""} — a /draft run ends when the CanonicalDraft exists, and these are what it still owes (SPEC-draft-command, the read-not-invented rule)`);
  }
  // A FIGURE-CARRYING LEG OWES ITS RECORD, exactly as every Leg owes its
  // prose (the figure record, kogaki#878). The Brief declared the figure; a Draft emitted
  // without it would silently drop a decision the owner made at the Candidate
  // gate, and nothing downstream would report the drop — which is the shape
  // this repository refuses everywhere else it appears.
  let figureRecords = {};
  try { figureRecords = JSON.parse(readFileSync(join(ws, "run.json"), "utf8")).figures || {}; }
  catch { /* no run record — every figure-carrying Leg reports its absence below */ }
  const owedFigures = figureLegs(brief.legs)
    .filter((s) => !(figureRecords[s.leg_id] && existsSync(figureRecords[s.leg_id].path)))
    .map((s) => s.leg_id);
  if (owedFigures.length) {
    fail(`the run is not at completion: leg(s) ${owedFigures.join(", ")} declare figure: and have no recorded figure record — `
      + `the record is filled after that Leg's prose and recorded with \`figure --leg <id> --file <record.json>\` (the figure record)`);
  }
  // A RECORDED FIGURE THAT WILL NOT RENDER STOPS THE ARTIFACT (the renderer and the anchor). The
  // guard above answers "is a record owed"; this answers "does it render", and
  // the two are separable — a record can exist, resolve and validate, and still
  // name a kind this runtime has no seat for. Emitting the Draft with the block
  // silently absent is the drop-with-no-report shape the figure record refuses one act
  // earlier, so it is refused here for the same reason.
  if (figureErrors.length) {
    fail(`the figure(s) this run recorded do not render: ${figureErrors.join("; ")} — the markup is the Harness's (the renderer and the anchor), so this is a renderer or a record defect and never prose to be written around`);
  }
  // THE RESERVED-NAME RECONCILIATION (SPEC-draft-command "The name is reserved,
  // and the reservation precedes the collision", kogaki#1158): a
  // non-English realization writes `draft.<lang>.md`, sibling to the reserved
  // `draft.md` and never colliding with it — `draft.md` is reserved for the
  // English CanonicalDraft alone, unchanged.
  const outPath = lang === "en" ? join(dirname(brief.path), "draft.md") : join(dirname(brief.path), `draft.${lang}.md`);
  // `generated_by` is an immutable birth record: an overwrite keeps the
  // artifact's original one, and this run's identity goes to the workspace.
  let generatedBy = {
    at: new Date().toISOString(),
    by: "src/draft.mjs (story 1.80, kogaki#587)",
    brief_sha: sha256(brief.text),
  };
  if (existsSync(outPath)) {
    const prior = readFileSync(outPath, "utf8").match(/^generated_by: (\{.*\})\s*$/m);
    if (prior) { try { generatedBy = JSON.parse(prior[1]); } catch { /* keep fresh */ } }
  }
  const cites = brief.strands.flatMap((s) =>
    s.cites.map((c) => ({ strand: s.id, slug: s.slug, kind: c.kind, cite: c.cite })));
  // THE TRACE MAPS EACH LEG TO ITS SECTION, not to its own ordinal
  // (kogaki#823). `section: i + 1` numbered the Legs and called the result a
  // section, which was true only while the two units were the same one — after
  // the Section grouping it asserted a one-to-one mapping that the Brief may not declare, so a
  // reader of the trace could not tell which Legs shared a heading.
  const secOf = sectionOfLeg(brief.legs);
  const trace = brief.legs.map((s) => {
    const sec = secOf.get(s.leg_id);
    return { leg_id: s.leg_id, section: sec.index, ...(sec.title !== undefined ? { section_title: sec.title } : {}) };
  });
  // THE PACKET RECORD IS READ, NEVER RE-DERIVED (kogaki#868). `cmdPacket` wrote
  // path and sha to run.json at the render; recomputing a sha here would answer
  // for the file as it stands rather than for the input that produced the
  // prose, which is the whole of what the trace is for.
  let packets = {};
  try { packets = JSON.parse(readFileSync(join(ws, "run.json"), "utf8"))[packetsRecordKey(lang)] || {}; }
  catch { /* no run record, or unreadable — every Leg reports its absence below */ }
  // The artifact is owner-visible and machine-independent (round 1 finding 3):
  // the Brief is named relative to the draft that realizes it — always its
  // sibling — so two machines emit identical bytes. The absolute path is
  // machine identity and stays in run.json / last-emit.json.
  // terms_sha_at_generation (acceptance item 1; the Terminology List
  // Decision): sha256 of terms/prh.yml as it stood when this run's Packets
  // were rendered — read fresh here rather than threaded through run.json,
  // because a `--lang` run renders every Packet against the same file in one
  // sitting and `emit` is its last act. WRITES NOTHING ELSE NEW: this is the
  // one field acceptance item 1 names, plus `lang:` so a reader (and this
  // Draft's own reconciliation with the reserved-name clause) can tell which
  // realization produced it without parsing the filename.
  let termsShaAtGeneration = null;
  if (lang !== "en") {
    const termsPath = typeof args["terms-path"] === "string" && args["terms-path"] !== "" ? args["terms-path"] : DEFAULT_TERMS_PATH;
    try { termsShaAtGeneration = sha256Terms(readFileSync(termsPath, "utf8")); }
    catch (e) { fail(`the term list at ${termsPath} cannot be read (${e.message}) — terms_sha_at_generation cannot be recorded without it`); }
  }
  const head = [
    "---",
    `brief: ${relative(dirname(outPath), brief.path)}`,
    `brief_pin: sha256:${sha256(brief.text)}`,
    `survey_pin: ${brief.surveyPin}`,
    `generated_by: ${JSON.stringify(generatedBy)}`,
    ...(lang !== "en" ? [`lang: ${lang}`, `terms_sha_at_generation: ${termsShaAtGeneration}`] : []),
    "cites:",
    ...cites.map((c) => `  - ${JSON.stringify(c)}`),
    "trace:",
  ];
  // THE NUMBERS ARE WHAT AN EDITOR SHOWS: 1-based over the file as written,
  // frontmatter included. The offset is countable before the entries are
  // filled because an entry renders as exactly ONE line whatever it carries —
  // head lines, then one per trace entry, then the closing `---`, then the
  // blank line the `\n\n` join leaves. So body line 1 is file line
  // `bodyOffset + 1`, and the count cannot circle back on the values below.
  const bodyOffset = head.length + trace.length + 2;
  for (const t of trace) {
    const span = ranges.get(t.leg_id);
    if (span) t.lines = [span[0] + bodyOffset, span[1] + bodyOffset];
    const rec = packets[t.leg_id];
    if (rec && typeof rec.path === "string" && typeof rec.sha256 === "string") {
      // Relative to the draft, the same convention `brief:` uses above: the sha
      // identifies the input, the path is repo-relative, and neither is machine
      // identity (DESIGN.md, "Lifetimes: what is owner state and what is machine state").
      t.packet = relative(dirname(outPath), rec.path);
      t.packet_sha = rec.sha256;
    } else {
      // The trace never gates the write it traces — the same rule `snapshotDraft`
      // and `cmdPacket`'s own record write already hold.
      process.stderr.write(`draft: leg ${t.leg_id} has no readable packet record in ${join(ws, "run.json")} — its trace entry carries no packet fields; the trace never gates the write it traces\n`);
    }
    // THE FIGURE ENTRY (the renderer and the anchor, kogaki#879). `record` is relative to the draft,
    // the convention `brief:` and `packet:` already use — two machines emit
    // identical bytes — and `record_sha` is the sha `figure` recorded at
    // validation, READ rather than recomputed. `lines` is the block's own span,
    // beside the Leg's prose range and never inside it: a reader joining a
    // rendered figure back to the record it came from needs both, and a single
    // range carrying both would answer for neither.
    const fig = figures.get(t.leg_id);
    if (fig) {
      const span = figureRanges.get(t.leg_id);
      t.figure = {
        position: fig.position,
        record: relative(dirname(outPath), fig.path),
        record_sha: fig.sha256,
        ...(span ? { lines: [span[0] + bodyOffset, span[1] + bodyOffset] } : {}),
      };
    }
  }
  const fm = [
    ...head,
    ...trace.map((t) => `  - ${JSON.stringify(t)}`),
    "---",
  ].join("\n");
  writeFileSync(outPath, fm + "\n\n" + body + "\n");
  writeFileSync(join(ws, "last-emit.json"), JSON.stringify({
    out: outPath, at: new Date().toISOString(), body_sha: sha256(body),
  }, null, 2) + "\n");
  process.stdout.write(`CanonicalDraft: ${outPath} (one per Brief, fixed human name, overwritten on re-run)\n`);
}

// THIS FILE IS BOTH A COMMAND AND A LIBRARY, AND THE GUARD IS WHAT MAKES THE
// SECOND POSSIBLE (kogaki#1014). `parseLegBlock` is the Brief's own reader for
// a `leg` block and ReviewDraft's Reverse Outline is one — "parsed by the same
// function that parses a Brief Leg" is the acceptance, so this module has to be
// importable. Without the guard the dispatch below ran at import, read the
// IMPORTER's argv, matched no subcommand and exited 1: `review-draft open`
// died on draft.mjs's usage line before writing anything.
//
// The check is the module's own URL against the process entry point, so
// `node src/draft.mjs …` still runs the CLI and every import is silent.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  switch (args._cmd) {
    case "resolve": cmdResolve(args); break;
    case "material": cmdMaterial(args); break;
    case "packet": cmdPacket(args); break;
    case "section": cmdSection(args); break;
    case "figure": cmdFigure(args); break;
    case "emit": cmdEmit(args); break;
    default: fail("usage: draft.mjs resolve|material|packet|section|figure|emit --brief <path> [--workspace <dir>] [--strand <L-id>] [--leg <id>]");
  }
}
