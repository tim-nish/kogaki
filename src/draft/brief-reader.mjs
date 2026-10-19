// draft/brief-reader — the Brief read as its record, the Leg record refusal, the target line and the trace structure.
// Cut from src/draft.mjs at its named section (kogaki#1461); the design and
// its rulings are stated at the entry and in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg and the Move it binds
//
import { resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { introducesRefusal, opensSectionRefusal, figureRefusal, journeysRefusal, budgetRefusal, reactivateRefusal, parseBriefRecord, unfilledSlots, briefLegs, legschema } from "../compose.mjs";

export function fail(msg) {
  process.stderr.write(`draft: ${msg}\n`);
  process.exit(1);
}

// The omitted-value guard brief.mjs carries (PR #484 round 1 finding 1),
// inherited unchanged: a bare `--brief` parses as boolean true and String(true)
// reaches readFileSync as a filename.
export function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}
// A Brief minted since kogaki#1116 carries no survey pin, because the commit pin
// is deprecated and each Strand's cite carries the served address at its own
// content hash. The absence is STATED in the Draft's frontmatter rather than
// rendered as an empty value: a blank `survey_pin:` would read as a pin the
// Draft failed to carry, which is the one thing that is not true of it.
const NO_SURVEY_PIN = "none — the commit pin is deprecated (kogaki#1116); each Strand's cite carries its own content hash";

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// ---------------------------------------------------------------------------
// THE BRIEF IS READ AS ITS RECORD (kogaki#1328, owner decision 2026-10-10).
// `parseBriefRecord` (src/compose.mjs) reads theses/<slug>/brief.yaml and
// refuses an undeclared key; `briefLegs` returns the Legs in recorded order.
// No regular expression reads a rendering of the Brief. The composition side's
// shape predicates run again here, imported, so a hand-edited Leg this side
// cannot realize refuses by name rather than reaching a Packet half-formed.
//
// Returns `{ slug, surveyPin, thesis, strands, legs, refusals, text, record }`;
// the caller decides what a refusal costs.
export function readBrief(text, path = "<brief>") {
  const refusals = [];
  const parsed = parseBriefRecord(text, path);
  if (parsed.error) return { refusals: [parsed.error], text, legs: [], strands: [] };
  const record = parsed.record;

  // A template is refused BY FIELD (AC1): the first slot still awaiting
  // composition names the field the refusal carries.
  const open = unfilledSlots(record);
  if (open.length) {
    refusals.push(`the Brief at ${path} is a template, not an input: the field "${open[0]}" still reads as an `
      + "unfilled slot (null) — the Brief is filled when a Candidate is adopted");
  }

  const slug = typeof record.slug === "string" && record.slug !== "" ? record.slug : basename(dirname(resolve(path)));

  // THE THESIS IS THE ARTICLE'S TITLE, VERBATIM (kogaki#1327, owner decision
  // 2026-10-10): the record's `thesis` key, rendered by `emit` exactly as it
  // stands. No field is composed for the title.
  const thesis = typeof record.thesis === "string" && record.thesis.trim() !== "" ? record.thesis.trim() : null;
  if (thesis === null) {
    refusals.push(`the Brief at ${path} carries no non-empty \`thesis\` — `
      + "the Draft's title is the Thesis, rendered verbatim, and there is no field composed for it");
  }

  // THE SURVEY PIN IS NO LONGER CARRIED (kogaki#1116): each Strand's cite
  // carries the served address at its own content hash, so the absence is a
  // recorded absence, and the frontmatter says which.
  const surveyPin = NO_SURVEY_PIN;

  // Strands, with their cites in the order the mint wrote them.
  const strands = record.strands.map((s) => ({
    id: String(s.id),
    slug: String(s.slug),
    cites: [
      ...(typeof s.cite === "string" ? [{ kind: "cite", cite: s.cite }] : []),
      ...(typeof s.journey_cite === "string" ? [{ kind: "journey cite", cite: s.journey_cite }] : []),
    ],
  }));

  // Legs, in recorded order. The order IS the Reader Path (AC3); nothing
  // below re-sorts it.
  const legs = [];
  if (Array.isArray(record.reader_path)) {
    const declared = new Set(Object.keys(legschema().fields));
    for (const [i, raw] of record.reader_path.entries()) {
      const bad = legRecordRefusal(raw, declared, `the Brief at ${path}, leg ${raw?.leg_id ?? i + 1}`);
      if (bad) { refusals.push(bad); continue; }
    }
    if (!refusals.length) legs.push(...briefLegs(record));
  }
  if (legs.length === 0 && refusals.length === 0) {
    refusals.push(`the Brief at ${path} carries no Reader Path legs — there is nothing to realize`);
  }

  return { slug, surveyPin, thesis, strands, legs, refusals, text, record };
}

