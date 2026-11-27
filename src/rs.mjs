// rs — the command that reads served Lessons or Decisions, or a written statement, into one RelationalStructure and
// keeps it under rs/ (kogaki#1970, kogaki#1973, kogaki#1975). `create` makes one reading and keeps it; each Relation no
// other names is a candidate, written at once where it is the only one and otherwise by `--reading --apex` with no
// call. `check` reads the files under rs/. The file's reader is src/rs/file.mjs; the instruction is
// prompts/rs/read.prompt.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { oneCall } from "./analogy.mjs";
import { renderPromptFile } from "./prompt-file.mjs";
import { readRs, relationsUnder, rsRefusal, sentenceOf, depthOf, topsOf, RESTS_ON, SNAKE_WORD } from "./rs/file.mjs";
import { resolveJudgeBinary } from "./workflow/judge.mjs";
import { REPO, gatewayQuery, relFromRepo } from "./workflow/run-record.mjs";
import { stringifyYaml } from "./yaml.mjs";

export const PROMPT_NAME = "rs/read";
// A refused reading is asked again with the refusal put back; the third refusal stops the command.
export const READ_CALLS = 3;
const FLOW_LABEL = "RS";
// `KOGAKI_RS_RUNS` replaces runs/rs/ and `KOGAKI_RS_UNITS` the gateway; `KOGAKI_RS_DIR` replaces rs/ FOR FIXTURES ONLY.
const runsRoot = () => process.env.KOGAKI_RS_RUNS || join(REPO, "runs", "rs");
const rsDir = () => process.env.KOGAKI_RS_DIR || join(REPO, "rs");
const ADDRESS = /^([^\s:/@]+)::(lesson|decision)\/([^\s/@]+)$/;
const JOURNEY = /^[^\s:/@]+::journey\//;
// The addresses beside `--statement` (kogaki#1975): the Units the statement rests on.
const RESTING = /^([^\s:/@]+)::(lesson|decision|journey)\/([^\s/@]+)$/;
const HEADER =
  "A RelationalStructure read by `node src/rs.mjs create` from the served Units under `sources`: its Roles, with " +
  "each source's own words for them, and its Relations. Edited by hand; `node src/rs.mjs check` reads it.";
const STATEMENT_HEADER =
  "A RelationalStructure read by `node src/rs.mjs create --statement` from the written statement under `sources`: " +
  "its Roles, with the statement's own words for them, and its Relations; `rests_on` cites the served Units the " +
  "statement rests on. Edited by hand; `node src/rs.mjs check` reads it.";
const USAGE =
  "usage: node src/rs.mjs create [--name <name>] <address> [<address> ...]\n" +
  "       node src/rs.mjs create --statement <file> [--name <name>] [<address> ...]\n" +
  "       node src/rs.mjs create --reading <stamp> --apex <n> [--name <name>]\n" +
  "       node src/rs.mjs check [<file> ...]";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
// A source as the file holds it: a statement's carries no cite (kogaki#1975).
const sourceEntry = ({ id, cite, text }) => (cite === undefined ? { id, text } : { id, cite, text });
const citeOf = (s) => s.cite ?? "statement";
const squeeze = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

// THE WORDS READ FROM A SERVED UNIT (kogaki#1970): a Decision whose text opens with `**`, the words up to the next `**`;
// any other Decision and every Lesson, the whole text.
export function unitText(kind, text) {
  const t = String(text ?? "");
  if (kind === "decision" && t.startsWith("**")) {
    const end = t.indexOf("**", 2);
    if (end > 2) return t.slice(2, end).trim();
  }
  return t;
}

// The served line of one address: `{ cite, text }` or null.
function servedUnit(address, pkg) {
  const file = process.env.KOGAKI_RS_UNITS;
  if (file) {
    const units = JSON.parse(readFileSync(file, "utf8"));
    return Object.hasOwn(units, address) ? units[address] : null;
  }
  const resp = gatewayQuery("policy_lookup", { question: address, package: pkg });
  return (resp.lines || []).find((l) => typeof l.cite === "string" && l.cite.startsWith(`${address}@`)) || null;
}

const fileAt = (name) => join(rsDir(), `${name}.yaml`);

