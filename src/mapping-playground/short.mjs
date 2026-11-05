#!/usr/bin/env node
// The Structure-Mapping Playground's short Trial (kogaki#1669): one proposition, one Move, one paragraph,
// read on a sheet that compares the proposition with the RBS slot; a second Leg Waypoint states the proposition (kogaki#1681, kogaki#1689).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, personaPriorKnowledgeLine, loadMoveContracts } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { derivedRow } from "../proof-sheet/leg-brief.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { planLeg, paragraphPlanUnitInput, validateParagraphPlanUnit, PARAGRAPH_PLAN_TABLE } from "../paragraph-plan.mjs";
import { renderPacket } from "../draft/render-packet.mjs";
import { splitPacketTemplate } from "../draft/packet.mjs";
import { sectionsOf, sectionOfLeg } from "../draft/workspace.mjs";
import { writerSettings, writerRefusal } from "../draft/writer.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseProposition, validateStructure, higherOrderOf } from "./structure.mjs";
import { validateRbsTable, suppliedEntry, projectionsOf, BASE_KIND_DEFINITIONS } from "./rbs.mjs";
import { mapperRow, MAPPER_ATTEMPTS } from "./sme.mjs";
import { EXTRACTION_TABLE } from "../proof-sheet/extract.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR, TRIAL_FILE, READING_FILE, STRUCTURE_FILE } from "./trial.mjs";
import { renderShortSheet } from "./sheet.mjs";

export const RBS_ROW_PREFIX = "rbs_";
export const RBS_DEFAULT = "rbs_placeholder";
export const RBS_FILE = "rbs.yaml";
export const RBS_OWNER = "owner-authored";
export const BIND_FILE = "bind.yaml";
export const PACKET_FILE = "packet.md";
export const PARAGRAPH_FILE = "paragraph.md";
export const SHEET_FILE = "sheet.html";
export const SHORT_STAGES = ["sme", "rbs", "bind", "write"];
const LEG_ID = "smp";
const BIND_ROW = "smp_bind_unit";
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
const PACKET_TEMPLATE = join(REPO, "src", "packet-template.md");
const USAGE = "usage: node src/mapping-playground/short.mjs run --proposition <file> (--structure <file> | --mapper <sme_map_<variant>>) "
  + "--out <dir under runs/mapping-playground/> [--rbs <rbs_<variant>> | --rbs-file <file>] [--audience <audiences/<name>.md>] [--library <dir>]";

function fail(msg) {
  process.stderr.write(`short: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => (path && existsSync(path) ? { path: relFromRepo(path), sha256: sha256(path) } : null);
const readTable = () => JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));

// ---------------------------------------------------------------------------
// THE CORRESPONDENCE TABLE: a row `rbs_<variant>` fills it; `fill` names the code that does.

export function rbsRow(table, variant) {
  const rows = Object.keys(table).filter((k) => k.startsWith(RBS_ROW_PREFIX));
  if (!String(variant).startsWith(RBS_ROW_PREFIX) || !table[variant]) {
    return { error: `--rbs ${JSON.stringify(variant)} names no \`${RBS_ROW_PREFIX}<variant>\` row of the Playground's table — it declares ${rows.join(", ") || "none"}` };
  }
  const row = { id: variant, ...table[variant] };
  if (row.judgment_point) return { row };
  if (!Object.hasOwn(RBS_FILLS, row.fill)) {
    return { error: `the \`${variant}\` row's \`fill\` ${JSON.stringify(row.fill)} names no fill this runner carries — it carries ${Object.keys(RBS_FILLS).join(", ")}` };
  }
  return { row };
}

const RBS_FILLS = {
  // One pair per Role, in the structure's order; the variant cannot say which base object plays it.
  roles: (structure) => structure.roles.map((r) => ({ base: null, target: r.id })),
};

export function fillRbs(row, structure) {
  return { variant: row.id, placeholder: row.placeholder === true, base: { domain: null, kind: null }, pairs: RBS_FILLS[row.fill](structure) };
}

export function rbsBaseInput(structure, persona) {
  return {
    structure,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    kinds: Object.entries(BASE_KIND_DEFINITIONS).map(([kind, definition]) => ({ kind, definition })),
  };
}

