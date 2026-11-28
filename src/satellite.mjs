// satellite — the one verb that reads served Decisions or Lessons by themselves into a structure and appends it to
// `satellites.yaml` beside a Brief (kogaki#1963): `add` reads the Units' sentences with the structure reading /brief
// makes, takes one structure and its ApexRelation, derives its Legs, and appends the entry under the next free id. The
// file's reader and writer are src/compose/satellites.mjs; the two instructions are prompts/sme/read-structure.prompt
// and prompts/brief/apex.prompt, unchanged.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here. This module names no spec content.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readBriefFiles } from "./compose.mjs";
import { audienceLanguage, audiencePathOf, personaPriorKnowledgeLine, readerPersona } from "./compose/audience.mjs";
import {
  RST_RELATIONS,
  appendedSatellitesText,
  nextSatelliteId,
  readSatellites,
  satellitesRefusal,
  writeSatellitesText,
} from "./compose/satellites.mjs";
import {
  componentsOf,
  describedComponent,
  readHolds,
  structureLegs,
  validateApex,
  withApex,
  withReach,
} from "./compose/structure.mjs";
import { mintStructure, relationsAmongRelations, relationsAmongRoles, validateReadSet } from "./sme/structure.mjs";
import { oneCall } from "./analogy.mjs";
import { renderPromptFile } from "./prompt-file.mjs";
import { resolveJudgeBinary } from "./workflow/judge.mjs";
import { REPO, gatewayQuery, relFromRepo } from "./workflow/run-record.mjs";
import { printBriefPlanPlayground } from "./workflow/playground-file.mjs";
import { READ_ADDRESS, READ_KINDS, formsOf, headlineOf } from "./unit-address.mjs";

export const STRUCTURE_PROMPT = "sme/read-structure";
export const APEX_PROMPT = "brief/apex";
// A refused answer is asked again with the same prompt; the third refusal stops the command.
export const READ_CALLS = 3;
const FLOW_LABEL = "Satellite";
// `KOGAKI_SATELLITE_RUNS` replaces runs/satellite/ and `KOGAKI_SATELLITE_UNITS` the gateway, FOR FIXTURES ONLY.
const runsRoot = () => process.env.KOGAKI_SATELLITE_RUNS || join(REPO, "runs", "satellite");
// The expression /brief cuts a Lesson's headline with (src/workflow/strands.mjs).
const FIRST_SENTENCE = /^.*?[.!?](?=\s|$)/;
const USAGE =
  "usage: node src/satellite.mjs add --brief <theses/<slug>/brief.yaml> --before <leg_id> " +
  `--as <${RST_RELATIONS.join("|")}> <address> [<address> ...]`;

const isText = (v) => typeof v === "string" && v.trim() !== "";

// THE SENTENCE READ FROM A SERVED UNIT (kogaki#1963, kogaki#1989): its headline where src/unit-address.mjs finds one,
// otherwise its first sentence, or the whole text where there is none.
export function unitClaim(kind, text) {
  const headline = headlineOf(kind, text);
  if (headline !== null) return headline;
  const t = String(text ?? "");
  const m = FIRST_SENTENCE.exec(t);
  return (m ? m[0] : t).trim();
}

// The served line of one address: `{ cite, text }` or null.
function servedUnit(address, pkg) {
  const file = process.env.KOGAKI_SATELLITE_UNITS;
  if (file) {
    const units = JSON.parse(readFileSync(file, "utf8"));
    return Object.hasOwn(units, address) ? units[address] : null;
  }
  const resp = gatewayQuery("policy_lookup", { question: address, package: pkg });
  return (resp.lines || []).find((l) => typeof l.cite === "string" && l.cite.startsWith(`${address}@`)) || null;
}

