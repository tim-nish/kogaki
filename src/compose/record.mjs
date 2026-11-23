// compose/record — the Brief as one YAML record, and the placed Strands
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the read-not-invented rule;
//       the durable home and the entry point;
//       journey register as a Candidate axis
//
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { stringifyYaml, parseYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import { READER_STATE_DIMENSIONS, readerStateDimensionLine } from "./leg-schema.mjs";
import { asOneList, oneListIds } from "../sme/structure.mjs";

// ---- THE BRIEF IS ONE YAML RECORD (kogaki#1328, owner decision 2026-10-10) ----
//
// `theses/<slug>/brief.yaml` is the Brief, read through `parseBriefRecord`
// and the readers beside it; nothing reads it back from a rendering. Its
// shape is `brief_record` in `src/candidate-schema.json`, whose key set this
// file reads (`briefRecordKeys`). It carries no reader state (kogaki#1699).
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
    throw new Error(
      "src/candidate-schema.json declares no `brief_record.keys` — the Brief record's shape is declared there (kogaki#1328), and a reader with no declaration has no key set to refuse against",
    );
  }
  return b;
}
export function briefRecordDeclaration() {
  return candidateSchemaBlock();
}
// The record's top-level keys, in the order the file writes them, and the
// subset that is a slot awaiting composition at mint.
export function briefRecordKeys() {
  return Object.keys(candidateSchemaBlock().keys);
}
export function briefSlotKeys() {
  const keys = candidateSchemaBlock().keys;
  return Object.keys(keys).filter((k) => keys[k].filled_at === "adoption");
}

// A paragraph reader state's line form — one `dimension: value` line per dimension — to the
// ParagraphPlan record's five-key map, and back (the Leg's states are retired, kogaki#1699). The map is keyed by READER_STATE_DIMENSIONS
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
  return READER_STATE_DIMENSIONS.filter((d) => typeof map[d] === "string")
    .map((d) => `${d}: ${map[d]}`)
    .join("\n");
}

// One Leg as the record carries it: its fields in the schema's order (kogaki#1768: a Leg binds no Move, so no field
// written for a Leg Move's binding is carried). A Leg of a Brief composed from a structure carries its `relation` and
// `text` (kogaki#1775).
export function legRecord(s) {
  const out = { leg_id: s.leg_id };
  if (typeof s.relation === "string") out.relation = s.relation;
  if (typeof s.text === "string") out.text = s.text;
  out.claims = (s.claims || []).map((g) => ({ strand: g.strand, proposition: g.proposition }));
  if (s.opens_section !== undefined) out.opens_section = s.opens_section;
  if (s.reaches_target === true) out.reaches_target = true;
  return out;
}

// A BRIEF STORED BEFORE THE ONE LIST, READ AS ONE (kogaki#1937): its `structure` read by `asOneList`, and each Leg's
// `relation` renamed with it. Returns `{ record, renamed }`, `renamed` the ids `oneListIds` gives — empty, and the
// record as it is, for a Brief in one list. The record in hand is not changed.
export function briefAsOneList(record) {
  const renamed = oneListIds(record && record.structure);
  if (!renamed.size) return { record, renamed };
  const relation = (l) =>
    l && typeof l === "object" && renamed.has(l.relation) ? { ...l, relation: renamed.get(l.relation) } : l;
  return {
    record: {
      ...record,
      structure: asOneList(record.structure),
      ...(Array.isArray(record.reader_path) ? { reader_path: record.reader_path.map(relation) } : {}),
    },
    renamed,
  };
}

