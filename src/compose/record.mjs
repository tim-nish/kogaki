// compose/record — the Brief as one YAML record, and the placed Strands
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the read-not-invented rule; the obligations ledger;
//       the durable home and the entry point;
//       journey register as a Candidate axis
//
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { stringifyYaml, parseYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import {
  READER_STATE_DIMENSIONS, deriveReaderStatesBefore, journeyUses,
  readerStateDimensionLine, waypointsRefusal,
} from "./leg-schema.mjs";
import { parseIntroducesEntry } from "./sections.mjs";

// ---- THE BRIEF IS ONE YAML RECORD (kogaki#1328, owner decision 2026-10-10) ----
//
// `theses/<slug>/brief.yaml` is the Brief, read through `parseBriefRecord`
// and the readers beside it; nothing reads it back from a rendering. Its
// shape is `brief_record` in `src/candidate-schema.json`, whose key set this
// file reads (`briefRecordKeys`). EACH READER STATE IS WRITTEN ONCE PER
// BOUNDARY: `reader_start` before the first Leg, `reader_state_after` per
// Leg, before-states derived on read (`deriveReaderStatesBefore`,
// kogaki#1325); `reader_target` names the Leg marked `reaches_target`.
export const BRIEF_RECORD_FILE = "brief.yaml";
const RECORD_WIDTH = 120;

let CANDIDATE_SCHEMA_FILE = null;
function candidateSchemaBlock() {
  if (!CANDIDATE_SCHEMA_FILE) {
    const p = join(dirname(fileURLToPath(import.meta.url)), "..", "candidate-schema.json");
    CANDIDATE_SCHEMA_FILE = JSON.parse(readFileSync(p, "utf8"));
  }
  const b = CANDIDATE_SCHEMA_FILE.brief_record;
  if (!b || typeof b.keys !== "object") {
    throw new Error("src/candidate-schema.json declares no `brief_record.keys` — the Brief record's shape is declared there (kogaki#1328), and a reader with no declaration has no key set to refuse against");
  }
  return b;
}
export function briefRecordDeclaration() { return candidateSchemaBlock(); }
// The record's top-level keys, in the order the file writes them, and the
// subset that is a slot awaiting composition at mint.
export function briefRecordKeys() { return Object.keys(candidateSchemaBlock().keys); }
export function briefSlotKeys() {
  const keys = candidateSchemaBlock().keys;
  return Object.keys(keys).filter((k) => keys[k].filled_at === "adoption");
}

// A reader state's line form — one `dimension: value` line per dimension, the
// form the Candidate carries and every in-memory reader reads — to the
// record's five-key map, and back. The map is keyed by READER_STATE_DIMENSIONS
// in that order; a dimension the state does not carry is absent.
export function readerStateMap(value) {
  if (value === null || value === undefined) return null;
  const out = {};
  for (const dim of READER_STATE_DIMENSIONS) {
    const v = readerStateDimensionLine(value, dim);
    if (v !== null) out[dim] = v;
  }
  return out;
}
export function readerStateText(map) {
  if (!map || typeof map !== "object") return undefined;
  return READER_STATE_DIMENSIONS.filter((d) => typeof map[d] === "string").map((d) => `${d}: ${map[d]}`).join("\n");
}

// One Leg as the record carries it: its fields in the schema's order, the
// before-state left out (derived on read), the reader state as a map, an
// `introduces` object with its fields in the schema's own order.
const INTRODUCES_KEYS = ["term", "kind", "source", "meaning", "nearest", "differs"];
export function legRecord(s) {
  const out = { leg_id: s.leg_id };
  if (s.move) out.move = s.move;
  out.materials = [...s.materials];
  out.purpose = s.purpose;
  out.reader_state_after = readerStateMap(s.reader_state_after);
  out.depends_on = [...(s.depends_on || [])];
  out.rationale = s.rationale;
  out.claims = (s.claims || []).map((g) => ({ strand: g.strand, proposition: g.proposition }));
  // A LEG WAYPOINT IS `point` AND `serves`, AND NOTHING ELSE (kogaki#1375): no Move
  // information reaches the Brief; the paragraph Move is the ParagraphPlan stage's.
  out.waypoints = (s.waypoints || []).map((w) => ({ serves: [...w.serves], point: String(w.point).replace(/\s*\n\s*/g, " ").trim() }));
  if ((s.journeys || []).length) {
    out.journeys = s.journeys.map((j) => {
      const gloss = journeyUses().get(j.use);
      return gloss ? { strand: j.strand, use: j.use, meaning: gloss } : { strand: j.strand, use: j.use };
    });
  }
  if ((s.introduces || []).length) {
    out.introduces = s.introduces.map((e) => {
      if (!e || typeof e !== "object" || Array.isArray(e)) return e;
      const p = parseIntroducesEntry(e);
      const src = p.error ? e : p;
      return Object.fromEntries(INTRODUCES_KEYS.filter((k) => src[k] !== undefined && src[k] !== null).map((k) => [k, src[k]]));
    });
  }
  if ((s["re-activate"] || []).length) out["re-activate"] = [...s["re-activate"]];
  if (s.budget !== undefined && s.budget !== null) out.budget = s.budget;
  if (s.opens_section !== undefined) out.opens_section = s.opens_section;
  if (s.reaches_target === true) out.reaches_target = true;
  if (Array.isArray(s.names)) out.names = [...s.names];
  if (s.bridges) out.bridges = [...s.bridges];
  if (s.figure !== undefined && s.figure !== null) {
    out.figure = s.figure;
    out.figure_roles = { ...s.figure_roles };
  }
  if (s.entailed === true) {
    out.entailed = true;
    out.entailment_reasoning = s.entailment_reasoning;
  }
  return out;
}

// The record's Legs back to the in-memory shape every reader of a Leg reads:
// the reader states in their line form, each before-state derived from the
// state before it.
export function briefLegs(record) {
  const path = Array.isArray(record?.reader_path) ? record.reader_path : [];
  const legs = path.map((r) => {
    const s = { ...r };
    s.reader_state_after = readerStateText(r.reader_state_after);
    if (Array.isArray(r.journeys)) s.journeys = r.journeys.map((j) => ({ strand: j.strand, use: j.use }));
    if (r.figure_roles && typeof r.figure_roles === "object") s.figure_roles = { ...r.figure_roles };
    s.materials = Array.isArray(r.materials) ? r.materials.map(String) : [];
    s.depends_on = Array.isArray(r.depends_on) ? r.depends_on.map(String) : [];
    s.claims = Array.isArray(r.claims) ? r.claims : [];
    s.waypoints = Array.isArray(r.waypoints) ? r.waypoints : [];
    return s;
  });
  return deriveReaderStatesBefore(legs, readerStateText(record?.reader_start));
}

// ---------------------------------------------------------------------------
// THE PARAGRAPHPLAN FILE (kogaki#1375) — its one writer and its one reader, here in shared
// code because two commands touch it: /paragraph-plan writes it and /draft reads it, and a
// command module never imports another command's (kogaki#1302).
export const PARAGRAPH_PLAN_FILE = "paragraph-plan.yaml";
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

export function paragraphPlanPathFor(briefPath) {
  return join(dirname(resolve(briefPath)), PARAGRAPH_PLAN_FILE);
}

// ---------------------------------------------------------------------------
// THE PARAGRAPHPLAN FILE — its one writer and its one reader.
//
// One YAML record: `version`, `brief` (the path and the content hash of the Brief it
// was made from), and `legs`, one per Leg of the Brief's Reader Path in order, each
// carrying one entry per Leg Waypoint in order with that Leg Waypoint's Paragraph
// Waypoints. A Paragraph Waypoint is `point` and `serves`, and nothing else -- or
// `performs` alone, for a Segment that acts on the reader's reading (kogaki#1448).

const PLAN_HEADER = [
  "The paragraph plan for one article: under every Leg Waypoint of the Brief named below, the Paragraph Waypoints",
  "-- the points its one paragraph makes, in order, each with the Claims it serves. A Leg Waypoint is one paragraph,",
  "and a Paragraph Waypoint is one Segment of the Move bound to it. /paragraph-plan writes it from the Brief; /draft",
  "reads it beside the Brief and refuses it when the Brief has changed since. It holds nothing of a Move.",
].join(" ");

// `legs[i].waypoints` is one array of Paragraph Waypoints per Leg Waypoint, and
// `legs[i].joins`, where given, one join per Leg Waypoint -- null on the first (kogaki#1411).
export const oneLine = (s) => String(s).replace(/\s*\n\s*/g, " ").trim();
export function paragraphPlanRecord({ briefPath, briefText, legs }) {
  return {
    version: "1",
    brief: { path: relFromRepo(resolve(briefPath)), sha256: sha256(briefText) },
    legs: legs.map((l) => ({
      leg_id: l.leg_id,
      waypoints: l.waypoints.map((pws, i) => {
        const join = (l.joins || [])[i];
        return {
          waypoint: i + 1,
          ...(typeof join === "string" ? { join: oneLine(join) } : {}),
          paragraph_waypoints: pws.map((p) => ({ ...(Object.hasOwn(p, "performs")
            ? { performs: oneLine(p.performs) } : { point: oneLine(p.point), serves: [...p.serves] }),
          ...(typeof p.manner === "string" && p.manner.trim() ? { manner: oneLine(p.manner) } : {}) })),
        };
      }),
    })),
  };
}

export function paragraphPlanRecordText(record) {
  return stringifyYaml(record, { width: 120, header: PLAN_HEADER });
}

const PLAN_KEYS = ["version", "brief", "legs"];
const PLAN_BRIEF_KEYS = ["path", "sha256"];
const PLAN_LEG_KEYS = ["leg_id", "waypoints"];
const PLAN_WAYPOINT_KEYS = ["waypoint", "join", "paragraph_waypoints"];
const PARAGRAPH_WAYPOINT_KEYS = ["point", "serves"];
// THE PERFORMS FORM (kogaki#1448, owner decision 2026-10-19): a Paragraph Waypoint for a
// Segment that acts on the reader's reading -- announce, flag, concede difficulty, signal a
// turn -- carries `performs`, the operation in the planner's words, in place of `point` and
// `serves`: such a Segment carries no part of the Leg Waypoint's point, and a point written
// for it is invented content.
const PERFORMS_WAYPOINT_KEYS = ["performs"];
// THE MANNER (kogaki#1510): a Paragraph Waypoint built on a Segment that carries a `manner`
// carries it too, copied by the Harness when the plan is written -- never by the planner, so
// the planner's answer is read with `manner: false` and the plan record with `manner: true`.
const MANNER_KEY = "manner";

export function undeclaredKey(obj, allowed) {
  return Object.keys(obj).find((k) => !allowed.includes(k));
}

// THE READ /draft MAKES (kogaki#1375). `briefPath` and `briefText` are the Brief /draft
// was handed, `legs` its parsed Legs. Returns `{ path, waypoints, joins }` — `waypoints` a
// Map from leg_id to one array of Paragraph Waypoints per Leg Waypoint, `joins` a Map from
// leg_id to one join per Leg Waypoint, null on the first (kogaki#1411) — or `{ error }`,
// naming both files where the two disagree. OPENS NO MOVE FILE: the record carries none.
export function readParagraphPlanBeside(briefPath, briefText, legs) {
  const path = paragraphPlanPathFor(briefPath);
  const rel = relFromRepo(path);
  const briefRel = relFromRepo(resolve(briefPath));
  if (!existsSync(path)) {
    return { error: `the Brief at ${briefRel} has no ParagraphPlan file beside it (${rel}) — /draft renders each Leg `
      + `Waypoint's Paragraph Waypoints from that file, and /paragraph-plan writes it from the adopted Brief: run `
      + `\`node src/paragraph-plan.mjs start --brief ${briefRel}\` first (kogaki#1375)` };
  }
  let record;
  try { record = parseYaml(readFileSync(path, "utf8"), rel); }
  catch (e) { return { error: `the ParagraphPlan file ${rel} is not a YAML record this reader can read: ${e.message}` }; }
  const r = paragraphPlanShapeRefusal(record, rel, legs);
  if (r) return { error: r };
  const want = sha256(briefText);
  if (record.brief.sha256 !== want) {
    return { error: `the ParagraphPlan file ${rel} was made from a different Brief: it names ${record.brief.path} at `
      + `sha256 ${record.brief.sha256}, and the Brief at ${briefRel} is sha256 ${want} — the Brief has changed since `
      + `the plan was made, so run /paragraph-plan on this Brief again (kogaki#1375)` };
  }
  const waypoints = new Map(record.legs.map((l) => [l.leg_id, l.waypoints.map((w) => w.paragraph_waypoints)]));
  const joins = new Map(record.legs.map((l) => [l.leg_id, l.waypoints.map((w) => w.join ?? null)]));
  return { path, waypoints, joins };
}

// The record's shape against the Brief's Legs: every key declared, one entry per Leg and
// per Leg Waypoint in order, and every Paragraph Waypoint shaped as a Leg Waypoint is —
// `waypointsRefusal`, the Leg Waypoints' own rule, over the parent's Claims — and
// carrying `point` and `serves` alone. A key outside those is refused by name: the file
// holds no Move id, no Segment and no Move field.
export function paragraphPlanShapeRefusal(record, rel, legs) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return `the ParagraphPlan file ${rel} is not a YAML map`;
  const k0 = undeclaredKey(record, PLAN_KEYS);
  if (k0) return `the ParagraphPlan file ${rel} carries \`${k0}\`, which a ParagraphPlan record does not declare (kogaki#1375)`;
  if (String(record.version) !== "1") return `the ParagraphPlan file ${rel} carries version ${JSON.stringify(record.version)}, not "1"`;
  const b = record.brief;
  if (!b || typeof b !== "object" || Array.isArray(b) || typeof b.path !== "string" || typeof b.sha256 !== "string") {
    return `the ParagraphPlan file ${rel} names no Brief — \`brief\` carries the \`path\` and the \`sha256\` of the Brief it was made from`;
  }
  const kb = undeclaredKey(b, PLAN_BRIEF_KEYS);
  if (kb) return `the ParagraphPlan file ${rel} carries \`brief.${kb}\`, which a ParagraphPlan record does not declare`;
  if (!Array.isArray(record.legs) || record.legs.length !== legs.length
    || record.legs.some((l, i) => !l || l.leg_id !== legs[i].leg_id)) {
    return `the ParagraphPlan file ${rel} carries the Legs ${JSON.stringify((record.legs || []).map((l) => l && l.leg_id))}, `
      + `and the Brief's Reader Path is ${JSON.stringify(legs.map((l) => l.leg_id))} — one entry per Leg, in order`;
  }
  for (const [i, l] of record.legs.entries()) {
    const leg = legs[i];
    const at = `the ParagraphPlan file ${rel}, leg ${leg.leg_id}`;
    const kl = undeclaredKey(l, PLAN_LEG_KEYS);
    if (kl) return `${at} carries \`${kl}\`, which a ParagraphPlan record does not declare`;
    if (!Array.isArray(l.waypoints) || l.waypoints.length !== leg.waypoints.length) {
      return `${at} carries ${Array.isArray(l.waypoints) ? l.waypoints.length : "no"} Leg Waypoint entr(ies) for the Leg's `
        + `${leg.waypoints.length} Leg Waypoint(s) — one per Leg Waypoint, in order`;
    }
    for (const [j, w] of l.waypoints.entries()) {
      const atW = `${at}, Waypoint ${j + 1}`;
      if (!w || typeof w !== "object" || Array.isArray(w)) return `${atW} is not a map`;
      const kw = undeclaredKey(w, PLAN_WAYPOINT_KEYS);
      if (kw) return `${atW} carries \`${kw}\`, which a ParagraphPlan record does not declare — the file holds no Move id, `
        + "no Segment and no Move field (kogaki#1375)";
      if (w.waypoint !== j + 1) return `${atW} is numbered ${JSON.stringify(w.waypoint)} — entries are one per Leg Waypoint, in order`;
      const badJoin = joinRefusal(w, j, atW);
      if (badJoin) return badJoin;
      const bad = paragraphWaypointsRefusal(w.paragraph_waypoints, leg.waypoints[j].serves, atW, { manner: true });
      if (bad) return bad;
    }
  }
  return null;
}

