#!/usr/bin/env node
// The Leg run — one original Leg, run from its paragraphs to the Moves extracted from them (kogaki#1386,
// owner decision 2026-10-15; cut to its two stages at kogaki#1885).
//
// WHAT IT IS. The Move-Extraction Playground's unit is one original Leg: N consecutive paragraphs of a source
// text, plus the Audience, cut by the Extractor's own `legParagraphs` (The paragraph unit, rule 1). This command runs that Leg through two
// stages in order: the Extractor over each paragraph (src/move-extraction-playground/extract.mjs), and the ingest into a
// Move library of this run's own (`tools/move_ingest.py`'s `run_from_extraction`). Then it writes the sheet
// (src/move-extraction-playground/leg-sheet.mjs).
//
// EVERY STAGE IS RUN AS ITS OWN COMMAND, in a child process, with its output kept in the
// stage's directory (`command.json`). A stage that stops ends the run there, and the sheet is
// still written: it shows the stop and marks every later stage as not run, so a failure is
// placed at the stage that made it.
//
// EVERY MODEL CALL IS RECORDED. Each stage's declared command (`claude`, or the binary
// `KOGAKI_JUDGE_CLI` names) is wrapped by a recorder written into the run directory and named
// to the stages through `KOGAKI_JUDGE_CLI`. The recorder hands the call through unchanged and
// appends what it was given and what it answered to the stage's `calls.jsonl`.
//
// NOTHING IS WRITTEN TO `moves/` OR `theses/`. The Moves go to `<run>/moves/`, beside a copy
// of `moves/ROLES.json`.
//
// SEVERAL CONSECUTIVE LEGS (kogaki#1532, owner decision 2026-10-23): `--leg <file>` repeated, in
// order, runs the Legs as one span. Each file is kept as `legs/<slug>.md`, and the Extractor runs
// over every paragraph of every Leg in order. The run record's `legs` lists each file, its copy in
// the run and its paragraph count, for one file too; `--resume` carries the list.
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
import { buildSheet } from "./leg-sheet.mjs";
import { audienceLanguage } from "../compose.mjs";

export const STAGES = ["extract", "ingest"];
export const RUN_FILE = "run.json";
export const CALLS_FILE = "calls.jsonl";
export const RECORDER_FILE = "call-recorder.mjs";
const DECLARING_TABLES = [
  ["src/move-extraction-playground/extraction-workflow.json", (t) => t.judge && t.judge.command],
  ["src/paragraph-plan-workflow.json", (t) => t.judge && t.judge.command],
  ["src/draft-workflow.json", (t) => t.writer && t.writer.command],
];

function fail(msg) {
  process.stderr.write(`leg-run: ${msg}\n`);
  process.exit(1);
}

// THE RECORDER, written into the run directory so the run carries the exact program that
// stood between the stages and the model. It answers `--version` through the real binary
// (the stages probe it), and otherwise passes stdin, argv, stdout and the exit status through.
export const RECORDER_TEXT = `#!/usr/bin/env node
// Written by src/move-extraction-playground/leg-run.mjs (kogaki#1386): passes one model call through to the
// stage's declared command unchanged and appends what it was given and what it answered to
// the stage's calls.jsonl.
import { appendFileSync, readFileSync, writeSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
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
// STREAMED, NOT BUFFERED (kogaki#1439): every chunk the model writes is handed on as it
// arrives, because the job supervisor reads output growth as the call's liveness and ends a
// job whose running unit grew nothing for its stall bound. A relay that answers only once the
// call ends hides that growth, so every call longer than the bound read as stalled.
// WRITTEN SYNCHRONOUSLY: \`process.stdout.write\` to a pipe is asynchronous, and \`process.exit\`
// right after it cuts an answer longer than the pipe's buffer — the stage then reads no result line.
const out = [], err = [];
let spawnError = null;
const child = spawn(real, argv, { stdio: ["pipe", "pipe", "pipe"] });
child.stdout.on("data", (b) => { out.push(b); writeSync(1, b); });
child.stderr.on("data", (b) => { err.push(b); writeSync(2, b); });
child.on("error", (e) => { spawnError = e; });
child.stdin.on("error", () => {});
child.stdin.end(stdin);
child.on("close", (status, signal) => {
  if (log) {
    appendFileSync(log, JSON.stringify({ at, argv, stdin, stdout: Buffer.concat(out).toString("utf8"),
      stderr: Buffer.concat(err).toString("utf8").slice(-4000), exit: spawnError ? null : status, signal: signal || null,
      ...(spawnError ? { error: String(spawnError.message) } : {}) }) + "\\n");
  }
  process.exit(spawnError || status === null ? 1 : status);
});
`;

