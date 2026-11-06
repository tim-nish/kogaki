// The Structure-Mapping Playground's inputs, read and refused (kogaki#1664): the proposition file,
// the owner-authored RelationalStructure, and the Trial's one Leg.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Structure-Mapping Playground
//       specs/spec-draft-pipeline/SPEC.md
//
import { FUNCTION_WORDS, wordsOf, wordForms } from "../compose.mjs";
import { validateLegPathUnit } from "../proof-sheet/leg-brief.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const CITE = /^\S+::\S+\/\S+@[0-9a-f]{12,}$/;

// The proposition file (kogaki#1685): a `cite:` line and a `proposition:` line, and nothing else.
export function parseProposition(text) {
  const lines = String(text).split("\n");
  const field = (key) => {
    const l = lines.find((x) => x.startsWith(`${key}:`));
    return l === undefined ? null : l.slice(key.length + 1).trim();
  };
  if (field("claim") !== null) return { error: "the proposition file carries a `claim:` line — its sentence is the `proposition:` line" };
  const cite = field("cite");
  const proposition = field("proposition");
  if (!cite) return { error: "the proposition file carries no `cite:` line" };
  if (!CITE.test(cite)) return { error: `the proposition file's \`cite:\` ${JSON.stringify(cite)} is not a UnitID at a content hash` };
  if (!proposition) return { error: "the proposition file carries no `proposition:` line" };
  for (const key of ["cite", "proposition"]) {
    if (lines.filter((l) => l.startsWith(`${key}:`)).length > 1) return { error: `the proposition file carries more than one \`${key}:\` line` };
  }
  const last = Math.max(lines.findIndex((l) => l.startsWith("cite:")), lines.findIndex((l) => l.startsWith("proposition:")));
  const stray = lines.findIndex((l) => l.trim() !== "" && !l.startsWith("cite:") && !l.startsWith("proposition:"));
  if (stray > last) return { error: "the proposition file carries text below its two lines; a Strand's rendering is not an input of the Playground" };
  if (stray >= 0) return { error: `the proposition file carries ${JSON.stringify(lines[stray].trim())} beside its two lines — it carries \`cite:\` and \`proposition:\` and nothing else` };
  return { cite, proposition };
}

// The content words of the proposition, as the forms `wordForms` folds them to: the word test
// `recoverabilityOf` runs, inverted.
export function propositionForms(proposition) {
  const forms = new Set();
  for (const w of wordsOf(proposition)) {
    if (FUNCTION_WORDS.has(w) || /^[\p{N}]+$/u.test(w)) continue;
    for (const f of wordForms(w)) forms.add(f);
  }
  return forms;
}

// The first word of `text` that is a content word of the proposition, or null.
export function propositionWordIn(text, forms) {
  for (const w of wordsOf(text)) {
    if (FUNCTION_WORDS.has(w) || /^[\p{N}]+$/u.test(w)) continue;
    if ([...wordForms(w)].some((f) => forms.has(f))) return w;
  }
  return null;
}

function propositionWordRefusal(text, forms, field) {
  const w = propositionWordIn(text, forms);
  return w ? `${field} carries "${w}", a content word of the proposition — the reader does not hold the Strand's words (kogaki#1664)` : null;
}

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// The structure's higher-order relations as a list (kogaki#1678): the list itself, the one-map form read as
// a list of one with id `h1`, or null where `higher_order` is neither.
export function higherOrderOf(record) {
  const h = isMap(record) ? record.higher_order : undefined;
  if (Array.isArray(h)) return h.length ? h : null;
  return isMap(h) ? [{ id: "h1", ...h }] : null;
}