// THE JOIN IS A TYPED RELATION (kogaki#1477, owner decision 2026-10-20). Every Leg Waypoint
// after the first carries one `join`, ONE WORD of this closed set naming how its paragraph's
// first point stands to the paragraph before it, and the first carries none: the connection
// between Legs is the Brief's (kogaki#1282). The join was one sentence (kogaki#1411), and the
// Writer, which must realise it in its own first sentence, paraphrased it as a clause. The set
// is Halliday and Hasan's conjunctive classes laid over the top-level senses of the Penn
// Discourse TreeBank, cut to the relations a paragraph opening realises as a connective;
// temporal is omitted because the plan's order already carries it. The definitions are the
// ones the planner's row renders, so checks/check-paragraph-plan.sh reads them from here.
export const JOIN_TYPES = {
  consequence: "this paragraph follows from what the previous one established",
  grounds: "this paragraph gives the reason for what the previous one asserted",
  contrast: "this paragraph sets its matter against the previous one's",
  elaboration: "this paragraph carries the previous one's matter further or in more detail",
  summary: "this paragraph draws the preceding paragraphs together",
  none: "this paragraph opens on its own matter and no connective is owed",
};
const JOIN_SET = Object.keys(JOIN_TYPES).join(", ");

// THE JOIN, BY ITS PLACE IN THE LEG (kogaki#1411) AND ITS SET (kogaki#1477). `j` is the Leg
// Waypoint's 0-based place. Shared by the plan reader and the plan call's validator, so the
// file the stage writes is the file /draft reads.
export function joinRefusal(w, j, at) {
  const has = Object.hasOwn(w, "join");
  if (j === 0) {
    return has ? `${at} carries \`join\` — the first Leg Waypoint of a Leg carries no join: the connection between Legs `
      + "is the Brief's, admitted by `introduces` and `re-activate` (kogaki#1282), and the join is only for a paragraph "
      + "after the first within a Leg (kogaki#1411)" : null;
  }
  if (!has) {
    return `${at} carries no \`join\` — every Leg Waypoint after the first carries one word of ${JOIN_SET}, naming how `
      + "this paragraph's first point stands to the paragraph before it (kogaki#1411, kogaki#1477)";
  }
  if (typeof w.join !== "string" || w.join.trim() === "") {
    return `${at} carries an empty \`join\` — a join is one word of ${JOIN_SET} (kogaki#1411, kogaki#1477)`;
  }
  if (!Object.hasOwn(JOIN_TYPES, w.join)) {
    const what = /\s/.test(w.join.trim()) ? "a sentence" : `the word ${JSON.stringify(w.join)}, which is outside the set`;
    return `${at} carries ${what} for \`join\` — a join is one word of ${JOIN_SET}, never prose the Writer would `
      + "paraphrase (kogaki#1477)";
  }
  return null;
}