// The one command every stage declares. The recorder stands in for exactly one, so three
// tables declaring two commands refuse rather than record one stage's calls through another
// stage's binary.
export function declaredCommand() {
  if (process.env.KOGAKI_JUDGE_CLI) return process.env.KOGAKI_JUDGE_CLI;
  const seen = DECLARING_TABLES.map(([file, read]) => [
    file,
    String(read(JSON.parse(readFileSync(join(REPO, file), "utf8")))),
  ]);
  const commands = [...new Set(seen.map(([, c]) => c))];
  if (commands.length !== 1) {
    fail(
      `the stages declare ${commands.length} model commands (${seen.map(([f, c]) => `${f}: ${c}`).join("; ")}) — the recorder stands in for one. Nothing was started.`,
    );
  }
  return commands[0];
}

// The recorder written into `dir`, the run directory `stageEnv` names it from. Exported for the
// Structure-Mapping Playground's Trial (kogaki#1664).
export function installRecorder(dir) {
  writeFileSync(join(dir, RECORDER_FILE), RECORDER_TEXT);
  chmodSync(join(dir, RECORDER_FILE), 0o755);
}

export function stageEnv(runDir, stageDir, realPath) {
  return {
    ...process.env,
    KOGAKI_JUDGE_CLI: join(runDir, RECORDER_FILE),
    KOGAKI_PROOF_SHEET_REAL_CLI: realPath,
    KOGAKI_PROOF_SHEET_CALLS: join(stageDir, CALLS_FILE),
  };
}

// One command of a stage: run, keep its argv, exit status and output beside the stage.
function runCommand(stageDir, name, argv, env, log) {
  const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const rec = {
    name,
    argv: argv.map((a) => (a.startsWith(REPO + "/") ? a.slice(REPO.length + 1) : a)),
    exit: r.status,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
    ...(r.error ? { error: String(r.error.message) } : {}),
  };
  log.push(rec);
  writeJson(join(stageDir, "command.json"), log);
  return rec;
}

function readJsonOr(path, dflt) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return dflt;
  }
}

function stopLine(rec) {
  const said = `${rec.stdout}\n${rec.stderr}`
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return `\`${rec.name}\` exited ${rec.exit === null ? "on a signal" : rec.exit}: ${said.slice(-3).join(" ") || rec.error || "(no output)"}`;
}

// THE INGEST: the Extractions, in paragraph order, through `run_from_extraction` with the
// owner's `accept` recorded, into this run's own library. It is Kogaki's one admission gate
// for Moves (kogaki#1418): each candidate is validated through the Adapter's own validator
// (src/move-validate.mjs), so a Move this stage admits is one the production Adapter reads. The library starts empty, so the
// near-duplicate check has no row to match and each proposal's screen is rendered with none.
// A refusal prints each refused Extraction's line to stderr, which `stopLine` reads (kogaki#1576).
const INGEST_PY = `
import json, os, sys
sys.path.insert(0, os.path.join(os.getcwd(), "tools"))
import move_ingest as mi
paths, moves_dir, out_dir = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
entries = []
for p in paths:
    try:
        prop = mi.derive_from_extraction(mi.read_extraction(p)[1])
    except mi.Refusal as e:
        prop = mi.Proposal(1, refusal=e)
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
if "refused" in result:
    lines = [e["refusal"] for e in entries if not e["admitted"]] or [result["refused"]]
    for line in lines:
        print(" ".join(line.split()), file=sys.stderr)
    sys.exit(1)
`;

// THE AUDIENCE, RESOLVED ONCE (kogaki#1396). The flag if given, the `brief.audience_file`
// setting otherwise — resolved here and nowhere else, so every stage reads the one path the
// run used and the sheet reads it back from the record rather than the live setting.
function resolvedAudience(audience) {
  return audience || String(settingValue({ setting: "brief.audience_file" }));
}

