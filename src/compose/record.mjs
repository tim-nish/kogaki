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
import { parseIntroducesEntry, parseReactivateEntry } from "./sections.mjs";
import { mappingShapeRefusal, mappingRecordRefusal } from "./mapping-record.mjs";

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
// `text` and no `waypoints` (kogaki#1775); a Leg that predates it keeps its waypoints, each `point`, `serves` and `case`.
export function legRecord(s) {
  const out = { leg_id: s.leg_id };
  if (typeof s.relation === "string") out.relation = s.relation;
  if (typeof s.text === "string") out.text = s.text;
  out.claims = (s.claims || []).map((g) => ({ strand: g.strand, proposition: g.proposition }));
  if (Array.isArray(s.waypoints)) {
    out.waypoints = s.waypoints.map((w) => ({
      serves: [...w.serves],
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
// One YAML record: `version`, `brief` (the Brief's path and content hash), and `legs`, one
// per Leg in order. THE LEG IS THE UNIT (kogaki#1777, owner decision 2026-11-10): each Leg
// entry carries the one Move bound to the Leg (`move`, an id and nothing else of the Move)
// and its `paragraphs`, at most `brief.paragraphs_per_leg`. Each paragraph carries the Leg
// schema at the paragraph scale -- `materials`, `purpose`, `depends_on`, `rationale`,
// `introduces`, `re-activate` -- beside its `join` and its Waypoints
// (`point` and `serves`, or `performs` alone, kogaki#1448), one per Segment of the Leg's
// Move. It carries no reader state and no Obligations ledger (kogaki#1701): what a Leg takes
// up and leaves is its bound Move's `takes` and `leaves`.

const PLAN_HEADER = [
  "The paragraph plan for one article: the paragraph-level Reader Path. Under every Leg of the Brief named below,",
  "the one Move bound to the Leg (its id and nothing else of the Move) and the Leg's paragraphs: for each, the",
  "Strands it stands on, what it does to the reader, the earlier paragraphs it stands on, why it comes here, the",
  "terms it introduces, what it re-activates, and its Waypoints -- the points the paragraph makes, in order, each",
  "with the Claims it serves, one per Segment of the bound Move. What a Leg takes up and leaves is its bound Move's",
  "`takes` and `leaves`, never written here. Above the Legs, the one base domain every analogy in the article draws",
  "from, with a counterpart for each Role and relation, or none and why.",
  "/paragraph-plan writes it from the Brief; /draft reads it beside the Brief and refuses it when the Brief has",
  "changed since.",
].join(" ");

// `legs[i]` is `{ leg_id, move, move_forced_by?, paragraphs }`, each paragraph the entry the
// stage's validator passed: its schema fields, its `join` where it carries one (kogaki#1411) and
// its `paragraph_waypoints`.
export const oneLine = (s) =>
  String(s)
    .replace(/\s*\n\s*/g, " ")
    .trim();
const PLAN_INTRODUCES_KEYS = ["term", "meaning"];
// kogaki#1649: a judge-forced mark is a non-empty list of axis ids, written by the site loop and never by a planner.
const marked = (v) => Array.isArray(v) && v.length > 0;
const FORCED_MARK_KEYS = ["forced_by", "move_forced_by"];
function forcedMarkRefusal(v, at, key) {
  if (v === undefined) return null;
  return marked(v) && v.every((x) => typeof x === "string" && x.trim() !== "")
    ? null
    : `${at} carries \`${key}\` that is not a non-empty list of axis ids (kogaki#1649)`;
}
const unmarked = (o) =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.fromEntries(Object.entries(o).filter(([k]) => !FORCED_MARK_KEYS.includes(k)))
    : o;

// ONE PARAGRAPH AS THE FILE WRITES IT: its schema fields, its join and its Waypoints.
function paragraphRecord(e, n) {
  const strings = (v) => (Array.isArray(v) ? v.map((x) => oneLine(x)) : []);
  const schema = {};
  if (Array.isArray(e.materials)) schema.materials = e.materials.map(String);
  if (typeof e.purpose === "string") schema.purpose = oneLine(e.purpose);
  if (Array.isArray(e.depends_on)) schema.depends_on = [...e.depends_on];
  if (typeof e.rationale === "string") schema.rationale = oneLine(e.rationale);
  if (Array.isArray(e.introduces)) {
    schema.introduces = e.introduces.map((t) =>
      t && typeof t === "object"
        ? Object.fromEntries(
            PLAN_INTRODUCES_KEYS.filter((k) => typeof t[k] === "string").map((k) => [k, oneLine(t[k])]),
          )
        : t,
    );
  }
  if (Array.isArray(e["re-activate"])) schema["re-activate"] = strings(e["re-activate"]);
  return {
    paragraph: n,
    ...schema,
    ...(typeof e.join === "string" ? { join: oneLine(e.join) } : {}),
    paragraph_waypoints: (e.paragraph_waypoints || []).map((p) => ({
      ...(Object.hasOwn(p, "performs")
        ? { performs: oneLine(p.performs) }
        : {
            point: oneLine(p.point),
            serves: [...p.serves],
            ...(p.cast && typeof p.cast === "object" ? { cast: { ...p.cast } } : {}),
          }),
      ...(marked(p.forced_by) ? { forced_by: p.forced_by.map(String) } : {}),
    })),
  };
}

// `mapping`, where given, is the Mapping Record the plan names by path and digest (kogaki#1733).
// `analogy` is the run's Analogy Mapping, or `{ none }`, written before the Legs (kogaki#1778).
export function paragraphPlanRecord({ briefPath, briefText, legs, mapping = null, analogy = null }) {
  return {
    version: "1",
    brief: { path: relFromRepo(resolve(briefPath)), sha256: sha256(briefText) },
    ...(analogy ? { analogy } : {}),
    ...(mapping ? { mapping } : {}),
    legs: legs.map((l) => ({
      leg_id: l.leg_id,
      move: l.move,
      ...(marked(l.move_forced_by) ? { move_forced_by: l.move_forced_by.map(String) } : {}),
      paragraphs: (l.paragraphs || []).map((e, i) => paragraphRecord(e, i + 1)),
    })),
  };
}

export function paragraphPlanRecordText(record) {
  return stringifyYaml(record, { width: 120, header: PLAN_HEADER });
}

const PLAN_KEYS = ["version", "brief", "analogy", "mapping", "legs"];
const PLAN_BRIEF_KEYS = ["path", "sha256"];
const PLAN_LEG_KEYS = ["leg_id", "move", "move_forced_by", "paragraphs"];
// THE PARAGRAPH'S SCHEMA (kogaki#1639): the Leg schema minus `opens_section`, `reaches_target`,
// `names`, `figure`, `figure_roles` and `bridges`, which have no paragraph counterpart, and minus
// `move`, which the Leg binds once for all its paragraphs (kogaki#1777).
export const PLAN_SCHEMA_KEYS = ["materials", "purpose", "depends_on", "rationale", "introduces", "re-activate"];
const PLAN_PARAGRAPH_KEYS = ["paragraph", ...PLAN_SCHEMA_KEYS, "join", "paragraph_waypoints"];
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
export const RETIRED_PLAN_KEYS = Object.freeze([
  "reader_state_before",
  "reader_state_after",
  "obligations",
  "discharges",
  "journeys",
]);
export function retiredPlanKeyRefusal(obj, at) {
  const k =
    obj && typeof obj === "object" && !Array.isArray(obj)
      ? RETIRED_PLAN_KEYS.find((x) => Object.hasOwn(obj, x))
      : undefined;
  if (k === undefined) return null;
  return `${at} carries \`${k}\`, ${k === "journeys" ? RETIRED_JOURNEYS_REASON : RETIRED_PLAN_REASON}`;
}
// THE ANALOGY MAPPING AS THE FILE CARRIES IT (kogaki#1778): a base domain with its Role and relation
// counterparts, or `none` with its reason. A string to refuse with, or null.
const ANALOGY_KEYS = ["base_domain", "roles", "relations"];
export function analogyShapeRefusal(analogy, at) {
  const text = (v) => typeof v === "string" && v.trim() !== "";
  const map = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
  if (!map(analogy)) return `${at} carries an \`analogy\` that is not a record (kogaki#1778)`;
  if (Object.hasOwn(analogy, "none")) {
    return Object.keys(analogy).length === 1 && text(analogy.none)
      ? null
      : `${at}'s \`analogy\` answers \`none\` with no reason, or beside a mapping (kogaki#1778)`;
  }
  const extra = undeclaredKey(analogy, ANALOGY_KEYS);
  if (extra) return `${at}'s \`analogy\` carries \`${extra}\`, which it does not declare (kogaki#1778)`;
  const b = analogy.base_domain;
  if (!map(b) || !text(b.name) || !text(b.description))
    return `${at}'s \`analogy.base_domain\` is not a \`{ name, description }\` pair (kogaki#1778)`;
  const pairs = (list, k) => Array.isArray(list) && list.every((x) => map(x) && text(x[k]) && text(x.counterpart));
  if (!pairs(analogy.roles, "role"))
    return `${at}'s \`analogy.roles\` are not \`{ role, counterpart }\` pairs (kogaki#1778)`;
  if (!pairs(analogy.relations, "relation"))
    return `${at}'s \`analogy.relations\` are not \`{ relation, counterpart }\` pairs (kogaki#1778)`;
  return null;
}

const PARAGRAPH_WAYPOINT_KEYS = ["point", "serves", "cast"];
// THE PERFORMS FORM (kogaki#1448, owner decision 2026-10-19): a Waypoint for a
// Segment that acts on the reader's reading -- announce, flag, concede difficulty, signal a
// turn -- carries `performs`, the operation in the planner's words, in place of `point` and
// `serves`: such a Segment carries no part of the Leg's relation, and a point written for it
// is invented content.
const PERFORMS_WAYPOINT_KEYS = ["performs"];

export function undeclaredKey(obj, allowed) {
  return Object.keys(obj).find((k) => !allowed.includes(k));
}

// The Strand ids a Leg's Claims name, in order: what a paragraph of the Leg may stand on.
export const legStrandIds = (leg) => (Array.isArray(leg && leg.claims) ? leg.claims : []).map((g) => String(g.strand));

// THE READ /draft MAKES (kogaki#1375). `briefPath` and `briefText` are the Brief /draft
// was handed, `legs` its parsed Legs. Returns `{ path, record, paragraphs, ... }` —
// `paragraphs` a Map from leg_id to the Leg's paragraphs as the file carries them, each with
// its `join` where it has one (kogaki#1411), `record` the whole record as read — or
// `{ error }`, naming both files where the two disagree. OPENS NO MOVE FILE AND NO LIBRARY
// (kogaki#1311): the record carries a Move's id and nothing else of it, and this read holds
// the id to its shape; whether it names a Move in a library is refused where a library is
// open -- the plan call's validator and the Move-Extraction Playground.
export function readParagraphPlanBeside(briefPath, briefText, legs) {
  const path = paragraphPlanPathFor(briefPath);
  const rel = relFromRepo(path);
  const briefRel = relFromRepo(resolve(briefPath));
  if (!existsSync(path)) {
    return {
      error:
        `the Brief at ${briefRel} has no ParagraphPlan file beside it (${rel}) — /draft renders each Leg's ` +
        `paragraphs from that file, and /paragraph-plan writes it from the adopted Brief: run ` +
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
  // THE MAPPING RECORD (kogaki#1733): a plan naming one is read only while the record on disk
  // is the one it names; a plan written before the record existed names none.
  let mappingSha = null;
  if (record.mapping) {
    const m = mappingRecordRefusal(record.mapping, path, rel);
    if (m.error) return { error: m.error };
    mappingSha = m.sha256;
  }
  const paragraphs = new Map(record.legs.map((l) => [l.leg_id, l.paragraphs]));
  return { path, record, paragraphs, mappingSha };
}

// The terms a Leg's `introduces` carries, by `term`, from either form the Brief's record
// holds (a typed `{term, meaning}` item, or the bare / anchored line) and from the plan
// call's own `{term, meaning}` list, whose `meaning` may be null for a bare term.
export function legIntroducedTerms(leg) {
  return (leg && Array.isArray(leg.introduces) ? leg.introduces : [])
    .map((raw) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw))
        return typeof raw.term === "string" ? raw.term.trim() : "";
      const p = parseIntroducesEntry(raw);
      return p.error ? "" : p.term;
    })
    .filter(Boolean);
}

// ONE PARAGRAPH'S SCHEMA, by the Leg schema's own rules at the paragraph scale (kogaki#1639).
// `w` is the entry, `j` its 0-based place in the Leg, `leg` the Brief's Leg (its `claims`,
// `introduces`) and `entries` the Leg's paragraphs so far. The Move is the Leg's,
// bound once for every paragraph (kogaki#1777), so a paragraph names none. Shared by the plan
// reader and the plan call's validator, so the record the stage writes is the record every read
// refuses alike. Returns a string to refuse with, or null.
export function paragraphSchemaRefusal(w, j, leg, entries, at) {
  const serves = legStrandIds(leg);
  const n = j + 1;
  const retired = retiredPlanKeyRefusal(w, at);
  if (retired) return retired;
  if (Object.hasOwn(w, "move")) {
    return `${at} carries \`move\` — the Leg binds one Move for all its paragraphs, named on the Leg, and a paragraph names none (kogaki#1777)`;
  }
  if (!Array.isArray(w.materials) || !w.materials.length || w.materials.some((m) => typeof m !== "string")) {
    return `${at} carries no \`materials\` — the Strand ids the paragraph stands on, from its Leg's Claims (kogaki#1639)`;
  }
  const outside = w.materials.find((m) => !serves.includes(m));
  if (outside !== undefined) {
    return `${at} names ${JSON.stringify(outside)} in \`materials\`, which no Claim of its Leg names — a paragraph stands on its Leg's Claims (${serves.join(", ")}) (kogaki#1639)`;
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
  if (!Array.isArray(w.introduces))
    return `${at} carries no \`introduces\` — the terms of the Leg's \`introduces\` this paragraph introduces, each \`{term, meaning}\`; may be empty (kogaki#1639)`;
  const legTerms = legIntroducedTerms(leg);
  for (const t of w.introduces) {
    const term = t && typeof t === "object" && !Array.isArray(t) && typeof t.term === "string" ? t.term.trim() : "";
    if (!term || typeof t.meaning !== "string" || t.meaning.trim() === "" || undeclaredKey(t, PLAN_INTRODUCES_KEYS)) {
      return `${at} introduces ${JSON.stringify(t)} — each entry is \`{term, meaning}\`, the term one of the Leg's \`introduces\` and the meaning the Brief's or the planner's (kogaki#1639)`;
    }
    if (!legTerms.includes(term))
      return `${at} introduces ${JSON.stringify(term)}, which the Leg ${leg.leg_id} does not introduce (its \`introduces\`: ${legTerms.length ? legTerms.join(", ") : "none"}) (kogaki#1639)`;
  }
  if (!Array.isArray(w["re-activate"]))
    return `${at} carries no \`re-activate\` — \`<paragraph> term <term>\` and \`<paragraph> claim <Strand id> as <one plain sentence>\` lines; may be empty (kogaki#1639)`;
  for (const raw of w["re-activate"]) {
    if (typeof raw !== "string")
      return `${at} re-activates a non-string entry — each is one line, \`<paragraph> term <term>\` or \`<paragraph> claim <Strand id> as <one plain sentence>\` (kogaki#1639)`;
    const e = parseReactivateEntry(raw);
    if (e.error || e.kind === "journey") {
      return `${at} re-activates ${JSON.stringify(raw.trim())} — a paragraph's re-activate line is \`<paragraph> term <term>\` or \`<paragraph> claim <Strand id> as <one plain sentence>\`, a paragraph number of this Leg in place of a Leg id (kogaki#1639)`;
    }
    const ref = /^\d+$/.test(e.leg_id) ? Number(e.leg_id) : NaN;
    if (!Number.isInteger(ref) || ref < 1 || ref >= n) {
      return (
        `${at} re-activates ${JSON.stringify(raw.trim())} — it names ${JSON.stringify(e.leg_id)}, and a paragraph re-activates only from an earlier paragraph of the same Leg ` +
        `(${n === 1 ? "none before this one" : `1 to ${n - 1}`}), never itself, a later paragraph or another Leg (kogaki#1639)`
      );
    }
    const source = entries[ref - 1] || {};
    if (e.kind === "term") {
      const found = (Array.isArray(source.introduces) ? source.introduces : []).some(
        (t) => t && typeof t === "object" && String(t.term).trim() === e.value,
      );
      if (!found)
        return `${at} re-activates ${JSON.stringify(raw.trim())}, but paragraph ${ref} does not introduce ${JSON.stringify(e.value)} — a re-activated term matches, verbatim, a term that paragraph's \`introduces\` carries (kogaki#1639)`;
    } else if (!(Array.isArray(source.materials) ? source.materials : []).includes(e.value)) {
      return `${at} re-activates ${JSON.stringify(raw.trim())}, but paragraph ${ref} does not stand on ${JSON.stringify(e.value)} — a re-activated claim names a Strand that paragraph's \`materials\` carries (kogaki#1639)`;
    }
  }
  return null;
}

// THE LEG'S RULES OVER ITS PARAGRAPHS (kogaki#1639): no term of the Leg's `introduces` is
// introduced by two paragraphs (kogaki#1663). `entries` are the Leg's entries, each already passed
// `paragraphSchemaRefusal`. Returns a string to refuse with, or null.
export function paragraphLegRefusal(entries, leg, at) {
  for (const term of legIntroducedTerms(leg)) {
    const by = entries
      .map((e, i) => ((e.introduces || []).some((t) => t && String(t.term).trim() === term) ? i + 1 : 0))
      .filter(Boolean);
    if (by.length > 1) {
      return (
        `${at}: the term ${JSON.stringify(term)} of the Leg's \`introduces\` is introduced by paragraphs ${by.join(" and ")} — ` +
        "a term of the Leg is introduced by at most one of its paragraphs, named in that paragraph's `introduces` (kogaki#1639, kogaki#1663)"
      );
    }
  }
  return null;
}

// The record's shape against the Brief's Legs: every key declared, one entry per Leg in order,
// each naming its one bound Move and carrying from one paragraph to `brief.paragraphs_per_leg`
// (kogaki#1777), every paragraph carrying its schema (`paragraphSchemaRefusal`) under the
// Leg's rules (`paragraphLegRefusal`), and every Waypoint shaped as `paragraphWaypointsRefusal`
// reads it over the paragraph's `materials`. A key outside those is refused by name: the file
// holds the bound Move's id and nothing else of the Move (kogaki#1639). `library`, where
// given, is the Set of Move ids a `move` may name; `bound` is the paragraph bound, the
// setting's where none is handed.
export function paragraphPlanShapeRefusal(record, rel, legs, { library = null, bound = null } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record))
    return `the ParagraphPlan file ${rel} is not a YAML map`;
  const k0 = undeclaredKey(record, PLAN_KEYS);
  if (k0)
    return `the ParagraphPlan file ${rel} carries \`${k0}\`, which a ParagraphPlan record does not declare (kogaki#1375)`;
  if (String(record.version) !== "1")
    return `the ParagraphPlan file ${rel} carries version ${JSON.stringify(record.version)}, not "1"`;
  const b = record.brief;
  if (!b || typeof b !== "object" || Array.isArray(b) || typeof b.path !== "string" || typeof b.sha256 !== "string") {
    return `the ParagraphPlan file ${rel} names no Brief — \`brief\` carries the \`path\` and the \`sha256\` of the Brief it was made from`;
  }
  const kb = undeclaredKey(b, PLAN_BRIEF_KEYS);
  if (kb) return `the ParagraphPlan file ${rel} carries \`brief.${kb}\`, which a ParagraphPlan record does not declare`;
  if (Object.hasOwn(record, "analogy")) {
    const a = analogyShapeRefusal(record.analogy, `the ParagraphPlan file ${rel}`);
    if (a) return a;
  }
  if (Object.hasOwn(record, "mapping")) {
    const m = mappingShapeRefusal(record.mapping, rel);
    if (m) return m;
  }
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
  const max = bound ?? paragraphsPerLeg();
  for (const [i, l] of record.legs.entries()) {
    const leg = legs[i];
    const at = `the ParagraphPlan file ${rel}, leg ${leg.leg_id}`;
    const retiredLeg = retiredPlanKeyRefusal(l, at);
    if (retiredLeg) return retiredLeg;
    if (Object.hasOwn(l, "waypoints")) {
      return (
        `${at} carries \`waypoints\` — the Leg is the unit (kogaki#1777): it binds one \`move\` ` +
        "and carries its `paragraphs`; run /paragraph-plan on this Brief again"
      );
    }
    const kl = undeclaredKey(l, PLAN_LEG_KEYS);
    if (kl) return `${at} carries \`${kl}\`, which a ParagraphPlan record does not declare`;
    if (typeof l.move !== "string" || l.move.trim() === "") {
      return `${at} carries no \`move\` — a Leg names the one Move bound to it by id, and nothing else of the Move (kogaki#1777)`;
    }
    if (library && !library.has(l.move))
      return `${at} binds move ${JSON.stringify(l.move)}, which names no Move in the library (kogaki#1639)`;
    const badMove = forcedMarkRefusal(l.move_forced_by, at, "move_forced_by");
    if (badMove) return badMove;
    if (!Array.isArray(l.paragraphs)) return `${at} carries no \`paragraphs\` list (kogaki#1777)`;
    const count = paragraphCountRefusal(l.paragraphs.length, max, at);
    if (count) return count;
    for (const [j, w] of l.paragraphs.entries()) {
      const atW = `${at}, paragraph ${j + 1}`;
      if (!w || typeof w !== "object" || Array.isArray(w)) return `${atW} is not a map`;
      const retiredW = retiredPlanKeyRefusal(w, atW);
      if (retiredW) return retiredW;
      if (Object.hasOwn(w, "move")) return paragraphSchemaRefusal(w, j, leg, l.paragraphs.slice(0, j), atW);
      const kw = undeclaredKey(w, PLAN_PARAGRAPH_KEYS);
      if (kw)
        return (
          `${atW} carries \`${kw}\`, which a ParagraphPlan record does not declare — the file holds the bound Move's id ` +
          "and nothing else of the Move: no Segment and no Move field (kogaki#1375, kogaki#1639)"
        );
      if (w.paragraph !== j + 1)
        return `${atW} is numbered ${JSON.stringify(w.paragraph)} — paragraphs are numbered in order from 1`;
      const schema = paragraphSchemaRefusal(w, j, leg, l.paragraphs.slice(0, j), atW);
      if (schema) return schema;
      const badJoin = joinRefusal(w, j, atW);
      if (badJoin) return badJoin;
      const badMark = (Array.isArray(w.paragraph_waypoints) ? w.paragraph_waypoints : [])
        .map((p, k) => forcedMarkRefusal(p && p.forced_by, `${atW}, Waypoint ${k + 1}`, "forced_by"))
        .find(Boolean);
      if (badMark) return badMark;
      const pws = Array.isArray(w.paragraph_waypoints) ? w.paragraph_waypoints.map(unmarked) : w.paragraph_waypoints;
      const bad = paragraphWaypointsRefusal(pws, w.materials, atW);
      if (bad) return bad;
    }
    const legRule = paragraphLegRefusal(l.paragraphs, leg, at);
    if (legRule) return legRule;
  }
  return null;
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
  if (Object.hasOwn(p, "performs")) {
    return has
      ? `${at} carries \`cast\` on a \`performs\` Waypoint — a cast is the shape of a point's sentences, ` +
          "and a `performs` entry carries no point (kogaki#1695)"
      : null;
  }
  if (!has)
    return `${at} carries no \`cast\` — every \`point\` Waypoint carries one, \`{}\` where its Segment sets no key of ${CAST_SET} (kogaki#1695)`;
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

// ONE PARAGRAPH'S WAYPOINTS, by the Waypoints' own rule (every Strand the paragraph's
// `materials` names is served by at least one of them) and
// with `point`, `serves` and `cast` as their only keys -- or `performs` alone (kogaki#1448), which
// the Claim-coverage rule does not count: the `point` Waypoints carry it, and a
// paragraph none of whose Waypoints carries a `point` is refused.
export function paragraphWaypointsRefusal(pws, parentServes, at) {
  if (Array.isArray(pws)) {
    for (const [i, p] of pws.entries()) {
      if (p && typeof p === "object" && !Array.isArray(p)) {
        const badCast = castRefusal(p, `${at}: Waypoint ${i + 1}`);
        if (badCast) return badCast;
        if (Object.hasOwn(p, "performs")) {
          const k = undeclaredKey(p, PERFORMS_WAYPOINT_KEYS);
          if (k) {
            return (
              `${at}: Waypoint ${i + 1} carries \`performs\` beside \`${k}\` — a \`performs\` Waypoint ` +
              "carries its Segment's operation on the reader's reading in place of `point` and `serves`, and nothing else (kogaki#1448)"
            );
          }
          if (typeof p.performs !== "string" || p.performs.trim() === "") {
            return (
              `${at}: Waypoint ${i + 1} carries an empty \`performs\` — it names the operation its Segment ` +
              "performs on the reader's reading, in one sentence (kogaki#1448)"
            );
          }
          continue;
        }
        const k = undeclaredKey(p, PARAGRAPH_WAYPOINT_KEYS);
        if (k) {
          return (
            `${at}: Waypoint ${i + 1} carries \`${k}\` — a Waypoint carries \`point\`, \`serves\` and \`cast\`, ` +
            "or `performs` alone, and nothing of a Move reaches past Waypoint generation (kogaki#1375, kogaki#1448)"
          );
        }
      }
    }
    const isPoint = (p) => !(p && typeof p === "object" && Object.hasOwn(p, "performs"));
    const points = pws.filter(isPoint);
    const ordinals = pws.map((p, i) => i + 1).filter((n) => isPoint(pws[n - 1]));
    if (pws.length && !points.length) {
      return (
        `${at}: none of its Waypoints carries a \`point\` — a \`performs\` Waypoint carries no part ` +
        "of the Leg's relation, so every Claim the paragraph stands on is served by at least one `point` Waypoint (kogaki#1448)"
      );
    }
    return waypointsRefusal(points, parentServes, `${at}'s Waypoints`, ordinals, null, { paragraph: true });
  }
  return waypointsRefusal(pws, parentServes, `${at}'s Waypoints`, null, null, { paragraph: true });
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