// A READING REFUSED, or null: what `mintStructure` and `validateReadSet` refuse, and a source stating no relation.
export function readingRefusal(answer, claims) {
  const m = mintStructure(answer);
  if (m.text) return { refusal: m.text };
  const v = validateReadSet(m.structure, claims, { thesis: false, considered: true });
  if (v.text) return { refusal: v.text };
  const stated = new Set([
    ...relationsAmongRoles(m.structure).map((r) => r.from),
    ...relationsAmongRelations(m.structure).flatMap((h) => h.from || []),
  ]);
  const idle = claims.find((c) => !stated.has(c.id));
  if (idle) return { refusal: `the source ${idle.id} is the \`from\` of no relation — every source states one` };
  return { structure: m.structure };
}

// THE CALLS OF ONE STEP, each kept under `dir`: `{ value }` or `{ stopped }`. `judge(record)` returns
// `{ refusal }` or `{ value }`.
function calls(binary, prompt, input, dir, what, judge) {
  let last = null;
  for (let n = 1; n <= READ_CALLS; n++) {
    const d = join(dir, `call-${n}`);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "input.json"), `${JSON.stringify(input, null, 2)}\n`);
    writeFileSync(join(d, "prompt.txt"), prompt);
    const out = oneCall(binary, prompt);
    writeFileSync(join(d, "answer.txt"), out.raw);
    if (out.died) return { stopped: `the ${what} call died: ${out.died}` };
    const got = out.refusal ? { refusal: out.refusal } : judge(out.record);
    if (!got.refusal) return { value: got.value };
    last = got.refusal;
    writeFileSync(join(d, "refusal.txt"), `${last}\n`);
  }
  return { stopped: `the ${what} was refused ${READ_CALLS} times; the last refusal: ${last}` };
}

const promptOf = (name, rowId, input) =>
  renderPromptFile(name, { flow_label: FLOW_LABEL, row_id: rowId, input: JSON.stringify(input, null, 2) });

// The Units of the addresses: `{ sources }` or `{ error }`.
function readUnits(addresses) {
  const sources = [];
  for (const [i, address] of addresses.entries()) {
    const [, pkg, kind] = READ_ADDRESS.exec(address);
    const line = servedUnit(address, pkg);
    if (!line || !isText(line.cite)) return { error: `the served Units hold no ${address}` };
    sources.push({ id: `U${i + 1}`, cite: line.cite, claim: unitClaim(kind, line.text) });
  }
  return { sources };
}

// The arguments refused, or null.
function argumentsRefusal(record, before, as, addresses) {
  if (!record.reader_path.some((l) => l.leg_id === before))
    return `--before ${before} names no Leg of reader-path.yaml`;
  if (!RST_RELATIONS.includes(as)) return `--as ${as} is not one of ${RST_RELATIONS.join(", ")}`;
  if (!addresses.length) return "no address is given";
  const twice = addresses.find((a, i) => addresses.indexOf(a) !== i);
  if (twice !== undefined) return `the address ${twice} is given twice`;
  const bad = addresses.find((a) => !READ_ADDRESS.test(a));
  if (bad !== undefined) return `the address ${bad} is not ${formsOf(READ_KINDS)}`;
  return null;
}

