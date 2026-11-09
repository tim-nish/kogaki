// The Leg-Planning Playground's records, read and refused (kogaki#1764): the claims file, the structure read over the
// claim set, the Leg Waypoints composed from it, the Legs grouped over them, and the file `/paragraph-plan` reads.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Leg-Planning Playground
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../workflow/run-record.mjs";
import { briefLegs } from "../compose/record.mjs";
import { waypointsRefusal } from "../compose/leg-schema.mjs";

export const COMPOSED_BY = "leg-planning";
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const CITE = /^\S+::\S+\/\S+@[0-9a-f]{12,}$/;
const KINDS = ["thesis", "cite", "claim"];

// THE CLAIMS FILE: one `thesis:` line, then pairs of a `cite:` line and a `claim:` line, and nothing else. A claim's id is
// `c<n>`, its place in the file.
export function parseClaims(text) {
  const lines = String(text).split("\n").map((l, i) => ({ n: i + 1, text: l })).filter((l) => l.text.trim() !== "");
  const at = (l) => `line ${l.n}, ${JSON.stringify(l.text.trim())}`;
  let thesis = null;
  const claims = [];
  let cite = null;
  for (const l of lines) {
    const m = /^([a-z_]+):(.*)$/.exec(l.text);
    const kind = m ? m[1] : null;
    const value = m ? m[2].trim() : "";
    if (kind === "proposition") return { error: `${at(l)}: the claims file carries a \`proposition:\` line — its sentences are \`claim:\` lines` };
    if (!KINDS.includes(kind)) return { error: `${at(l)}: the claims file carries \`thesis:\`, \`cite:\` and \`claim:\` lines and nothing else` };
    if (!value) return { error: `${at(l)}: the \`${kind}:\` line is empty` };
    if (kind === "thesis") {
      if (thesis !== null) return { error: `${at(l)}: a second \`thesis:\` line — the claims file carries one` };
      if (claims.length || cite) return { error: `${at(l)}: the \`thesis:\` line comes first, before every claim` };
      thesis = value;
    } else if (kind === "cite") {
      if (thesis === null) return { error: `${at(l)}: a \`cite:\` line before the \`thesis:\` line` };
      if (cite) return { error: `line ${cite.n}: the \`cite:\` line carries no \`claim:\` line after it` };
      if (!CITE.test(value)) return { error: `${at(l)}: the \`cite:\` is not a UnitID at a content hash` };
      cite = { n: l.n, value };
    } else {
      if (!cite) return { error: `${at(l)}: a \`claim:\` line with no \`cite:\` line before it` };
      claims.push({ id: `c${claims.length + 1}`, cite: cite.value, claim: value });
      cite = null;
    }
  }
  if (cite) return { error: `line ${cite.n}: the \`cite:\` line carries no \`claim:\` line after it` };
  if (thesis === null) return { error: "the claims file carries no `thesis:` line" };
  if (!claims.length) return { error: "the claims file carries no `cite:` and `claim:` pair" };
  return { thesis, claims };
}

// A ROW'S COPIES: each `{{copy:<name>}}` in its judgment point replaced by the text its `copies` entry names.
export function resolvedRow(table, id) {
  const row = table[id];
  if (!isMap(row)) return { error: `the Playground's table declares no \`${id}\` row` };
  let text = String(row.judgment_point);
  for (const [name, c] of Object.entries(row.copies || {})) {
    const source = JSON.parse(readFileSync(join(REPO, c.file), "utf8"));
    const field = String(((source[c.row] || {})[c.field]) ?? "");
    const open = field.indexOf(c.opens);
    const close = open < 0 ? -1 : field.indexOf(c.closes, open + c.opens.length);
    if (close < 0) return { error: `\`${id}\`'s copy \`${name}\`: ${c.file}'s \`${c.row}.${c.field}\` no longer carries ${JSON.stringify(c.opens)} … ${JSON.stringify(c.closes)}` };
    const token = `{{copy:${name}}}`;
    if (!text.includes(token)) return { error: `\`${id}\` declares the copy \`${name}\`, and its judgment point carries no ${token}` };
    text = text.split(token).join(field.slice(open, close + c.closes.length));
  }
  const left = /\{\{copy:([^}]+)\}\}/.exec(text);
  if (left) return { error: `\`${id}\`'s judgment point carries ${left[0]}, which its \`copies\` does not declare` };
  return { row: { ...row, id, judgment_point: text } };
}

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

