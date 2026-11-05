#!/usr/bin/env node
// The Structure-Mapping Playground's Trial (kogaki#1664): a Strand and a RelationalStructure, owner-authored
// or mapped by an SME variant (kogaki#1665), through a one-Leg Brief, `/paragraph-plan` and `/draft`, to a Trial record.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Structure-Mapping Playground
//       specs/spec-draft-pipeline/SPEC.md
//   The first SME
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, audienceLanguage, deriveReaderStatesBefore, legRecord, readerStateMap, briefRecordText,
  wordsOf, FUNCTION_WORDS } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, READER_PATH_JOB_STALL_S, jobHeartbeatMs } from "../workflow/detached-job.mjs";
import { EXTRACTION_TABLE, awaitJob, lastRefusal, writeJson } from "../proof-sheet/extract.mjs";
import { derivedRow, readerStartUnitInput, readerStartText, completedLeg } from "../proof-sheet/leg-brief.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { PARAGRAPH_PLAN_STILL_RUNNING_LINE } from "../paragraph-plan.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseProposition, validateStructure, structureClaims, higherOrderOf } from "./structure.mjs";
import { mapperRow, mapperInput, MAPPER_ATTEMPTS } from "./sme.mjs";

export const PLAYGROUND_TABLE = "src/mapping-playground/playground-workflow.json";
export const TRIALS_DIR = join("runs", "mapping-playground");
export const TRIAL_FILE = "trial.json";
export const READING_FILE = "reading.md";
export const STRUCTURE_FILE = "structure.yaml";
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
export const CONSTANT_COMMENT = "# TRIAL CONSTANT (kogaki#1664): not composed — the parser requires it.";
const PLAN_AWAIT_S = 60;
const PLAN_AWAITS_MAX = 60;
const USAGE = "usage: node src/mapping-playground/trial.mjs run --strand <file> (--structure <file> | --mapper <sme_map_<variant>>) "
  + "--out <dir under runs/mapping-playground/> [--audience <audiences/<name>.md>] [--library <dir>]";

function fail(msg) {
  process.stderr.write(`trial: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => (path && existsSync(path) ? { path: relFromRepo(path), sha256: sha256(path) } : null);

// The proposition file (kogaki#1685) and the structure, read and validated; a refusal ends the process before
// anything is written.
function readStrand(strandFile) {
  let strandText;
  try { strandText = readFileSync(strandFile, "utf8"); } catch (e) { fail(`the proposition file cannot be read (${e.message}). Nothing was started.`); }
  const strand = parseProposition(strandText);
  if (strand.error) fail(`${strand.error}. Nothing was started.`);
  return strand;
}

function readInputs(strandFile, structureFile) {
  const strand = readStrand(strandFile);
  let structure;
  try { structure = parseYaml(readFileSync(structureFile, "utf8"), structureFile); }
  catch (e) { fail(`the structure cannot be read (${e.message}). Nothing was started.`); }
  const v = validateStructure(structure, strand);
  if (v.error) fail(`${v.error}. Nothing was started.`);
  return { strand, structure };
}

// ---------------------------------------------------------------------------
// THE BRIEF: the Reader start row and the Leg row, each one job on the shared supervisor.

function positiveSetting(job, key) {
  const n = Number(settingValue(job && job[key]));
  return Number.isInteger(n) && n > 0 ? n
    : fail(`src/proof-sheet/extraction-workflow.json's \`job\` declares no positive \`${key}\`. Nothing was started.`);
}

function runRow({ dir, unitId, row, input, recordArray, validator, bounds }) {
  mkdirSync(dir, { recursive: true });
  const held = bindFlow(FLOW);
  let prompt;
  try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
  writeFileSync(join(dir, "prompt.md"), prompt);
  startDetachedJobSupervisor(dir, { units: [{ id: unitId, prompt }], ...bounds, recordArray, validator });
  const job = awaitJob(dir, bounds.heartbeatMs);
  const u = (job.units || [])[0] || {};
  writeJson(join(dir, "attempts.json"), { row: row.id, state: job.state, status: u.status || null,
    attempts: u.attempts || 1, refusals: u.refusals || [], ...(u.timed_out ? { timed_out: u.timed_out } : {}) });
  if (job.state !== "done" || u.status !== "done" || !u.candidate) {
    return { stopped: `the Trial's Brief stopped at \`${row.id}\`: the job ended ${job.state} after ${u.attempts || 1} attempt(s) — `
      + String(lastRefusal(job)).split("\n").join(" ") };
  }
  writeJson(join(dir, "answer.json"), u.candidate);
  return { record: u.candidate };
}

function trialBriefText({ slug, composePath, claims, readerStart, leg, thesis }) {
  const full = deriveReaderStatesBefore([completedLeg(leg, claims.length)], readerStart);
  const constants = {
    strands: claims.map((c) => ({ id: c.claim_strand, slug: `${slug}-${c.from}`, cite: `mapping-playground::claim/${slug}-${c.from}` })),
    thesis,
    reader_target: full.at(-1).leg_id,
    strand_coverage: [],
    journey_coverage: [],
    obligations: [],
    tradeoffs: {},
    bridged: {},
  };
  const text = briefRecordText({ slug, compose_path: composePath, ...constants, defined_terms: [],
    reader_start: readerStateMap(readerStart), reader_path: full.map(legRecord) });
  const keys = new Set(Object.keys(constants));
  return text.split("\n").flatMap((line) => {
    const m = /^([a-z_]+):/.exec(line);
    return m && keys.has(m[1]) ? [CONSTANT_COMMENT, line] : [line];
  }).join("\n");
}

function judgeBounds(extraction) {
  return {
    command: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || extraction.judge.command), process.env.PATH).path,
    model: String(settingValue(extraction.judge.model)), outputFormat: String(extraction.judge.output_format || "json"),
    callLimitS: positiveSetting(extraction.job, "call_limit_s"), unitAttempts: positiveSetting(extraction.job, "unit_attempts"),
    stallS: Number(extraction.job.stall_s) || READER_PATH_JOB_STALL_S, heartbeatMs: jobHeartbeatMs(extraction.job.heartbeat_ms),
  };
}

