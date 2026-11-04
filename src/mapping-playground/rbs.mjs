// The short Trial's correspondence table, refused or `{}` (kogaki#1669, kogaki#1671): its pairs,
// the base and its kind of match, and an owner-supplied binding of one Move.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { moveContract } from "../compose.mjs";
import { claimForms, claimWordIn } from "./structure.mjs";

// The four kinds of match of Gentner 1983.
export const BASE_KINDS = ["analogy", "abstraction", "literal-similarity", "mere-appearance"];

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// Every string a `target` carries: the prose itself, or each leaf of a mapping.
function targetTexts(target) {
  if (typeof target === "string") return [target];
  if (Array.isArray(target)) return target.flatMap(targetTexts);
  if (isMap(target)) return Object.values(target).flatMap(targetTexts);
  return [];
}

function claimWordRefusal(text, forms, field) {
  const w = claimWordIn(text, forms);
  return w ? `${field} carries "${w}", a content word of the Strand's claim — the reader does not hold the Strand's words (kogaki#1669)` : null;
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

// The supplied binding: `move` resolving in the library, and one `{ segment, point }` per segment, in order.
function bindingRefusal(record, forms, movesDir) {
  const hasMove = Object.hasOwn(record, "move");
  const hasWaypoints = Object.hasOwn(record, "waypoints");
  if (!hasMove && !hasWaypoints) return null;
  if (!hasMove || !hasWaypoints) return `the correspondence table carries \`${hasMove ? "move" : "waypoints"}\` without \`${hasMove ? "waypoints" : "move"}\``;
  if (!isText(record.move)) return "move is not one Move id";
  const c = moveContract(record.move, movesDir);
  if (c.error) return `move ${JSON.stringify(record.move)} names no Move of the library ${movesDir}: ${c.error}`;
  const n = c.segments.length;
  if (!Array.isArray(record.waypoints) || record.waypoints.length !== n) {
    return `waypoints carries ${Array.isArray(record.waypoints) ? record.waypoints.length : "no list of"} entries, and the Move ${record.move} has ${n} segments`;
  }
  for (const [i, w] of record.waypoints.entries()) {
    const at = `waypoints[${i}]`;
    if (!isMap(w) || w.segment !== i + 1) return `${at} is not \`{ segment: ${i + 1}, point }\``;
    if (!isText(w.point)) return `${at}.point is empty`;
    const r = claimWordRefusal(w.point, forms, `${at}.point`);
    if (r) return r;
  }
  return null;
}

export function validateRbsTable(record, claim, { movesDir = "moves" } = {}) {
  if (!isMap(record) || !Array.isArray(record.pairs) || !record.pairs.length) {
    return { error: "the correspondence table carries no non-empty `pairs` list" };
  }
  const b = Object.hasOwn(record, "base") ? baseRefusal(record.base) : null;
  if (b) return { error: b };
  const forms = claimForms(claim);
  for (const [i, p] of record.pairs.entries()) {
    if (!isMap(p) || !Object.hasOwn(p, "base") || !Object.hasOwn(p, "target")) {
      return { error: `pairs[${i}] is not a \`{ base, target }\` pair` };
    }
    const texts = targetTexts(p.target).filter((t) => t.trim() !== "");
    if (!texts.length) return { error: `pairs[${i}].target is empty` };
    for (const t of texts) {
      const r = claimWordRefusal(t, forms, `pairs[${i}].target`);
      if (r) return { error: r };
    }
  }
  const m = bindingRefusal(record, forms, movesDir);
  return m ? { error: m } : {};
}

// The binding the owner supplied, as the `bind` stage's entry, or null where the table carries none.
export function suppliedEntry(record, serves) {
  if (!Object.hasOwn(record, "move")) return null;
  return { waypoint: 1, move: record.move,
    paragraph_waypoints: record.waypoints.map((w) => ({ point: String(w.point).trim(), serves: [...serves] })) };
}
