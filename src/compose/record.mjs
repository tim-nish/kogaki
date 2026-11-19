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
import { settingValue } from "../workflow/judge.mjs";
import { READER_STATE_DIMENSIONS, readerStateDimensionLine, waypointsRefusal } from "./leg-schema.mjs";
import { parseReactivateEntry } from "./sections.mjs";

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
// `text` and no `waypoints` (kogaki#1775); a Leg that predates it keeps its waypoints, each `point` and `case`.
export function legRecord(s) {
  const out = { leg_id: s.leg_id };
  if (typeof s.relation === "string") out.relation = s.relation;
  if (typeof s.text === "string") out.text = s.text;
  out.claims = (s.claims || []).map((g) => ({ strand: g.strand, proposition: g.proposition }));
  if (Array.isArray(s.waypoints)) {
    out.waypoints = s.waypoints.map((w) => ({
      point: String(w.point)
        .replace(/\s*\n\s*/g, " ")
        .trim(),
      case: w.case,
    }));
  }
  if (s.opens_section !== undefined) out.opens_section = s.opens_section;
  if (s.reaches_target === true) out.reaches_target = true;
  return out;
}

// The record's Legs back to the in-memory shape every reader of a Leg reads. A Leg carrying `text` is read as it stands
// (kogaki#1775); a Leg that predates it is read with an empty `waypoints` where it carries none.
export function briefLegs(record) {
  const path = Array.isArray(record?.reader_path) ? record.reader_path : [];
  return path.map((r) => ({
    ...r,
    claims: Array.isArray(r.claims) ? r.claims : [],
    ...(typeof r.text === "string" ? {} : { waypoints: Array.isArray(r.waypoints) ? r.waypoints : [] }),
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
// (kogaki#1865, owner decision 2026-11-19). Each Leg entry carries the Move taken for the Leg (`move`), the two
// numbers of its fit (`fit`: `met` and `compared`), the Move's Segments fitted to the Leg (`segments`, each `bind`,
// the number of the Leg's sentence given to it or null, and `edges`, copied from the Move file) and, where the Points
// call's answer was not refused, `points`. Nothing ties the plan to the Move after it is written: a person may change
// a Leg's `segments`, and /draft reads what stands there.

const PLAN_HEADER = [
  "The paragraph plan for one article. Under every Leg of the Brief named below: the Move taken for the Leg,",
  "how well the Leg met its Edges (`fit`), the Move's Segments fitted to the Leg -- for each, the number of the",
  "Leg's sentence bound to it or null, and its Edges -- and the Points written for them, which are debugging",
  "information and reach no Writer. A Leg no Move fitted carries no Move and no Segments.",
  "/paragraph-plan writes it from the Brief; /draft reads it beside the Brief and refuses it when the Brief has",
  "changed since.",
].join(" ");

export const oneLine = (s) =>
  String(s)
    .replace(/\s*\n\s*/g, " ")
    .trim();

// `legs[i]` is `{ leg_id, move?, fit?, segments?, points? }`, as `/paragraph-plan`'s Leg steps wrote it.
export function paragraphPlanRecord({ briefPath, briefText, legs }) {
  return {
    version: "2",
    brief: { path: relFromRepo(resolve(briefPath)), sha256: sha256(briefText) },
    legs: legs.map((l) => ({
      leg_id: l.leg_id,
      ...(l.move ? { move: l.move, fit: { met: l.fit.met, compared: l.fit.compared } } : {}),
      ...(Array.isArray(l.segments)
        ? {
            segments: l.segments.map((g) => ({
              bind: g.bind,
              edges: (g.edges || []).map((e) => ({ ...e, to: [...e.to] })),
            })),
          }
        : {}),
      ...(Array.isArray(l.points)
        ? { points: l.points.map((p) => ({ segment: p.segment, point: oneLine(p.point) })) }
        : {}),
    })),
  };
}

export function paragraphPlanRecordText(record) {
  return stringifyYaml(record, { width: 120, header: PLAN_HEADER });
}

const PLAN_KEYS = ["version", "brief", "legs"];
const PLAN_BRIEF_KEYS = ["path", "sha256"];
export const PLAN_LEG_KEYS = ["leg_id", "move", "fit", "segments", "points"];
// THE KEYS THAT LEFT THE RECORD (kogaki#1865): a file carrying one was written before the stage chose a Move by its
// Edges, and is refused naming the key.
export const LEFT_PLAN_KEYS = Object.freeze(["paragraphs", "move_forced_by", "analogy", "mapping"]);
// THE PARAGRAPH'S SCHEMA (kogaki#1639): the Leg schema minus `opens_section`, `reaches_target`,
// `names`, `figure`, `figure_roles` and `bridges`, which have no paragraph counterpart, and minus
// `move`, which the Leg binds once for all its paragraphs (kogaki#1777).
export const PLAN_SCHEMA_KEYS = ["materials", "purpose", "depends_on", "rationale", "re-activate"];
// THE BOUND ON A LEG'S PARAGRAPHS (kogaki#1777): `brief.paragraphs_per_leg` in kogaki.settings.json.
export const PARAGRAPHS_PER_LEG_SETTING = "brief.paragraphs_per_leg";
export function paragraphsPerLeg() {
  const n = Number(settingValue({ setting: PARAGRAPHS_PER_LEG_SETTING }));
  if (!Number.isInteger(n) || n <= 0)
    throw new Error(`kogaki.settings.json's \`${PARAGRAPHS_PER_LEG_SETTING}\` is not a positive integer (kogaki#1777)`);
  return n;
}
// A Leg's paragraph count against the bound; null where it holds.
export function paragraphCountRefusal(count, bound, at) {
  if (count < 1) return `${at} carries no paragraph — a Leg's bound Move shapes at least one paragraph (kogaki#1777)`;
  return count > bound
    ? `${at} carries ${count} paragraphs, over the bound of ${bound} a Leg takes (\`${PARAGRAPHS_PER_LEG_SETTING}\`, kogaki#1777)`
    : null;
}
// THE RETIRED PLAN KEYS (kogaki#1701): a paragraph carries no reader state and no Obligations
// ledger, and a Leg entry or a paragraph entry carrying one is refused naming the key.
const RETIRED_PLAN_REASON =
  "retired from the ParagraphPlan (kogaki#1701): what a paragraph takes up and leaves is its " +
  "bound Move's `takes` and `leaves`, and the record carries no reader state and no Obligations ledger";
// `journeys` (kogaki#1818): src/leg-schema.json declares no `journey` since kogaki#1768.
const RETIRED_JOURNEYS_REASON =
  "a key src/leg-schema.json no longer declares (kogaki#1768, kogaki#1818): a Leg draws on no Journey, so no paragraph places one";
// `introduces` (kogaki#1841): a Leg introduces no term since kogaki#1768.
const RETIRED_INTRODUCES_REASON =
  "retired from the ParagraphPlan (kogaki#1768, kogaki#1841): a Leg introduces no term, so no paragraph introduces one; plan the Leg again";
export const RETIRED_PLAN_KEYS = Object.freeze([
  "reader_state_before",
  "reader_state_after",
  "obligations",
  "discharges",
  "journeys",
  "introduces",
]);
const RETIRED_KEY_REASONS = { journeys: RETIRED_JOURNEYS_REASON, introduces: RETIRED_INTRODUCES_REASON };
export function retiredPlanKeyRefusal(obj, at) {
  const k =
    obj && typeof obj === "object" && !Array.isArray(obj)
      ? RETIRED_PLAN_KEYS.find((x) => Object.hasOwn(obj, x))
      : undefined;
  if (k === undefined) return null;
  return `${at} carries \`${k}\`, ${RETIRED_KEY_REASONS[k] ?? RETIRED_PLAN_REASON}`;
}
const PARAGRAPH_WAYPOINT_KEYS = ["point", "cast"];

export function undeclaredKey(obj, allowed) {
  return Object.keys(obj).find((k) => !allowed.includes(k));
}

// The Strand ids a Leg's Claims name, in order: what a paragraph of the Leg may stand on.
export const legStrandIds = (leg) => (Array.isArray(leg && leg.claims) ? leg.claims : []).map((g) => String(g.strand));

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

// ONE PARAGRAPH'S SCHEMA, by the Leg schema's own rules at the paragraph scale (kogaki#1639).
// `w` is the entry, `j` its 0-based place in the Leg, `leg` the Brief's Leg (its `claims`)
// and `entries` the Leg's paragraphs so far. The Move is the Leg's,
// bound once for every paragraph (kogaki#1777), so a paragraph names none. Shared by the plan
// reader and the plan call's validator, so the record the stage writes is the record every read
// refuses alike. Returns a string to refuse with, or null.
export function paragraphSchemaRefusal(w, j, leg, entries, at) {
  const strands = legStrandIds(leg);
  const n = j + 1;
  const retired = retiredPlanKeyRefusal(w, at);
  if (retired) return retired;
  if (Object.hasOwn(w, "move")) {
    return `${at} carries \`move\` — the Leg binds one Move for all its paragraphs, named on the Leg, and a paragraph names none (kogaki#1777)`;
  }
  if (!Array.isArray(w.materials) || !w.materials.length || w.materials.some((m) => typeof m !== "string")) {
    return `${at} carries no \`materials\` — the Strand ids the paragraph stands on, from its Leg's Claims (kogaki#1639)`;
  }
  const outside = w.materials.find((m) => !strands.includes(m));
  if (outside !== undefined) {
    return `${at} names ${JSON.stringify(outside)} in \`materials\`, which no Claim of its Leg names — a paragraph stands on its Leg's Claims (${strands.join(", ")}) (kogaki#1639)`;
  }
  if (typeof w.purpose !== "string" || w.purpose.trim() === "") {
    return `${at} carries no \`purpose\` — what the paragraph does to the reader, a verb about the reader (kogaki#1639)`;
  }
  if (!Array.isArray(w.depends_on))
    return `${at} carries no \`depends_on\` — the earlier paragraphs of this Leg it stands on, by paragraph number; may be empty (kogaki#1639)`;
  for (const d of w.depends_on) {
    if (!Number.isInteger(d) || d < 1 || d >= n) {
      return (
        `${at} depends on ${JSON.stringify(d)} — a paragraph depends only on an earlier paragraph of the same Leg, by paragraph number ` +
        `(${n === 1 ? "none before this one" : `1 to ${n - 1}`}), never on itself, a later paragraph or another Leg (kogaki#1639)`
      );
    }
  }
  if (typeof w.rationale !== "string" || w.rationale.trim() === "") {
    return `${at} carries no \`rationale\` — why this paragraph comes here rather than earlier or later (kogaki#1639)`;
  }
  if (!Array.isArray(w["re-activate"]))
    return `${at} carries no \`re-activate\` — \`<paragraph> claim <Strand id> as <one plain sentence>\` lines; may be empty (kogaki#1639)`;
  for (const raw of w["re-activate"]) {
    if (typeof raw !== "string")
      return `${at} re-activates a non-string entry — each is one line, \`<paragraph> claim <Strand id> as <one plain sentence>\` (kogaki#1639)`;
    const e = parseReactivateEntry(raw);
    if (e.error || e.kind !== "claim") {
      return `${at} re-activates ${JSON.stringify(raw.trim())} — a paragraph's re-activate line is \`<paragraph> claim <Strand id> as <one plain sentence>\`, a paragraph number of this Leg in place of a Leg id; no paragraph introduces a term to re-activate (kogaki#1639, kogaki#1841)`;
    }
    const ref = /^\d+$/.test(e.leg_id) ? Number(e.leg_id) : NaN;
    if (!Number.isInteger(ref) || ref < 1 || ref >= n) {
      return (
        `${at} re-activates ${JSON.stringify(raw.trim())} — it names ${JSON.stringify(e.leg_id)}, and a paragraph re-activates only from an earlier paragraph of the same Leg ` +
        `(${n === 1 ? "none before this one" : `1 to ${n - 1}`}), never itself, a later paragraph or another Leg (kogaki#1639)`
      );
    }
    const source = entries[ref - 1] || {};
    if (!(Array.isArray(source.materials) ? source.materials : []).includes(e.value)) {
      return `${at} re-activates ${JSON.stringify(raw.trim())}, but paragraph ${ref} does not stand on ${JSON.stringify(e.value)} — a re-activated claim names a Strand that paragraph's \`materials\` carries (kogaki#1639)`;
    }
  }
  return null;
}

// The record's shape against the Brief's Legs (kogaki#1865): every key declared, one entry per Leg in order, each
// carrying `move`, `fit` and `segments` together or none of them, and `points` only beside them. A key that left the
// record is refused naming it. Returns a string to refuse with, or null.
const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const count = (v) => Number.isInteger(v) && v >= 0;
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

// ONE LEG ENTRY: a string to refuse with, or null.
function planLegRefusal(l, at) {
  const left = LEFT_PLAN_KEYS.find((k) => Object.hasOwn(l, k));
  if (left)
    return `${at} carries \`${left}\`, which left the record when the stage came to choose a Move by its Edges (kogaki#1865) — ${AGAIN}`;
  const retired = retiredPlanKeyRefusal(l, at);
  if (retired) return retired;
  const kl = undeclaredKey(l, PLAN_LEG_KEYS);
  if (kl) return `${at} carries \`${kl}\`, which a ParagraphPlan record does not declare`;
  const fitted = ["move", "fit", "segments"].filter((k) => Object.hasOwn(l, k));
  if (!fitted.length)
    return Object.hasOwn(l, "points") ? `${at} carries \`points\` and no Move — Points are written under a Move` : null;
  if (fitted.length < 3)
    return `${at} carries ${fitted.map((k) => `\`${k}\``).join(" and ")} alone — a Leg a Move fitted carries \`move\`, \`fit\` and \`segments\` together`;
  if (typeof l.move !== "string" || l.move.trim() === "") return `${at}'s \`move\` is not a Move's id`;
  if (!isMap(l.fit) || undeclaredKey(l.fit, ["met", "compared"]) || !count(l.fit.met) || !count(l.fit.compared))
    return `${at}'s \`fit\` is not \`{ met, compared }\`, two counts`;
  if (l.fit.met > l.fit.compared) return `${at}'s \`fit\` meets more Edges than it compares`;
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
      if (
        !Array.isArray(e.to) ||
        !e.to.length ||
        e.to.some((t) => !Number.isInteger(t) || t < 1 || t > l.segments.length)
      )
        return `${atE}'s \`to\` does not name Segments of this Leg`;
    }
  }
  if (!Object.hasOwn(l, "points")) return null;
  if (!Array.isArray(l.points) || l.points.length !== l.segments.length)
    return `${at}'s \`points\` is not one entry per Segment`;
  const p = l.points.findIndex(
    (x, k) => !isMap(x) || undeclaredKey(x, ["segment", "point"]) || x.segment !== k + 1 || typeof x.point !== "string",
  );
  return p < 0 ? null : `${at}'s \`points\` entry ${p + 1} is not \`{ segment, point }\` in order`;
}

