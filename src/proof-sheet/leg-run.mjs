#!/usr/bin/env node
// The Leg run — one original Leg, run from its paragraphs to its written Leg (kogaki#1386,
// owner decision 2026-10-15).
//
// WHAT IT IS. The Proof Sheet's unit is one original Leg: N consecutive paragraphs of a source
// text, plus the Audience, cut by the Extractor's own `legParagraphs` (The paragraph unit, rule 1). This command runs that Leg through every stage in order: the
// Extractor over each paragraph (src/proof-sheet/extract.mjs), the ingest into a Move library
// of this run's own (`tools/move_ingest.py`'s `run_from_extraction`), the Leg Brief composer
// (src/proof-sheet/leg-brief.mjs), and then, unchanged, `/paragraph-plan` with `--moves-dir` at
// that library and `/draft resolve` and `section`. The production Brief composer is outside
// the boundary and is never run here. Then it writes the sheet (src/proof-sheet/leg-sheet.mjs).
//
// EVERY STAGE IS RUN AS ITS OWN COMMAND, in a child process, with its output kept in the
// stage's directory (`command.json`). A stage that stops ends the run there, and the sheet is
// still written: it shows the stop and marks every later stage as not run, so a failure is
// placed at the stage that made it.
//
// EVERY MODEL CALL IS RECORDED. Each stage's declared command (`claude`, or the binary
// `KOGAKI_JUDGE_CLI` names) is wrapped by a recorder written into the run directory and named
// to the stages through `KOGAKI_JUDGE_CLI`. The recorder hands the call through unchanged and
// appends what it was given and what it answered to the stage's `calls.jsonl`. That is how the
// Writer's prompt is on the record as sent: `/draft section` hands the Writer the Packet as
// its entire stdin, and the recorded stdin is compared with the Packet file on the sheet.
//
// NOTHING IS WRITTEN TO `moves/` OR `theses/`. The Moves go to `<run>/moves/` (beside a copy
// of `moves/ROLES.json`), the Brief and the ParagraphPlan file to `<run>/brief/`, the
// ParagraphPlan job to `<run>/paragraph-plan/` (`--run-dir`) and the Draft workspace to
// `<run>/draft/` (`--workspace`).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The paragraph unit
//       passages/FORMAT.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync } from "node:fs";
import { join, resolve, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO } from "../workflow/run-record.mjs";
import { legParagraphs, writeJson } from "./extract.mjs";
import { PARAGRAPH_PLAN_STILL_RUNNING_LINE } from "../paragraph-plan.mjs";
import { buildSheet } from "./leg-sheet.mjs";

export const STAGES = ["extract", "ingest", "brief", "paragraph-plan", "draft"];
export const RUN_FILE = "run.json";
export const CALLS_FILE = "calls.jsonl";
export const RECORDER_FILE = "call-recorder.mjs";
const DECLARING_TABLES = [
  ["src/proof-sheet/extraction-workflow.json", (t) => t.judge && t.judge.command],
  ["src/paragraph-plan-workflow.json", (t) => t.judge && t.judge.command],
  ["src/draft-workflow.json", (t) => t.writer && t.writer.command],
];
const PLAN_AWAIT_S = 60;
const PLAN_AWAITS_MAX = 60;

function fail(msg) {
  process.stderr.write(`leg-run: ${msg}\n`);
  process.exit(1);
}

// THE RECORDER, written into the run directory so the run carries the exact program that
// stood between the stages and the model. It answers `--version` through the real binary
// (the stages probe it), and otherwise passes stdin, argv, stdout and the exit status through.
export const RECORDER_TEXT = `#!/usr/bin/env node
// Written by src/proof-sheet/leg-run.mjs (kogaki#1386): passes one model call through to the
// stage's declared command unchanged and appends what it was given and what it answered to
// the stage's calls.jsonl.
import { appendFileSync, readFileSync, writeSync } from "node:fs";
import { spawnSync } from "node:child_process";
const real = process.env.KOGAKI_PROOF_SHEET_REAL_CLI;
const log = process.env.KOGAKI_PROOF_SHEET_CALLS;
const argv = process.argv.slice(2);
if (argv.includes("--version")) {
  const v = spawnSync(real, argv, { encoding: "utf8" });
  writeSync(1, v.stdout || ""); writeSync(2, v.stderr || "");
  process.exit(v.status === null ? 1 : v.status);
}
const stdin = readFileSync(0, "utf8");
const at = new Date().toISOString();
const r = spawnSync(real, argv, { input: stdin, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
if (log) {
  appendFileSync(log, JSON.stringify({ at, argv, stdin, stdout: r.stdout || "", stderr: String(r.stderr || "").slice(-4000),
    exit: r.status, signal: r.signal || null, ...(r.error ? { error: String(r.error.message) } : {}) }) + "\\n");
}
// WRITTEN SYNCHRONOUSLY: \`process.stdout.write\` to a pipe is asynchronous, and \`process.exit\`
// right after it cuts an answer longer than the pipe's buffer — the stage then reads no result line.
writeSync(1, r.stdout || ""); writeSync(2, r.stderr || "");
process.exit(r.status === null ? 1 : r.status);
`;