// The record's Legs back to the in-memory shape every reader of a Leg reads (kogaki#1775).
export function briefLegs(record) {
  const path = Array.isArray(record?.reader_path) ? record.reader_path : [];
  return path.map((r) => ({
    ...r,
    claims: Array.isArray(r.claims) ? r.claims : [],
  }));
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
// One YAML record: `version` "2", `brief` (the Brief's path and content hash), and `legs`, one per Leg in order
// (kogaki#1865, kogaki#1876). Each Leg entry carries `leg_id` and, where a Move was fitted, the Leg's Segments
// (`segments`, each `bind`, the number of the Leg's sentence given to it or null, and `edges`). A person may change
// a Leg's `segments`, and /draft reads what stands there.

const PLAN_HEADER = [
  "The paragraph plan for one article. Under every Leg of the Brief named below: the Leg's Segments -- for each,",
  "the number of the Leg's sentence bound to it or null, and its Edges. A Leg given no Segments carries its id alone.",
  "/paragraph-plan writes it from the Brief; /draft reads it beside the Brief and refuses it when the Brief has",
  "changed since.",
].join(" ");

export const oneLine = (s) =>
  String(s)
    .replace(/\s*\n\s*/g, " ")
    .trim();

// `legs[i]` is `{ leg_id, segments? }`, as `/paragraph-plan` hands it at the end of a job.
export function paragraphPlanRecord({ briefPath, briefText, legs }) {
  return {
    version: "2",
    brief: { path: relFromRepo(resolve(briefPath)), sha256: sha256(briefText) },
    legs: legs.map((l) => ({
      leg_id: l.leg_id,
      ...(Array.isArray(l.segments)
        ? {
            segments: l.segments.map((g) => ({
              bind: g.bind,
              edges: (g.edges || []).map((e) => ({ ...e, to: [...e.to] })),
            })),
          }
        : {}),
    })),
  };
}

export function paragraphPlanRecordText(record) {
  return stringifyYaml(record, { width: 120, header: PLAN_HEADER });
}

const PLAN_KEYS = ["version", "brief", "legs"];
const PLAN_BRIEF_KEYS = ["path", "sha256"];
export const PLAN_LEG_KEYS = ["leg_id", "segments"];
// THE KEYS THAT LEFT THE RECORD (kogaki#1865): a file carrying one was written before the stage chose a Move by its
// Edges, and is refused naming the key.
export const LEFT_PLAN_KEYS = Object.freeze(["paragraphs", "move_forced_by", "analogy", "mapping"]);
export function undeclaredKey(obj, allowed) {
  return Object.keys(obj).find((k) => !allowed.includes(k));
}

// THE READ /draft MAKES (kogaki#1375, kogaki#1865). `briefPath` and `briefText` are the Brief /draft was handed,
// `legs` its parsed Legs. Returns `{ path, record, segments }` -- `segments` a Map from leg_id to the Leg's Segments as
// the file carries them, none for a Leg no Move fitted -- or `{ error }`, naming both files where the two disagree.
// OPENS NO MOVE FILE AND NO LIBRARY: the plan carries the Segments it was fitted with, and /draft reads what stands.
export function readParagraphPlanBeside(briefPath, briefText, legs) {
  const path = paragraphPlanPathFor(briefPath);
  const rel = relFromRepo(path);
  const briefRel = relFromRepo(resolve(briefPath));
  if (!existsSync(path)) {
    return {
      error:
        `the Brief at ${briefRel} has no ParagraphPlan file beside it (${rel}) — /draft renders each Leg ` +
        `from that file, and /paragraph-plan writes it from the adopted Brief: run ` +
        `\`node src/paragraph-plan.mjs start --brief ${briefRel}\` first (kogaki#1375)`,
    };
  }
  let record;
  try {
    record = parseYaml(readFileSync(path, "utf8"), rel);
  } catch (e) {
    return { error: `the ParagraphPlan file ${rel} is not a YAML record this reader can read: ${e.message}` };
  }
  const r = paragraphPlanShapeRefusal(record, rel, legs);
  if (r) return { error: r };
  const want = sha256(briefText);
  if (record.brief.sha256 !== want) {
    return {
      error:
        `the ParagraphPlan file ${rel} was made from a different Brief: it names ${record.brief.path} at ` +
        `sha256 ${record.brief.sha256}, and the Brief at ${briefRel} is sha256 ${want} — the Brief has changed since ` +
        `the plan was made, so run /paragraph-plan on this Brief again (kogaki#1375)`,
    };
  }
  const segments = new Map(record.legs.map((l) => [l.leg_id, l.segments || null]));
  return { path, record, segments };
}

// The record's shape against the Brief's Legs (kogaki#1865, kogaki#1876): every key declared, one entry per Leg in
// order, each carrying `leg_id` and at most `segments`. A key that left the record is refused naming it. Returns a
// string to refuse with, or null.
const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const AGAIN = "run /paragraph-plan on this Brief again";
export function paragraphPlanShapeRefusal(record, rel, legs) {
  if (!isMap(record)) return `the ParagraphPlan file ${rel} is not a YAML map`;
  const left = LEFT_PLAN_KEYS.find((k) => Object.hasOwn(record, k));
  if (left)
    return `the ParagraphPlan file ${rel} carries \`${left}\`, which left the record when the stage came to choose a Move by its Edges (kogaki#1865) — ${AGAIN}`;
  const k0 = undeclaredKey(record, PLAN_KEYS);
  if (k0)
    return `the ParagraphPlan file ${rel} carries \`${k0}\`, which a ParagraphPlan record does not declare (kogaki#1375)`;
  if (String(record.version) !== "2")
    return `the ParagraphPlan file ${rel} carries version ${JSON.stringify(record.version)}, not "2" — ${AGAIN}`;
  const b = record.brief;
  if (!isMap(b) || typeof b.path !== "string" || typeof b.sha256 !== "string") {
    return `the ParagraphPlan file ${rel} names no Brief — \`brief\` carries the \`path\` and the \`sha256\` of the Brief it was made from`;
  }
  const kb = undeclaredKey(b, PLAN_BRIEF_KEYS);
  if (kb) return `the ParagraphPlan file ${rel} carries \`brief.${kb}\`, which a ParagraphPlan record does not declare`;
  if (
    !Array.isArray(record.legs) ||
    record.legs.length !== legs.length ||
    record.legs.some((l, i) => !l || l.leg_id !== legs[i].leg_id)
  ) {
    return (
      `the ParagraphPlan file ${rel} carries the Legs ${JSON.stringify((record.legs || []).map((l) => l && l.leg_id))}, ` +
      `and the Brief's Reader Path is ${JSON.stringify(legs.map((l) => l.leg_id))} — one entry per Leg, in order`
    );
  }
  for (const [i, l] of record.legs.entries()) {
    const at = `the ParagraphPlan file ${rel}, leg ${legs[i].leg_id}`;
    const bad = planLegRefusal(l, at);
    if (bad) return bad;
  }
  return null;
}

// The kinds of Hypophora an Edge may carry, the keys of `hypophora` in src/sme/senses.json (kogaki#1950).
export const HYPOPHORA_KINDS = Object.freeze(["answer", "question"]);

// The number of the first Segment with nothing bound that stands at neither end of an Edge (kogaki#1902), or 0.
export function looseSegment(segments) {
  const pointed = new Set(segments.flatMap((s) => (Array.isArray(s.edges) ? s.edges : []).flatMap((e) => e.to)));
  const i = segments.findIndex((s, k) => s.bind === null && !s.edges.length && !pointed.has(k + 1));
  return i + 1;
}

// ONE LEG ENTRY: a string to refuse with, or null.
function planLegRefusal(l, at) {
  const left = LEFT_PLAN_KEYS.find((k) => Object.hasOwn(l, k));
  if (left)
    return `${at} carries \`${left}\`, which left the record when the stage came to choose a Move by its Edges (kogaki#1865) — ${AGAIN}`;
  const kl = undeclaredKey(l, PLAN_LEG_KEYS);
  if (kl) return `${at} carries \`${kl}\`, which a ParagraphPlan record does not declare`;
  if (!Object.hasOwn(l, "segments")) return null;
  if (!Array.isArray(l.segments) || !l.segments.length) return `${at}'s \`segments\` is not a list of Segments`;
  for (const [k, g] of l.segments.entries()) {
    const atS = `${at}, Segment ${k + 1}`;
    if (!isMap(g) || undeclaredKey(g, ["bind", "edges"])) return `${atS} is not \`{ bind, edges }\``;
    if (g.bind !== null && !(Number.isInteger(g.bind) && g.bind >= 1))
      return `${atS}'s \`bind\` is not a sentence number or null`;
    if (!Array.isArray(g.edges)) return `${atS}'s \`edges\` is not a list`;
    for (const [j, e] of g.edges.entries()) {
      const atE = `${atS}, Edge ${j + 1}`;
      if (!isMap(e) || undeclaredKey(e, ["sense", "to", "hypophora"])) return `${atE} is not \`{ sense, to }\``;
      if (e.sense !== null && (typeof e.sense !== "string" || !e.sense.trim()))
        return `${atE}'s \`sense\` is not a Sense or null`;
      if (Object.hasOwn(e, "hypophora") && !HYPOPHORA_KINDS.includes(e.hypophora))
        return `${atE}'s \`hypophora\` is ${JSON.stringify(e.hypophora)} — it is one of ${HYPOPHORA_KINDS.map((k) => `\`${k}\``).join(", ")} (kogaki#1950); a plan written before that carries \`true\`, and /paragraph-plan writes it again`;
      if (
        !Array.isArray(e.to) ||
        !e.to.length ||
        e.to.some((t) => !Number.isInteger(t) || t < 1 || t > l.segments.length)
      )
        return `${atE}'s \`to\` does not name Segments of this Leg`;
    }
  }
  const loose = looseSegment(l.segments);
  if (loose)
    return `${at}, Segment ${loose} has no \`bind\`, carries no Edge and no Edge points to it — every Segment has a sentence bound or stands at one end of an Edge`;
  return null;
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
    .filter((s) => typeof s.journey_cite === "string" && s.journey_cite !== "")
    .map((s) => s.id);
}