// The arguments refused, or null.
function argumentsRefusal(addresses, name) {
  if (!addresses.length) return "no address is given";
  const twice = addresses.find((a, i) => addresses.indexOf(a) !== i);
  if (twice !== undefined) return `the address ${twice} is given twice`;
  const journey = addresses.find((a) => JOURNEY.test(a));
  if (journey !== undefined) return `the address ${journey} is of kind journey, and a Journey is not read`;
  const bad = addresses.find((a) => !ADDRESS.test(a));
  if (bad !== undefined)
    return `the address ${bad} is not <package>::lesson/<local-name> or <package>::decision/<local-name>`;
  return nameRefusal(name);
}

// The arguments beside `--statement` refused, or null.
function statementRefusal(addresses, name) {
  const twice = addresses.find((a, i) => addresses.indexOf(a) !== i);
  if (twice !== undefined) return `the address ${twice} is given twice`;
  const bad = addresses.find((a) => !RESTING.test(a));
  if (bad !== undefined) return `the address ${bad} is not of a Lesson, a Decision or a Journey`;
  return nameRefusal(name);
}

// The `--name` refused, or null.
function nameRefusal(name) {
  if (name !== null && !SNAKE_WORD.test(name)) return `--name ${JSON.stringify(name)} is not one snake_case word`;
  if (name !== null && existsSync(fileAt(name))) return `${relFromRepo(fileAt(name))} exists`;
  return null;
}

const KEYS = {
  answer: ["roles", "relations"],
  role: ["name", "context", "in"],
  relation: ["name", "holds", "from"],
};

function keysOf(entry, keys, extra, at) {
  if (!isMap(entry)) return `${at} is not a record`;
  const stray = Object.keys(entry).find((k) => !keys.includes(k) && !extra.includes(k));
  if (stray !== undefined) return `${at} carries the key \`${stray}\`, which it does not declare`;
  const missing = keys.find((k) => !Object.hasOwn(entry, k));
  return missing === undefined ? null : `${at} carries no \`${missing}\``;
}