// ADD (kogaki#1963): `{ lines }` naming the entry written, or `{ error, lines }` where it stopped with nothing written.
export function add(briefPath, { before, as, addresses }) {
  const r = readBriefFiles(briefPath);
  if (r.error) return { error: r.error, lines: [] };
  const current = readSatellites(briefPath, r.record);
  if (current.error) return { error: `${current.error}. Nothing was written`, lines: [] };
  const bad = argumentsRefusal(r.record, before, as, addresses);
  if (bad) return { error: bad, lines: [] };
  const units = readUnits(addresses);
  if (units.error) return { error: units.error, lines: [] };
  const claims = units.sources.map(({ id, claim }) => ({ id, claim }));
  const audience = audiencePathOf(r.record);
  const persona = readerPersona(audience);
  if (persona.error) return { error: persona.error, lines: [] };
  const binary = resolveJudgeBinary(process.env.KOGAKI_JUDGE_CLI || "claude", process.env.PATH).path;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = join(runsRoot(), basename(dirname(resolve(briefPath))), stamp);
  const readInput = {
    state: "read_structure",
    claims,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
  };
  const read = calls(
    binary,
    promptOf(STRUCTURE_PROMPT, "read_structure", readInput),
    readInput,
    join(runDir, "read-structure"),
    "structure reading",
    (answer) => {
      const got = readingRefusal(answer, claims);
      return got.refusal ? got : { value: got.structure };
    },
  );
  if (read.stopped) return { error: `${read.stopped}. Nothing was written`, lines: [] };
  let structure = read.value;
  const components = componentsOf(structure, claims);
  if (components.length > 1) {
    return {
      error:
        `the Units were read as ${components.length} structures with nothing joining them, and each is added by its own ` +
        "run. Nothing was written",
      lines: components.flatMap((k) => [
        `${k.component}:`,
        ...k.relations.map((id) => `\t${readHolds(structure, structure.relations.find((x) => x.id === id).holds)}`),
      ]),
    };
  }
  const [k] = components;
  if (k.top.length === 1) structure = withReach({ ...structure, attains_thesis: k.top[0] }, claims);
  else {
    const language = audienceLanguage(audience);
    if (language.error) return { error: language.error, lines: [] };
    const apexInput = {
      state: "apex",
      language: language.language,
      claims,
      components: [describedComponent(structure, k)],
    };
    const apex = calls(
      binary,
      promptOf(APEX_PROMPT, "apex", apexInput),
      apexInput,
      join(runDir, "apex"),
      "apex",
      (answer) => {
        const v = validateApex(answer, [k], structure);
        return v.text ? { refusal: v.text } : { value: answer.apexes[0] };
      },
    );
    if (apex.stopped) return { error: `${apex.stopped}. Nothing was written`, lines: [] };
    structure = withApex(structure, apex.value, claims);
  }
  const id = nextSatelliteId(current.absent ? null : current.record);
  const entry = {
    id,
    rst_relation: as,
    before,
    sources: units.sources,
    structure,
    reader_path: structureLegs(structure, claims).map((l, i) => ({ leg_id: `${id}.L${i + 1}`, relation: l.relation })),
  };
  const out = appendedSatellitesText(current.absent ? null : current, entry);
  const refusal = satellitesRefusal(out.file, r.record, relFromRepo(current.path));
  if (refusal) return { error: `${refusal}. Nothing was written`, lines: [] };
  writeSatellitesText(current.path, out.text);
  const holdsOf = (rel) => readHolds(structure, structure.relations.find((x) => x.id === rel).holds);
  return {
    lines: [
      `wrote ${id} to ${relFromRepo(current.path)}`,
      `apex\t${structure.attains_thesis}\t${holdsOf(structure.attains_thesis)}`,
      ...entry.reader_path.map((l) => `${l.leg_id}\t${l.relation}\t${holdsOf(l.relation)}`),
    ],
  };
}

function main(argv) {
  const flags = new Map();
  const addresses = [];
  for (let i = 1; i < argv.length; i++) {
    if (["--brief", "--before", "--as"].includes(argv[i])) flags.set(argv[i], argv[++i]);
    else addresses.push(argv[i]);
  }
  const briefPath = flags.get("--brief");
  if (argv[0] !== "add" || !isText(briefPath) || !isText(flags.get("--before")) || !isText(flags.get("--as"))) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  const r = add(resolve(briefPath), { before: flags.get("--before"), as: flags.get("--as"), addresses });
  if (r.lines.length) process.stdout.write(`${r.lines.join("\n")}\n`);
  if (r.error) {
    process.stderr.write(`satellite: ${r.error}\n`);
    process.exit(1);
  }
  // THE BRIEFPLANPLAYGROUND IS WRITTEN AGAIN after the entry is appended (kogaki#1967); a page not written is a warning.
  printBriefPlanPlayground(resolve(briefPath));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