// ONE LEG WAYPOINT'S PARAGRAPH WAYPOINTS, by the Leg Waypoints' own rule (the count is
// not fixed, and every Claim the parent serves is served by at least one of them) and
// with `point` and `serves` as their only keys -- or `performs` alone (kogaki#1448), which
// the Claim-coverage rule does not count: the `point` Paragraph Waypoints carry it, and a
// Leg Waypoint none of whose Paragraph Waypoints carries a `point` is refused.
export function paragraphWaypointsRefusal(pws, parentServes, at, { manner = false } = {}) {
  if (Array.isArray(pws)) {
    for (const [i, p] of pws.entries()) {
      if (p && typeof p === "object" && !Array.isArray(p)) {
        if (manner && Object.hasOwn(p, MANNER_KEY)
            && (typeof p.manner !== "string" || p.manner.trim() === "" || /[\r\n]/.test(p.manner))) {
          return `${at}: Paragraph Waypoint ${i + 1} carries a \`manner\` that is not one non-empty line — it is its Segment's `
            + "manner, copied, and a Paragraph Waypoint on a Segment with none leaves the key out (kogaki#1510)";
        }
        const own = manner ? [MANNER_KEY] : [];
        if (Object.hasOwn(p, "performs")) {
          const k = undeclaredKey(p, [...PERFORMS_WAYPOINT_KEYS, ...own]);
          if (k) {
            return `${at}: Paragraph Waypoint ${i + 1} carries \`performs\` beside \`${k}\` — a \`performs\` Paragraph Waypoint `
              + "carries its Segment's operation on the reader's reading in place of `point` and `serves`, and nothing else (kogaki#1448)";
          }
          if (typeof p.performs !== "string" || p.performs.trim() === "") {
            return `${at}: Paragraph Waypoint ${i + 1} carries an empty \`performs\` — it names the operation its Segment `
              + "performs on the reader's reading, in one sentence (kogaki#1448)";
          }
          continue;
        }
        const k = undeclaredKey(p, [...PARAGRAPH_WAYPOINT_KEYS, ...own]);
        if (k) {
          return `${at}: Paragraph Waypoint ${i + 1} carries \`${k}\` — a Paragraph Waypoint carries \`point\` and \`serves\`, `
            + "or `performs` alone, and nothing of a Move reaches past Paragraph Waypoint generation (kogaki#1375, kogaki#1448)";
        }
      }
    }
    const isPoint = (p) => !(p && typeof p === "object" && Object.hasOwn(p, "performs"));
    const points = pws.filter(isPoint);
    const ordinals = pws.map((p, i) => i + 1).filter((n) => isPoint(pws[n - 1]));
    if (pws.length && !points.length) {
      return `${at}: none of its Paragraph Waypoints carries a \`point\` — a \`performs\` Paragraph Waypoint carries no part `
        + "of the Leg Waypoint's point, so every Claim the parent serves is served by at least one `point` Paragraph Waypoint (kogaki#1448)";
    }
    return waypointsRefusal(points, parentServes, `${at}'s Paragraph Waypoints`, ordinals);
  }
  return waypointsRefusal(pws, parentServes, `${at}'s Paragraph Waypoints`);
}