// One Leg of the record, held to the shapes a Packet needs: the key set
// `src/leg-schema.json` declares, and each field's own grammar through the
// composition side's predicates. Returns a refusal string or null.
function legRecordRefusal(raw, declared, at) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return `${at}: a Leg is a map of named fields`;
  if (typeof raw.leg_id !== "string" || raw.leg_id === "") return `${at}: carries no \`leg_id\``;
  for (const k of Object.keys(raw)) {
    if (k === "reader_state_before") {
      return `${at}: carries \`reader_state_before\` — a Leg's before-state is the state written before it `
        + "(the Reader start, or the previous Leg's after-state) and is derived on read, never written (kogaki#1325, kogaki#1328)";
    }
    // THE RELATIONS LAYER IS RETIRED (kogaki#1215; owner ruling 2026-09-28):
    // a Leg marking a satellite cannot be realized, and is refused by name.
    if (k === "relation") {
      return `${at}: carries a \`relation\` — the relations layer is retired (kogaki#1215): claims and `
        + "introduce-here entries render as flat lists, and a Leg marking a satellite cannot be realized";
    }
    if (!declared.has(k)) {
      return `${at}: carries \`${k}\`, which is not a Leg field (src/leg-schema.json) — a field nobody declared is refused rather than read`;
    }
  }
  if (raw.reader_state_after === null || typeof raw.reader_state_after !== "object" || Array.isArray(raw.reader_state_after)) {
    return `${at}: \`reader_state_after\` is a map of the reader's state, one key per dimension`;
  }
  if (!Array.isArray(raw.claims) || raw.claims.some((g) => !g || typeof g.strand !== "string" || typeof g.proposition !== "string")) {
    return `${at}: \`claims\` is a list of maps, each naming its \`strand\` and its \`proposition\``;
  }
  if (!Array.isArray(raw.waypoints) || raw.waypoints.some((w) => !w || typeof w.point !== "string" || !Array.isArray(w.serves))) {
    return `${at}: \`waypoints\` is a list of maps, each with its \`point\` and the Strands it \`serves\``;
  }
  if (raw.introduces !== undefined) {
    const bad = introducesRefusal(raw.introduces, at);
    if (bad) return bad;
  }
  if (raw["re-activate"] !== undefined) {
    const bad = reactivateRefusal(raw["re-activate"], at);
    if (bad) return bad;
  }
  if (raw.opens_section !== undefined) {
    const bad = opensSectionRefusal(typeof raw.opens_section === "string" ? raw.opens_section.trim() : raw.opens_section, at);
    if (bad) return bad;
  }
  if (raw.figure !== undefined || raw.figure_roles !== undefined) {
    const bad = figureRefusal(raw.figure, raw.figure_roles, at);
    if (bad) return bad;
  }
  if (raw.journeys !== undefined) {
    const bad = journeysRefusal((Array.isArray(raw.journeys) ? raw.journeys : []).map((j) => ({ strand: j?.strand, use: j?.use })),
      Array.isArray(raw.materials) ? raw.materials.map(String) : [], at);
    if (bad) return bad;
  }
  if (raw.budget !== undefined) {
    const bad = budgetRefusal(raw.budget, at);
    if (bad) return bad;
  }
  // the Reader target Leg's mark (kogaki#1231): only `true` is a mark, and any
  // other value refuses naming the Leg rather than reading as unmarked.
  if (raw.reaches_target !== undefined && raw.reaches_target !== true) {
    return `${at}: reaches_target reads ${JSON.stringify(raw.reaches_target)} — `
      + "the mark is `true` on exactly one Leg and absent elsewhere (kogaki#1231)";
  }
  return null;
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
