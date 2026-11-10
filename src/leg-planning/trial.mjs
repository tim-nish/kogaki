#!/usr/bin/env node
// The Leg-Planning Playground's Trial (kogaki#1764): a claims file read into one RelationalStructure, the Legs derived
// from it as the Brief derives them, one per relation the apex reaches with no Call and no Move (kogaki#1775), and
// `/paragraph-plan` run over the Legs, every Call recorded and the chain rendered as one sheet. The ParagraphPlan's
// reading of a Leg with no Waypoint is kogaki#1777's; until it lands, the paragraph-plan stage stops on its refusal.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Leg-Planning Playground, Trial, Round, Submission, Comment, Call, the Call Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, personaPriorKnowledgeLine, loadMoveContracts } from "../compose.mjs";
import { briefLegs, briefRecordText, PARAGRAPH_PLAN_FILE } from "../compose/record.mjs";
import { judgePrompt, refusalReach, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { writeCallRecord, cliRecord, tableRecord } from "../workflow/call-record.mjs";
import { readReaderPathJob } from "../workflow/detached-job.mjs";
import { PARAGRAPH_PLAN_STILL_RUNNING_LINE, NO_PARAGRAPH_MOVE_FITS } from "../paragraph-plan.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { MAPPER_CALLS } from "../mapping-playground/sme.mjs";
import { unitCalls, roundsAt, unitStatus, waypointStatus, namedWaypoints } from "../flp/sheet.mjs";
import { parseClaims, readerPathRefusal, COMPOSED_BY } from "./read-set.mjs";
import { mintStructure, validateReadSet, withReach, structureLegs, pathReachRefusal } from "../compose/structure.mjs";
import { resolvedRow } from "../workflow/copies.mjs";
import { renderLppSheet } from "./sheet.mjs";

export const LPP_TABLE = "src/leg-planning/workflow.json";
export const BRIEF_TABLE = "src/brief-workflow.json";
export const TRIALS_DIR = join("runs", "leg-planning");
export const TRIAL_FILE = "trial.json";
export const STRUCTURE_FILE = "structure.yaml";
export const LEGS_FILE = "legs.yaml";
export const SHEET_FILE = "sheet.html";
export const PLAN_DIR = "paragraph-plan";
export const PLAN_BRIEF_FILE = "brief.yaml";
export const STAGES = ["structure", "legs", "paragraph-plan"];
const PLAN_AWAIT_S = 30;
const PLAN_AWAITS_MAX = 240;
const FLOW = { lane: "brief", label: "Leg-Planning Playground" };
const USAGE = "usage: node src/leg-planning/trial.mjs run --claims <file> --out <dir under runs/leg-planning/> "
  + "[--audience <audiences/<name>.md>] [--library <dir>] [--brief <theses/<slug>/brief.yaml>]";

function fail(msg) {
  process.stderr.write(`leg-planning: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => ({ path: relFromRepo(path), sha256: sha256(path) });
const readJson = (file) => JSON.parse(readFileSync(join(REPO, file), "utf8"));

// The library's sha256: every file under it, in path order, as its relative path and the sha256 of its bytes.
function dirSha256(dir) {
  const lines = [];
  const walk = (d) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else lines.push(`${relative(dir, p).split(sep).join("/")} ${sha256(p)}`);
    }
  };
  walk(dir);
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

// ONE MODEL CALL, bounded by `timeoutS`: the answer's text, or the stop, with the call's own argv and stdout.
function oneCall({ binary, model, timeoutS, input }) {
  const argv = ["-p", "--model", model, "--output-format", "json", "--tools", "", "--disable-slash-commands",
    "--strict-mcp-config", "--setting-sources", "", "--no-session-persistence"];
  const call = { argv: { argv, model, output_format: "json", timeout_s: timeoutS } };
  const r = spawnSync(binary, argv, { input, encoding: "utf8", timeout: 1000 * timeoutS, maxBuffer: 64 * 1024 * 1024 });
  call.raw = String(r.stdout ?? "");
  if (r.error) return { ...call, stopped: `the call could not finish (${r.error.code || "spawn failed"}: ${r.error.message})` };
  if (r.status !== 0) return { ...call, stopped: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${String(r.stderr || "").trim().split("\n")[0] || "(no stderr)"}` };
  try {
    const envl = JSON.parse(r.stdout);
    if (envl && typeof envl.result === "string") return { ...call, text: envl.result };
    if (typeof envl === "string") return { ...call, text: envl };
  } catch (e) { return { ...call, stopped: `the call's json answer does not parse (${e.message})` }; }
  return { ...call, stopped: "the call's json answer carries no string `result`" };
}

function answerRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; } catch (e) { return { error: `the answer is not one JSON record (${e.message})` }; }
}

