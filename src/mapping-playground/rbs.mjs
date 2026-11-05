// The short Trial's correspondence table, refused or `{}` (kogaki#1669, kogaki#1671): its pairs,
// the base and its kind of match, an owner-supplied binding of one Move, and the projecting bindings (kogaki#1681).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { moveContract } from "../compose.mjs";
import { propositionForms, propositionWordIn } from "./structure.mjs";

// The four kinds of match of Gentner 1983, each with its one-line definition.
export const BASE_KIND_DEFINITIONS = {
  analogy: "relations are mapped from base to target, and few attributes of the objects are",
  abstraction: "the base is an abstract relational structure whose objects carry few attributes, and its relations are mapped",
  "literal-similarity": "both relations and many attributes of the objects are mapped",
  "mere-appearance": "attributes of the objects are mapped, and few relations are",
};
export const BASE_KINDS = Object.keys(BASE_KIND_DEFINITIONS);

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// Every string a `target` carries: the prose itself, or each leaf of a mapping.
function targetTexts(target) {
  if (typeof target === "string") return [target];
  if (Array.isArray(target)) return target.flatMap(targetTexts);
  if (isMap(target)) return Object.values(target).flatMap(targetTexts);
  return [];
}

function propositionWordRefusal(text, forms, field) {
  const w = propositionWordIn(text, forms);
  return w ? `${field} carries "${w}", a content word of the proposition — the reader does not hold the Strand's words (kogaki#1669)` : null;
}

function baseRefusal(base) {
  if (!isMap(base) || !Object.hasOwn(base, "domain") || !Object.hasOwn(base, "kind")) {
    return "the correspondence table's `base` is not a `{ domain, kind }` map";
  }
  if (base.domain !== null && !isText(base.domain)) return "base.domain is neither one phrase nor null";
  if (base.kind !== null && !BASE_KINDS.includes(base.kind)) {
    return `base.kind ${JSON.stringify(base.kind)} is not one of ${BASE_KINDS.join(", ")} (Gentner 1983), or null`;
  }
  return null;
}

// A binding: `move` resolving in the library, and one `{ segment, point }` per segment, in order.
// `at` prefixes every field it names; `forms` null skips the proposition-word test (a projecting binding).
function bindingRefusal(record, forms, movesDir, at = "") {
  if (Object.hasOwn(record, "grounds")) return `${at}grounds is no field of a binding: why the Move was chosen is \`${at}binding_rationale\` (kogaki#1678)`;
  if (Object.hasOwn(record, "binding_rationale") && !isText(record.binding_rationale)) {
    return `${at}binding_rationale is not one text — why the Move was chosen (kogaki#1675)`;
  }
  const hasMove = Object.hasOwn(record, "move");
  const hasWaypoints = Object.hasOwn(record, "waypoints");
  if (!hasMove && !hasWaypoints) return null;
  if (!hasMove || !hasWaypoints) return `the correspondence table carries \`${at}${hasMove ? "move" : "waypoints"}\` without \`${at}${hasMove ? "waypoints" : "move"}\``;
  if (!isText(record.move)) return `${at}move is not one Move id`;
  const c = moveContract(record.move, movesDir);
  if (c.error) return `${at}move ${JSON.stringify(record.move)} names no Move of the library ${movesDir}: ${c.error}`;
  const n = c.segments.length;
  if (!Array.isArray(record.waypoints) || record.waypoints.length !== n) {
    return `${at}waypoints carries ${Array.isArray(record.waypoints) ? record.waypoints.length : "no list of"} entries, and the Move ${record.move} has ${n} segments`;
  }
  for (const [i, w] of record.waypoints.entries()) {
    const field = `${at}waypoints[${i}]`;
    if (!isMap(w) || w.segment !== i + 1) return `${field} is not \`{ segment: ${i + 1}, point }\``;
    if (!isText(w.point)) return `${field}.point is empty`;
    const r = forms ? propositionWordRefusal(w.point, forms, `${field}.point`) : null;
    if (r) return r;
  }
  return null;
}