// THE JOIN IS A TYPED RELATION (kogaki#1477, owner decision 2026-10-20). Every paragraph of a
// Leg after the first carries one `join`, ONE WORD of this closed set naming how its paragraph's
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

// THE CAST IS A CLOSED MAP (kogaki#1695). The definitions are the ones the planner's row and the
// Packet template render, so the checks read them from here.
export const CAST_KEYS = {
  terse: "one short statement given at once, taking no elaboration after it",
  plain: "laid down without support, ground or qualification",
  hedged: "offered as a guess or forecast rather than asserted",
  chained: "a run of parallel items or alternatives inside one sentence",
  asked: "put as a question that takes no lead-in",
  voiced: "spoken in a named voice, the first person, an invitation, or words reported as another's",
  instanced: "one recognisable instance named and left without comment",
  dated: "each instance placed in time",
  figured: "asserted as a likeness or a figurative identification",
};
const CAST_SET = Object.keys(CAST_KEYS).join(", ");

// ONE WAYPOINT'S CAST (kogaki#1695). `null` where it passes.
export function castRefusal(p, at) {
  const has = Object.hasOwn(p, "cast");
  if (!has)
    return `${at} carries no \`cast\` — every Waypoint carries one, \`{}\` where its Segment sets no key of ${CAST_SET} (kogaki#1695)`;
  const c = p.cast;
  if (!c || typeof c !== "object" || Array.isArray(c))
    return `${at} carries a \`cast\` that is not a map of ${CAST_SET} to booleans (kogaki#1695)`;
  for (const [k, v] of Object.entries(c)) {
    if (!Object.hasOwn(CAST_KEYS, k))
      return `${at} carries the cast key \`${k}\`, which is outside the set ${CAST_SET} (kogaki#1695)`;
    if (typeof v !== "boolean")
      return `${at} carries the cast key \`${k}\` with ${JSON.stringify(v)}, not a boolean (kogaki#1695)`;
  }
  return null;
}