// The Strand ids of the closed set, in the order the mint wrote them; and the
// Journey-bearing members — the Strands whose served record carries a
// Journey cite. Read from the record for the reason they always were read
// from the Brief: the Brief is the closed set's carrier, and a second source
// would be a Brief fetch.
export function briefStrandIds(record) {
  return (Array.isArray(record?.strands) ? record.strands : []).map((s) => s.id);
}
export function briefJourneyStrands(record) {
  return (Array.isArray(record?.strands) ? record.strands : [])
    .filter((s) => typeof s.journey_cite === "string" && s.journey_cite !== "").map((s) => s.id);
}

// The record's text: its keys in the declared order, a caption above each
// as a comment for the owner who reads the file, every line within
// RECORD_WIDTH. A comment is never read back.
export function briefRecordText(record) {
  const decl = candidateSchemaBlock();
  const ordered = {};
  for (const k of Object.keys(decl.keys)) if (k in record) ordered[k] = record[k];
  for (const k of Object.keys(record)) if (!(k in ordered)) ordered[k] = record[k];
  const comments = new Map(Object.entries(decl.keys)
    .filter(([, d]) => typeof d.caption === "string").map(([k, d]) => [k, d.caption]));
  return stringifyYaml(ordered, { width: RECORD_WIDTH, comments, header: decl.header });
}