// THE CALLER: one numbered Call Record per Call, under `<out>/calls/<row>/<n>/`, every row's count its own.
function caller({ outDir, binary, cli, model, timeoutS }) {
  const counts = new Map();
  return function ask({ row, input, history = null, tables, phase = null, check }) {
    const n = (counts.get(row.id) || 0) + 1;
    counts.set(row.id, n);
    const held = bindFlow(FLOW);
    let prompt;
    try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, history && history.length ? history : null); } finally { bindFlow(held); }
    const call = oneCall({ binary, model, timeoutS, input: prompt });
    const a = call.stopped ? null : answerRecord(call.text);
    const raw = call.stopped ? null : a.error ? { group: "shape", text: a.error } : check(a.record);
    const r = raw ? refusalReach(row, raw) : null;
    const { judgment_point: jp, ...rowRecord } = row;
    writeCallRecord(outDir, row.id, n, { prompt, argv: call.argv, cli, input, row: { row: { ...rowRecord, judgment_point: jp, phase }, tables: tables.map(tableRecord) },
      raw: call.raw, answer: a && !a.error ? a.record : undefined,
      refusal: call.stopped ? { text: call.stopped, validator: "oneCall" } : r && { group: r.group, reach: r.reach, text: r.text, validator: raw.validator || null } });
    return { n, call: `${row.id}/${n}`, stopped: call.stopped || null, answer: a && !a.error ? a.record : null, refusal: r };
  };
}

const historyEntry = (asked) => ({ answer: asked.answer, refusal: asked.refusal.text, group: asked.refusal.group, reach: asked.refusal.reach });
const personaInput = (persona) => ({ reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) });

// STAGE 1: the structure, under the Mapper's bound, with its `reach` and `unreached` derived from `attains_thesis`.
function structureStage({ ask, row, claims, thesis, persona }) {
  const input = { thesis, claims: claims.map((c) => ({ id: c.id, claim: c.claim })), persona: personaInput(persona) };
  const history = [];
  const rounds = [];
  for (let k = 1; k <= MAPPER_CALLS; k++) {
    const a = ask({ row, input, history, tables: [LPP_TABLE], check: (rec) => {
      const m = mintStructure(rec);
      if (m.text) return { ...m, validator: "mintStructure" };
      const v = validateReadSet(m.structure, claims);
      return v.text ? { ...v, validator: "validateReadSet" } : null;
    } });
    rounds.push({ round: k, submission: a.call, comment: a.stopped || (a.refusal && a.refusal.text) || null, verdict: a.stopped ? "stopped" : a.refusal ? "refused" : "passed" });
    if (a.stopped) return { stopped: a.stopped, rounds };
    if (!a.refusal) {
      const structure = withReach(mintStructure(a.answer).structure, claims);
      return { value: structure, rounds, reach: structure.reach, unreached: structure.unreached };
    }
    history.push(historyEntry(a));
  }
  return { stopped: `the \`${row.id}\` answer was refused ${MAPPER_CALLS} times; the last refusal: ${history[history.length - 1].refusal}`, rounds };
}

// STAGE 2: the Legs, derived as the Brief derives them (kogaki#1775); no Call is made.
function legsStage({ structure, claims }) {
  const legs = structureLegs(structure, claims);
  const bad = pathReachRefusal(legs, structure);
  if (bad) return { stopped: `the derived Legs break the path's reach: ${bad}` };
  return { value: legs, rounds: [] };
}

// THE BRIEF `/paragraph-plan` IS HANDED (kogaki#1767): legs.yaml's `reader_path`, unchanged, in a Brief record beside
// the structure it was derived from (kogaki#1775).
function planBriefText({ slug, audiencePath, claims, thesis, legsFile, structure }) {
  return briefRecordText({ slug, compose_path: relFromRepo(audiencePath),
    strands: claims.map((c) => ({ id: c.id, slug: `${slug}-${c.id}`, cite: c.cite })), thesis, defined_terms: [], structure,
    reader_path: legsFile.reader_path, strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {} });
}

