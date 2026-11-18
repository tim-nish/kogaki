// The short Trial's Move table (kogaki#1840, kogaki#1858): a Move written by hand as a count of Bind targets and, per
// Segment, the Bind target it is given and how; read, refused naming the place, and paired with a Leg in order by the Harness.
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
import { legSentences } from "./leg-senses.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const TABLE_KEYS = ["binds", "segments"];
const SEGMENT_KEYS = ["bind", "domain", "genericity", "discourse_relation"];
const SEGMENT_OPTIONAL = ["manner"];
const DOMAIN_KEYS = ["own", "apart"];
const DISCOURSE_KEYS = ["sense", "to"];
// The keys a table carried before kogaki#1858, each refused by name.
const RETIRED_KEYS = ["states", "relations", "roles", "label"];
export const MAX_BINDS = 3;
export const GENERICITY = ["generic", "particular"];

function keysRefusal(obj, required, optional, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const retired = Object.keys(obj).find((k) => RETIRED_KEYS.includes(k));
  if (retired) return `${at} carries \`${retired}\`, a key the Move table no longer declares`;
  const extra = Object.keys(obj).find((k) => !required.includes(k) && !optional.includes(k));
  if (extra)
    return `${at} carries \`${extra}\`, which the table does not declare — it carries ${[...required, ...optional].join(", ")}`;
  const missing = required.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// The table's Segments, each as its number and the table's fields.
export function tableSegments(table) {
  return table.segments.map((s, i) => ({ segment: i + 1, ...s }));
}

// THE TABLE, refused naming the place, or null. `segmentCount` is the named Move's.
export function validateMoveTable(table, segmentCount) {
  const top = keysRefusal(table, TABLE_KEYS, [], "the Move table");
  if (top) return top;
  if (!Number.isInteger(table.binds) || table.binds < 1 || table.binds > MAX_BINDS)
    return `the Move table's \`binds\` is ${JSON.stringify(table.binds)}, not a whole number from 1 to ${MAX_BINDS}`;
  if (!Array.isArray(table.segments)) return "the Move table's `segments` is not a list";
  if (table.segments.length !== segmentCount)
    return `the Move table's \`segments\` carries ${table.segments.length} entries, and the named Move has ${segmentCount} Segments — one entry per Segment, in order`;
  const given = new Map();
  for (const [i, s] of table.segments.entries()) {
    const n = i + 1;
    const at = `Segment ${n}`;
    const bad = keysRefusal(s, SEGMENT_KEYS, SEGMENT_OPTIONAL, at);
    if (bad) return bad;
    if (s.bind !== null) {
      if (!Number.isInteger(s.bind) || s.bind < 1 || s.bind > table.binds)
        return `${at}'s \`bind\` is ${JSON.stringify(s.bind)}, neither null nor one Bind target from 1 to ${table.binds}`;
      if (given.has(s.bind))
        return `${at}'s \`bind\` is ${s.bind}, which Segment ${given.get(s.bind)} is already given — each Bind target is given to one Segment`;
      given.set(s.bind, n);
    }
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
      if (!isText(r.sense)) return `${at}'s \`discourse_relation.sense\` is not one non-empty text`;
      if (!Array.isArray(r.to) || !r.to.length)
        return `${at}'s \`discourse_relation.to\` is not a list of Segment numbers`;
      const late = r.to.find((x) => !Number.isInteger(x) || x < 1 || x >= n);
      if (late !== undefined)
        return `${at}'s \`discourse_relation.to\` names ${JSON.stringify(late)}, which is not a Segment before it`;
    }
    if (Object.hasOwn(s, "manner") && !isText(s.manner)) return `${at}'s \`manner\` is not one non-empty sentence`;
  }
  for (let k = 1; k <= table.binds; k++)
    if (!given.has(k)) return `Bind target ${k} is given to no Segment — every Bind target of the table is given to one`;
  return null;
}

// THE TABLE AGAINST THE LEG: `binds` against the Leg's Arguments and CentralClaim, naming both numbers, or null.
export function tableLegRefusal(table, legStructure, legId, relationId) {
  const n = legSentences(legStructure, relationId).length;
  if (table.binds !== n)
    return `the Move table's \`binds\` is ${table.binds}, and the Leg ${legId} has ${n} Arguments and CentralClaim`;
  return null;
}

// The table file read and refused: `{ table, error: null }`, or `{ table: null, error }`.
export function readMoveTable(path, segmentCount, legStructure, legId, relationId) {
  let table;
  try {
    table = parseYaml(readFileSync(path, "utf8"), path);
  } catch (e) {
    return { table: null, error: `the Move table cannot be read (${e.message})` };
  }
  const bad = validateMoveTable(table, segmentCount) || tableLegRefusal(table, legStructure, legId, relationId);
  return bad ? { table: null, error: bad } : { table, error: null };
}

// THE MOVE STRUCTURE THE TABLE GIVES: the number of Bind targets, and per Segment the one it is given.
export function tableMoveStructure(table) {
  return {
    binds: table.binds,
    segments: table.segments.map((s, i) => ({ segment: i + 1, bind: s.bind })),
  };
}

// THE PAIRING IN ORDER: Bind target k is given entry k of `legSentences`, the Arguments and then the CentralClaim.
export function pairInOrder(legStructure, relationId) {
  return {
    binds: legSentences(legStructure, relationId).map((s) => ({ bind: s.number, kind: s.kind, leg: s.id })),
  };
}

// THE POINTS CALL'S INPUT (kogaki#1858): the Leg's Arguments and CentralClaim with their sentences, and per Segment
// what is bound to it and its Sense.
export function tablePointsInput(legId, legStructure, relationId, table) {
  const sentences = legSentences(legStructure, relationId);
  const central = sentences[sentences.length - 1];
  return {
    leg: {
      leg_id: legId,
      arguments: sentences.slice(0, -1).map((s) => ({ id: s.id, sentence: s.sentence })),
      central_claim: { id: central.id, sentence: central.sentence },
    },
    segments: table.segments.map((s, i) => {
      const b = s.bind === null ? null : sentences[s.bind - 1];
      const r = s.discourse_relation;
      return {
        segment: i + 1,
        bound: b ? { kind: b.kind, id: b.id } : null,
        sense: r ? { sense: r.sense, to: [...r.to] } : null,
      };
    }),
  };
}
