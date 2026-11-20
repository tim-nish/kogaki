// The short Trial's correspondence table, refused or `{}` (kogaki#1669, kogaki#1671): one table per bound Move (kogaki#1709),
// each its base (kogaki#1693) and correspondences, an owner-supplied binding of one Move, and the projecting bindings
// (kogaki#1681).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { moveContract } from "../compose.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

function baseRefusal(base, at = "") {
  if (!isMap(base)) return `${at}base is not a \`{ domain }\` map`;
  const extra = Object.keys(base).find((k) => k !== "domain");
  if (extra)
    return `${at}base carries \`${extra}\`, which it does not declare — a base is \`{ domain }\` and has no kind (kogaki#1693)`;
  if (!Object.hasOwn(base, "domain")) return `${at}base carries no \`domain\``;
  if (!isText(base.domain)) return `${at}base.domain is not one phrase`;
  return null;
}

// A binding: `move` resolving in the library, and `binding_rationale` where given (kogaki#1883). `at` prefixes every field it
// names. `beside` holds the keys the record declares beside the binding's two; any other key is refused naming it (kogaki#1885).
function bindingRefusal(record, movesDir, at = "", beside = []) {
  if (Object.hasOwn(record, "grounds"))
    return `${at}grounds is no field of a binding: why the Move was chosen is \`${at}binding_rationale\` (kogaki#1678)`;
  const extra = Object.keys(record).find((k) => !["move", "binding_rationale", ...beside].includes(k));
  if (extra) return `\`${at}${extra}\` is no field of a binding: a binding carries \`move\` and \`binding_rationale\``;
  if (Object.hasOwn(record, "binding_rationale") && !isText(record.binding_rationale)) {
    return `${at}binding_rationale is not one text — why the Move was chosen (kogaki#1675)`;
  }
  if (!Object.hasOwn(record, "move")) return null;
  if (!isText(record.move)) return `${at}move is not one Move id`;
  const c = moveContract(record.move, movesDir);
  if (c.error) return `${at}move ${JSON.stringify(record.move)} names no Move of the library ${movesDir}: ${c.error}`;
  return null;
}

// The projecting bindings in order (kogaki#1681): `projection` is a list, and a map is a list of one.
export function projectionsOf(record) {
  if (!record || !Object.hasOwn(record, "projection")) return [];
  return Array.isArray(record.projection) ? record.projection : [record.projection];
}

// Each projecting binding has the first binding's shape, and only beside a first binding.
function projectionRefusal(record, movesDir) {
  if (!Object.hasOwn(record, "projection")) return null;
  const list = projectionsOf(record);
  if (!list.length)
    return "projection is an empty list: it carries one `{ move, binding_rationale }` per further paragraph";
  if (!Object.hasOwn(record, "move")) {
    return "the correspondence table carries `projection` without `move`: a projecting paragraph projects what paragraph one's binding gave the reader";
  }
  for (const [i, p] of list.entries()) {
    const at = `projection[${i}].`;
    if (!isMap(p)) return `projection[${i}] is not a \`{ move, binding_rationale }\` map`;
    const r = bindingRefusal(p, movesDir, at);
    if (r) return r;
    if (!Object.hasOwn(p, "move")) return `the correspondence table carries \`projection[${i}]\` without \`${at}move\``;
  }
  return null;
}

// ONE TABLE (kogaki#1693, kogaki#1709): `{ base, correspondences }`, its fields named under `at`. The `correspondence` row's
// answer is one table; the owner's file carries one per bound Move under `tables`.
// Each refusal carries its group (kogaki#1708): `shape`, `base` or `role`.
function tableRefusal(t, structure, at = "") {
  if (!Array.isArray(t.correspondences) || !t.correspondences.length) {
    return { group: "shape", error: `the correspondence table carries no non-empty \`${at}correspondences\` list` };
  }
  const b = baseRefusal(t.base, at);
  if (b) return { group: "base", error: b };
  for (const [i, c] of t.correspondences.entries()) {
    const f = `${at}correspondences[${i}]`;
    if (!isMap(c) || !Object.hasOwn(c, "role") || !Object.hasOwn(c, "expression")) {
      return { group: "shape", error: `${f} is not a \`{ role, expression }\` correspondence` };
    }
    if (!isText(c.expression)) return { group: "shape", error: `${f}.expression is not one base text` };
    if (!isText(c.role)) return { group: "role", error: `${f}.role is not one Role id` };
  }
  if (structure) {
    const roles = structure.roles.map((r) => r.id);
    for (const [i, c] of t.correspondences.entries()) {
      if (!roles.includes(c.role)) {
        return {
          group: "role",
          error: `${at}correspondences[${i}].role ${JSON.stringify(c.role)} names no Role of the structure — it names ${roles.join(", ")}`,
        };
      }
    }
    for (const id of roles) {
      const n = t.correspondences.filter((c) => c.role === id).length;
      if (n !== 1) {
        return {
          group: "role",
          error: `${at ? `${at.slice(0, -1)}: ` : ""}the Role ${JSON.stringify(id)} has ${n} correspondences, and every Role has one`,
        };
      }
    }
  }
  return null;
}

