// The short Trial's correspondence table, refused or `{}` (kogaki#1669, kogaki#1671): its correspondences,
// the base (kogaki#1693), an owner-supplied binding of one Move, and the projecting bindings (kogaki#1681).
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

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

function propositionWordRefusal(text, forms, field) {
  const w = propositionWordIn(text, forms);
  return w ? `${field} carries "${w}", a content word of the proposition — the reader does not hold the Strand's words (kogaki#1669)` : null;
}

function baseRefusal(base) {
  if (!isMap(base)) return "the correspondence table's `base` is not a `{ domain }` map";
  const extra = Object.keys(base).find((k) => k !== "domain");
  if (extra) return `base carries \`${extra}\`, which it does not declare — a base is \`{ domain }\` and has no kind (kogaki#1693)`;
  if (!Object.hasOwn(base, "domain")) return "base carries no `domain`";
  if (base.domain !== null && !isText(base.domain)) return "base.domain is neither one phrase nor null";
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

export function validateRbsTable(record, proposition, { movesDir = "moves", structure = null } = {}) {
  if (isMap(record) && Object.hasOwn(record, "pairs")) {
    return { error: "the correspondence table carries `pairs`, which it does not declare — its rows are `correspondences: [{ role, expression }]` (kogaki#1693)" };
  }
  if (!isMap(record) || !Array.isArray(record.correspondences) || !record.correspondences.length) {
    return { error: "the correspondence table carries no non-empty `correspondences` list" };
  }
  const b = baseRefusal(record.base);
  if (b) return { error: b };
  const forms = propositionForms(proposition);
  const placeholder = record.placeholder === true;
  for (const [i, c] of record.correspondences.entries()) {
    if (!isMap(c) || !Object.hasOwn(c, "role") || !Object.hasOwn(c, "expression")) {
      return { error: `correspondences[${i}] is not a \`{ role, expression }\` correspondence` };
    }
    if (!(placeholder && c.expression === null)) {
      if (!isText(c.expression)) return { error: `correspondences[${i}].expression is not one base text — only a placeholder table gives a Role null` };
      const r = propositionWordRefusal(c.expression, forms, `correspondences[${i}].expression`);
      if (r) return { error: r };
    }
    if (!isText(c.role)) return { error: `correspondences[${i}].role is not one Role id` };
    const r = propositionWordRefusal(c.role, forms, `correspondences[${i}].role`);
    if (r) return { error: r };
  }
  if (structure) {
    const roles = structure.roles.map((r) => r.id);
    for (const [i, c] of record.correspondences.entries()) {
      if (!roles.includes(c.role)) return { error: `correspondences[${i}].role ${JSON.stringify(c.role)} names no Role of the structure — it names ${roles.join(", ")}` };
    }
    for (const id of roles) {
      const n = record.correspondences.filter((c) => c.role === id).length;
      if (n !== 1) return { error: `the Role ${JSON.stringify(id)} has ${n} correspondences, and every Role has one` };
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