// The one command every stage declares. The recorder stands in for exactly one, so three
// tables declaring two commands refuse rather than record one stage's calls through another
// stage's binary.
export function declaredCommand() {
  if (process.env.KOGAKI_JUDGE_CLI) return process.env.KOGAKI_JUDGE_CLI;
  const seen = DECLARING_TABLES.map(([file, read]) => [file, String(read(JSON.parse(readFileSync(join(REPO, file), "utf8"))))]);
  const commands = [...new Set(seen.map(([, c]) => c))];
  if (commands.length !== 1) {
    fail(`the stages declare ${commands.length} model commands (${seen.map(([f, c]) => `${f}: ${c}`).join("; ")}) — the recorder stands in for one. Nothing was started.`);
  }
  return commands[0];
}

function stageEnv(runDir, stageDir, realPath) {
  return { ...process.env, KOGAKI_JUDGE_CLI: join(runDir, RECORDER_FILE), KOGAKI_PROOF_SHEET_REAL_CLI: realPath,
    KOGAKI_PROOF_SHEET_CALLS: join(stageDir, CALLS_FILE) };
}

// One command of a stage: run, keep its argv, exit status and output beside the stage.
function runCommand(stageDir, name, argv, env, log) {
  const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rec = { name, argv: argv.map((a) => a.startsWith(REPO + "/") ? a.slice(REPO.length + 1) : a), exit: r.status,
    stdout: r.stdout || "", stderr: r.stderr || "", ...(r.error ? { error: String(r.error.message) } : {}) };
  log.push(rec);
  writeJson(join(stageDir, "command.json"), log);
  return rec;
}

function readJsonOr(path, dflt) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return dflt; }
}

function stopLine(rec) {
  const said = `${rec.stdout}\n${rec.stderr}`.split("\n").map((l) => l.trim()).filter(Boolean);
  return `\`${rec.name}\` exited ${rec.exit === null ? "on a signal" : rec.exit}: ${said.slice(-3).join(" ") || rec.error || "(no output)"}`;
}

// THE INGEST: the Extractions, in paragraph order, through `run_from_extraction` with the
// owner's `accept` recorded, into this run's own library. The library starts empty, so the
// near-duplicate check has no row to match and each proposal's screen is rendered with none.
const INGEST_PY = `
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), "tools"))
import move_ingest as mi
paths, moves_dir, out_dir = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
entries = []
for p in paths:
    with open(p, encoding="utf-8") as h:
        prop = mi.derive_from_extraction(h.read())
    entries.append({"extraction": os.path.basename(p), "admitted": prop.admitted,
                    "move": prop.id if prop.admitted else None,
                    "refusal": None if prop.admitted else str(prop.refusal),
                    "screen": mi.render_passage_screen(prop, [])})
result = {"entries": entries, "written": []}
try:
    r = mi.run_from_extraction(paths, moves_dir, out_dir, select="accept")
    result["written"] = [os.path.basename(w) for w in (r["written"] or [])]
except mi.Refusal as e:
    result["refused"] = str(e)
with open(os.path.join(out_dir, "ingest.json"), "w", encoding="utf-8") as h:
    json.dump(result, h, ensure_ascii=False, indent=2)
    h.write("\\n")
sys.exit(1 if "refused" in result else 0)
`;

// THE AUDIENCE, RESOLVED ONCE (kogaki#1396). The flag if given, the `brief.audience_file`
// setting otherwise — resolved here and nowhere else, so every stage reads the one path the
// run used and the sheet reads it back from the record rather than the live setting.
function resolvedAudience(audience) {
  return audience || String(settingValue({ setting: "brief.audience_file" }));
}