// The projecting bindings in order (kogaki#1681): `projection` is a list, and a map is a list of one.
export function projectionsOf(record) {
  if (!record || !Object.hasOwn(record, "projection")) return [];
  return Array.isArray(record.projection) ? record.projection : [record.projection];
}

// Each projecting binding has the first binding's shape, with no proposition-word test, and only beside a first binding.
function projectionRefusal(record, movesDir) {
  if (!Object.hasOwn(record, "projection")) return null;
  const list = projectionsOf(record);
  if (!list.length) return "projection is an empty list: it carries one `{ move, waypoints, binding_rationale }` per further paragraph";
  if (!Object.hasOwn(record, "move") || !Object.hasOwn(record, "waypoints")) {
    return "the correspondence table carries `projection` without `move` and `waypoints`: a projecting paragraph projects what paragraph one's binding gave the reader";
  }
  for (const [i, p] of list.entries()) {
    const at = `projection[${i}].`;
    if (!isMap(p)) return `projection[${i}] is not a \`{ move, waypoints, binding_rationale }\` map`;
    if (!Object.hasOwn(p, "move") || !Object.hasOwn(p, "waypoints")) {
      return `the correspondence table carries \`projection[${i}]\` without \`${at}${Object.hasOwn(p, "move") ? "waypoints" : "move"}\``;
    }
    const r = bindingRefusal(p, null, movesDir, at);
    if (r) return r;
  }
  return null;
}

// `structure`, where given, adds the Role rules: each `target` names one of its Roles, and every Role is paired once.
export function validateRbsTable(record, proposition, { movesDir = "moves", structure = null } = {}) {
  if (!isMap(record) || !Array.isArray(record.pairs) || !record.pairs.length) {
    return { error: "the correspondence table carries no non-empty `pairs` list" };
  }
  const b = baseRefusal(record.base);
  if (b) return { error: b };
  const forms = propositionForms(proposition);
  const placeholder = record.placeholder === true;
  for (const [i, p] of record.pairs.entries()) {
    if (!isMap(p) || !Object.hasOwn(p, "base") || !Object.hasOwn(p, "target")) {
      return { error: `pairs[${i}] is not a \`{ base, target }\` pair` };
    }
    if (!(placeholder && p.base === null)) {
      if (!isText(p.base)) return { error: `pairs[${i}].base is not one base text — only a placeholder table pairs a Role with null` };
      const r = propositionWordRefusal(p.base, forms, `pairs[${i}].base`);
      if (r) return { error: r };
    }
    const texts = targetTexts(p.target).filter((t) => t.trim() !== "");
    if (!texts.length) return { error: `pairs[${i}].target is empty` };
    for (const t of texts) {
      const r = propositionWordRefusal(t, forms, `pairs[${i}].target`);
      if (r) return { error: r };
    }
  }
  if (structure) {
    const roles = structure.roles.map((r) => r.id);
    for (const [i, p] of record.pairs.entries()) {
      if (!roles.includes(p.target)) return { error: `pairs[${i}].target ${JSON.stringify(p.target)} names no Role of the structure — it names ${roles.join(", ")}` };
    }
    for (const id of roles) {
      const n = record.pairs.filter((p) => p.target === id).length;
      if (n !== 1) return { error: `the Role ${JSON.stringify(id)} is paired ${n} times, and every Role is paired once` };
    }
  }
  const m = bindingRefusal(record, forms, movesDir) || projectionRefusal(record, movesDir);
  return m ? { error: m } : {};
}

// The binding the owner supplied, as the `bind` stage's entry, or null where the table carries none.
export function suppliedEntry(record, serves) {
  if (!record || !Object.hasOwn(record, "move")) return null;
  return { waypoint: 1, move: record.move, binding_rationale: Object.hasOwn(record, "binding_rationale") ? String(record.binding_rationale).trim() : null,
    paragraph_waypoints: record.waypoints.map((w) => ({ point: String(w.point).trim(), serves: [...serves] })) };
}