// THE JOIN, BY ITS PLACE IN THE LEG (kogaki#1411) AND ITS SET (kogaki#1477). `j` is the
// paragraph's 0-based place. Shared by the plan reader and the plan call's validator, so the
// file the stage writes is the file /draft reads.
export function joinRefusal(w, j, at) {
  const has = Object.hasOwn(w, "join");
  if (j === 0) {
    return has
      ? `${at} carries \`join\` — the first paragraph of a Leg carries no join: the connection between Legs ` +
          "is the Brief's, admitted by `introduces` and `re-activate` (kogaki#1282), and the join is only for a paragraph " +
          "after the first within a Leg (kogaki#1411)"
      : null;
  }
  if (!has) {
    return (
      `${at} carries no \`join\` — every paragraph of a Leg after the first carries one word of ${JOIN_SET}, naming how ` +
      "this paragraph's first point stands to the paragraph before it (kogaki#1411, kogaki#1477)"
    );
  }
  if (typeof w.join !== "string" || w.join.trim() === "") {
    return `${at} carries an empty \`join\` — a join is one word of ${JOIN_SET} (kogaki#1411, kogaki#1477)`;
  }
  if (!Object.hasOwn(JOIN_TYPES, w.join)) {
    const what = /\s/.test(w.join.trim())
      ? "a sentence"
      : `the word ${JSON.stringify(w.join)}, which is outside the set`;
    return (
      `${at} carries ${what} for \`join\` — a join is one word of ${JOIN_SET}, never prose the Writer would ` +
      "paraphrase (kogaki#1477)"
    );
  }
  return null;
}

