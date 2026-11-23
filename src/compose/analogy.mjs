// compose/analogy — a Brief's Bases (kogaki#1957): `analogy.yaml` beside the Brief's three files, edited by hand,
// holding one key, `bases`. The one reader of the file, the one writer that appends to it, and the reach of a Leg its
// Bases are read against. The file is not part of the Brief's hash.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";

export const ANALOGY_FILE = "analogy.yaml";
const WIDTH = 120;
const HEADER =
  "The Brief's Bases: situations a reader knows in which Relations of the Brief hold. Edited by hand; " +
  "`node src/analogy.mjs propose` appends Bases and changes none already here.";
const BASE_ID = /^b_(\d+)$/;

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

export const analogyPathFor = (briefPath) => join(dirname(resolve(briefPath)), ANALOGY_FILE);

// THE REACH OF A RELATION: the Roles and the Relations it reaches, itself included, each in the order of the Brief's
// lists. A relation among Roles reaches its `between`; one among relations reaches each relation it `relates`.
export function relationReach(structure, relationId) {
  const relations = new Map((structure.relations || []).map((r) => [r.id, r]));
  const roles = new Set();
  const reached = new Set();
  const walk = (id) => {
    if (reached.has(id) || !relations.has(id)) return;
    reached.add(id);
    const r = relations.get(id);
    if (Array.isArray(r.relates)) r.relates.forEach(walk);
    else (r.between || []).forEach((x) => roles.add(x));
  };
  walk(relationId);
  return {
    roles: (structure.roles || []).filter((r) => roles.has(r.id)),
    relations: (structure.relations || []).filter((r) => reached.has(r.id)),
  };
}

// A Base TELLS A LEG where its `relations` names the Leg's relation, its CentralClaim, and each relation that relation
// `relates`, its Arguments. An Argument that is a Role is told by the thing the check requires for it.
export function baseTellsRelation(base, structure, relationId) {
  const told = isMap(base.relations) ? base.relations : {};
  const central = (structure.relations || []).find((r) => r.id === relationId);
  if (!central || !Object.hasOwn(told, relationId)) return false;
  return (Array.isArray(central.relates) ? central.relates : []).every((id) => Object.hasOwn(told, id));
}

export const basesTelling = (record, structure, relationId) =>
  record.bases.filter((b) => baseTellsRelation(b, structure, relationId)).map((b) => b.id);

// THE REFUSALS THE FILE MEETS, each naming the Base and, where it is one, the key. Returns an error string or null.
export function analogyRefusal(record, structure, at) {
  if (!isMap(record) || !Array.isArray(record.bases)) return `${at} holds no \`bases\` list`;
  const roleIds = new Set((structure.roles || []).map((r) => r.id));
  const relationIds = new Set((structure.relations || []).map((r) => r.id));
  const seen = new Set();
  for (const [i, base] of record.bases.entries()) {
    if (!isMap(base)) return `${at}, Base ${i + 1}: it is not a map`;
    const id = base.id;
    if (!isText(id)) return `${at}, Base ${i + 1}: it has no \`id\``;
    if (seen.has(id)) return `${at}, Base ${id}: two Bases share the id ${id}`;
    seen.add(id);
    if (!isText(base.name)) return `${at}, Base ${id}: it has no \`name\``;
    if (!isText(base.description)) return `${at}, Base ${id}: it has no \`description\``;
    for (const key of ["roles", "relations"]) {
      if (base[key] !== undefined && !isMap(base[key])) return `${at}, Base ${id}: its \`${key}\` is not a map`;
    }
    const roles = base.roles || {};
    const relations = base.relations || {};
    for (const k of Object.keys(roles)) {
      if (!roleIds.has(k)) return `${at}, Base ${id}: its \`roles\` key ${k} names no Role`;
      if (!isText(roles[k])) return `${at}, Base ${id}: its \`roles\` key ${k} gives no thing`;
    }
    for (const k of Object.keys(relations)) {
      if (!relationIds.has(k)) return `${at}, Base ${id}: its \`relations\` key ${k} names no Relation`;
      if (!isText(relations[k])) return `${at}, Base ${id}: its \`relations\` key ${k} gives no sentence`;
    }
    for (const k of Object.keys(relations)) {
      const missing = relationReach(structure, k).roles.find((r) => !Object.hasOwn(roles, r.id));
      if (missing) {
        return `${at}, Base ${id}: it tells the Relation ${k} and gives no thing for the Role ${missing.id}, which ${k} reaches`;
      }
    }
  }
  return null;
}