const shape = (text) => ({ group: "shape", text });
const listOf = (v) => (Array.isArray(v) && v.length ? v : null);

// THE STRUCTURE READ OVER THE CLAIM SET, refused `{ group, text }` or `{}`. `claims` is `parseClaims`'s list.
export function validateReadSet(record, claims) {
  const bad = keysRefusal(record, ["roles", "relations", "higher_order", "attains_thesis"], "the structure");
  if (bad) return shape(bad);
  const claimIds = new Set(claims.map((c) => c.id));
  const ids = new Set();
  const roles = listOf(record.roles);
  if (!roles) return shape("the structure's `roles` is not a non-empty list");
  for (const [i, r] of roles.entries()) {
    const b = keysRefusal(r, ["id", "context", "attributes", "claims"], `roles[${i}]`);
    if (b) return shape(b);
    if (!isText(r.id) || ids.has(r.id)) return shape(`roles[${i}]'s \`id\` is empty or not unique`);
    if (!isText(r.context)) return shape(`the Role ${JSON.stringify(r.id)}'s \`context\` is empty`);
    if (!Array.isArray(r.attributes) || r.attributes.some((a) => !isText(a))) return shape(`the Role ${JSON.stringify(r.id)}'s \`attributes\` is not a list of text`);
    const stray = listOf(r.claims) ? r.claims.find((c) => !claimIds.has(c)) : null;
    if (!listOf(r.claims) || stray !== undefined) return shape(`the Role ${JSON.stringify(r.id)}'s \`claims\` ${listOf(r.claims) ? `names ${JSON.stringify(stray)}, which is no claim's id` : "is not a non-empty list"}`);
    ids.add(r.id);
  }
  const roleIds = new Set(ids);
  const relations = listOf(record.relations);
  if (!relations) return shape("the structure's `relations` is not a non-empty list");
  const relationIds = new Set();
  for (const [i, r] of relations.entries()) {
    const b = keysRefusal(r, ["id", "between", "holds", "from"], `relations[${i}]`);
    if (b) return shape(b);
    if (!isText(r.id) || ids.has(r.id)) return shape(`relations[${i}]'s \`id\` is empty or not unique`);
    if (!Array.isArray(r.between) || r.between.length < 2 || r.between.some((x) => !roleIds.has(x))) {
      return shape(`the relation ${JSON.stringify(r.id)}'s \`between\` does not name two or more Roles`);
    }
    if (!claimIds.has(r.from)) return shape(`the relation ${JSON.stringify(r.id)}'s \`from\` ${JSON.stringify(r.from)} is not one claim id`);
    if (!isText(r.holds)) return shape(`the relation ${JSON.stringify(r.id)}'s \`holds\` is empty`);
    const absent = r.between.find((x) => !r.holds.includes(`{${x}}`));
    if (absent !== undefined) return shape(`the relation ${JSON.stringify(r.id)}'s \`holds\` writes no {${absent}}, a Role its \`between\` names`);
    ids.add(r.id);
    relationIds.add(r.id);
  }
  const higher = listOf(record.higher_order);
  if (!higher) return shape("the structure's `higher_order` is not a non-empty list");
  for (const [i, h] of higher.entries()) {
    const b = keysRefusal(h, ["id", "relates", "holds"], `higher_order[${i}]`);
    if (b) return shape(b);
    if (!isText(h.id) || ids.has(h.id)) return shape(`higher_order[${i}]'s \`id\` is empty or not unique`);
    if (!Array.isArray(h.relates) || h.relates.length < 2) return shape(`the higher-order relation ${JSON.stringify(h.id)} relates fewer than two relations`);
    const stray = h.relates.find((x) => !relationIds.has(x));
    if (stray !== undefined) return shape(`the higher-order relation ${JSON.stringify(h.id)} relates ${JSON.stringify(stray)}, which is no relation's id`);
    if (!isText(h.holds)) return shape(`the higher-order relation ${JSON.stringify(h.id)}'s \`holds\` is empty`);
    ids.add(h.id);
  }
  const used = new Set(relations.flatMap((r) => r.between));
  const idle = roles.find((r) => !used.has(r.id));
  if (idle) return { group: "coverage", text: `the Role ${JSON.stringify(idle.id)} is in no relation` };
  const stated = new Set(relations.map((r) => r.from));
  const unstated = claims.find((c) => !stated.has(c.id));
  if (unstated) return { group: "coverage", text: `the claim ${unstated.id} is the \`from\` of no relation` };
  if (!higher.some((h) => h.id === record.attains_thesis)) {
    return shape(`\`attains_thesis\` ${JSON.stringify(record.attains_thesis ?? null)} names no higher-order relation`);
  }
  return {};
}

// THE CLAIM IDS A CARRIED ID SERVES: a relation's `from`, a higher-order relation's relations' `from`, in claim order.
export function servesOf(structure, carries, claims) {
  const relation = new Map(structure.relations.map((r) => [r.id, r]));
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
  const from = new Set(carries.flatMap((id) => (relation.has(id) ? [relation.get(id).from]
    : higher.has(id) ? higher.get(id).relates.map((x) => relation.get(x).from) : [])));
  return claims.map((c) => c.id).filter((id) => from.has(id));
}

// ONE WAYPOINT, refused naming it or `null`.
function waypointRefusal(w, n, known) {
  const at = `Waypoint ${n}`;
  if (isMap(w) && Object.hasOwn(w, "serves")) return { group: "shape", text: `${at} carries \`serves\` — it is derived from \`carries\`, never written` };
  const b = keysRefusal(w, ["point", "carries"], at);
  if (b) return { group: "shape", text: b };
  if (!isText(w.point)) return { group: "shape", text: `${at}'s \`point\` is empty` };
  if (!listOf(w.carries)) return { group: "carries", text: `${at}'s \`carries\` is empty` };
  const stray = w.carries.find((id) => !known.has(id));
  if (stray !== undefined) return { group: "carries", text: `${at} carries ${JSON.stringify(stray)}, which names no relation or higher-order relation of the structure` };
  return null;
}

// THE WAYPOINT SET, refused `{ group, text }` or `{}`.
export function validateWaypoints(answer, structure) {
  const b = keysRefusal(answer, ["waypoints"], "the answer");
  if (b) return shape(b);
  const ws = listOf(answer.waypoints);
  if (!ws) return shape("the answer's `waypoints` is not a non-empty list");
  const all = [...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)];
  const known = new Set(all);
  for (const [i, w] of ws.entries()) {
    const r = waypointRefusal(w, i + 1, known);
    if (r) return r;
  }
  const carried = new Set(ws.flatMap((w) => w.carries));
  const idle = all.find((id) => !carried.has(id));
  if (idle) return { group: "coverage", text: `${JSON.stringify(idle)} is carried by no Waypoint — the Waypoints together carry every relation and higher-order relation` };
  if (!ws[ws.length - 1].carries.includes(structure.attains_thesis)) {
    return { group: "coverage", text: `Waypoint ${ws.length}, the last, does not carry ${JSON.stringify(structure.attains_thesis)}, the higher-order relation that attains the thesis` };
  }
  return {};
}