// The record read from its text, or a refusal naming what is wrong. A key the
// declaration does not name is refused rather than read, and a required key
// absent is refused by name; a slot key present as `null` is a slot awaiting
// composition, which is a template rather than a malformed record, and the
// caller decides what that costs.
export function parseBriefRecord(text, path = "<brief>") {
  let record;
  try { record = parseYaml(text, path); }
  catch (e) { return { error: `the Brief at ${path} is not a YAML record this reader can read: ${e.message}` }; }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { error: `the Brief at ${path} is not a YAML map — the Brief record is one map of named keys (kogaki#1328)` };
  }
  const decl = candidateSchemaBlock().keys;
  for (const k of Object.keys(record)) {
    if (!Object.prototype.hasOwnProperty.call(decl, k)) {
      return { error: `the Brief at ${path} carries the key \`${k}\`, which the Brief record does not declare `
        + `(src/candidate-schema.json, \`brief_record\`) — a key nobody reads is refused rather than carried` };
    }
  }
  for (const [k, d] of Object.entries(decl)) {
    if (d.required === true && !(k in record)) {
      return { error: `the Brief at ${path} carries no \`${k}\` — ${d.description}` };
    }
  }
  if (!Array.isArray(record.strands) || record.strands.length === 0) {
    return { error: `the Brief at ${path} settles no Strands — \`strands\` is the closed set the mint wrote` };
  }
  return { record };
}
export function readBriefRecord(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { return { error: `the Brief at ${path} cannot be read (${e.message})` }; }
  const r = parseBriefRecord(text, path);
  return r.error ? r : { record: r.record, text };
}
// The slot keys still awaiting composition, in the declared order.
export function unfilledSlots(record) {
  return briefSlotKeys().filter((k) => record[k] === null || record[k] === undefined);
}