// THE ONE READER: `{ absent: true }` where there is no file, `{ record, text }`, or `{ error }`.
export function readAnalogy(briefPath, structure) {
  const path = analogyPathFor(briefPath);
  if (!existsSync(path)) return { absent: true, path };
  const at = relFromRepo(path);
  let text;
  let record;
  try {
    text = readFileSync(path, "utf8");
    record = parseYaml(text, at);
  } catch (e) {
    return { error: `${at} cannot be read (${e.message})` };
  }
  const refusal = analogyRefusal(record, structure, at);
  return refusal ? { error: refusal } : { record, text, path };
}

// The next free ids after every `b_<n>` the record holds, `count` of them.
export function nextBaseIds(record, count) {
  const top = Math.max(
    0,
    ...((record && record.bases) || []).map((b) => Number((BASE_ID.exec(b && b.id) || [])[1] || 0)),
  );
  return Array.from({ length: count }, (_, k) => `b_${top + k + 1}`);
}

// THE ONE WRITER: `bases` appended after every Base the file holds. Where the file is there its text is kept and the
// new Bases' text added at its end; where that would not read back as the file's Bases followed by the new ones, the
// file is written whole from the record, every Base kept as it reads.
export function appendBases(path, current, bases) {
  const record = current && current.record ? current.record : { bases: [] };
  const want = { ...record, bases: [...record.bases, ...bases] };
  if (current && typeof current.text === "string") {
    const items = stringifyYaml({ bases }, { width: WIDTH }).replace(/^bases:\n/, "");
    const text = `${current.text.replace(/\n*$/, "\n")}${items}`;
    let back;
    try {
      back = parseYaml(text, path);
    } catch {
      back = null;
    }
    if (isDeepStrictEqual(back, want)) {
      writeFileSync(path, text);
      return;
    }
  }
  writeFileSync(path, stringifyYaml(want, { width: WIDTH, header: HEADER }));
}

// THE BASE A LEG TAKES (kogaki#1959), read only for a Leg whose Segments hold one of domain `apart` or `both`: the
// Base its `base` names, or with none the first Base of the file that tells it. Returns `{ base }`, `{ base: null }`
// for a Leg with no such Segment, or `{ error }` naming the Leg.
export const SITUATED_DOMAINS = Object.freeze(["apart", "both"]);
export const legIsSituated = (segments) => (segments || []).some((s) => SITUATED_DOMAINS.includes(s && s.domain));
export function legBase(briefPath, structure, leg, chosen = leg.base) {
  if (!legIsSituated(leg.segments)) return { base: null };
  const at = `Leg ${leg.leg_id}`;
  const propose = `\`node src/analogy.mjs propose --brief ${relFromRepo(resolve(briefPath))} --leg ${leg.leg_id}\``;
  const a = readAnalogy(briefPath, structure);
  if (a.error) return { error: `${at}: ${a.error}` };
  const bases = a.absent ? [] : a.record.bases;
  const tells = (b) => baseTellsRelation(b, structure, leg.relation);
  if (chosen !== undefined && chosen !== null) {
    const named = bases.find((b) => b.id === chosen);
    if (!named)
      return { error: `${at}: its \`base\` ${chosen} names no Base of ${ANALOGY_FILE} — ${propose} proposes two` };
    if (!tells(named))
      return {
        error: `${at}: its \`base\` ${chosen} names a Base that does not tell its relation ${leg.relation} — ${propose} proposes two`,
      };
    return { base: named };
  }
  const first = bases.find(tells);
  if (!first)
    return {
      error: `${at} has a Segment of domain apart or both, and no Base of ${ANALOGY_FILE} tells its relation ${leg.relation} — ${propose} proposes two`,
    };
  return { base: first };
}

// A Leg's `base` against the file, for the Brief's check: an error string or null.
export function legBaseRefusal(record, structure, leg) {
  if (leg.base === undefined) return null;
  const named = ((record && record.bases) || []).find((b) => b.id === leg.base);
  if (!named) return `Leg ${leg.leg_id}: its \`base\` ${JSON.stringify(leg.base)} names no Base of ${ANALOGY_FILE}`;
  if (!baseTellsRelation(named, structure, leg.relation))
    return `Leg ${leg.leg_id}: its \`base\` ${leg.base} names a Base that does not tell its relation ${leg.relation}`;
  return null;
}