// A REWRITE OF WAYPOINT `n` ALONE, refused or `{ waypoints }`, the set with it in place.
export function rewrittenSet(answer, n, waypoints, structure) {
  if (isMap(answer) && Object.hasOwn(answer, "waypoint") && answer.waypoint !== n) {
    return shape(`the rewrite answers Waypoint ${JSON.stringify(answer.waypoint)}, and the Waypoint to rewrite is ${n}`);
  }
  const b = keysRefusal(answer, ["waypoint", "point", "carries"], `the rewrite of Waypoint ${n}`);
  if (b) return shape(b);
  const next = waypoints.map((w, i) => (i + 1 === n ? { point: answer.point, carries: answer.carries } : { point: w.point, carries: w.carries }));
  const v = validateWaypoints({ waypoints: next }, structure);
  return v.text ? v : { waypoints: next };
}

// THE GROUNDED VERDICT, refused `{ group, text }` or `{}`.
export function validateGrounded(answer, waypoints) {
  const b = keysRefusal(answer, ["verdict", "sites"], "the verdict");
  if (b) return shape(b);
  if (!["fits", "does-not-fit"].includes(answer.verdict)) return shape(`\`verdict\` ${JSON.stringify(answer.verdict)} is neither \`fits\` nor \`does-not-fit\``);
  if (!Array.isArray(answer.sites)) return shape("`sites` is not a list");
  if ((answer.verdict === "fits") !== (answer.sites.length === 0)) return shape(`\`sites\` is ${answer.sites.length ? "non-empty under `fits`" : "empty under `does-not-fit`"}`);
  for (const [i, s] of answer.sites.entries()) {
    const sb = keysRefusal(s, ["waypoint", "phrase", "why"], `sites[${i}]`);
    if (sb) return shape(sb);
    const w = waypoints[Number(s.waypoint) - 1];
    if (!w) return shape(`sites[${i}] names Waypoint ${JSON.stringify(s.waypoint)}, which the input does not carry`);
    if (!isText(s.phrase) || !w.point.includes(s.phrase)) return shape(`sites[${i}]'s \`phrase\` is not words of Waypoint ${s.waypoint}'s \`point\``);
  }
  return {};
}