// Fills one slot of the record; a slot already filled refuses, because
// composition resumes by judgment, never by overwrite.
export function fillSlot(record, key, value) {
  if (!briefSlotKeys().includes(key)) {
    return { error: `\`${key}\` is not a slot of the Brief record (src/candidate-schema.json, \`brief_record\`)` };
  }
  if (record[key] !== null && record[key] !== undefined) {
    return { error: `the Brief's \`${key}\` is already filled — composition resumes by judgment, not by overwrite, `
      + "or this is not a minted Brief (the durable home and the entry point)" };
  }
  return { record: { ...record, [key]: value } };
}

// THE THESIS ROW OF CLOSURE IS DERIVED (kogaki#1328). It was the Candidate's
// free-text `reasoning.thesis_closure`, written into the Brief whole — one
// line of 1934 characters in the 2026-10-09 Brief, carrying what the Strand
// coverage already carried per Strand. It is now rendered from that coverage
// — each placed Strand's `role_in_thesis` — and handed to the one Leg marked
// `reaches_target`, the Leg whose after-state is the Reader target. Null where
// the record carries no such Leg or no stated role.
export function thesisClosureRow(record) {
  const roles = (Array.isArray(record?.strand_coverage) ? record.strand_coverage : [])
    .filter((c) => typeof c.role_in_thesis === "string" && c.role_in_thesis.trim() !== "")
    .map((c) => c.role_in_thesis.trim());
  if (!roles.length || typeof record.thesis !== "string") return null;
  return `The Thesis — ${record.thesis.trim()} — is established by the end of this Leg, with each piece of `
    + `the material doing its part: ${roles.join(" ")}`;
}
export function thesisClosureLeg(record) {
  const marked = (Array.isArray(record?.reader_path) ? record.reader_path : []).filter((s) => s.reaches_target === true);
  return marked.length === 1 ? marked[0].leg_id : null;
}

