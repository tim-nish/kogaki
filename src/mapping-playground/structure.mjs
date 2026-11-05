// The Structure-Mapping Playground's inputs, read and refused (kogaki#1664): the strand file,
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

// The strand file: a `cite:` line and a `claim:` line, a blank line, then the served rendering.
export function parseStrandFile(text) {
  const lines = String(text).split("\n");
  const blank = lines.findIndex((l) => l.trim() === "");
  const head = blank < 0 ? lines : lines.slice(0, blank);
  const field = (key) => {
    const l = head.find((x) => x.startsWith(`${key}:`));
    return l === undefined ? null : l.slice(key.length + 1).trim();
  };
  const cite = field("cite");
  const claim = field("claim");
  const rendering = blank < 0 ? "" : lines.slice(blank + 1).join("\n").trim();
  if (!cite) return { error: "the strand file carries no `cite:` line before its first blank line" };
  if (!CITE.test(cite)) return { error: `the strand file's \`cite:\` ${JSON.stringify(cite)} is not a UnitID at a content hash` };
  if (!claim) return { error: "the strand file carries no `claim:` line before its first blank line" };
  if (!rendering) return { error: "the strand file carries no served rendering below its `cite:` and `claim:` lines" };
  return { cite, claim, rendering };
}

// The content words of the Strand's claim, as the forms `wordForms` folds them to: the word test
// `recoverabilityOf` runs, inverted.
export function claimForms(claim) {
  const forms = new Set();
  for (const w of wordsOf(claim)) {
    if (FUNCTION_WORDS.has(w) || /^[\p{N}]+$/u.test(w)) continue;
    for (const f of wordForms(w)) forms.add(f);
  }
  return forms;
}

// The first word of `text` that is a content word of the claim, or null.
export function claimWordIn(text, forms) {
  for (const w of wordsOf(text)) {
    if (FUNCTION_WORDS.has(w) || /^[\p{N}]+$/u.test(w)) continue;
    if ([...wordForms(w)].some((f) => forms.has(f))) return w;
  }
  return null;
}

function claimWordRefusal(text, forms, field) {
  const w = claimWordIn(text, forms);
  return w ? `${field} carries "${w}", a content word of the Strand's claim — the reader does not hold the Strand's words (kogaki#1664)` : null;
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

// The RelationalStructure record, refused or `{}`. `strand` is `parseStrandFile`'s answer.
// `attributes` is optional and carried for the owner's inspection only (kogaki#1671).
export function validateStructure(record, strand) {
  const keys = ["strand", "roles", "relations", "higher_order"];
  const bad = keysRefusal(record, isMap(record) && "attributes" in record ? [...keys, "attributes"] : keys, "the structure");
  if (bad) return { error: bad };
  if (record.strand !== strand.cite) {
    return { error: `the structure's \`strand\` ${JSON.stringify(record.strand)} is not the strand file's \`cite:\` ${JSON.stringify(strand.cite)}` };
  }
  const forms = claimForms(strand.claim);
  const ids = new Set();
  const listOf = (key) => (Array.isArray(record[key]) && record[key].length ? record[key] : null);
  const roles = listOf("roles");
  if (!roles) return { error: "the structure's `roles` is not a non-empty list" };
  for (const [i, r] of roles.entries()) {
    const at = `roles[${i}]`;
    const b = keysRefusal(r, ["id", "context"], at);
    if (b) return { error: b };
    if (!isText(r.id) || ids.has(r.id)) return { error: `${at}'s \`id\` is empty or not unique` };
    if (!isText(r.context)) return { error: `${at}'s \`context\` is empty` };
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
  if ("attributes" in record) {
    if (!Array.isArray(record.attributes)) return { error: "the structure's `attributes` is not a list" };
    for (const [i, a] of record.attributes.entries()) {
      const at = `attributes[${i}]`;
      const ab = keysRefusal(a, ["role", "words"], at);
      if (ab) return { error: ab };
      if (!roleIds.has(a.role)) return { error: `${at}'s \`role\` names ${JSON.stringify(a.role)}, which is no Role's id` };
    }
  }
  const texts = [
    ...roles.map((r, i) => [r.context, `roles[${i}].context`]),
    ...relations.map((r, i) => [r.holds, `relations[${i}].holds`]),
    ...higher.map((h, i) => [h.holds, listed ? `higher_order[${i}].holds` : "higher_order.holds"]),
  ];
  for (const [text, field] of texts) {
    const r = claimWordRefusal(text, forms, field);
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

// The Trial's Leg, refused or `{}`: the claim-word test first, then the Proof Sheet's own
// validator over the Leg. `inputs` carries `holds`, `claim`, `reader_start` and `segments`.
export function validateSmpLegUnit(record, inputs) {
  const leg = isMap(record) && Array.isArray(record.legs) && record.legs.length === 1 ? record.legs[0] : null;
  if (isMap(leg)) {
    if ("introduces" in leg) return { error: "leg 1 carries `introduces` — a Trial's Leg introduces no term (kogaki#1664)" };
    const forms = claimForms(inputs.claim);
    for (const [i, w] of (Array.isArray(leg.waypoints) ? leg.waypoints : []).entries()) {
      const r = isMap(w) && typeof w.point === "string" ? claimWordRefusal(w.point, forms, `leg 1: waypoints[${i}].point`) : null;
      if (r) return { error: r };
    }
    const after = typeof leg.reader_state_after === "string" ? claimWordRefusal(leg.reader_state_after, forms, "leg 1: reader_state_after") : null;
    if (after) return { error: after };
    for (const [i, g] of (Array.isArray(leg.claims) ? leg.claims : []).entries()) {
      if (isMap(g) && inputs.holds[i] !== undefined && g.proposition !== inputs.holds[i]) {
        return { error: `leg 1: Claim ${i + 1}'s \`proposition\` is not entry ${i + 1}'s \`holds\` word for word: ${JSON.stringify(inputs.holds[i])}` };
      }
    }
  }
  return validateLegPathUnit(record, { paragraph_count: inputs.holds.length, reader_start: inputs.reader_start, segments: inputs.segments });
}
