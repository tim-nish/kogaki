// sme/read — the SME's one reading of a text as Roles and Relations (kogaki#1984): the instruction is
// prompts/sme/read.prompt, the answer is checked and its ids minted here, and a refused answer is asked again with the
// refusal put back. `node src/rs.mjs create` calls it and no other reading.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { oneCall } from "../analogy.mjs";
import { renderPromptFile } from "../prompt-file.mjs";
import { relationsUnder, rsRefusal, RESTS_ON, SNAKE_WORD } from "../rs/file.mjs";

export const PROMPT_NAME = "sme/read";
// A refused reading is asked again with the refusal put back; the third refusal stops the reading.
export const READ_CALLS = 3;
export const OVER_RELATIONS = "holds_over_relations";
export const CONSIDERED = "considered";
export const VERDICTS = Object.freeze(["connected", "not_connected"]);
const FLOW_LABEL = "RS";
const BRACED = /\{([^{}]*)\}/g;

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
// A source as the file holds it: a statement's carries no cite (kogaki#1975).
const sourceEntry = ({ id, cite, text }) => (cite === undefined ? { id, text } : { id, cite, text });
const squeeze = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
const bracedIn = (text) => [...String(text).matchAll(BRACED)].map((m) => m[1]);

const KEYS = {
  answer: ["roles", "relations", CONSIDERED],
  role: ["name", "context", "in"],
  relation: ["name", "holds", "from"],
  row: ["relations", "verdict", "why"],
};