// THE LANGUAGE THE RUN USED (kogaki#1417), recorded beside the Audience it was read from.
// An Audience declaring none records `null` here; the record states what the run was given either way.
function recordedLanguage(audiencePath) {
  const l = audienceLanguage(resolve(REPO, audiencePath));
  return l.error ? null : l.language;
}

// THE STAGE ENGINE, shared by a fresh run and a resumed one. `priorStages`, a `Map` of stage
// name to its previous `run.json` entry, is `null` for a fresh run. A stage already `done`
// is kept as its own record and never re-entered; a stage short of that re-enters with its
// stage directory's existing `command.json` as the log it appends to, so a resumed Round
// keeps the stopped one rather than replacing it.
function runStages(runDir, record, { slug, realPath, audienceArgs, priorStages }) {
  const legFiles = record.legs.map((l) => join(runDir, l.copy));
  const legArgs = legFiles.flatMap((f) => ["--leg", f]);
  const save = () => writeJson(join(runDir, RUN_FILE), record);
  const dirOf = (stage) => {
    const d = join(runDir, stage);
    mkdirSync(d, { recursive: true });
    return d;
  };
  const stage = (name, body) => {
    const prev = priorStages && priorStages.get(name);
    if (prev && prev.state === "done") {
      record.stages.push(prev);
      save();
      return prev;
    }
    if (record.stopped) {
      record.stages.push({ stage: name, state: "not run" });
      save();
      return null;
    }
    const d = dirOf(name);
    const log = readJsonOr(join(d, "command.json"), []);
    // A STAGE THAT THROWS IS STILL A PLACED STOP: the throw is this stage's stop line, so the
    // stage list and the sheet name where the run ended rather than the run dying unrecorded.
    let r;
    try {
      r = body(d, stageEnv(runDir, d, realPath), log, prev);
    } catch (e) {
      r = { stopped: `the stage threw: ${String((e && e.message) || e).split("\n")[0]}` };
    }
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
    const c = runCommand(
      d,
      "extract",
      [
        process.execPath,
        "src/move-extraction-playground/extract.mjs",
        "run",
        ...legArgs,
        "--out",
        d,
        ...(legFiles.length === 1 ? ["--passage", slug] : []),
        ...audienceArgs,
        ...resumeArgs,
      ],
      env,
      log,
    );
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
    const written = JSON.parse(readFileSync(join(d, "ingest.json"), "utf8")).written;
    return { moves_dir: moves, moves: written };
  });

  record.finished_at = new Date().toISOString();
  save();
}

// A LEG FILE'S SLUG: its name without the extension or a `.passage` suffix.
const legSlug = (legPath) => basename(legPath, extname(legPath)).replace(/\.passage$/, "");

// The Leg files, read: `{ path, text, paragraphs, slug }` in order. Refuses an unreadable or
// empty file, and two files sharing a slug, whose copies in the run would collide.
function readLegs(legPaths) {
  const legs = legPaths.map((legPath) => {
    let text;
    try {
      text = readFileSync(legPath, "utf8");
    } catch (e) {
      fail(`the Leg at ${legPath} cannot be read (${e.message})`);
    }
    const paragraphs = legParagraphs(text);
    if (!paragraphs.length) fail(`the Leg at ${legPath} carries no paragraph — there is nothing to run`);
    return { path: legPath, text, paragraphs, slug: legSlug(legPath) };
  });
  const seen = legs.map((l) => l.slug).find((x, i, all) => all.indexOf(x) !== i);
  if (seen)
    fail(`two Leg files are named ${seen} — each Leg is kept in the run under its own name. Nothing was started.`);
  return legs;
}

// Copy the Legs into the run: `leg.md` for one, `legs/<slug>.md` each for several. Returns the
// record's `legs`.
function writeLegs(runDir, legs) {
  if (legs.length > 1) mkdirSync(join(runDir, "legs"), { recursive: true });
  return legs.map((l) => {
    const copy = legs.length === 1 ? "leg.md" : `legs/${l.slug}.md`;
    writeFileSync(join(runDir, copy), l.text);
    return { file: resolve(l.path), copy, paragraphs: l.paragraphs.length };
  });
}