// The record's text: its keys in the declared order, a caption above each
// as a comment for the owner who reads the file, every line within
// RECORD_WIDTH. A comment is never read back.
export function briefRecordText(record) {
  const decl = candidateSchemaBlock();
  const ordered = {};
  for (const k of Object.keys(decl.keys)) if (k in record) ordered[k] = record[k];
  for (const k of Object.keys(record)) if (!(k in ordered)) ordered[k] = record[k];
  const comments = new Map(
    Object.entries(decl.keys)
      .filter(([, d]) => typeof d.caption === "string")
      .map(([k, d]) => [k, d.caption]),
  );
  return stringifyYaml(ordered, { width: RECORD_WIDTH, comments, header: decl.header });
}

// A key the Brief record carried once and carries no longer, refused by name
// with the key that replaced it.
const RETIRED_LEDGER =
  "the Obligations ledger is retired (kogaki#1699): what a Leg takes up and leaves is its Move's `takes` and `leaves`, judged across the path, and the record carries no field for it.";
const RETIRED_RECORD_KEYS = Object.freeze({
  closure: RETIRED_LEDGER,
  obligations: RETIRED_LEDGER,
  discharges: RETIRED_LEDGER,
  reader_start:
    "Reader start is retired as a record field (kogaki#1699): the Reader start heading renders the Persona's prior-knowledge line.",
  reader_target:
    "Reader target is retired as a record field (kogaki#1699): the Reader target heading renders the Thesis, which the Leg marked `reaches_target` attains.",
});

