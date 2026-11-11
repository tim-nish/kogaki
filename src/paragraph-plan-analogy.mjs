// The Analogy Mapping (kogaki#1778, owner decision 2026-11-10): before its first Leg unit the ParagraphPlan
// runs one judgment, `analogy_mapping`, over the Brief's `structure` and the Persona, and the article keeps the
// one base domain it names; every Leg bound to an analogy Move draws from it. [see: SPEC-draft-pipeline "the Analogy Mapping"]
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the Analogy Mapping
//       specs/spec-draft-pipeline/SPEC.md
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { personaPriorKnowledgeLine } from "./compose.mjs";

export const ANALOGY_ROW = "analogy_mapping";
export const ANALOGY_UNIT = "analogy";
export const ANALOGY_DIR = "analogy";
export const ANALOGY_FILE = "paragraph-plan-analogy.json";
export const NO_STRUCTURE_REASON = "the Brief carries no structure, so there is no system to map onto a base domain.";
// The key every call handed the mapping reads it under.
export const ANALOGY_INPUT_KEY = "analogy_you_must_draw_from";

const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const oneLine = (s) => String(s).replace(/\s*\n\s*/g, " ").trim();

// AN ANALOGY MOVE carries a `carry` entry among its `takes` or `leaves` (moves/ROLES.json).
export const isAnalogyMove = (contract) => [...((contract && contract.takes) || []), ...((contract && contract.leaves) || [])]
  .some((x) => isMap(x) && x.kind === "carry");

// The apex, and every relation and higher-order relation the structure reaches, in declared order.
export function reachedRelations(structure) {
  const s = isMap(structure) ? structure : {};
  const reach = new Set([...(Array.isArray(s.reach) ? s.reach : []), ...(isText(s.attains_thesis) ? [s.attains_thesis] : [])]);
  return [...(s.relations || []), ...(s.higher_order || [])].filter((r) => isMap(r) && reach.has(r.id));
}

export function analogyMappingInput(structure, persona) {
  const reached = new Set(reachedRelations(structure).map((r) => r.id));
  const pick = (r, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(r, k)).map((k) => [k, r[k]]));
  return {
    structure: {
      roles: (structure.roles || []).map((r) => pick(r, ["id", "name", "context", "attributes"])),
      relations: (structure.relations || []).filter((r) => reached.has(r.id)).map((r) => pick(r, ["id", "name", "between", "holds"])),
      higher_order: (structure.higher_order || []).filter((r) => reached.has(r.id)).map((r) => pick(r, ["id", "name", "relates", "holds"])),
      apex: structure.attains_thesis,
    },
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
  };
}

const MAPPING_KEYS = ["version", "base_domain", "roles", "relations"];
const NONE_KEYS = ["version", "none"];

