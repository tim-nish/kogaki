// rs/file — the one reader of an RS file under rs/ (kogaki#1970): its sources, its Roles with each source's own words
// for them, and its Relations; a file read from a statement carries `rests_on` beside them (kogaki#1975), and a Relation
// between Relations carries `holds_over_relations` beside `holds` (kogaki#1984). It reads form only; the ApexRelation and
// the depth are derived, never stored.
import { readFileSync } from "node:fs";
import { CITE } from "../unit-address.mjs";
import { parseYaml } from "../yaml.mjs";

export const FILE_KEYS = Object.freeze(["sources", "roles", "relations"]);
export const RESTS_ON = "rests_on";
const SOURCE_KEYS = ["id", "text"];
const ROLE_KEYS = ["id", "name", "context", "in"];
const IN_KEYS = ["source", "words", "attributes"];
const RELATION_KEYS = ["id", "name", "holds", "from"];
const OVER_RELATIONS = "holds_over_relations";
const SOURCE_ID = /^S[1-9][0-9]*$/;
const ROLE_ID = /^r_[1-9][0-9]*$/;
const RELATION_ID = /^c_[1-9][0-9]*$/;
export const SNAKE_WORD = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const BRACED = /\{([^{}]*)\}/g;

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

// The keys of an entry refused: one it does not declare, or one it declares and lacks. `extra` are keys it may carry.
function keysRefusal(entry, keys, extra, at) {
  if (!isMap(entry)) return `${at} is not a record`;
  const stray = Object.keys(entry).find((k) => !keys.includes(k) && !extra.includes(k));
  if (stray !== undefined) return `${at} carries the key \`${stray}\`, which it does not declare`;
  const missing = keys.find((k) => !Object.hasOwn(entry, k));
  return missing === undefined ? null : `${at} carries no \`${missing}\``;
}

// The ids of one list refused: not of their form, or repeated; and its names, where it has them.
function idsRefusal(list, form, at, named) {
  const ids = new Set();
  const names = new Set();
  for (const e of list) {
    if (typeof e.id !== "string" || !form.test(e.id)) return `${at}: the id ${JSON.stringify(e.id)} is not of its form`;
    if (ids.has(e.id)) return `${at}: the id ${e.id} is repeated`;
    ids.add(e.id);
    if (!named) continue;
    if (typeof e.name !== "string" || !SNAKE_WORD.test(e.name))
      return `${at} ${e.id}: the name ${JSON.stringify(e.name)} is not one snake_case word`;
    if (names.has(e.name)) return `${at} ${e.id}: the name ${e.name} is repeated`;
    names.add(e.name);
  }
  return null;
}

// The Relations no other Relation's `relates` names.
export const topsOf = (record) => {
  const named = new Set(record.relations.flatMap((c) => c.relates || []));
  return record.relations.filter((c) => !named.has(c.id));
};

// The depth of a Relation: 1 with `between`, one more than the deeper of its two with `relates`.
export function depthOf(record, id) {
  const byId = new Map(record.relations.map((c) => [c.id, c]));
  const depth = (cid) => {
    const c = byId.get(cid);
    return c.between ? 1 : 1 + Math.max(...c.relates.map(depth));
  };
  return depth(id);
}

// A Relation's sentence with each Role's name in place of its id.
export function sentenceOf(record, relation) {
  const names = new Map(record.roles.map((r) => [r.id, r.name]));
  return relation.holds.replace(BRACED, (m, id) => (names.has(id) ? names.get(id) : m));
}

// The Relations under one, itself first.
export function relationsUnder(record, id) {
  const byId = new Map(record.relations.map((c) => [c.id, c]));
  const out = [];
  const walk = (cid) => {
    if (out.includes(cid)) return;
    out.push(cid);
    for (const r of byId.get(cid).relates || []) walk(r);
  };
  walk(id);
  return out.map((cid) => byId.get(cid));
}