function planCommand(args) {
  const r = spawnSync(process.execPath, ["src/paragraph-plan.mjs", ...args], { cwd: REPO, encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  const said = `${r.stdout || ""}\n${r.stderr || ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return { exit: r.status, stdout: String(r.stdout || ""), line: said.slice(-3).join(" ") || (r.error ? r.error.message : "(no output)") };
}

// THE BINDING AND THE VERDICT AT EACH WAYPOINT, read from the plan's run as the FLP reads it.
function planWaypoints(runDir, legs) {
  const job = readReaderPathJob(runDir) || { units: [] };
  return legs.flatMap((leg, i) => {
    const unitId = `leg-${i + 1}`;
    const unit = (job.units || []).find((u) => u.id === unitId);
    const status = unitStatus(job, unit);
    const calls = unitCalls(runDir, unitId);
    const last = unit && Array.isArray(unit.refusals) && unit.refusals.length ? unit.refusals[unit.refusals.length - 1] : "";
    return (leg.waypoints || []).map((_, k) => {
      const n = k + 1;
      const rounds = roundsAt(calls, n, status);
      const r = rounds[rounds.length - 1];
      const entry = unit && unit.candidate ? unit.candidate.waypoints[k] : r && r.entry;
      return { leg_id: leg.leg_id, waypoint: n, move: entry && typeof entry.move === "string" ? entry.move : null,
        verdict: waypointStatus(status, n, namedWaypoints(last), rounds).text,
        rounds: rounds.map((x) => ({ round: x.number, call: x.call ? relFromRepo(x.call.dir) : null,
          verdict: x.verdict.kind === "judge" ? x.verdict.record.verdict : x.verdict.kind, comment: x.comment ? x.comment.text : null })) };
    });
  });
}

// The Leg and Waypoint a unit's last `no_paragraph_move_fits` refusal names, or `null`.
function noFitStop(runDir) {
  const job = readReaderPathJob(runDir) || { units: [] };
  for (const u of job.units || []) {
    const last = Array.isArray(u.refusals) && u.refusals.length ? String(u.refusals[u.refusals.length - 1]) : "";
    if (u.status === "done" || !last.includes(NO_PARAGRAPH_MOVE_FITS)) continue;
    const at = [...last.matchAll(/^Leg (\S+), Waypoint (\d+) /gm)].map((m) => `Leg ${m[1]}, Waypoint ${m[2]}`);
    return `${NO_PARAGRAPH_MOVE_FITS} at ${at.join("; ") || u.id}`;
  }
  return null;
}

// STAGE 4: `/paragraph-plan` over the Legs, driven as the SMP Trial drives it (kogaki#1767).
function paragraphPlanStage({ outDir, legsPath, legsFile, slug, audiencePath, claims, thesis, libraryDir, structure }) {
  const dir = join(outDir, PLAN_DIR);
  const runDir = join(dir, "run");
  mkdirSync(runDir, { recursive: true });
  const briefPath = join(dir, PLAN_BRIEF_FILE);
  writeFileSync(briefPath, planBriefText({ slug, audiencePath, claims, thesis, legsFile, structure }));
  const shown = { legs: fileRecord(legsPath), brief: fileRecord(briefPath), run: relFromRepo(runDir) };
  const pp = (cmd, extra = []) => planCommand([cmd, "--brief", briefPath, "--run-dir", runDir, "--moves-dir", libraryDir, ...extra]);
  const ended = (line) => ({ ...shown, waypoints: planWaypoints(runDir, legsFile.reader_path), stopped: noFitStop(runDir) || line });
  const s = pp("start");
  if (s.exit !== 0) return { ...shown, stopped: `\`paragraph-plan start\` exited ${s.exit}: ${s.line}` };
  for (let i = 0; i < PLAN_AWAITS_MAX; i++) {
    const a = pp("await", ["--wait-s", String(PLAN_AWAIT_S)]);
    if (a.exit !== 0) return ended(`\`paragraph-plan await\` exited ${a.exit}: ${a.line}`);
    if (a.stdout.includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) continue;
    const planPath = join(dir, PARAGRAPH_PLAN_FILE);
    if (!existsSync(planPath)) return ended("the ParagraphPlan job ended and wrote no plan");
    return { ...shown, plan: fileRecord(planPath), waypoints: planWaypoints(runDir, legsFile.reader_path) };
  }
  return { ...shown, stopped: `the ParagraphPlan job was still running after ${PLAN_AWAITS_MAX} awaits of ${PLAN_AWAIT_S}s` };
}

function readClaims(file) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch (e) { fail(`the claims file cannot be read (${e.message}). Nothing was written.`); }
  const c = parseClaims(text);
  if (c.error) fail(`${c.error}. Nothing was written.`);
  return c;
}