// The record read from its text, or a refusal naming what is wrong. A key the
// declaration does not name is refused rather than read, and a required key
// absent is refused by name; a slot key present as `null` is a slot awaiting
// composition, which is a template rather than a malformed record, and the
// caller decides what that costs.
export function parseBriefRecord(text, path = "<brief>") {
  let record;
  try {
    record = parseYaml(text, path);
  } catch (e) {
    return { error: `the Brief at ${path} is not a YAML record this reader can read: ${e.message}` };
  }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return {
      error: `the Brief at ${path} is not a YAML map — the Brief record is one map of named keys (kogaki#1328)`,
    };
  }
  const decl = candidateSchemaBlock().keys;
  for (const k of Object.keys(record)) {
    if (Object.prototype.hasOwnProperty.call(RETIRED_RECORD_KEYS, k)) {
      return { error: `the Brief at ${path} carries \`${k}\` — ${RETIRED_RECORD_KEYS[k]}` };
    }
    if (!Object.prototype.hasOwnProperty.call(decl, k)) {
      return {
        error:
          `the Brief at ${path} carries the key \`${k}\`, which the Brief record does not declare ` +
          `(src/candidate-schema.json, \`brief_record\`) — a key nobody reads is refused rather than carried`,
      };
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
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    return { error: `the Brief at ${path} cannot be read (${e.message})` };
  }
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
    return {
      error:
        `the Brief's \`${key}\` is already filled — composition resumes by judgment, not by overwrite, ` +
        "or this is not a minted Brief (the durable home and the entry point)",
    };
  }
  return { record: { ...record, [key]: value } };
}

// THE THESIS ROW OF CLOSURE IS DERIVED (kogaki#1328). It was the Candidate's
// free-text `reasoning.thesis_closure`, written into the Brief whole — one
// line of 1934 characters in the 2026-10-09 Brief, carrying what the Strand
// coverage already carried per Strand. It is now rendered from that coverage
// — each placed Strand's `role_in_thesis` — and handed to the one Leg marked
// `reaches_target`, the Leg that attains the Thesis. Null where
// the record carries no such Leg or no stated role.
export function thesisClosureRow(record) {
  const roles = (Array.isArray(record?.strand_coverage) ? record.strand_coverage : [])
    .filter((c) => typeof c.role_in_thesis === "string" && c.role_in_thesis.trim() !== "")
    .map((c) => c.role_in_thesis.trim());
  if (!roles.length || typeof record.thesis !== "string") return null;
  return (
    `The Thesis — ${record.thesis.trim()} — is established by the end of this Leg, with each piece of ` +
    `the material doing its part: ${roles.join(" ")}`
  );
}
export function thesisClosureLeg(record) {
  const marked = (Array.isArray(record?.reader_path) ? record.reader_path : []).filter(
    (s) => s.reaches_target === true,
  );
  return marked.length === 1 ? marked[0].leg_id : null;
}

// The placement count, taken AFTER composition and COUNTED IN PLACEMENTS
// (the read-not-invented rule's completeness rider): a placement is a leg whose claims
// carry the Strand. Derived from the composed legs themselves, never from
// a declaration — a composer that cannot omit in principle can still omit
// in fact, and a declared cover would hide exactly that.
export function placements(legs, strandIds) {
  const used = new Map(strandIds.map((id) => [id, []]));
  for (const s of legs) {
    for (const g of s.claims || []) {
      if (used.has(g.strand) && !used.get(g.strand).includes(s.leg_id)) used.get(g.strand).push(s.leg_id);
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