// THE STAGE ENGINE, shared by a fresh run and a resumed one. `priorStages`, a `Map` of stage
// name to its previous `run.json` entry, is `null` for a fresh run. A stage already `done`
// is kept as its own record and never re-entered; a stage short of that re-enters with its
// stage directory's existing `command.json` as the log it appends to, so a resumed attempt
// keeps the stopped one rather than replacing it.
function runStages(runDir, record, { legFile, slug, realPath, audienceArgs, priorStages }) {
  const save = () => writeJson(join(runDir, RUN_FILE), record);
  const dirOf = (stage) => { const d = join(runDir, stage); mkdirSync(d, { recursive: true }); return d; };
  const stage = (name, body) => {
    const prev = priorStages && priorStages.get(name);
    if (prev && prev.state === "done") { record.stages.push(prev); save(); return prev; }
    if (record.stopped) { record.stages.push({ stage: name, state: "not run" }); save(); return null; }
    const d = dirOf(name);
    const log = readJsonOr(join(d, "command.json"), []);
    // A STAGE THAT THROWS IS STILL A PLACED STOP: the throw is this stage's stop line, so the
    // stage list and the sheet name where the run ended rather than the run dying unrecorded.
    let r;
    try { r = body(d, stageEnv(runDir, d, realPath), log, prev); }
    catch (e) { r = { stopped: `the stage threw: ${String(e && e.message || e).split("\n")[0]}` }; }
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", ...r });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r;
  };
  save();

  // 1. The Extractor, one job per paragraph. Re-entered, it skips every paragraph it already
  // wrote by naming its own earlier run directory with `--resume`.
  const ex = stage("extract", (d, env, log, prev) => {
    const resumeArgs = prev && prev.extractor_run ? ["--resume", prev.extractor_run] : [];
    const c = runCommand(d, "extract", [process.execPath, "src/proof-sheet/extract.mjs", "run", "--leg", legFile,
      "--out", d, "--passage", slug, ...audienceArgs, ...resumeArgs], env, log);
    const extractorRun = (c.stdout.match(/^run directory: (.+)$/m) || [])[1] || (prev && prev.extractor_run) || null;
    if (c.exit !== 0) return { stopped: stopLine(c), extractor_run: extractorRun };
    if (!extractorRun) return { stopped: `\`extract\` exited 0 but printed no run directory: ${stopLine(c)}` };
    const written = JSON.parse(readFileSync(join(extractorRun, "extractions.json"), "utf8")).written;
    return { extractor_run: extractorRun, extractions: written };
  });

  // 2. The ingest, into this run's library. No model call.
  stage("ingest", (d, env, log) => {
    const moves = join(runDir, "moves");
    mkdirSync(moves, { recursive: true });
    copyFileSync(join(REPO, "moves", "ROLES.json"), join(moves, "ROLES.json"));
    const paths = ex.extractions.map((f) => join(runDir, "extract", f));
    const c = runCommand(d, "ingest", ["python3", "-c", INGEST_PY, JSON.stringify(paths), moves, d], env, log);
    if (c.exit !== 0) return { stopped: stopLine(c) };
    return { moves_dir: moves, moves: JSON.parse(readFileSync(join(d, "ingest.json"), "utf8")).written };
  });

  // 3. The Leg Brief composer.
  const brief = stage("brief", (d, env, log) => {
    const c = runCommand(d, "leg-brief", [process.execPath, "src/proof-sheet/leg-brief.mjs", "run", "--extractions", ex.extractor_run,
      "--out", d, "--slug", slug, ...audienceArgs], env, log);
    const legBriefRun = (c.stdout.match(/^run directory: (.+)$/m) || [])[1] || null;
    if (c.exit !== 0 || !legBriefRun) return { stopped: stopLine(c), leg_brief_run: legBriefRun };
    return { brief: join(d, "brief.yaml"), leg_brief_run: legBriefRun };
  });

  // 4. /paragraph-plan, unchanged, with the run's library and its own run directory. Resumed
  // whole rather than re-entered mid-job (kogaki#1396, out of scope).
  stage("paragraph-plan", (d, env, log) => {
    const job = join(d, "job");
    mkdirSync(job, { recursive: true });
    const pp = (cmd, extra = []) => runCommand(d, `paragraph-plan ${cmd}`, [process.execPath, "src/paragraph-plan.mjs", cmd,
      "--brief", brief.brief, "--run-dir", job, "--moves-dir", join(runDir, "moves"), ...extra], env, log);
    const s = pp("start");
    if (s.exit !== 0) return { stopped: stopLine(s), job };
    for (let i = 0; i < PLAN_AWAITS_MAX; i++) {
      const a = pp("await", ["--wait-s", String(PLAN_AWAIT_S)]);
      if (a.exit !== 0) return { stopped: stopLine(a), job };
      if (!a.stdout.includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) {
        return { job, plan: join(runDir, "brief", "paragraph-plan.yaml") };
      }
    }
    return { stopped: `the ParagraphPlan job was still running after ${PLAN_AWAITS_MAX} awaits of ${PLAN_AWAIT_S}s`, job };
  });

  // 5. /draft resolve, then section for the Brief's one Leg. Resumed whole (out of scope).
  stage("draft", (d, env, log) => {
    const dr = (cmd, extra = []) => runCommand(d, `draft ${cmd}`, [process.execPath, "src/draft.mjs", cmd,
      "--brief", brief.brief, "--workspace", d, ...extra], env, log);
    const r = dr("resolve");
    if (r.exit !== 0) return { stopped: stopLine(r) };
    const legId = (readFileSync(brief.brief, "utf8").match(/^\s*-?\s*leg_id:\s*(\S+)/m) || [])[1];
    const s = dr("section", ["--leg", legId]);
    if (s.exit !== 0) return { stopped: stopLine(s), leg_id: legId, workspace: join(d, slug) };
    return { leg_id: legId, workspace: join(d, slug), section: join(d, slug, "sections", `${legId}.md`) };
  });

  record.finished_at = new Date().toISOString();
  save();
}

