// document-plan/shared-roles — the verbs `share`, `unshare` and `roles` of src/document-plan.mjs and the member read of
// its `check` (kogaki#1981): which Roles of a DocumentPlan's RS files are one thing in this article. No RS file is
// rewritten and no model is called; which Roles are one is passed by the Session.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRs, SNAKE_WORD } from "../rs/file.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import { stringifyYaml } from "../yaml.mjs";
import { documentPlanRefusal, readDocumentPlan, SHARED_ROLES } from "./file.mjs";

export const PLAN_HEADER =
  "A DocumentPlan written by `node src/document-plan.mjs create`: RS files under rs/ in reading order, and each " +
  "connection's Satellite, relation and Nucleus; `share` adds the shared Roles. `node src/document-plan.mjs check` " +
  "reads it.";
const MEMBER = /^([^:]+):([^:]+)$/;

const refused = (line) => ({ status: 1, lines: [`refused: ${line}`] });
const wordsOf = (role) => role.in.map((e) => e.words).join("; ");
const roleLine = (rs, role) => `${rs}\t${role.id}\t${role.name}\t${wordsOf(role)}`;

// One RS file of the plan: `{ record }` or `{ error }`.
function rsRecord(rsDir, rs) {
  const file = join(rsDir, `${rs}.yaml`);
  if (!existsSync(file)) return { error: `the RS ${rs} has no file ${relFromRepo(file)}` };
  const r = readRs(file, relFromRepo(file));
  return r.error ? { error: `the RS ${rs} is refused by readRs: ${r.error}` } : { record: r.record };
}

const write = (path, plan) => writeFileSync(path, stringifyYaml(plan, { header: PLAN_HEADER }));

// SHARE (kogaki#1981): `{ status, lines }`; the plan is rewritten only when `shared:` is printed.
export function share({ path, at, name, members, rsDir }) {
  const read = readDocumentPlan(path, at);
  if (read.error) return refused(read.error);
  const { plan } = read;
  if (name === null) return refused("no --name is given");
  if (!SNAKE_WORD.test(name)) return refused(`--name ${JSON.stringify(name)} is not one snake_case word`);
  if (members.length < 2) return refused(`${members.length} --member given, fewer than two`);
  const given = [];
  const lines = [`shared: ${name}`];
  const others = new Map(
    (plan[SHARED_ROLES] || [])
      .filter((s) => s.name !== name)
      .flatMap((s) => s.members.map((m) => [`${m.rs}:${m.role}`, s.name])),
  );
  for (const member of members) {
    const m = MEMBER.exec(member);
    if (!m) return refused(`--member ${JSON.stringify(member)} is not <rs>:<role id>`);
    const [, rs, id] = m;
    if (!plan.order.includes(rs)) return refused(`--member ${member} names the RS ${rs}, which is not in the order`);
    if (given.some((g) => g.rs === rs)) return refused(`--member ${member} is a second Role of the RS ${rs}`);
    if (others.has(member)) return refused(`--member ${member} is a member of the shared Role ${others.get(member)}`);
    const r = rsRecord(rsDir, rs);
    if (r.error) return refused(r.error);
    const role = r.record.roles.find((x) => x.id === id);
    if (!role) return refused(`--member ${member} names the Role ${id}, which the RS ${rs} does not hold`);
    given.push({ rs, role: id });
    lines.push(roleLine(rs, role));
  }
  const shared = (plan[SHARED_ROLES] || []).slice();
  const i = shared.findIndex((s) => s.name === name);
  if (i === -1) shared.push({ name, members: given });
  else shared[i] = { name, members: given };
  const next = { ...plan, [SHARED_ROLES]: shared };
  const refusal = documentPlanRefusal(next, at);
  if (refusal) return refused(refusal);
  write(path, next);
  return { status: 0, lines };
}

// UNSHARE (kogaki#1981): removing the last shared Role removes the key.
export function unshare({ path, at, name }) {
  const read = readDocumentPlan(path, at);
  if (read.error) return refused(read.error);
  const { plan } = read;
  if (name === null) return refused("no --name is given");
  const shared = plan[SHARED_ROLES] || [];
  if (!shared.some((s) => s.name === name)) return refused(`${at} holds no shared Role ${name}`);
  const rest = shared.filter((s) => s.name !== name);
  const next = { ...plan };
  if (rest.length) next[SHARED_ROLES] = rest;
  else delete next[SHARED_ROLES];
  write(path, next);
  return { status: 0, lines: [`unshared: ${name}`] };
}

// ROLES (kogaki#1981): one line per Role of every RS in the plan's order, ending in its shared Role or `-`.
export function roles({ path, at, rsDir }) {
  const read = readDocumentPlan(path, at);
  if (read.error) return refused(read.error);
  const { plan } = read;
  const sharedOf = new Map(
    (plan[SHARED_ROLES] || []).flatMap((s) => s.members.map((m) => [`${m.rs}:${m.role}`, s.name])),
  );
  const lines = [];
  for (const rs of plan.order) {
    const r = rsRecord(rsDir, rs);
    if (r.error) return refused(r.error);
    for (const role of r.record.roles) lines.push(`${roleLine(rs, role)}\t${sharedOf.get(`${rs}:${role.id}`) ?? "-"}`);
  }
  return { status: 0, lines };
}

// THE MEMBER READ OF `check` (kogaki#1981): the first member whose RS file does not hold its Role, or null.
export function membersRefusal(plan, at, rsDir) {
  const records = new Map();
  for (const s of plan[SHARED_ROLES] || []) {
    for (const m of s.members) {
      if (!records.has(m.rs)) records.set(m.rs, rsRecord(rsDir, m.rs));
      const r = records.get(m.rs);
      const where = `${at}: the shared Role ${s.name}: the member ${m.rs}:${m.role}`;
      if (r.error) return `${where}: ${r.error}`;
      if (!r.record.roles.some((x) => x.id === m.role)) return `${where} names a Role the RS ${m.rs} does not hold`;
    }
  }
  return null;
}