function rbsBaseRefusal(answer, proposition, structure, libraryDir) {
  const isMap = answer && typeof answer === "object" && !Array.isArray(answer);
  const extra = isMap ? Object.keys(answer).find((k) => k !== "base" && k !== "pairs") : null;
  if (extra) return `the answer carries \`${extra}\`, which the row does not declare — it carries base and pairs`;
  const v = validateRbsTable(isMap ? { ...answer, placeholder: false } : answer, proposition, { movesDir: libraryDir, structure });
  return v.error || null;
}

// The `rbs_base` row (kogaki#1688).
function rbsBaseStage({ dir, env, row, structure, persona, proposition, libraryDir }) {
  const extraction = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const input = rbsBaseInput(structure, persona);
  const history = [];
  for (let attempt = 1; attempt <= MAPPER_ATTEMPTS; attempt++) {
    const held = bindFlow(FLOW);
    let prompt;
    try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, history.length ? history : null); } finally { bindFlow(held); }
    writeFileSync(join(dir, `prompt-${attempt}.md`), prompt);
    const call = oneCall({ env, model: String(settingValue(extraction.judge.model)), outputFormat: String(extraction.judge.output_format || "json"),
      timeoutS: Number(settingValue(extraction.job.call_limit_s)), input: prompt });
    if (call.stopped) return { stopped: call.stopped };
    const a = answerRecord(call.text);
    if (a.record !== undefined) writeFileSync(join(dir, `answer-${attempt}.json`), JSON.stringify(a.record, null, 2) + "\n");
    const refusal = a.stopped || rbsBaseRefusal(a.record, proposition, structure, libraryDir);
    if (!refusal) return { table: { variant: row.id, placeholder: false, base: a.record.base, pairs: a.record.pairs } };
    history.push({ answer: a.record ?? null, refusal });
  }
  return { stopped: `the \`${row.id}\` answer was refused ${MAPPER_ATTEMPTS} times; the last refusal: ${history[history.length - 1].refusal}` };
}

// ---------------------------------------------------------------------------
// THE ONE LEG (kogaki#1681, kogaki#1685, kogaki#1689): its one claim is the proposition, in the Brief's form; its first Leg Waypoint is
// the structure in the base's objects, and one Leg Waypoint whose point is the proposition follows per projecting binding, one in the model route.
// The first Leg Waypoint's point (kogaki#1688).
export function firstPoint(structure, rbs) {
  const base = new Map(rbs.pairs.map((p) => [p.target, p.base === null ? p.target : String(p.base).trim()]));
  return [...structure.relations, ...higherOrderOf(structure)]
    .map((e) => String(e.holds).trim().replace(/\{([^{}\s]+)\}/g, (all, id) => (base.has(id) ? base.get(id) : all)))
    .map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(" ");
}

export function shortLeg(proposition, rbs, persona, structure) {
  const first = { point: firstPoint(structure, rbs), serves: ["L1"] };
  return {
    leg_id: LEG_ID,
    reader_state_before: personaPriorKnowledgeLine(persona),
    reader_state_after: null,
    claims: [{ strand: "L1", proposition }],
    waypoints: [first, ...Array.from({ length: Math.max(1, projectionsOf(rbs).length) }, () => ({ point: proposition, serves: ["L1"] }))],
    introduces: [],
    journeys: [],
  };
}