function audienceOf(audience) {
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(persona.error);
  return { audiencePath, persona };
}

// THE MAPPER (kogaki#1665): the variant's row, one job under the one-retry bound, its answer
// written as the Trial's structure file.
export function mapStructure({ strandFile, mapper, out, structureOut, audience }) {
  const strand = readStrand(strandFile);
  const playground = JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));
  const m = mapperRow(playground, mapper);
  if (m.error) fail(`${m.error}. Nothing was started.`);
  const { persona } = audienceOf(audience);
  const extraction = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const dir = resolve(out);
  const r = runRow({ dir, unitId: "map", row: m.row, recordArray: "roles", input: mapperInput(strand, persona),
    validator: { module: "src/mapping-playground/sme.mjs", export: "validateMapperAnswer", inputs: { cite: strand.cite, proposition: strand.proposition } },
    bounds: { ...judgeBounds(extraction), unitAttempts: MAPPER_ATTEMPTS } });
  if (r.stopped) return { stopped: r.stopped.replace("the Trial's Brief stopped", "the Mapper stopped") };
  writeFileSync(resolve(structureOut), stringifyYaml(r.record));
  return { structure: resolve(structureOut), prompt: join(dir, "prompt.md") };
}

export function composeTrialBrief({ strandFile, structureFile, out, slug, audience }) {
  const { strand, structure } = readInputs(strandFile, structureFile);
  const extraction = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const playground = JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));
  const rs = derivedRow(extraction, "leg_reader_start_unit");
  if (rs.error) fail(`${rs.error}. Nothing was started.`);
  const lr = derivedRow(playground, "smp_leg_unit", PLAYGROUND_TABLE);
  if (lr.error) fail(`${lr.error}. Nothing was started.`);
  const { audiencePath, persona } = audienceOf(audience);
  const lang = audienceLanguage(audiencePath);
  if (lang.error) fail(`${lang.error} Nothing was started.`);
  const outDir = resolve(out);
  const briefPath = join(outDir, "brief.yaml");
  if (existsSync(briefPath)) fail(`a Brief already exists at ${briefPath}, and nothing was written over it. Nothing was started.`);
  const bounds = judgeBounds(extraction);
  mkdirSync(outDir, { recursive: true });
  const { roles, relations, higher_order } = structure;
  const r1 = runRow({ dir: join(outDir, "reader-start"), unitId: "reader-start", row: rs.row, recordArray: "reader_start",
    input: readerStartUnitInput({ paragraphs: [roles.map((r) => r.context).join(" ")], extractions: [{ roles, relations, higher_order }],
      persona, language: lang.language }),
    validator: { module: "src/proof-sheet/leg-brief.mjs", export: "validateLegReaderStartUnit", inputs: {} }, bounds });
  if (r1.stopped) return { stopped: r1.stopped };
  const readerStart = readerStartText(r1.record);
  const claims = structureClaims(structure);
  const forbidden = [...new Set(wordsOf(strand.proposition).filter((w) => !FUNCTION_WORDS.has(w) && !/^[\p{N}]+$/u.test(w)))];
  const r2 = runRow({ dir: join(outDir, "leg"), unitId: "leg", row: lr.row, recordArray: "legs",
    input: { reader_start: readerStart, language: lang.language, leg_ids_already_carried: [], forbidden_words: forbidden,
      structure: { roles, relations, higher_order }, claims },
    validator: { module: "src/mapping-playground/structure.mjs", export: "validateSmpLegUnit",
      inputs: { holds: claims.map((c) => c.holds), proposition: strand.proposition, reader_start: readerStart, segments: claims.map((c) => c.material) } },
    bounds });
  if (r2.stopped) return { stopped: r2.stopped };
  writeFileSync(briefPath, trialBriefText({ slug, composePath: relFromRepo(audiencePath), claims, readerStart,
    leg: r2.record.legs[0], thesis: higherOrderOf(structure).map((h) => h.holds).join(" ") }));
  return { brief: briefPath };
}