// The RelationalStructure record, refused or `{}`. `proposition` is `parseProposition`'s answer.
export function validateStructure(record, proposition) {
  const bad = keysRefusal(record, ["strand", "roles", "relations", "higher_order"], "the structure");
  if (bad) return { error: bad };
  if (record.strand !== proposition.cite) {
    return { error: `the structure's \`strand\` ${JSON.stringify(record.strand)} is not the proposition file's \`cite:\` ${JSON.stringify(proposition.cite)}` };
  }
  const forms = propositionForms(proposition.proposition);
  const ids = new Set();
  const listOf = (key) => (Array.isArray(record[key]) && record[key].length ? record[key] : null);
  const roles = listOf("roles");
  if (!roles) return { error: "the structure's `roles` is not a non-empty list" };
  for (const [i, r] of roles.entries()) {
    const at = `roles[${i}]`;
    const b = keysRefusal(r, ["id", "context", "attributes"], at);
    if (b) return { error: isMap(r) && isText(r.id) ? `${b} (the Role ${JSON.stringify(r.id)})` : b };
    if (!isText(r.id) || ids.has(r.id)) return { error: `${at}'s \`id\` is empty or not unique` };
    if (!isText(r.context)) return { error: `${at}'s \`context\` is empty` };
    if (!Array.isArray(r.attributes)) return { error: `the Role ${JSON.stringify(r.id)}'s \`attributes\` is not a list` };
    for (const [n, a] of r.attributes.entries()) {
      if (!isText(a)) return { error: `the Role ${JSON.stringify(r.id)}'s \`attributes[${n}]\` is empty or not text` };
      if (r.attributes.indexOf(a) !== n) return { error: `the Role ${JSON.stringify(r.id)}'s \`attributes[${n}]\` repeats ${JSON.stringify(a)}` };
    }
    ids.add(r.id);
  }
  const relations = listOf("relations");
  if (!relations) return { error: "the structure's `relations` is not a non-empty list" };
  const roleIds = new Set(ids);
  const relationIds = new Set();
  for (const [i, r] of relations.entries()) {
    const at = `relations[${i}]`;
    const b = keysRefusal(r, ["id", "between", "holds"], at);
    if (b) return { error: b };
    if (!isText(r.id) || ids.has(r.id)) return { error: `${at}'s \`id\` is empty or not unique` };
    if (!Array.isArray(r.between) || r.between.length < 2) return { error: `${at}'s \`between\` names fewer than two Roles` };
    const stray = r.between.find((x) => !roleIds.has(x));
    if (stray !== undefined) return { error: `${at}'s \`between\` names ${JSON.stringify(stray)}, which is no Role's id` };
    if (!isText(r.holds)) return { error: `${at}'s \`holds\` is empty` };
    ids.add(r.id);
    relationIds.add(r.id);
  }
  const higher = higherOrderOf(record);
  if (!higher) return { error: "the structure's `higher_order` is neither a `{ relates, holds }` map nor a non-empty list of `{ id, relates, holds }`" };
  if (higher.length > 1) return { error: `the structure's \`higher_order\` carries ${higher.length} entries, and a proposition has one higher-order relation` };
  const listed = Array.isArray(record.higher_order);
  for (const [i, h] of higher.entries()) {
    const at = listed ? `higher_order[${i}]` : "higher_order";
    const b = keysRefusal(listed ? h : record.higher_order, listed ? ["id", "relates", "holds"] : ["relates", "holds"], at);
    if (b) return { error: b };
    if (!listed && ids.has(h.id)) return { error: "higher_order is read as `h1`, which a Role or relation already names: rename that element or write higher_order as a list" };
    if (!isText(h.id) || ids.has(h.id)) return { error: `${at}'s \`id\` is empty or not unique` };
    if (!Array.isArray(h.relates) || h.relates.length < 2) return { error: `${at}'s \`relates\` names fewer than two relations` };
    const stray = h.relates.find((x) => !relationIds.has(x));
    if (stray !== undefined) return { error: `${at}'s \`relates\` names ${JSON.stringify(stray)}, which is no relation's id` };
    if (!isText(h.holds)) return { error: `${at}'s \`holds\` is empty` };
    ids.add(h.id);
  }
  const texts = [
    ...roles.map((r, i) => [r.context, `roles[${i}].context`]),
    ...relations.map((r, i) => [r.holds, `relations[${i}].holds`]),
    ...higher.map((h, i) => [h.holds, listed ? `higher_order[${i}].holds` : "higher_order.holds"]),
  ];
  for (const [text, field] of texts) {
    const r = propositionWordRefusal(text, forms, field);
    if (r) return { error: r };
  }
  return {};
}

// The Leg's Claims, one per relation in order and then one per higher-order relation: each `holds`
// sentence, with the `material` its Claim and point are recovered from.
export function structureClaims(record) {
  const role = new Map(record.roles.map((r) => [r.id, r.context]));
  const relation = new Map(record.relations.map((r) => [r.id, r]));
  const rows = record.relations.map((r) => ({ from: r.id, holds: r.holds, material: [r.holds, ...r.between.map((id) => role.get(id))] }));
  for (const h of higherOrderOf(record)) {
    const under = h.relates.map((id) => relation.get(id));
    rows.push({ from: h.id, holds: h.holds,
      material: [h.holds, ...under.map((r) => r.holds), ...[...new Set(under.flatMap((r) => r.between))].map((id) => role.get(id))] });
  }
  return rows.map((r, i) => ({ claim_strand: `L${i + 1}`, ...r }));
}

// The Trial's Leg, refused or `{}`: the proposition-word test first, then the Proof Sheet's own
// validator over the Leg. `inputs` carries `holds`, `proposition`, `reader_start` and `segments`.
export function validateSmpLegUnit(record, inputs) {
  const leg = isMap(record) && Array.isArray(record.legs) && record.legs.length === 1 ? record.legs[0] : null;
  if (isMap(leg)) {
    if ("introduces" in leg) return { error: "leg 1 carries `introduces` — a Trial's Leg introduces no term (kogaki#1664)" };
    const forms = propositionForms(inputs.proposition);
    for (const [i, w] of (Array.isArray(leg.waypoints) ? leg.waypoints : []).entries()) {
      const r = isMap(w) && typeof w.point === "string" ? propositionWordRefusal(w.point, forms, `leg 1: waypoints[${i}].point`) : null;
      if (r) return { error: r };
    }
    const after = typeof leg.reader_state_after === "string" ? propositionWordRefusal(leg.reader_state_after, forms, "leg 1: reader_state_after") : null;
    if (after) return { error: after };
    for (const [i, g] of (Array.isArray(leg.claims) ? leg.claims : []).entries()) {
      if (isMap(g) && inputs.holds[i] !== undefined && g.proposition !== inputs.holds[i]) {
        return { error: `leg 1: Claim ${i + 1}'s \`proposition\` is not entry ${i + 1}'s \`holds\` word for word: ${JSON.stringify(inputs.holds[i])}` };
      }
    }
  }
  return validateLegPathUnit(record, { paragraph_count: inputs.holds.length, reader_start: inputs.reader_start, segments: inputs.segments });
}