function keysOf(entry, keys, extra, at) {
  if (!isMap(entry)) return `${at} is not a record`;
  const stray = Object.keys(entry).find((k) => !keys.includes(k) && !extra.includes(k));
  if (stray !== undefined) return `${at} carries the key \`${stray}\`, which it does not declare`;
  const missing = keys.find((k) => !Object.hasOwn(entry, k));
  return missing === undefined ? null : `${at} carries no \`${missing}\``;
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// THE SENTENCES OF A RELATION BETWEEN RELATIONS refused, in the answer's names, or null. `roleOf` maps a Relation's
// name to the Role names its `between` holds, `under` a Relation's name to the names of the Relations under it.
function sentencesRefusal(c, roleNames, under, roleOf) {
  const at = `the Relation ${c.name}`;
  if (!Object.hasOwn(c, OVER_RELATIONS)) return `${at} relates two Relations and carries no \`${OVER_RELATIONS}\``;
  if (!isText(c[OVER_RELATIONS])) return `${at} carries no sentence in \`${OVER_RELATIONS}\``;
  const over = bracedIn(c[OVER_RELATIONS]);
  const unsaid = c.relates.find((n) => !over.includes(n));
  if (unsaid !== undefined) return `${at}: its \`${OVER_RELATIONS}\` does not write {${unsaid}}`;
  const other = over.find((n) => !c.relates.includes(n));
  if (other !== undefined) return `${at}: its \`${OVER_RELATIONS}\` writes {${other}}, which is neither of the two`;
  const held = bracedIn(c.holds);
  if (!held.some((n) => roleNames.has(n))) return `${at}: its holds writes no Role in braces`;
  const related = new Set(under.get(c.name).flatMap((n) => roleOf.get(n) || []));
  const stray = held.find((n) => !related.has(n));
  if (stray !== undefined) return `${at}: its holds writes {${stray}}, which is no Role a Relation under it relates`;
  return null;
}

// THE `considered` ROWS refused, in the answer's names, or null.
function consideredRefusal(answer) {
  const rows = answer[CONSIDERED];
  if (!Array.isArray(rows)) return `the answer's \`${CONSIDERED}\` is not a list`;
  const names = new Set(answer.relations.map((c) => c.name));
  const higher = answer.relations.filter((c) => Object.hasOwn(c, "relates"));
  for (const [i, row] of rows.entries()) {
    const at = `the \`${CONSIDERED}\` row ${i + 1}`;
    const bad = keysOf(row, KEYS.row, [], at);
    if (bad) return bad;
    if (!Array.isArray(row.relations) || row.relations.length < 2)
      return `${at} names fewer than two Relations in \`relations\``;
    const none = row.relations.find((n) => !names.has(n));
    if (none !== undefined) return `${at} names ${JSON.stringify(none)}, which is no Relation's name`;
    if (new Set(row.relations).size !== row.relations.length) return `${at} names a Relation twice`;
    if (!VERDICTS.includes(row.verdict))
      return `${at}: its verdict ${JSON.stringify(row.verdict)} is neither ${VERDICTS.join(" nor ")}`;
    if (!isText(row.why)) return `${at} carries no \`why\``;
    const joined = higher.find((c) => sameSet(c.relates, row.relations));
    if (row.verdict === "connected" && !joined)
      return `${at} is \`connected\`, and no Relation relates exactly ${row.relations.join(", ")}`;
    if (row.verdict === "not_connected" && joined)
      return `${at} is \`not_connected\`, and the Relation ${joined.name} relates exactly ${row.relations.join(", ")}`;
  }
  for (const c of higher) {
    if (!rows.some((row) => row.verdict === "connected" && sameSet(row.relations, c.relates)))
      return `the Relation ${c.name} relates ${c.relates.join(", ")}, and no \`connected\` row names exactly those`;
  }
  const relatedOnce = new Set(higher.flatMap((c) => c.relates));
  const tops = answer.relations.filter((c) => !relatedOnce.has(c.name));
  if (tops.length < 2) return null;
  const apart = new Set(rows.filter((row) => row.verdict === "not_connected").flatMap((row) => row.relations));
  const alone = tops.find((c) => !apart.has(c.name));
  return alone === undefined
    ? null
    : `the Relation ${alone.name} is one of ${tops.length} tops and stands in no \`not_connected\` row`;
}

// THE RECORD OF A READING, its ids minted in the order of the answer: `{ record }` or `{ refusal }`. Every refusal of
// the file's reader but the last applies, every `words` and attribute occurs in the text of its source, each Relation
// between Relations carries its two sentences, and `considered` gives each joining weighed its verdict and its reason.
export function mintedReading(answer, sources, restsOn = null) {
  const top = keysOf(answer, KEYS.answer, [], "the answer");
  if (top) return { refusal: top };
  if (!Array.isArray(answer.roles) || !Array.isArray(answer.relations))
    return { refusal: "the answer's `roles` or `relations` is not a list" };
  for (const r of answer.roles) {
    const bad = keysOf(r, KEYS.role, [], `the Role ${isMap(r) ? JSON.stringify(r.name) : JSON.stringify(r)}`);
    if (bad) return { refusal: bad };
  }
  for (const c of answer.relations) {
    const at = `the Relation ${isMap(c) ? JSON.stringify(c.name) : JSON.stringify(c)}`;
    const extra = isMap(c) && Object.hasOwn(c, "relates") ? ["relates", OVER_RELATIONS] : ["between", "relates"];
    const bad = keysOf(c, KEYS.relation, extra, at);
    if (bad) return { refusal: bad };
  }
  for (const [list, what] of [
    [answer.roles, "Role"],
    [answer.relations, "Relation"],
  ]) {
    const seen = new Set();
    for (const e of list) {
      if (typeof e.name !== "string" || !SNAKE_WORD.test(e.name))
        return { refusal: `the ${what} name ${JSON.stringify(e.name)} is not one snake_case word` };
      if (seen.has(e.name)) return { refusal: `the ${what} name ${e.name} is repeated` };
      seen.add(e.name);
    }
  }
  const roleId = new Map(answer.roles.map((r, i) => [r.name, `r_${i + 1}`]));
  const relationId = new Map(answer.relations.map((c, i) => [c.name, `c_${i + 1}`]));
  const swap = (text, ids) =>
    typeof text === "string" ? text.replace(BRACED, (m, n) => (ids.has(n) ? `{${ids.get(n)}}` : m)) : text;
  const record = {
    sources: sources.map(sourceEntry),
    roles: answer.roles.map((r) => ({ id: roleId.get(r.name), name: r.name, context: r.context, in: r.in })),
    relations: answer.relations.map((c) => {
      const out = { id: relationId.get(c.name), name: c.name, holds: swap(c.holds, roleId), from: c.from };
      if (Object.hasOwn(c, "between"))
        out.between = Array.isArray(c.between) ? c.between.map((n) => roleId.get(n) ?? n) : c.between;
      if (Object.hasOwn(c, "relates"))
        out.relates = Array.isArray(c.relates) ? c.relates.map((n) => relationId.get(n) ?? n) : c.relates;
      if (Object.hasOwn(c, OVER_RELATIONS)) out[OVER_RELATIONS] = swap(c[OVER_RELATIONS], relationId);
      return out;
    }),
  };
  if (restsOn) record[RESTS_ON] = restsOn;
  // A refusal is put back in the answer's own names, never in ids it did not write.
  const names = new Map();
  for (const ids of [roleId, relationId]) for (const [n, id] of ids) names.set(id, n);
  const named = (text) => text.replace(/\b[rc]_[1-9][0-9]*\b/g, (id) => names.get(id) ?? id);
  const refusal = rsRefusal(record, "the answer", { oneApex: false });
  if (refusal) return { refusal: named(refusal) };
  const textOf = new Map(sources.map((s) => [s.id, squeeze(s.text)]));
  for (const r of record.roles) {
    for (const e of r.in) {
      const said = [e.words, ...e.attributes].find((w) => !textOf.get(e.source).includes(squeeze(w)));
      if (said !== undefined)
        return { refusal: `the Role ${r.name}: ${JSON.stringify(said)} does not occur in the text of ${e.source}` };
    }
  }
  const roleNames = new Set(roleId.keys());
  const roleOf = new Map(answer.relations.map((c) => [c.name, c.between || []]));
  const under = new Map(record.relations.map((c) => [c.name, relationsUnder(record, c.id).map((u) => u.name)]));
  for (const c of answer.relations.filter((x) => Object.hasOwn(x, "relates"))) {
    const bad = sentencesRefusal(c, roleNames, under, roleOf);
    if (bad) return { refusal: bad };
  }
  const rows = consideredRefusal(answer);
  if (rows) return { refusal: rows };
  record[CONSIDERED] = answer[CONSIDERED].map((row) => ({
    relations: row.relations.map((n) => relationId.get(n)),
    verdict: row.verdict,
    why: row.why,
  }));
  return { record };
}

const promptOf = (input, history) =>
  renderPromptFile(PROMPT_NAME, {
    flow_label: FLOW_LABEL,
    row_id: "read",
    input: JSON.stringify(input, null, 2),
    history,
    whole_new_record: false,
  });

// THE READING, each call kept under `dir`: `{ record }` or `{ stopped }`. The input is the sources alone.
export function smeReading(binary, sources, dir, restsOn = null) {
  const input = { sources: sources.map(({ id, text }) => ({ id, text })) };
  const history = [];
  for (let n = 1; n <= READ_CALLS; n++) {
    const prompt = promptOf(input, history);
    const d = join(dir, `call-${n}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "input.json"), `${JSON.stringify(input, null, 2)}\n`);
    writeFileSync(join(d, "prompt.txt"), prompt);
    const out = oneCall(binary, prompt);
    writeFileSync(join(d, "answer.txt"), out.raw);
    if (out.died) return { stopped: `the call died: ${out.died}` };
    const got = out.refusal ? { refusal: out.refusal } : mintedReading(out.record, sources, restsOn);
    if (!got.refusal) return { record: got.record };
    writeFileSync(join(d, "refusal.txt"), `${got.refusal}\n`);
    history.push({ call: n, answer: out.record ? JSON.stringify(out.record) : "", refusal: got.refusal });
  }
  return { stopped: `the reading was refused ${READ_CALLS} times; the last refusal: ${history.at(-1).refusal}` };
}

// The `not_connected` rows of a reading, each as its Relations' names and its reason.
export function unjoinedOf(record) {
  const nameOf = new Map(record.relations.map((c) => [c.id, c.name]));
  return (record[CONSIDERED] || [])
    .filter((row) => row.verdict === "not_connected")
    .map((row) => ({ names: row.relations.map((id) => nameOf.get(id) ?? id), why: row.why }));
}