// ONE PARAGRAPH'S WAYPOINTS, by the Waypoints' own rule and with `point` and `cast` as their
// only keys. A Waypoint carrying `performs` is refused by name (kogaki#1864).
export function paragraphWaypointsRefusal(pws, at) {
  if (Array.isArray(pws)) {
    for (const [i, p] of pws.entries()) {
      if (p && typeof p === "object" && !Array.isArray(p)) {
        if (Object.hasOwn(p, "performs")) {
          return (
            `${at}: Waypoint ${i + 1} carries \`performs\` — a Waypoint carries \`point\` and \`cast\`, ` +
            "and the `performs` form left the ParagraphPlan (kogaki#1864)"
          );
        }
        const badCast = castRefusal(p, `${at}: Waypoint ${i + 1}`);
        if (badCast) return badCast;
        const k = undeclaredKey(p, PARAGRAPH_WAYPOINT_KEYS);
        if (k) {
          return (
            `${at}: Waypoint ${i + 1} carries \`${k}\` — a Waypoint carries \`point\` and \`cast\`, ` +
            "and nothing of a Move reaches past Waypoint generation (kogaki#1375)"
          );
        }
      }
    }
  }
  return waypointsRefusal(pws, `${at}'s Waypoints`, null, null, { paragraph: true });
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