// ---------------------------------------------------------------------------
// THE TRIAL.

function runCommand(stageDir, name, argv, env, log) {
  const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rec = { name, argv: argv.map((a) => (a.startsWith(REPO + sep) ? a.slice(REPO.length + 1) : a)), exit: r.status,
    stdout: r.stdout || "", stderr: r.stderr || "", ...(r.error ? { error: String(r.error.message) } : {}) };
  log.push(rec);
  writeJson(join(stageDir, "command.json"), log);
  return rec;
}

function stopLine(rec) {
  const said = `${rec.stdout}\n${rec.stderr}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return `\`${rec.name}\` exited ${rec.exit === null ? "on a signal" : rec.exit}: ${said.slice(-3).join(" ") || rec.error || "(no output)"}`;
}

function trialSlug(out) {
  return basename(out).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trial";
}

export function runTrial({ strand: strandFile, structure: givenStructure = null, mapper = null, out, audience = null, library = null }) {
  const outDir = resolve(out);
  const trials = resolve(REPO, TRIALS_DIR);
  const rel = relative(trials, outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep)) fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE))) fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  let strand;
  if (mapper) {
    strand = readStrand(strandFile);
    const m = mapperRow(JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8")), mapper);
    if (m.error) fail(`${m.error}. Nothing was started.`);
  } else ({ strand } = readInputs(strandFile, givenStructure));
  const structureFile = mapper ? join(outDir, STRUCTURE_FILE) : resolve(givenStructure);
  const audiencePath = audience || String(settingValue({ setting: "brief.audience_file" }));
  const libraryDir = resolve(REPO, library || "moves");
  if (!existsSync(libraryDir)) fail(`the library ${libraryDir} does not exist. Nothing was started.`);
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const slug = trialSlug(outDir);
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const reading = join(outDir, READING_FILE);
  writeFileSync(reading, `# Reading of Trial ${slug}\n`);
  const record = {
    trial: slug,
    strand: { cite: strand.cite, path: relFromRepo(resolve(strandFile)), sha256: sha256(strandFile) },
    structure: mapper ? { path: relFromRepo(structureFile), sha256: null, author: "sme" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    audience: audiencePath,
    library: relFromRepo(libraryDir),
    model_command: realPath,
    started_at: new Date().toISOString(),
    brief: null, plan: null, draft: null,
    stages: [],
    reading: relFromRepo(reading),
  };
  const save = () => writeJson(join(outDir, TRIAL_FILE), record);
  const stage = (name, body) => {
    if (record.stopped) { record.stages.push({ stage: name, state: "not run" }); save(); return null; }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try { r = body(d, stageEnv(outDir, d, realPath), []); }
    catch (e) { r = { stopped: `the stage threw: ${String(e && e.message || e).split("\n")[0]}` }; }
    const calls = join(d, CALLS_FILE);
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", calls: existsSync(calls) ? relFromRepo(calls) : null, ...r });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r;
  };
  save();
  if (mapper) {
    stage("sme", (d, env, log) => {
      const job = join(d, "job");
      const c = runCommand(d, "map", [process.execPath, "src/mapping-playground/trial.mjs", "map", "--strand", resolve(strandFile),
        "--mapper", mapper, "--out", job, "--structure-out", structureFile, "--audience", audiencePath], env, log);
      const prompt = join(job, "prompt.md");
      if (existsSync(prompt)) record.mapper.prompt_sha256 = sha256(prompt);
      if (c.exit !== 0 || !existsSync(structureFile)) return { stopped: stopLine(c) };
      record.structure.sha256 = sha256(structureFile);
      return {};
    });
  }
  const briefPath = join(outDir, "brief", "brief.yaml");
  stage("brief", (d, env, log) => {
    const c = runCommand(d, "compose", [process.execPath, "src/mapping-playground/trial.mjs", "compose", "--strand", resolve(strandFile),
      "--structure", structureFile, "--out", d, "--slug", slug, "--audience", audiencePath], env, log);
    return c.exit === 0 && existsSync(briefPath) ? {} : { stopped: stopLine(c) };
  });
  const planPath = join(outDir, "brief", "paragraph-plan.yaml");
  stage("paragraph-plan", (d, env, log) => {
    const job = join(d, "job");
    mkdirSync(job, { recursive: true });
    const pp = (cmd, extra = []) => runCommand(d, `paragraph-plan ${cmd}`, [process.execPath, "src/paragraph-plan.mjs", cmd,
      "--brief", briefPath, "--run-dir", job, "--moves-dir", libraryDir, ...extra], env, log);
    const s = pp("start");
    if (s.exit !== 0) return { stopped: stopLine(s) };
    for (let i = 0; i < PLAN_AWAITS_MAX; i++) {
      const a = pp("await", ["--wait-s", String(PLAN_AWAIT_S)]);
      if (a.exit !== 0) return { stopped: stopLine(a) };
      if (!a.stdout.includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) return existsSync(planPath) ? {} : { stopped: "the ParagraphPlan job ended and wrote no plan" };
    }
    return { stopped: `the ParagraphPlan job was still running after ${PLAN_AWAITS_MAX} awaits of ${PLAN_AWAIT_S}s` };
  });
  let sectionPath = null;
  stage("draft", (d, env, log) => {
    const dr = (cmd, extra = []) => runCommand(d, `draft ${cmd}`, [process.execPath, "src/draft.mjs", cmd,
      "--brief", briefPath, "--workspace", d, ...extra], env, log);
    const r = dr("resolve");
    if (r.exit !== 0) return { stopped: stopLine(r) };
    const legId = parseYaml(readFileSync(briefPath, "utf8"), briefPath).reader_path[0].leg_id;
    const s = dr("section", ["--leg", legId]);
    if (s.exit !== 0) return { stopped: stopLine(s), leg_id: legId };
    sectionPath = join(d, slug, "sections", `${legId}.md`);
    return { leg_id: legId, packet: relFromRepo(join(d, slug, "packets", `${legId}.md`)) };
  });
  record.brief = fileRecord(briefPath);
  record.plan = fileRecord(planPath);
  record.draft = fileRecord(sectionPath);
  record.finished_at = new Date().toISOString();
  save();
  return { outDir, stopped: record.stopped || null };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  const need = (keys) => { for (const k of keys) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`); };
  if (args._cmd === "run") {
    if (str("structure") && str("mapper")) fail(`\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`);
    need(["strand", ...(str("mapper") ? [] : ["structure"]), "out"]);
    const r = runTrial({ strand: str("strand"), structure: str("structure"), mapper: str("mapper"), out: str("out"),
      audience: str("audience"), library: str("library") });
    console.log(`trial directory: ${r.outDir}`);
    if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
  } else if (args._cmd === "map") {
    need(["strand", "mapper", "out", "structure-out", "audience"]);
    const r = mapStructure({ strandFile: str("strand"), mapper: str("mapper"), out: str("out"), structureOut: str("structure-out"), audience: str("audience") });
    if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
    else console.log(`structure written: ${r.structure}`);
  } else if (args._cmd === "compose") {
    need(["strand", "structure", "out", "slug", "audience"]);
    const r = composeTrialBrief({ strandFile: str("strand"), structureFile: str("structure"), out: str("out"), slug: str("slug"), audience: str("audience") });
    if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
    else console.log(`Brief written: ${r.brief}`);
  } else {
    fail(USAGE);
  }
}
