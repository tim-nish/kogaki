// document-plan — the command that joins RS files under rs/ into one DocumentPlan under document-plans/ (kogaki#1976):
// the RSs in reading order and each connection's Satellite, relation and Nucleus, as the maintainer settled them with
// the Session. It calls no model. The file's reader is src/document-plan/file.mjs.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  connectionRefusal,
  documentPlanRefusal,
  orderRefusal,
  readDocumentPlan,
  topsOf,
} from "./document-plan/file.mjs";
import { readRs, sentenceOf, SNAKE_WORD } from "./rs/file.mjs";
import { REPO, relFromRepo } from "./workflow/run-record.mjs";
import { stringifyYaml } from "./yaml.mjs";

// `KOGAKI_RS_DIR` replaces rs/ and `KOGAKI_DOCUMENT_PLANS_DIR` replaces document-plans/, FOR FIXTURES ONLY.
const rsDir = () => process.env.KOGAKI_RS_DIR || join(REPO, "rs");
const plansDir = () => process.env.KOGAKI_DOCUMENT_PLANS_DIR || join(REPO, "document-plans");
const HEADER =
  "A DocumentPlan written by `node src/document-plan.mjs create`: RS files under rs/ in reading order, and each " +
  "connection's Satellite, relation and Nucleus. `node src/document-plan.mjs check` reads it.";
const USAGE =
  "usage: node src/document-plan.mjs create --name <name> --order <rs>[,<rs> ...] " +
  "--connect <satellite>:<relation>:<nucleus> [--connect ...]\n" +
  "       node src/document-plan.mjs check [<file> ...]";
const CONNECT = /^([^:]+):([^:]+):([^:]+)$/;

const refused = (line) => ({ status: 1, lines: [`refused: ${line}`] });

// CREATE (kogaki#1976): `{ status, lines }`; nothing is written unless `written:` is printed.
export function create({ name, order, connects }) {
  if (name === null) return refused("no --name is given");
  if (!SNAKE_WORD.test(name)) return refused(`--name ${JSON.stringify(name)} is not one snake_case word`);
  const path = join(plansDir(), `${name}.yaml`);
  if (existsSync(path)) return refused(`${relFromRepo(path)} exists`);
  const badOrder = orderRefusal(order, "--order");
  if (badOrder) return refused(badOrder);
  const records = new Map();
  for (const rs of order) {
    const file = join(rsDir(), `${rs}.yaml`);
    if (!existsSync(file)) return refused(`the RS ${rs} has no file ${relFromRepo(file)}`);
    const r = readRs(file, relFromRepo(file));
    if (r.error) return refused(`the RS ${rs} is refused by readRs: ${r.error}`);
    records.set(rs, r);
  }
  const connections = [];
  for (const given of connects) {
    const m = CONNECT.exec(given);
    if (!m) return refused(`--connect ${JSON.stringify(given)} is not <satellite>:<relation>:<nucleus>`);
    const c = { satellite: m[1], relation: m[2], nucleus: m[3] };
    const bad = connectionRefusal(c, order, "--connect");
    if (bad) return refused(bad);
    connections.push(c);
  }
  const plan = { order, connections };
  const refusal = documentPlanRefusal(plan, "the plan");
  if (refusal) return refused(refusal);
  const [top] = topsOf(plan);
  const { record, apex } = records.get(top);
  mkdirSync(plansDir(), { recursive: true });
  writeFileSync(path, stringifyYaml(plan, { header: HEADER }));
  return {
    status: 0,
    lines: [
      `written: ${relFromRepo(path)}`,
      `top nucleus: ${top} ${sentenceOf(record, apex)}`,
      `rs: ${order.length}`,
      `connections: ${connections.length}`,
    ],
  };
}

// CHECK (kogaki#1976): every file named, or every file under document-plans/; `{ status, lines }`.
export function check(files) {
  const dir = plansDir();
  const paths = files.length
    ? files.map((f) => resolve(f))
    : existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".yaml"))
          .sort()
          .map((f) => join(dir, f))
      : [];
  let status = 0;
  const lines = [];
  for (const path of paths) {
    const at = relFromRepo(path);
    const r = readDocumentPlan(path, at);
    if (r.error) {
      status = 1;
      lines.push(`refused: ${r.error}`);
      continue;
    }
    lines.push(`${at}\ttop nucleus ${r.top}\trs ${r.plan.order.length}\tconnections ${r.plan.connections.length}`);
  }
  return { status, lines };
}

function main(argv) {
  const [verb, ...rest] = argv;
  let r;
  if (verb === "create") {
    let name = null;
    let order = [];
    const connects = [];
    let stray = null;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--name") name = rest[++i] ?? "";
      else if (rest[i] === "--order") order = (rest[++i] ?? "").split(",").filter((s) => s !== "");
      else if (rest[i] === "--connect") connects.push(rest[++i] ?? "");
      else stray ??= rest[i];
    }
    r =
      stray !== null
        ? refused(`the argument ${JSON.stringify(stray)} is not declared`)
        : create({ name, order, connects });
  } else if (verb === "check") r = check(rest);
  else {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  if (r.lines.length) process.stdout.write(`${r.lines.join("\n")}\n`);
  process.exit(r.status);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