// RUN ONE LEG, or several in order (`legPath` a list). Returns `{ runDir, stopped?, sheet }`.
export function runLeg(legPath, { out, passage = null, audience = null, provenance, resume = null }) {
  if (resume) return resumeLeg(resume, { provenance });
  const legs = readLegs([].concat(legPath));
  if (!provenance || !existsSync(provenance))
    fail(
      `the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was started.`,
    );
  const slug = passage || (legs.length === 1 ? legs[0].slug : `${legs[0].slug}-to-${legs.at(-1).slug}`);
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const runDir = join(resolve(out), `leg-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const legsRecord = writeLegs(runDir, legs);
  installRecorder(runDir);
  const audiencePath = resolvedAudience(audience);
  const record = {
    leg: legs.length === 1 ? resolve(legs[0].path) : null,
    passage: slug,
    paragraphs: legsRecord.reduce((a, l) => a + l.paragraphs, 0),
    legs: legsRecord,
    audience: audiencePath,
    language: recordedLanguage(audiencePath),
    model_command: realPath,
    started_at: new Date().toISOString(),
    stages: [],
  };
  runStages(runDir, record, { slug, realPath, audienceArgs: ["--audience", audiencePath], priorStages: null });
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
}

// A RUN RECORD'S LEGS: its own `legs`, or for a record written before the list (kogaki#1532),
// its one Leg in `leg.md`.
function recordedLegs(record) {
  return Array.isArray(record.legs)
    ? record.legs
    : [{ file: record.leg, copy: "leg.md", paragraphs: record.paragraphs }];
}

// RESUME ONE LEG RUN, re-entering at the first stage its own `run.json` does not record
// `done` (kogaki#1396). Returns `{ runDir, stopped?, sheet }`.
export function resumeLeg(runDir, { provenance }) {
  runDir = resolve(runDir);
  const runFile = join(runDir, RUN_FILE);
  if (!existsSync(runFile)) fail(`${runDir} carries no ${RUN_FILE} — there is nothing to resume`);
  if (!provenance || !existsSync(provenance))
    fail(
      `the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was resumed.`,
    );
  const prior = JSON.parse(readFileSync(runFile, "utf8"));
  const priorStages = new Map((prior.stages || []).map((s) => [s.stage, s]));
  const record = { ...prior, legs: recordedLegs(prior), stages: [] };
  delete record.stopped;
  delete record.finished_at;
  // THE JUDGE BINARY IS RE-RESOLVED, NOT FROZEN FROM THE STOPPED ROUND: a resume is a fresh
  // process, and the point of resuming after a stop is that whatever stopped it can have been
  // fixed in the environment since. `record.model_command` is overwritten with the newly
  // resolved path, so the record keeps naming the binary the resumed run actually used.
  record.model_command = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  runStages(runDir, record, {
    slug: record.passage,
    realPath: record.model_command,
    audienceArgs: ["--audience", record.audience],
    priorStages,
  });
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
}

// The flags `run` takes; any other is refused with the usage line.
const FLAGS = new Set(["leg", "out", "provenance", "passage", "audience", "resume"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else if (key === "leg") {
        args.leg = [...(args.leg || []), next];
        i++;
      } else {
        args[key] = next;
        i++;
      }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  const legs = Array.isArray(args.leg) ? args.leg : [];
  const usage =
    "usage: node src/move-extraction-playground/leg-run.mjs run --leg <file of the Leg's paragraphs, blank-line separated> [--leg <the next Leg's file> ...] --out <dir> " +
    "--provenance <the provenance map> [--passage <slug>] [--audience <audiences/<name>.md>] " +
    "| node src/move-extraction-playground/leg-run.mjs run --resume <Leg run directory> --provenance <the provenance map>";
  const shapeOk = str("resume") ? !(args.leg !== undefined || str("out")) : !!(legs.length && str("out"));
  const unknown = Object.keys(args).some((k) => k !== "_cmd" && !FLAGS.has(k));
  if (args._cmd !== "run" || !str("provenance") || !shapeOk || unknown) fail(usage);
  const r = str("resume")
    ? resumeLeg(str("resume"), { provenance: str("provenance") })
    : runLeg(legs.length === 1 ? legs[0] : legs, {
        out: str("out"),
        passage: str("passage"),
        audience: str("audience"),
        provenance: str("provenance"),
      });
  console.log(`run directory: ${r.runDir}`);
  console.log(`sheet written: ${r.sheet}`);
  if (r.stopped) {
    console.log(`the run stopped at ${r.stopped}`);
    process.exitCode = 1;
  }
}
