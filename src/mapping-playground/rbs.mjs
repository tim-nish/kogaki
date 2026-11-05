// The short Trial's correspondence table, refused or `{}` (kogaki#1669, kogaki#1671): its pairs,
// the base and its kind of match, an owner-supplied binding of one Move, and the projecting binding (kogaki#1676).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { moveContract, FUNCTION_WORDS, wordsOf, wordForms } from "../compose.mjs";
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

// A binding: `move` resolving in the library, and one `{ segment, point }` per segment, in order.
// `at` prefixes every field it names; `forms` null skips the claim-word test (the projecting binding).
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
    const r = forms ? claimWordRefusal(w.point, forms, `${field}.point`) : null;
    if (r) return r;
  }
  return null;
}

// The projecting binding (kogaki#1676): the first binding's shape under `projection.`, with no claim-word test,
// and only beside a first binding.
function projectionRefusal(record, movesDir) {
  if (!Object.hasOwn(record, "projection")) return null;
  const p = record.projection;
  if (!isMap(p)) return "projection is not a `{ move, waypoints, binding_rationale }` map";
  if (!Object.hasOwn(record, "move") || !Object.hasOwn(record, "waypoints")) {
    return "the correspondence table carries `projection` without `move` and `waypoints`: paragraph two projects what paragraph one's binding gave the reader";
  }
  if (!Object.hasOwn(p, "move") || !Object.hasOwn(p, "waypoints")) {
    return `the correspondence table carries \`projection\` without \`projection.${Object.hasOwn(p, "move") ? "waypoints" : "move"}\``;
  }
  return bindingRefusal(p, null, movesDir, "projection.");
}

export function validateRbsTable(record, claim, { movesDir = "moves" } = {}) {
  if (!isMap(record) || !Array.isArray(record.pairs) || !record.pairs.length) {
    return { error: "the correspondence table carries no non-empty `pairs` list" };
  }
  const b = baseRefusal(record.base);
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
  const m = bindingRefusal(record, forms, movesDir) || projectionRefusal(record, movesDir);
  return m ? { error: m } : {};
}

// The binding the owner supplied, as the `bind` stage's entry, or null where the table carries none.
export function suppliedEntry(record, serves) {
  if (!record || !Object.hasOwn(record, "move")) return null;
  return { waypoint: 1, move: record.move, binding_rationale: Object.hasOwn(record, "binding_rationale") ? String(record.binding_rationale).trim() : null,
    paragraph_waypoints: record.waypoints.map((w) => ({ point: String(w.point).trim(), serves: [...serves] })) };
}

// Every structure `attributes` word a projecting point carries, by the claim-word test's word forms (kogaki#1676):
// `{ segment, word, role }`, in segment order, recorded and never refused.
export function attributeHits(waypoints, attributes) {
  const roles = (Array.isArray(attributes) ? attributes : [])
    .map((a) => ({ role: a.role, forms: claimForms((Array.isArray(a.words) ? a.words : [a.words]).join(" ")) }));
  const hits = [];
  for (const w of waypoints) {
    for (const word of wordsOf(w.point)) {
      if (FUNCTION_WORDS.has(word) || /^[\p{N}]+$/u.test(word)) continue;
      const forms = [...wordForms(word)];
      for (const r of roles) {
        if (forms.some((f) => r.forms.has(f)) && !hits.some((h) => h.segment === w.segment && h.word === word && h.role === r.role)) {
          hits.push({ segment: w.segment, word, role: r.role });
        }
      }
    }
  }
  return hits;
}