function readBrief(file) {
  if (!file) return null;
  let record;
  try { record = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { fail(`the Brief cannot be read (${e.message}). Nothing was written.`); }
  return { ...fileRecord(resolve(file)), legs: briefLegs(record) };
}

export function runLegPlanningTrial({ claims: claimsFile, out, audience = null, library = null, brief = null }) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep)) fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was written.`);
  if (existsSync(join(outDir, TRIAL_FILE))) fail(`a Trial already exists at ${outDir}, and nothing was written over it.`);
  const { thesis, claims } = readClaims(claimsFile);
  const table = readJson(LPP_TABLE);
  const rows = {};
  for (const id of ["sme_read_set"]) {
    const r = resolvedRow(table, id);
    if (r.error) fail(`${r.error}. Nothing was written.`);
    rows[id] = r.row;
  }
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(`${persona.error}. Nothing was written.`);
  const libraryDir = resolve(REPO, library || "moves");
  const lib = existsSync(libraryDir) ? loadMoveContracts(libraryDir) : { error: `the library ${libraryDir} does not exist` };
  if (lib.error) fail(`${lib.error}. Nothing was written.`);
  const briefRecord = readBrief(brief);
  const judge = resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || readJson(BRIEF_TABLE).judge.command), process.env.PATH);
  const ask = caller({ outDir, binary: judge.path, cli: cliRecord(judge.path, judge.version),
    model: String(settingValue({ setting: "brief.judge_model" })), timeoutS: Number(settingValue({ setting: "brief.call_limit_s" })) });
  mkdirSync(outDir, { recursive: true });
  const record = {
    trial: basename(outDir),
    claims: { ...fileRecord(resolve(claimsFile)), thesis, claims },
    persona: { audience: relFromRepo(audiencePath), ...personaInput(persona) },
    library: { path: relFromRepo(libraryDir), sha256: dirSha256(libraryDir) },
    brief: briefRecord ? { path: briefRecord.path, sha256: briefRecord.sha256 } : null,
    model_command: judge.path,
    started_at: new Date().toISOString(),
    stages: [],
  };
  const save = () => writeFileSync(join(outDir, TRIAL_FILE), JSON.stringify(record, null, 2) + "\n");
  const stage = (name, file, body) => {
    if (record.stopped) { record.stages.push({ stage: name, state: "not run" }); return null; }
    let r;
    try { r = body(); } catch (e) { r = { stopped: `the stage threw: ${String(e && e.message || e).split("\n")[0]}` }; }
    const { value, ...shown } = r;
    if (!r.stopped) writeFileSync(join(outDir, file), stringifyYaml(value.file));
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", file: r.stopped ? null : fileRecord(join(outDir, file)), ...shown });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : value.data;
  };
  save();
  const wrap = (r, file) => (r.stopped ? r : { ...r, value: { data: r.value, file: file(r.value) } });
  const structure = stage("structure", STRUCTURE_FILE, () => wrap(structureStage({ ask, row: rows.sme_read_set, claims, thesis, persona }), (s) => s));
  let legsFile = null;
  const legs = stage("legs", LEGS_FILE, () => {
    const r = legsStage({ structure, claims });
    if (r.stopped) return r;
    const file = { composed_by: COMPOSED_BY, reader_path: r.value };
    const readable = readerPathRefusal(file, structure);
    if (readable.error) return { stopped: `legs.yaml would not read as a Brief's \`reader_path\`: ${readable.error}`, rounds: r.rounds };
    legsFile = file;
    return { ...r, value: { data: r.value, file } };
  });
  let plan = null;
  if (record.stopped) record.stages.push({ stage: "paragraph-plan", state: "not run" });
  else {
    const r = paragraphPlanStage({ outDir, legsPath: join(outDir, LEGS_FILE), legsFile, slug: record.trial, audiencePath, claims, thesis, libraryDir, structure });
    record.stages.push({ stage: "paragraph-plan", state: r.stopped ? "stopped" : "done", ...r });
    if (r.stopped) record.stopped = `paragraph-plan: ${r.stopped}`;
    else plan = parseYaml(readFileSync(join(outDir, PLAN_DIR, PARAGRAPH_PLAN_FILE), "utf8"), PARAGRAPH_PLAN_FILE);
    save();
  }
  record.finished_at = new Date().toISOString();
  const sheetPath = join(outDir, SHEET_FILE);
  writeFileSync(sheetPath, renderLppSheet({ outDir, record, structure, legs, plan, libraryDir, briefLegs: briefRecord ? briefRecord.legs : null }));
  record.sheet = fileRecord(sheetPath);
  save();
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
  for (const k of ["claims", "out"]) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
  const r = runLegPlanningTrial({ claims: str("claims"), out: str("out"), audience: str("audience"), library: str("library"), brief: str("brief") });
  console.log(`trial directory: ${r.outDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