// THE ANSWER, READ BACK (the declared validator). `inputs.structure` is the Brief's. Returns `{ error }` or `{}`.
export function validateAnalogyMapping(record, inputs) {
  const structure = (inputs && inputs.structure) || {};
  if (!isMap(record)) return { error: "the Analogy Mapping is not one record" };
  if (String(record.version) !== "1") return { error: `the Analogy Mapping's version is ${JSON.stringify(record.version)}, not "1"` };
  if (Object.hasOwn(record, "none")) {
    const extra = Object.keys(record).find((k) => !NONE_KEYS.includes(k));
    if (extra) return { error: `the Analogy Mapping answers \`none\` and carries \`${extra}\` — \`none\` carries its reason and nothing else` };
    return isText(record.none) ? {} : { error: "the Analogy Mapping answers `none` with no reason no base domain fits" };
  }
  const extra = Object.keys(record).find((k) => !MAPPING_KEYS.includes(k));
  if (extra) return { error: `the Analogy Mapping carries \`${extra}\`, which it does not declare — it carries ${MAPPING_KEYS.slice(1).join(", ")}, or \`none\`` };
  const b = record.base_domain;
  if (!isMap(b) || !isText(b.name) || !isText(b.description)) return { error: "the Analogy Mapping's `base_domain` is not a `{ name, description }` pair of texts" };
  const pairs = (list, key, ids, what) => {
    if (!Array.isArray(list)) return `the Analogy Mapping carries no \`${key}\` list`;
    const seen = new Set();
    for (const x of list) {
      if (!isMap(x) || !isText(x[what]) || !isText(x.counterpart)) return `an entry of \`${key}\` is not a \`{ ${what}, counterpart }\` pair of texts`;
      if (!ids.includes(x[what])) return `\`${key}\` names ${JSON.stringify(x[what])}, which is not a ${what === "role" ? "Role" : "reached relation"} of the structure`;
      if (seen.has(x[what])) return `\`${key}\` maps ${x[what]} twice`;
      seen.add(x[what]);
    }
    return seen;
  };
  const roleIds = (structure.roles || []).map((r) => r.id);
  const roles = pairs(record.roles, "roles", roleIds, "role");
  if (typeof roles === "string") return { error: roles };
  const missingRole = roleIds.find((id) => !roles.has(id));
  if (missingRole) return { error: `the Analogy Mapping leaves the Role ${missingRole} without a counterpart in the base domain` };
  const relIds = reachedRelations(structure).map((r) => r.id);
  const rels = pairs(record.relations, "relations", relIds, "relation");
  if (typeof rels === "string") return { error: rels };
  const apex = structure.attains_thesis;
  if (isText(apex) && !rels.has(apex)) return { error: `the Analogy Mapping leaves the apex ${apex} without a counterpart in the base domain` };
  const missingRel = relIds.find((id) => !rels.has(id));
  if (missingRel) return { error: `the Analogy Mapping leaves the reached relation ${missingRel} without a counterpart in the base domain` };
  return {};
}

// The mapping as `paragraph-plan.yaml` writes it under `analogy`.
export function analogyRecord(record) {
  if (Object.hasOwn(record, "none")) return { none: oneLine(record.none) };
  return { base_domain: { name: oneLine(record.base_domain.name), description: oneLine(record.base_domain.description) },
    roles: record.roles.map((x) => ({ role: x.role, counterpart: oneLine(x.counterpart) })),
    relations: record.relations.map((x) => ({ relation: x.relation, counterpart: oneLine(x.counterpart) })) };
}

// The run directory's mapping, once resolved; null while the opening step runs.
export const analogyPath = (dir) => join(dir, ANALOGY_FILE);
export function readAnalogy(dir) {
  if (!existsSync(analogyPath(dir))) return null;
  return JSON.parse(readFileSync(analogyPath(dir), "utf8")).analogy;
}
export function writeAnalogy(dir, analogy) {
  writeFileSync(analogyPath(dir), `${JSON.stringify({ analogy }, null, 2)}\n`);
}

// The mapping a call for a Leg bound to `contract` is handed: the base domain for an analogy Move, nothing otherwise.
export function analogyFor(contract, analogy) {
  return isAnalogyMove(contract) && isMap(analogy) && isMap(analogy.base_domain) ? analogy : null;
}
export const withAnalogy = (obj, contract, analogy) => {
  const a = analogyFor(contract, analogy);
  return a ? { ...obj, [ANALOGY_INPUT_KEY]: a } : obj;
};

// A Mapping Table grounded for an analogy Move names the article's base domain; a string to refuse with, or null.
export function groundedBaseRefusal(table, analogy) {
  const name = oneLine(analogy.base_domain.name).toLowerCase();
  const domain = isMap(table && table.base) && isText(table.base.domain) ? oneLine(table.base.domain).toLowerCase() : "";
  return domain.includes(name) ? null : `the table's base.domain ${JSON.stringify(domain)} is not the article's base domain `
    + `${JSON.stringify(analogy.base_domain.name)} — every analogy Move draws from the one Analogy Mapping, \`${ANALOGY_INPUT_KEY}\` in the input`;
}