// The Mapping Record's `table.yaml` is this table with its `move` and `case` beside it (kogaki#1733).
export function validateCorrespondenceTable(table, { structure = null } = {}) {
  if (!isMap(table))
    return { group: "shape", error: "the correspondence table is not a `{ base, correspondences }` record" };
  for (const k of ["move", "case"]) {
    if (Object.hasOwn(table, k) && !isText(table[k]))
      return { group: "shape", error: `the correspondence table's \`${k}\` is not one text` };
  }
  const r = tableRefusal(table, structure);
  return r || {};
}

// The Moves the owner's file binds, in order: the first binding's, then each projecting binding's.
export const boundMovesOf = (record) =>
  Object.hasOwn(record, "move") ? [record.move, ...projectionsOf(record).map((p) => p.move)] : [];

// `_proposition` is no longer read: what an expression names is the owner's reading (kogaki#1707).
// Each refusal carries its group (kogaki#1708): `shape`, `base` or `role`.
export function validateRbsTable(record, _proposition, { movesDir = "moves", structure = null } = {}) {
  if (isMap(record) && Object.hasOwn(record, "pairs")) {
    return {
      group: "shape",
      error:
        "the correspondence table carries `pairs`, which it does not declare — its rows are `correspondences: [{ role, expression }]` (kogaki#1693)",
    };
  }
  const root = isMap(record) && ["base", "correspondences"].find((k) => Object.hasOwn(record, k));
  if (root) {
    return {
      group: "shape",
      error: `the correspondence table carries a root \`${root}\`, which is retired — its tables are \`tables: [{ move, base, correspondences }]\`, one per bound Move (kogaki#1709)`,
    };
  }
  if (!isMap(record) || !Array.isArray(record.tables) || !record.tables.length) {
    return {
      group: "shape",
      error:
        "the correspondence table carries no non-empty `tables` list of `{ move, base, correspondences }`, one per bound Move (kogaki#1709)",
    };
  }
  for (const [i, t] of record.tables.entries()) {
    const at = `tables[${i}].`;
    if (!isMap(t)) return { group: "shape", error: `tables[${i}] is not a \`{ move, base, correspondences }\` map` };
    const extra = Object.keys(t).find((k) => !["move", "base", "correspondences"].includes(k));
    if (extra)
      return {
        group: "shape",
        error: `tables[${i}] carries \`${extra}\`, which it does not declare — a table is \`{ move, base, correspondences }\``,
      };
    if (!isText(t.move)) return { group: "shape", error: `${at}move is not one Move id` };
    const r = tableRefusal(t, structure, at);
    if (r) return r;
  }
  const m = bindingRefusal(record, movesDir, "", ["tables", "projection"]) || projectionRefusal(record, movesDir);
  if (m) return { group: "shape", error: m };
  const bound = boundMovesOf(record);
  if (bound.length) {
    const stray = record.tables.findIndex((t) => !bound.includes(t.move));
    if (stray !== -1) {
      return {
        group: "shape",
        error: `tables[${stray}].move ${JSON.stringify(record.tables[stray].move)} matches no binding — the bindings bind ${bound.join(", ")}`,
      };
    }
    if (record.tables.length !== bound.length || record.tables.some((t, i) => t.move !== bound[i])) {
      return {
        group: "shape",
        error: `tables carries ${record.tables.map((t) => t.move).join(", ")}, and it carries one table per binding in the bindings' order: ${bound.join(", ")}`,
      };
    }
  }
  return {};
}

// The binding the owner supplied, as the `bind` stage's entry, or null where the table carries none.
export function suppliedEntry(record) {
  if (!record || !Object.hasOwn(record, "move")) return null;
  return {
    move: record.move,
    binding_rationale: Object.hasOwn(record, "binding_rationale") ? String(record.binding_rationale).trim() : null,
  };
}