// THE LEG PACKET'S OWN CLOSURE ROWS (Closure, kogaki#1151). A Leg is handed
// only the rows it is a party to — where it is `introduced_by`,
// `discharged_by` or `conceded_by` — as their text; the derived Thesis row is
// handed to the Leg marked `reaches_target`. Read from the record's `closure`
// list, which adoption wrote from the Candidate's obligations ledger.
export const CONCEDED_ROW_FIELDS = ["open", "why_not_here", "reader_keeps"];
export function closureRowsOf(record, legId) {
  const rows = [];
  if (thesisClosureLeg(record) === legId) {
    const t = thesisClosureRow(record);
    if (t) rows.push({ text: t });
  }
  for (const o of Array.isArray(record?.closure) ? record.closure : []) {
    if (o.introduced_by === legId || o.discharged_by === legId || o.conceded_by === legId) rows.push(o);
  }
  return rows;
}

// The placement count, taken AFTER composition and COUNTED IN PLACEMENTS
// (the obligations ledger; the read-not-invented
// rule's completeness rider): a placement is a leg whose materials
// carry the Strand. Derived from the composed legs themselves, never from
// a declaration — a composer that cannot omit in principle can still omit
// in fact, and a declared cover would hide exactly that.
export function placements(legs, strandIds) {
  const used = new Map(strandIds.map((id) => [id, []]));
  for (const s of legs) {
    for (const m of s.materials) {
      if (used.has(m)) used.get(m).push(s.leg_id);
    }
  }
  return used;
}

// Journey placement — journey register as a Candidate axis, MUST 1: a
// Journey is a DISTINCT material, derived from the composed legs because a
// Strand can be placed while its journey material is dropped.
// COUNTED FROM `journeys` (kogaki#1131, reversing kogaki#1111's count of a
// `<L-id>.journey` token): two readers of one fact disagreed and the first
// Brief at `done` disclosed as OMITTED Journeys its path placed. A
// `<L-id>.journey` in `materials` stays legal and checked in `fillBrief`,
// but places nothing on its own.
export function journeyPlacements(legs, journeyIds) {
  const used = new Map(journeyIds.map((id) => [id, []]));
  for (const s of legs) {
    for (const j of s.journeys || []) {
      if (j && used.has(j.strand)) used.get(j.strand).push(s.leg_id);
    }
  }
  return used;
}