// RUN ONE LEG. Returns `{ runDir, stopped?, sheet }`.
export function runLeg(legPath, { out, passage = null, audience = null, provenance, resume = null }) {
  if (resume) return resumeLeg(resume, { provenance });
  let text;
  try { text = readFileSync(legPath, "utf8"); } catch (e) { fail(`the Leg at ${legPath} cannot be read (${e.message})`); }
  const paragraphs = legParagraphs(text);
  if (!paragraphs.length) fail(`the Leg at ${legPath} carries no paragraph — there is nothing to run`);
  if (!provenance || !existsSync(provenance)) fail(`the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was started.`);
  const slug = passage || basename(legPath, extname(legPath)).replace(/\.passage$/, "");
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const runDir = join(resolve(out), `leg-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "leg.md"), text);
  writeFileSync(join(runDir, RECORDER_FILE), RECORDER_TEXT);
  chmodSync(join(runDir, RECORDER_FILE), 0o755);
  const audiencePath = resolvedAudience(audience);
  const record = { leg: resolve(legPath), passage: slug, paragraphs: paragraphs.length, audience: audiencePath,
    model_command: realPath, started_at: new Date().toISOString(), stages: [] };
  runStages(runDir, record, { legFile: join(runDir, "leg.md"), slug, realPath, audienceArgs: ["--audience", audiencePath], priorStages: null });
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
}

// RESUME ONE LEG RUN, re-entering at the first stage its own `run.json` does not record
// `done` (kogaki#1396). Returns `{ runDir, stopped?, sheet }`.
export function resumeLeg(runDir, { provenance }) {
  runDir = resolve(runDir);
  const runFile = join(runDir, RUN_FILE);
  if (!existsSync(runFile)) fail(`${runDir} carries no ${RUN_FILE} — there is nothing to resume`);
  if (!provenance || !existsSync(provenance)) fail(`the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was resumed.`);
  const prior = JSON.parse(readFileSync(runFile, "utf8"));
  const priorStages = new Map((prior.stages || []).map((s) => [s.stage, s]));
  const record = { ...prior, stages: [] };
  delete record.stopped;
  delete record.finished_at;
  runStages(runDir, record, { legFile: join(runDir, "leg.md"), slug: record.passage, realPath: record.model_command,
    audienceArgs: ["--audience", record.audience], priorStages });
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
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
  const usage = "usage: node src/proof-sheet/leg-run.mjs run --leg <file of the Leg's paragraphs, blank-line separated> --out <dir> "
    + "--provenance <the provenance map> [--passage <slug>] [--audience <audiences/<name>.md>] "
    + "| node src/proof-sheet/leg-run.mjs run --resume <Leg run directory> --provenance <the provenance map>";
  if (args._cmd !== "run" || !str("provenance") || (str("resume") ? (str("leg") || str("out")) : (!str("leg") || !str("out")))) {
    fail(usage);
  }
  const r = str("resume")
    ? resumeLeg(str("resume"), { provenance: str("provenance") })
    : runLeg(str("leg"), { out: str("out"), passage: str("passage"), audience: str("audience"), provenance: str("provenance") });
  console.log(`run directory: ${r.runDir}`);
  console.log(`sheet written: ${r.sheet}`);
  if (r.stopped) { console.log(`the run stopped at ${r.stopped}`); process.exitCode = 1; }
}
