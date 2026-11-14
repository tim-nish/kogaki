// The short Trial's Move table (kogaki#1840): a Move written by hand as a count of Roles, a count of numbered Relations
// and, per Segment, what it states and how; read, refused naming the place, and paired with a Leg in order by the Harness.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync } from "node:fs";
import { parseYaml } from "../yaml.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const isCount = (v) => Number.isInteger(v) && v > 0;
const TABLE_KEYS = ["roles", "relations", "segments"];
const SEGMENT_KEYS = ["states", "domain", "genericity", "discourse_relation"];
const SEGMENT_OPTIONAL = ["manner"];
const DOMAIN_KEYS = ["own", "apart"];
const DISCOURSE_KEYS = ["label", "to"];
export const GENERICITY = ["generic", "particular"];
// The one Move the plan call is offered with a table: no name of the library's reaches it.
export const TABLE_MOVE_ID = "move";

function keysRefusal(obj, required, optional, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !required.includes(k) && !optional.includes(k));
  if (extra)
    return `${at} carries \`${extra}\`, which the table does not declare — it carries ${[...required, ...optional].join(", ")}`;
  const missing = required.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

const relationId = (n) => `R${n}`;

// The table's Segments, each as its number and the table's fields.
export function tableSegments(table) {
  return table.segments.map((s, i) => ({ segment: i + 1, ...s }));
}

// THE TABLE, refused naming the place, or null. `segmentCount` is the named Move's.
export function validateMoveTable(table, segmentCount) {
  const top = keysRefusal(table, TABLE_KEYS, [], "the Move table");
  if (top) return top;
  for (const k of ["roles", "relations"])
    if (!isCount(table[k]))
      return `the Move table's \`${k}\` is ${JSON.stringify(table[k])}, not a whole number above 0`;
  if (!Array.isArray(table.segments)) return "the Move table's `segments` is not a list";
  if (table.segments.length !== segmentCount)
    return `the Move table's \`segments\` carries ${table.segments.length} entries, and the named Move has ${segmentCount} Segments — one entry per Segment, in order`;
  const stated = new Set();
  for (const [i, s] of table.segments.entries()) {
    const n = i + 1;
    const at = `Segment ${n}`;
    const bad = keysRefusal(s, SEGMENT_KEYS, SEGMENT_OPTIONAL, at);
    if (bad) return bad;
    if (!Array.isArray(s.states)) return `${at}'s \`states\` is not a list`;
    const stray = s.states.find((x) => !Number.isInteger(x) || x < 1 || x > table.relations);
    if (stray !== undefined)
      return `${at}'s \`states\` names ${JSON.stringify(stray)}, outside the Relations 1 to ${table.relations}`;
    s.states.forEach((x) => stated.add(x));
    const d = keysRefusal(s.domain, DOMAIN_KEYS, [], `${at}'s \`domain\``);
    if (d) return d;
    for (const k of DOMAIN_KEYS)
      if (typeof s.domain[k] !== "boolean")
        return `${at}'s \`domain.${k}\` is ${JSON.stringify(s.domain[k])}, not true or false`;
    if (s.domain.apart === true)
      return `${at}'s \`domain.apart\` is true, and the Move-table route tells no case apart — a base domain is named before no Waypoint today`;
    if (!GENERICITY.includes(s.genericity))
      return `${at}'s \`genericity\` is ${JSON.stringify(s.genericity)}, neither \`generic\` nor \`particular\``;
    if (s.genericity === "particular")
      return `${at}'s \`genericity\` is \`particular\`, and the Move-table route tells no particular case — its instances are named before no Waypoint today`;
    const r = s.discourse_relation;
    if (r !== null) {
      const rb = keysRefusal(r, DISCOURSE_KEYS, [], `${at}'s \`discourse_relation\``);
      if (rb) return rb;
      if (!isText(r.label)) return `${at}'s \`discourse_relation.label\` is not one non-empty text`;
      if (!Array.isArray(r.to) || !r.to.length)
        return `${at}'s \`discourse_relation.to\` is not a list of Segment numbers`;
      const late = r.to.find((x) => !Number.isInteger(x) || x < 1 || x >= n);
      if (late !== undefined)
        return `${at}'s \`discourse_relation.to\` names ${JSON.stringify(late)}, which is not a Segment before it`;
    }
    if (Object.hasOwn(s, "manner") && !isText(s.manner)) return `${at}'s \`manner\` is not one non-empty sentence`;
  }
  for (let k = 1; k <= table.relations; k++)
    if (!stated.has(k)) return `Relation ${k} is stated by no Segment — every Relation of the table is stated by one`;
  return null;
}

const legRelationsOf = (legStructure) => [...(legStructure.relations || []), ...(legStructure.higher_order || [])];

// THE TABLE AGAINST THE LEG: its counts against the Leg's structure, naming both numbers, or null.
export function tableLegRefusal(table, legStructure, legId) {
  const relations = legRelationsOf(legStructure).length;
  if (table.relations !== relations)
    return `the Move table states ${table.relations} Relations, and the Leg ${legId}'s structure holds ${relations} relations and higher-order relations`;
  const roles = (legStructure.roles || []).length;
  if (table.roles !== roles)
    return `the Move table needs ${table.roles} Roles, and the Leg ${legId}'s structure holds ${roles} Roles`;
  return null;
}

// The table file read and refused: `{ table, error: null }`, or `{ table: null, error }`.
export function readMoveTable(path, segmentCount, legStructure, legId) {
  let table;
  try {
    table = parseYaml(readFileSync(path, "utf8"), path);
  } catch (e) {
    return { table: null, error: `the Move table cannot be read (${e.message})` };
  }
  const bad = validateMoveTable(table, segmentCount) || tableLegRefusal(table, legStructure, legId);
  return bad ? { table: null, error: bad } : { table, error: null };
}

// THE MOVE STRUCTURE THE TABLE GIVES: the Relations as R1 to Rn with no `holds`, the number of Roles, and per Segment
// what it states.
export function tableMoveStructure(table) {
  return {
    roles: table.roles,
    relations: Array.from({ length: table.relations }, (_, k) => ({ id: relationId(k + 1) })),
    segments: table.segments.map((s, i) => ({ segment: i + 1, states: s.states.map(relationId) })),
  };
}

// THE PAIRING IN ORDER: the Leg's relations, then its higher-order relations, the k-th given to Rk. No Role is paired.
export function pairInOrder(table, legStructure) {
  const legRelations = legRelationsOf(legStructure);
  return {
    role_pairs: [],
    relation_pairs: Array.from({ length: table.relations }, (_, k) => ({
      move_relation: relationId(k + 1),
      leg_relation: legRelations[k].id,
    })),
  };
}

// The Move the plan call is offered: no name, no `breaks`, no `operation` — the table's Segments alone.
export function tablePlanMove(table) {
  return {
    id: TABLE_MOVE_ID,
    takes: [],
    leaves: [],
    before: null,
    after: null,
    breaks: [],
    segments: tableSegments(table),
  };
}