// THE REFUSAL OF A RECORD (kogaki#1970), the first one met, or null. `oneApex: false` leaves the last row, more than
// one Relation no other names, to the caller.
export function rsRefusal(record, at, { oneApex = true } = {}) {
  if (!isMap(record)) return `${at} is not a record of ${FILE_KEYS.join(", ")}`;
  const top = keysRefusal(record, FILE_KEYS, [RESTS_ON], at);
  if (top) return top;
  for (const k of FILE_KEYS) if (!Array.isArray(record[k])) return `${at}: \`${k}\` is not a list`;
  if (!record.relations.length) return `${at}: \`relations\` is empty, so no Relation is named by no other`;
  const statement = Object.hasOwn(record, RESTS_ON);
  for (const s of record.sources) {
    const bad = keysRefusal(s, SOURCE_KEYS, ["cite"], `${at}: the source ${isMap(s) ? s.id : JSON.stringify(s)}`);
    if (bad) return bad;
    if (typeof s.text !== "string") return `${at}: the source ${s.id} carries no text`;
    if (statement && Object.hasOwn(s, "cite"))
      return `${at}: the source ${s.id} carries a cite beside \`${RESTS_ON}\`, which a file read from Units does not carry`;
    if (!statement && !isText(s.cite))
      return `${at}: the source ${s.id} carries no cite, and the file carries no \`${RESTS_ON}\``;
    if (!statement && !CITE.test(s.cite)) return `${at}: the source ${s.id}'s cite ${s.cite} is not <address>@<hash>`;
  }
  if (statement) {
    if (!Array.isArray(record[RESTS_ON])) return `${at}: \`${RESTS_ON}\` is not a list`;
    if (record.sources.length !== 1)
      return `${at}: \`${RESTS_ON}\` stands beside ${record.sources.length} sources, and a statement is one`;
    const bad = record[RESTS_ON].find((c) => typeof c !== "string" || !CITE.test(c));
    if (bad !== undefined) return `${at}: the \`${RESTS_ON}\` entry ${JSON.stringify(bad)} is not <address>@<hash>`;
  }
  for (const r of record.roles) {
    const where = `${at}: the Role ${isMap(r) ? r.id : JSON.stringify(r)}`;
    const bad = keysRefusal(r, ROLE_KEYS, [], where);
    if (bad) return bad;
    if (!isText(r.context)) return `${where} carries no context`;
    if (!Array.isArray(r.in)) return `${where}: \`in\` is not a list`;
    for (const e of r.in) {
      const badIn = keysRefusal(e, IN_KEYS, [], `${where}: an \`in\` entry`);
      if (badIn) return badIn;
      if (!isText(e.words)) return `${where}: the \`in\` entry of ${e.source} carries no words`;
      if (!Array.isArray(e.attributes) || !e.attributes.every(isText))
        return `${where}: the \`attributes\` of its \`in\` entry of ${e.source} are not a list of phrases`;
    }
  }
  for (const c of record.relations) {
    const where = `${at}: the Relation ${isMap(c) ? c.id : JSON.stringify(c)}`;
    const extra = isMap(c) && Object.hasOwn(c, "relates") ? ["relates", OVER_RELATIONS] : ["between", "relates"];
    const bad = keysRefusal(c, RELATION_KEYS, extra, where);
    if (bad) return bad;
    if (!isText(c.holds)) return `${where} carries no holds`;
  }
  const ids =
    idsRefusal(record.sources, SOURCE_ID, `${at}: \`sources\``, false) ||
    idsRefusal(record.roles, ROLE_ID, `${at}: \`roles\``, true) ||
    idsRefusal(record.relations, RELATION_ID, `${at}: \`relations\``, true);
  if (ids) return ids;
  const sourceIds = new Set(record.sources.map((s) => s.id));
  const roleIds = new Set(record.roles.map((r) => r.id));
  const relationIds = new Set(record.relations.map((c) => c.id));
  for (const r of record.roles) {
    const stray = r.in.find((e) => !sourceIds.has(e.source));
    if (stray) return `${at}: the Role ${r.id}: an \`in\` entry names ${JSON.stringify(stray.source)}, no source`;
  }
  for (const c of record.relations) {
    const where = `${at}: the Relation ${c.id}`;
    const has = (k) => Object.hasOwn(c, k);
    if (has("between") === has("relates"))
      return `${where} carries ${has("between") ? "both" : "neither"} of between and relates`;
    const [key, held] = has("between") ? ["between", roleIds] : ["relates", relationIds];
    const two = c[key];
    if (!Array.isArray(two) || two.length !== 2 || two[0] === two[1])
      return `${where}: its \`${key}\` does not name exactly two`;
    const none = two.find((id) => !held.has(id));
    if (none !== undefined) return `${where}: its \`${key}\` names ${JSON.stringify(none)}, which names nothing`;
    const braced = [...c.holds.matchAll(BRACED)].map((m) => m[1]);
    const noRole = braced.find((id) => !roleIds.has(id));
    if (noRole !== undefined) return `${where}: its holds carries {${noRole}}, which names no Role`;
    if (key === "between") {
      const unsaid = two.find((id) => !braced.includes(id));
      if (unsaid) return `${where}: its holds does not carry {${unsaid}}`;
    } else {
      if (!braced.length) return `${where}: its holds carries no Role id in braces`;
      if (!Object.hasOwn(c, OVER_RELATIONS))
        return `${where} relates two Relations and carries no \`${OVER_RELATIONS}\``;
      const over = isText(c[OVER_RELATIONS]) ? [...c[OVER_RELATIONS].matchAll(BRACED)].map((m) => m[1]) : [];
      const unsaid = two.find((id) => !over.includes(id));
      if (unsaid) return `${where}: its \`${OVER_RELATIONS}\` does not carry {${unsaid}}`;
    }
    if (!Array.isArray(c.from) || !c.from.length) return `${where}: its \`from\` is empty`;
    const notSource = c.from.find((s) => !sourceIds.has(s));
    if (notSource !== undefined) return `${where}: its \`from\` names ${JSON.stringify(notSource)}, no source`;
  }
  const inBetween = new Set(record.relations.flatMap((c) => c.between || []));
  const idle = record.roles.find((r) => !inBetween.has(r.id));
  if (idle) return `${at}: the Role ${idle.id} is named by no Relation's between`;
  const byId = new Map(record.relations.map((c) => [c.id, c]));
  const state = new Map();
  const cycle = (id) => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "open") return id;
    state.set(id, "open");
    for (const r of byId.get(id).relates || []) {
      const hit = cycle(r);
      if (hit) return hit;
    }
    state.set(id, "done");
    return null;
  };
  for (const c of record.relations) {
    const hit = cycle(c.id);
    if (hit) return `${at}: the Relation ${hit} is related to itself through others`;
  }
  const tops = topsOf(record);
  if (!tops.length) return `${at}: no Relation is named by no other`;
  if (oneApex && tops.length > 1)
    return `${at}: the Relations ${tops.map((c) => c.id).join(", ")} are each named by no other; one is`;
  return null;
}

// READ ONE RS FILE: `{ record, apex, depth }` or `{ error }`, the error naming the file and the entry.
export function readRs(path, at = path) {
  let record;
  try {
    record = parseYaml(readFileSync(path, "utf8"), at);
  } catch (e) {
    return { error: `${at}: ${e.message}` };
  }
  const refusal = rsRefusal(record, at);
  if (refusal) return { error: refusal };
  const [apex] = topsOf(record);
  return { record, apex, depth: depthOf(record, apex.id) };
}