// A GROUNDED SITE AS THE COMMENT ITS WAYPOINT IS HANDED: the judge's text, verbatim.
export const siteComment = (s) => `Waypoint ${s.waypoint}: the judge quoted "${s.phrase}" and wrote: ${s.why}`;

// THE LEGS, refused `{ group, text }` or `{}`. `waypoints` is the passed set; `moveIds` the library's ids.
export function validateLegPartition(answer, waypoints, structure, moveIds) {
  const b = keysRefusal(answer, ["legs"], "the answer");
  if (b) return shape(b);
  const legs = listOf(answer.legs);
  if (!legs) return shape("the answer's `legs` is not a non-empty list");
  const higher = new Set(structure.higher_order.map((h) => h.id));
  const seen = new Set();
  let next = 1;
  for (const [i, leg] of legs.entries()) {
    const at = isMap(leg) && isText(leg.leg_id) ? `Leg ${leg.leg_id}` : `legs[${i}]`;
    if (isMap(leg) && Object.hasOwn(leg, "claims")) return shape(`${at} carries \`claims\` — they are derived from the Waypoints' \`serves\`, never written`);
    const lb = keysRefusal(leg, ["leg_id", "waypoints", "move"], at);
    if (lb) return shape(lb);
    if (!isText(leg.leg_id) || seen.has(leg.leg_id)) return shape(`${at}'s \`leg_id\` is empty or not unique`);
    seen.add(leg.leg_id);
    if (!moveIds.has(leg.move)) return { group: "library", text: `${at} binds ${JSON.stringify(leg.move)}, which names no Move of the library` };
    if (!listOf(leg.waypoints)) return { group: "partition", text: `${at} carries no Waypoint` };
    for (const n of leg.waypoints) {
      if (n !== next) return { group: "partition", text: `${at} carries Waypoint ${JSON.stringify(n)} where Waypoint ${next} comes next — the Legs are contiguous runs of the Waypoints, in order` };
      next += 1;
    }
    if (!leg.waypoints.some((n) => waypoints[n - 1].carries.some((id) => higher.has(id)))) {
      return { group: "partition", text: `${at}'s Waypoints carry no higher-order relation` };
    }
  }
  if (next <= waypoints.length) return { group: "partition", text: `Waypoint ${next} is in no Leg — every Waypoint is in exactly one Leg` };
  return {};
}

// THE LEGS IN THE BRIEF'S LEG SHAPE: each Leg's claims derived from its Waypoints' `serves`, the last marked
// `reaches_target`, and `purpose`, `rationale`, `introduces` and `opens_section` absent.
export function briefShapedLegs(answer, waypoints, claims) {
  const byId = new Map(claims.map((c) => [c.id, c]));
  return answer.legs.map((leg, i) => {
    const ws = leg.waypoints.map((n) => waypoints[n - 1]);
    const served = claims.map((c) => c.id).filter((id) => ws.some((w) => w.serves.includes(id)));
    return {
      leg_id: leg.leg_id,
      move: leg.move,
      claims: served.map((id) => ({ strand: id, proposition: byId.get(id).claim })),
      waypoints: ws.map((w) => ({ point: w.point, serves: [...w.serves], case: "own" })),
      ...(i === answer.legs.length - 1 ? { reaches_target: true } : {}),
    };
  });
}

// THE FILE `/paragraph-plan` READS AS A BRIEF'S `reader_path`, refused naming the Leg or `{}`: its own Leg reader and
// its own Leg Waypoint rule over every Leg.
export function readerPathRefusal(record) {
  if (!isMap(record) || record.composed_by !== COMPOSED_BY) return { error: `the file carries no \`composed_by: ${COMPOSED_BY}\` line` };
  const legs = briefLegs(record);
  if (!legs.length) return { error: "the file carries no Reader Path legs" };
  for (const leg of legs) {
    const bad = waypointsRefusal(leg.waypoints, (leg.claims || []).map((g) => g.strand), `leg ${leg.leg_id}`);
    if (bad) return { error: bad };
  }
  return {};
}
