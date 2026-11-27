// document-plan/file — the one reader of a DocumentPlan under document-plans/ (kogaki#1976): RS names in reading order
// and the connections joining each Satellite to its Nucleus, and the shared Roles where the file carries them
// (kogaki#1981). The top Nucleus is derived, never stored.
import { readFileSync } from "node:fs";
import { parseYaml } from "../yaml.mjs";
import { SNAKE_WORD } from "../rs/file.mjs";

export const FILE_KEYS = Object.freeze(["order", "connections"]);
export const SHARED_ROLES = "shared_roles";
export const CONNECTION_KEYS = Object.freeze(["satellite", "relation", "nucleus"]);
const SHARED_KEYS = ["name", "members"];
const MEMBER_KEYS = ["rs", "role"];
export const RELATIONS = Object.freeze(JSON.parse(readFileSync(new URL("./relations.json", import.meta.url), "utf8")));

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// The RSs that are the Satellite of no connection.
export const topsOf = (plan) => {
  const satellites = new Set(plan.connections.map((c) => c.satellite));
  return plan.order.filter((rs) => !satellites.has(rs));
};

// The refusal of an order, or null.
export function orderRefusal(order, at) {
  if (!Array.isArray(order)) return `${at}: \`order\` is not a list`;
  if (order.length < 2) return `${at}: \`order\` names ${order.length} RS, fewer than two`;
  const bad = order.find((rs) => typeof rs !== "string" || !SNAKE_WORD.test(rs));
  if (bad !== undefined) return `${at}: the RS ${JSON.stringify(bad)} in \`order\` is not one snake_case word`;
  const twice = order.find((rs, i) => order.indexOf(rs) !== i);
  if (twice !== undefined) return `${at}: \`order\` names the RS ${twice} twice`;
  return null;
}

// The refusal of one connection against the order, or null.
export function connectionRefusal(c, order, at) {
  if (!isMap(c)) return `${at}: a connection is not a record of ${CONNECTION_KEYS.join(", ")}`;
  const stray = Object.keys(c).find((k) => !CONNECTION_KEYS.includes(k));
  if (stray !== undefined) return `${at}: a connection carries the key \`${stray}\`, which it does not declare`;
  const missing = CONNECTION_KEYS.find((k) => typeof c[k] !== "string" || c[k] === "");
  if (missing !== undefined) return `${at}: a connection carries no \`${missing}\``;
  const where = `${at}: the connection ${c.satellite}:${c.relation}:${c.nucleus}`;
  if (!RELATIONS.includes(c.relation)) return `${where}: the relation ${c.relation} is not listed`;
  if (c.satellite === c.nucleus) return `${where}: its Satellite is its own Nucleus`;
  const outside = [c.satellite, c.nucleus].find((rs) => !order.includes(rs));
  if (outside !== undefined) return `${where}: the RS ${outside} is not in the order`;
  return null;
}

// The refusal of a plan's shared Roles against its order (kogaki#1981), or null. It opens no RS file.
export function sharedRolesRefusal(shared, order, at) {
  if (!Array.isArray(shared) || !shared.length) return `${at}: \`${SHARED_ROLES}\` is not a list of shared Roles`;
  const names = new Set();
  const held = new Map();
  for (const s of shared) {
    if (!isMap(s)) return `${at}: a shared Role is not a record of ${SHARED_KEYS.join(", ")}`;
    const stray = Object.keys(s).find((k) => !SHARED_KEYS.includes(k));
    if (stray !== undefined) return `${at}: a shared Role carries the key \`${stray}\`, which it does not declare`;
    if (typeof s.name !== "string" || !SNAKE_WORD.test(s.name))
      return `${at}: the shared Role ${JSON.stringify(s.name)} is not one snake_case word`;
    const where = `${at}: the shared Role ${s.name}`;
    if (names.has(s.name)) return `${where} is repeated`;
    names.add(s.name);
    if (!Array.isArray(s.members) || s.members.length < 2) return `${where} has fewer than two members`;
    const rsSeen = new Set();
    for (const m of s.members) {
      if (!isMap(m)) return `${where}: a member is not a record of ${MEMBER_KEYS.join(", ")}`;
      const strayM = Object.keys(m).find((k) => !MEMBER_KEYS.includes(k));
      if (strayM !== undefined) return `${where}: a member carries the key \`${strayM}\`, which it does not declare`;
      const missing = MEMBER_KEYS.find((k) => typeof m[k] !== "string" || m[k] === "");
      if (missing !== undefined) return `${where}: a member carries no \`${missing}\``;
      const member = `${m.rs}:${m.role}`;
      if (!order.includes(m.rs))
        return `${where}: the member ${member} names the RS ${m.rs}, which is not in the order`;
      if (rsSeen.has(m.rs)) return `${where}: two members are Roles of the RS ${m.rs}`;
      rsSeen.add(m.rs);
      if (held.has(member)) return `${where}: the member ${member} is a member of ${held.get(member)} too`;
      held.set(member, s.name);
    }
  }
  return null;
}

// THE REFUSAL OF A PLAN (kogaki#1976), the first one met, or null.
export function documentPlanRefusal(plan, at) {
  if (!isMap(plan)) return `${at} is not a record of ${FILE_KEYS.join(", ")}`;
  const stray = Object.keys(plan).find((k) => !FILE_KEYS.includes(k) && k !== SHARED_ROLES);
  if (stray !== undefined) return `${at} carries the key \`${stray}\`, which it does not declare`;
  const missing = FILE_KEYS.find((k) => !Object.hasOwn(plan, k));
  if (missing !== undefined) return `${at} carries no \`${missing}\``;
  const order = orderRefusal(plan.order, at);
  if (order) return order;
  if (!Array.isArray(plan.connections)) return `${at}: \`connections\` is not a list`;
  for (const c of plan.connections) {
    const bad = connectionRefusal(c, plan.order, at);
    if (bad) return bad;
  }
  const nucleusOf = new Map();
  for (const c of plan.connections) {
    if (nucleusOf.has(c.satellite)) return `${at}: the RS ${c.satellite} is the Satellite of two connections`;
    nucleusOf.set(c.satellite, c.nucleus);
  }
  for (const start of nucleusOf.keys()) {
    const seen = [start];
    for (let rs = nucleusOf.get(start); rs !== undefined; rs = nucleusOf.get(rs)) {
      if (rs === start) return `${at}: the connections ${seen.concat(start).join(" -> ")} return to ${start}`;
      if (seen.includes(rs)) break;
      seen.push(rs);
    }
  }
  const tops = topsOf(plan);
  if (tops.length !== 1)
    return tops.length
      ? `${at}: the RSs ${tops.join(", ")} are each the Satellite of no connection; one is`
      : `${at}: every RS is the Satellite of a connection; one is not`;
  return Object.hasOwn(plan, SHARED_ROLES) ? sharedRolesRefusal(plan[SHARED_ROLES], plan.order, at) : null;
}

// READ ONE DOCUMENTPLAN FILE: `{ plan, top }` or `{ error }`, the error naming the file and the entry.
export function readDocumentPlan(path, at = path) {
  let plan;
  try {
    plan = parseYaml(readFileSync(path, "utf8"), at);
  } catch (e) {
    return { error: `${at}: ${e.message}` };
  }
  const refusal = documentPlanRefusal(plan, at);
  if (refusal) return { error: refusal };
  return { plan, top: topsOf(plan)[0] };
}