// ONE MODEL CALL through the run's recorder, bounded by `timeoutS`; the answer's text, or the stop.
function oneCall({ env, model, outputFormat, timeoutS, input }) {
  const argv = ["-p", "--model", model, "--output-format", outputFormat, "--tools", "", "--disable-slash-commands",
    "--strict-mcp-config", "--setting-sources", "", "--no-session-persistence"];
  const r = spawnSync(env.KOGAKI_JUDGE_CLI, argv, { input, env, encoding: "utf8", timeout: 1000 * timeoutS, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { stopped: `the call could not finish (${r.error.code || "spawn failed"}: ${r.error.message})` };
  if (r.status !== 0) return { stopped: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${String(r.stderr || "").trim().split("\n")[0] || "(no stderr)"}` };
  if (outputFormat !== "json") return { text: String(r.stdout) };
  try {
    const envl = JSON.parse(r.stdout);
    if (typeof envl === "string") return { text: envl };
    if (envl && typeof envl.result === "string") return { text: envl.result };
  } catch (e) { return { stopped: `the call's json answer does not parse (${e.message})` }; }
  return { stopped: "the call's json answer carries no string `result`" };
}

function answerRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; }
  catch (e) { return { stopped: `the binding answer is not one JSON record (${e.message})` }; }
}

function bindStage({ dir, env, leg, persona, libraryDir, table }) {
  const plan = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const d = derivedRow(table, BIND_ROW, PLAYGROUND_TABLE);
  if (d.error) return { stopped: d.error };
  const row = { ...plan.paragraph_plan_unit, ...d.row, shared_text_file: plan.paragraph_plan_unit.shared_text_file };
  const library = loadMoveContracts(libraryDir);
  if (library.error) return { stopped: library.error };
  const planned = planLeg(leg);
  const input = paragraphPlanUnitInput(planned, library.moves, persona);
  const held = bindFlow(FLOW);
  let prompt;
  try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
  writeFileSync(join(dir, "prompt.md"), prompt);
  const call = oneCall({ env, model: String(settingValue(plan.judge.model)), outputFormat: String(plan.judge.output_format || "json"),
    timeoutS: Number(settingValue(plan.job.call_limit_s)), input: prompt });
  if (call.stopped) return { stopped: call.stopped };
  const a = answerRecord(call.text);
  if (a.stopped) return { stopped: a.stopped };
  writeFileSync(join(dir, "answer.json"), JSON.stringify(a.record, null, 2) + "\n");
  let v;
  try { v = validateParagraphPlanUnit(a.record, { legs: [planned], movesDir: libraryDir }, "leg-1"); }
  catch (e) { v = { error: String(e && e.message || e) }; }
  if (v.error) return { stopped: v.error.split("\n").join(" ") };
  return { entries: a.record.waypoints };
}

// THE PARAGRAPHS: one Packet over a one-Leg Brief, each Leg Waypoint carrying its binding's points, and the writer called once.
export function shortPacket({ leg, paragraphs, audiencePath }) {
  const split = splitPacketTemplate(readFileSync(PACKET_TEMPLATE, "utf8"));
  if (split.error) return { error: split.error };
  const packetLeg = { ...leg, waypoints: leg.waypoints.map((w, i) => ({ ...w, paragraph_waypoints: paragraphs[i].paragraph_waypoints })) };
  const brief = { record: { compose_path: relFromRepo(audiencePath) }, legs: [packetLeg], strands: [] };
  return renderPacket({ template: split.packet, brief, leg: packetLeg, priorSections: [],
    section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
}

function writeStage({ dir, env, leg, paragraphs, audiencePath, paragraphPath }) {
  const p = shortPacket({ leg, paragraphs, audiencePath });
  if (p.error) return { stopped: p.error };
  const packetPath = join(dir, PACKET_FILE);
  writeFileSync(packetPath, p.packet);
  const w = writerSettings();
  const call = oneCall({ env, model: w.model, outputFormat: w.output_format, timeoutS: w.timeout_s, input: p.packet });
  if (call.stopped) return { stopped: call.stopped, packet: relFromRepo(packetPath) };
  const refused = writerRefusal(call.text);
  if (refused) return { stopped: `the writer refused: ${refused}`, packet: relFromRepo(packetPath) };
  if (String(call.text).trim() === "") return { stopped: "the writer returned no prose", packet: relFromRepo(packetPath) };
  writeFileSync(paragraphPath, String(call.text).trim() + "\n");
  return { packet: relFromRepo(packetPath) };
}

// ---------------------------------------------------------------------------
// THE SHORT TRIAL.

function readProposition(file) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch (e) { fail(`the proposition file cannot be read (${e.message}). Nothing was started.`); }
  const proposition = parseProposition(text);
  if (proposition.error) fail(`${proposition.error}. Nothing was started.`);
  return proposition;
}

function readRbsFile(file, proposition, libraryDir, structure) {
  let record;
  try { record = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the correspondence table cannot be read (${e.message})` }; }
  const v = validateRbsTable(record && typeof record === "object" ? { ...record, placeholder: false } : record, proposition.proposition,
    { movesDir: libraryDir, structure });
  if (v.error) return v;
  if (!Object.hasOwn(record, "projection")) {
    return { error: "the correspondence table carries no `projection`: the owner's table binds the paragraph whose point is the proposition, "
      + "and a Trial that never states the proposition has no reading (kogaki#1689)" };
  }
  return { record: { ...record, variant: RBS_OWNER, placeholder: false } };
}

function readStructure(file, proposition) {
  let structure;
  try { structure = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the structure cannot be read (${e.message})` }; }
  const v = validateStructure(structure, proposition);
  return v.error ? v : { structure };
}

export function runShortTrial({ proposition: propositionFile, structure: givenStructure = null, mapper = null, out, rbs = RBS_DEFAULT,
  rbsFile = null, audience = null, library = null }) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep)) fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE))) fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  const table = readTable();
  const rr = rbsFile ? { row: { id: RBS_OWNER, placeholder: false } } : rbsRow(table, rbs);
  if (rr.error) fail(`${rr.error}. Nothing was started.`);
  const proposition = readProposition(propositionFile);
  let given = null;
  if (mapper) {
    const m = mapperRow(table, mapper);
    if (m.error) fail(`${m.error}. Nothing was started.`);
  } else {
    const s = readStructure(givenStructure, proposition);
    if (s.error) fail(`${s.error}. Nothing was started.`);
    given = s.structure;
  }
  const structureFile = mapper ? join(outDir, STRUCTURE_FILE) : resolve(givenStructure);
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(`${persona.error}. Nothing was started.`);
  const libraryDir = resolve(REPO, library || "moves");
  if (!existsSync(libraryDir)) fail(`the library ${libraryDir} does not exist. Nothing was started.`);
  const owned = rbsFile ? readRbsFile(rbsFile, proposition, libraryDir, given) : null;
  if (owned && owned.error) fail(`${owned.error}. Nothing was started.`);
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const slug = basename(outDir).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trial";
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const reading = join(outDir, READING_FILE);
  writeFileSync(reading, `# Reading of Trial ${slug}\n`);
  const rbsPath = join(outDir, RBS_FILE);
  const bindPath = join(outDir, BIND_FILE);
  const paragraphPath = join(outDir, PARAGRAPH_FILE);
  const sheetPath = join(outDir, SHEET_FILE);
  const record = {
    trial: slug,
    kind: "short",
    proposition: { cite: proposition.cite, proposition: proposition.proposition, path: relFromRepo(resolve(propositionFile)), sha256: sha256(propositionFile) },
    structure: mapper ? { path: relFromRepo(structureFile), sha256: null, author: "sme" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    rbs: { variant: rr.row.id, placeholder: rr.row.placeholder === true, path: null, sha256: null },
    bind: { move: null, binding_rationale: null, path: null, sha256: null },
    paragraph: { path: null, sha256: null },
    sheet: relFromRepo(sheetPath),
    audience: relFromRepo(audiencePath),
    library: relFromRepo(libraryDir),
    model_command: realPath,
    started_at: new Date().toISOString(),
    stages: [],
    reading: relFromRepo(reading),
  };
  const save = () => writeFileSync(join(outDir, TRIAL_FILE), JSON.stringify(record, null, 2) + "\n");
  const stage = (name, body) => {
    if (record.stopped) { record.stages.push({ stage: name, state: "not run" }); save(); return null; }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try { r = body(d, stageEnv(outDir, d, realPath)); }
    catch (e) { r = { stopped: `the stage threw: ${String(e && e.message || e).split("\n")[0]}` }; }
    const calls = join(d, CALLS_FILE);
    const { value, ...shown } = r;
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", calls: existsSync(calls) ? relFromRepo(calls) : null, ...shown });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : (value ?? {});
  };
  save();
  if (mapper) {
    stage("sme", (d, env) => {
      const job = join(d, "job");
      const c = spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "map", "--strand", resolve(propositionFile), "--mapper", mapper,
        "--out", job, "--structure-out", structureFile, "--audience", audiencePath], { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const prompt = join(job, "prompt.md");
      if (existsSync(prompt)) record.mapper.prompt_sha256 = sha256(prompt);
      if (c.status !== 0 || !existsSync(structureFile)) {
        const said = `${c.stdout || ""}\n${c.stderr || ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
        return { stopped: `\`map\` exited ${c.status === null ? "on a signal" : c.status}: ${said.slice(-3).join(" ") || "(no output)"}` };
      }
      record.structure.sha256 = sha256(structureFile);
      return {};
    });
  }
  let structure = null;
  const table1 = stage("rbs", (d, env) => {
    const s = readStructure(structureFile, proposition);
    if (s.error) return { stopped: s.error };
    structure = s.structure;
    if (owned) {
      const v = readRbsFile(rbsFile, proposition, libraryDir, structure);
      if (v.error) return { stopped: v.error };
      copyFileSync(rbsFile, rbsPath);
      record.rbs = { variant: RBS_OWNER, placeholder: false, ...fileRecord(rbsPath) };
      return { value: owned.record };
    }
    let filled;
    if (rr.row.judgment_point) {
      const r = rbsBaseStage({ dir: d, env, row: rr.row, structure, persona, proposition: proposition.proposition, libraryDir });
      if (r.stopped) return { stopped: r.stopped };
      filled = r.table;
    } else filled = fillRbs(rr.row, structure);
    const v = validateRbsTable(filled, proposition.proposition, { movesDir: libraryDir, structure });
    if (v.error) return { stopped: v.error };
    writeFileSync(rbsPath, stringifyYaml(filled));
    record.rbs = { variant: filled.variant, placeholder: filled.placeholder, ...fileRecord(rbsPath) };
    return { value: filled };
  });
  const leg = table1 ? shortLeg(proposition.proposition, table1, persona, structure) : null;
  const paragraphs = stage("bind", (d, env) => {
    const supplied = suppliedEntry(table1, leg.waypoints[0].serves);
    if (supplied) {
      const all = [supplied, ...projectionsOf(table1).map((p) => suppliedEntry(p, leg.waypoints[0].serves))];
      const listed = all.map((e) => ({ move: e.move, binding_rationale: e.binding_rationale, paragraph_waypoints: e.paragraph_waypoints }));
      writeFileSync(bindPath, stringifyYaml({ ...supplied, paragraphs: listed }));
      record.bind = { state: "supplied", author: "owner", move: supplied.move, binding_rationale: supplied.binding_rationale,
        paragraphs: listed, ...fileRecord(bindPath) };
      return { value: listed };
    }
    const r = bindStage({ dir: d, env, leg, persona, libraryDir, table });
    if (r.stopped) return r;
    const bound = { ...r.entries[0], binding_rationale: null };
    const listed = r.entries.map((e) => ({ move: e.move, binding_rationale: null, paragraph_waypoints: e.paragraph_waypoints }));
    writeFileSync(bindPath, stringifyYaml({ ...bound, paragraphs: listed }));
    record.bind = { author: BIND_ROW, move: bound.move, binding_rationale: null, paragraphs: listed, ...fileRecord(bindPath) };
    return { value: listed };
  });
  stage("write", (d, env) => {
    const r = writeStage({ dir: d, env, leg, paragraphs, audiencePath, paragraphPath });
    if (!r.stopped) record.paragraph = fileRecord(paragraphPath);
    return r;
  });
  record.finished_at = new Date().toISOString();
  save();
  const sheet = renderShortSheet({ outDir, record, proposition, structure, table: table1, leg, paragraphs, paragraphPath });
  writeFileSync(sheetPath, sheet);
  return { outDir, stopped: record.stopped || null };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[a.slice(2)] = true;
      else { args[a.slice(2)] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  if (args._cmd !== "run") fail(USAGE);
  if (str("rbs") && str("rbs-file")) fail(`\`--rbs\` and \`--rbs-file\` are given together: a Trial's correspondence table is a variant row's or the owner's file, never both. Nothing was started. ${USAGE}`);
  if (str("structure") && str("mapper")) fail(`\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`);
  if (Object.hasOwn(args, "strand")) fail(`\`--strand\` is no flag of the short Trial: its input is \`--proposition <file>\` (kogaki#1685). Nothing was started. ${USAGE}`);
  for (const k of ["proposition", ...(str("mapper") ? [] : ["structure"]), "out"]) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
  const r = runShortTrial({ proposition: str("proposition"), structure: str("structure"), mapper: str("mapper"), out: str("out"),
    rbs: str("rbs") || RBS_DEFAULT, rbsFile: str("rbs-file"), audience: str("audience"), library: str("library") });
  console.log(`trial directory: ${r.outDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