// THE RECORD OF A READING, its ids minted in the order of the answer: `{ record }` or `{ refusal }`. Every refusal of
// the file's reader but the last applies, and every `words` and attribute occurs in the text of its source.
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
    const bad = keysOf(
      c,
      KEYS.relation,
      ["between", "relates"],
      `the Relation ${isMap(c) ? JSON.stringify(c.name) : JSON.stringify(c)}`,
    );
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
  const record = {
    sources: sources.map(sourceEntry),
    roles: answer.roles.map((r) => ({ id: roleId.get(r.name), name: r.name, context: r.context, in: r.in })),
    relations: answer.relations.map((c) => {
      const out = {
        id: relationId.get(c.name),
        name: c.name,
        holds:
          typeof c.holds === "string"
            ? c.holds.replace(/\{([^{}]*)\}/g, (m, n) => (roleId.has(n) ? `{${roleId.get(n)}}` : m))
            : c.holds,
        from: c.from,
      };
      if (Object.hasOwn(c, "between"))
        out.between = Array.isArray(c.between) ? c.between.map((n) => roleId.get(n) ?? n) : c.between;
      if (Object.hasOwn(c, "relates"))
        out.relates = Array.isArray(c.relates) ? c.relates.map((n) => relationId.get(n) ?? n) : c.relates;
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

// THE READING, each call kept under `dir`: `{ record }` or `{ stopped }`.
function reading(binary, sources, dir, restsOn) {
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

const stop = (key, lines) => ({ status: 1, lines: [`stopped: ${key}`, ...lines] });

// THE CANDIDATES OF A READING (kogaki#1973): each Relation no other names, with every Relation under it, the Roles their
// `between` names and the sources their `from` names, ordered by sources adopted, most first, then by depth, deepest
// first, then by the reading's order.
export function candidatesOf(record) {
  const order = new Map(record.relations.map((c, i) => [c.id, i]));
  return topsOf(record)
    .map((top, index) => {
      const relations = relationsUnder(record, top.id).sort((x, y) => order.get(x.id) - order.get(y.id));
      const named = new Set(relations.flatMap((c) => c.between || []));
      const from = new Set(relations.flatMap((c) => c.from));
      return {
        top,
        index,
        depth: depthOf(record, top.id),
        relations,
        roles: record.roles.filter((r) => named.has(r.id)),
        sources: record.sources.filter((s) => from.has(s.id)),
        restsOn: record[RESTS_ON] ?? null,
      };
    })
    .sort((x, y) => y.sources.length - x.sources.length || y.depth - x.depth || x.index - y.index);
}

// THE FILE OF ONE CANDIDATE: its sources, Roles and Relations alone, each renumbered in the reading's order.
export function candidateRecord(candidate) {
  const sourceId = new Map(candidate.sources.map((s, i) => [s.id, `S${i + 1}`]));
  const roleId = new Map(candidate.roles.map((r, i) => [r.id, `r_${i + 1}`]));
  const relationId = new Map(candidate.relations.map((c, i) => [c.id, `c_${i + 1}`]));
  const file = {
    sources: candidate.sources.map((s) => sourceEntry({ ...s, id: sourceId.get(s.id) })),
    roles: candidate.roles.map((r) => ({
      id: roleId.get(r.id),
      name: r.name,
      context: r.context,
      in: r.in.filter((e) => sourceId.has(e.source)).map((e) => ({ ...e, source: sourceId.get(e.source) })),
    })),
    relations: candidate.relations.map((c) => {
      const out = {
        id: relationId.get(c.id),
        name: c.name,
        holds: c.holds.replace(/\{([^{}]*)\}/g, (m, id) => (roleId.has(id) ? `{${roleId.get(id)}}` : m)),
        from: c.from.map((s) => sourceId.get(s)),
      };
      if (c.between) out.between = c.between.map((id) => roleId.get(id));
      if (c.relates) out.relates = c.relates.map((id) => relationId.get(id));
      return out;
    }),
  };
  if (candidate.restsOn) file[RESTS_ON] = candidate.restsOn;
  return file;
}

const readingFile = (stamp) => join(runsRoot(), stamp, "reading.json");
const STAMP = /^[0-9TZ-]+$/;

// The candidate written as a file under rs/: `{ status, lines }`.
function writeCandidate(record, candidate, name) {
  const kept = new Set(candidate.roles.map((r) => r.id));
  const roleName = new Map(record.roles.map((r) => [r.id, r.name]));
  for (const c of candidate.relations) {
    const stray = [...c.holds.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).find((id) => !kept.has(id));
    if (stray !== undefined)
      return stop("form", [
        `the Relation ${c.name} names the Role ${roleName.get(stray) ?? stray}, which no Relation of the candidate is between`,
      ]);
  }
  const file = candidateRecord(candidate);
  const refusal = rsRefusal(file, "the candidate");
  if (refusal) return stop("form", [refusal]);
  const [apex] = topsOf(file);
  let base = name ?? apex.name;
  for (let k = 2; name === null && existsSync(fileAt(base)); k++) base = `${apex.name}_${k}`;
  const path = fileAt(base);
  mkdirSync(rsDir(), { recursive: true });
  writeFileSync(path, stringifyYaml(file, { header: file[RESTS_ON] ? STATEMENT_HEADER : HEADER }));
  const adopted = new Set(candidate.sources.map((s) => s.id));
  return {
    status: 0,
    lines: [
      `written: ${relFromRepo(path)}`,
      `apex: ${apex.id} ${sentenceOf(file, apex)}`,
      `depth: ${depthOf(file, apex.id)}`,
      ...file.sources.map((s) => `source: ${s.id} ${citeOf(s)}`),
      ...(file[RESTS_ON] ?? []).map((c) => `rests on: ${c}`),
      ...record.sources.filter((s) => !adopted.has(s.id)).map((s) => `left out: ${citeOf(s)}`),
    ],
  };
}

// The candidates printed under their numbers, for the maintainer to choose one.
function candidateLines(record, candidates, stamp) {
  return [
    `candidates: ${candidates.length}`,
    `reading: ${stamp}`,
    ...candidates.flatMap((k, i) => [
      `${i + 1}: ${k.top.name}: ${sentenceOf(record, k.top)}`,
      `\tdepth: ${k.depth}`,
      ...k.sources.map((s) => `\tadopts: ${citeOf(s)}`),
      `\tleaves out: ${record.sources.length - k.sources.length}`,
      ...k.relations.filter((c) => c !== k.top).map((c) => `\tunder: ${c.name}: ${sentenceOf(record, c)}`),
    ]),
  ];
}

// The text of the `--statement` file, trimmed: `{ text }` or `{ refusal }`.
function statementText(path) {
  if (!path) return { refusal: "--statement names no file" };
  let text;
  try {
    text = readFileSync(path, "utf8").trim();
  } catch {
    return { refusal: `--statement names ${path}, which is no file` };
  }
  return text ? { text } : { refusal: `the statement ${path} holds no text` };
}

// CREATE (kogaki#1970, kogaki#1973): `{ status, lines }`; nothing is written under rs/ unless a file line is printed.
// With `statement`, the file's text is the one source and the addresses are the Units it rests on (kogaki#1975).
export function create(addresses, { name = null, statement = null } = {}) {
  const bad = statement === null ? argumentsRefusal(addresses, name) : statementRefusal(addresses, name);
  if (bad) return stop("arguments", [bad]);
  const said = statement === null ? null : statementText(statement);
  if (said?.refusal) return stop("arguments", [said.refusal]);
  const lines = [];
  for (const address of addresses) {
    const [, pkg] = RESTING.exec(address);
    const line = servedUnit(address, pkg);
    if (!line || typeof line.cite !== "string") return stop("not-served", [`the served Units hold no ${address}`]);
    lines.push(line);
  }
  const sources = said
    ? [{ id: "S1", text: said.text }]
    : lines.map((line, i) => ({
        id: `S${i + 1}`,
        cite: line.cite,
        text: unitText(ADDRESS.exec(addresses[i])[2], line.text),
      }));
  const restsOn = said ? lines.map((line) => line.cite) : null;
  const binary = resolveJudgeBinary(process.env.KOGAKI_JUDGE_CLI || "claude", process.env.PATH).path;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const read = reading(binary, sources, join(runsRoot(), stamp), restsOn);
  if (read.stopped) return stop("form", [read.stopped]);
  const { record } = read;
  writeFileSync(readingFile(stamp), `${JSON.stringify(record, null, 2)}\n`);
  const candidates = candidatesOf(record);
  if (candidates.length === 1) return writeCandidate(record, candidates[0], name);
  return { status: 0, lines: candidateLines(record, candidates, stamp) };
}

// CREATE FROM A KEPT READING (kogaki#1973): candidate `apex`, counted from 1 in the order printed, with no call.
export function createFromReading(stamp, apex, { name = null } = {}) {
  if (!STAMP.test(stamp) || !existsSync(readingFile(stamp)))
    return stop("arguments", [`no reading is kept under ${stamp}`]);
  const bad = nameRefusal(name);
  if (bad) return stop("arguments", [bad]);
  const record = JSON.parse(readFileSync(readingFile(stamp), "utf8"));
  const candidates = candidatesOf(record);
  const n = /^[1-9][0-9]*$/.test(apex) ? Number(apex) : 0;
  if (n < 1 || n > candidates.length)
    return stop("arguments", [`--apex ${apex} names no candidate; the reading holds ${candidates.length}`]);
  return writeCandidate(record, candidates[n - 1], name);
}

// CHECK (kogaki#1970): every file named, or every file under rs/; `{ status, lines }`.
export function check(files) {
  const dir = rsDir();
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
    const r = readRs(path, at);
    if (r.error) {
      status = 1;
      lines.push(`refused: ${r.error}`);
      continue;
    }
    const { record, apex, depth } = r;
    lines.push(
      `${at}\tapex ${apex.id}\t${sentenceOf(record, apex)}\tdepth ${depth}\t` +
        `${record.sources.length} sources, ${record.roles.length} roles, ${record.relations.length} relations`,
    );
  }
  return { status, lines };
}

function main(argv) {
  const [verb, ...rest] = argv;
  let r;
  if (verb === "create") {
    let name = null;
    let stamp = null;
    let apex = null;
    const statements = [];
    const addresses = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === "--name") name = rest[++i] ?? "";
      else if (rest[i] === "--reading") stamp = rest[++i] ?? "";
      else if (rest[i] === "--apex") apex = rest[++i] ?? "";
      else if (rest[i] === "--statement") statements.push(rest[++i] ?? "");
      else addresses.push(rest[i]);
    }
    if (statements.length > 1) r = stop("arguments", ["--statement is given twice"]);
    else if (statements.length && (stamp !== null || apex !== null))
      r = stop("arguments", ["--statement is given beside --reading or --apex"]);
    else if (stamp === null && apex === null) r = create(addresses, { name, statement: statements[0] ?? null });
    else if (stamp === null || apex === null) r = stop("arguments", ["--reading and --apex are given together"]);
    else if (addresses.length) r = stop("arguments", ["an address is given beside --reading"]);
    else r = createFromReading(stamp, apex, { name });
  } else if (verb === "check") r = check(rest);
  else {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  if (r.lines.length) process.stdout.write(`${r.lines.join("\n")}\n`);
  process.exit(r.status);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
