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
// THE TERMS FILE IS RETIRED (kogaki#1529; kogaki#1498 before it): it fixed an `introduces`
// kind, and every introduced term is coined (kogaki#1531). `--terms` is refused by name, a run
// record carries no `terms` key, and a resumed record's `terms` is dropped and ignored.
//
// STAGE REUSE (kogaki#1512, owner decision 2026-10-22): `--reuse <earlier run> --from <stage>`,
// `<stage>` one of `REUSE_FROM`'s keys, takes the Passage, the Extraction and the Moves from an
// earlier run as one group (and, from `paragraph-plan`, its Brief too) instead of rebuilding
// them. The earlier run's stage directories before `<stage>` are copied into the new run, the
// Moves are re-ingested from the copied Extractions -- the ingest makes no model call, so an
// unedited Extraction gives the same Moves byte for byte -- and `<stage>` and every stage after
// it run as usual; `reuse.moves` holds the sha256 of the source's Move files and of the new
// run's, equal where no Extraction was edited. A copied stage keeps its own record, attempts and refusals and is never
// re-judged. `run.json`'s `reuse` names the source run, the stage, the sha256 of each copied
// stage directory, and every Segment field of a copied Extraction record that differs from the
// answer its Extractor wrote (`p<N>/answer.json`) -- the owner's edits, which the sheet badges.
//
// THE LIBRARY (kogaki#1521, owner request 2026-10-23): `--library <dir>`, on `run` and on
// `--reuse`, copies the directory's Move records into `<run>/moves/` beside the run's own at the
// ingest, so the plan stage binds from both, as production binds from the library. An id held by
// both is refused naming it: before anything is started where the run's own ids are already
// known (a reused run's source), and otherwise as the ingest's stop, before the plan stage.
// `--withhold-own`, valid only with `--library`, ingests the run's own Moves into
// `<run>/own-moves/` instead, so the plan's directory holds the library's records alone. The
// run record's `library` names the directory, the sha256 of its records, whether the run's own
// were withheld, and the ids placed in the plan's directory by source (`library`, `run`); the
// ingest stage's `moves` still lists the run's own.
//
// SEVERAL CONSECUTIVE LEGS (kogaki#1532, owner decision 2026-10-23): `--leg <file>` repeated, in
// order, runs the Legs as one span under one Brief. Each file is kept as `legs/<slug>.md`; the
// Extractor runs over every paragraph of every Leg in order; the Leg Brief composer composes one
// Leg per file and derives every cross-Leg field (src/proof-sheet/leg-brief.mjs `crossLegPath`);
// and `/draft section` runs once per Leg, each Leg's Writer calls kept in `draft/calls-<leg_id>.jsonl`.
// The run record's `legs` lists each file, its copy in the run and its paragraph count, for one
// file too; `--reuse` and `--resume` carry the list.
//
// A LEADING SUBSET OF THE LEGS (kogaki#1546): `--reuse <run> --from brief --legs <k>` copies the
// first k Leg files and the Extraction records of their paragraphs, and the run is a k-Leg run.
// Only a leading subset is reusable: each paragraph's reader state before it is carried from the
// paragraph before it (The paragraph unit). `reuse.legs` records k.
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
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, chmodSync, cpSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve, basename, dirname, extname, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { parseYaml } from "../yaml.mjs";
import { legParagraphs, writeJson } from "./extract.mjs";
import { PARAGRAPH_PLAN_STILL_RUNNING_LINE } from "../paragraph-plan.mjs";
import { buildSheet } from "./leg-sheet.mjs";
import { audienceLanguage, MOVE_RECORD_EXT } from "../compose.mjs";
import { TERMS_RETIRED } from "./leg-brief.mjs";

export const STAGES = ["extract", "ingest", "brief", "paragraph-plan", "draft"];
export const RUN_FILE = "run.json";
export const CALLS_FILE = "calls.jsonl";
export const RECORDER_FILE = "call-recorder.mjs";
const DECLARING_TABLES = [
  ["src/proof-sheet/extraction-workflow.json", (t) => t.judge && t.judge.command],
  ["src/paragraph-plan-workflow.json", (t) => t.judge && t.judge.command],
  ["src/draft-workflow.json", (t) => t.writer && t.writer.command],
];
// The stages a reused run copies, by the stage it starts from (kogaki#1512). The ingest is never
// copied: it is re-run over the copied Extractions.
export const REUSE_FROM = { brief: ["extract"], "paragraph-plan": ["extract", "brief"] };
// What a copied stage directory leaves behind: the ParagraphPlan file a later stage wrote beside
// the Brief, which the new run's own plan stage writes again.
const REUSE_EXCLUDE = { brief: ["paragraph-plan.yaml"] };
export const OWN_MOVES_DIR = "own-moves";
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
// owner's `accept` recorded, into this run's own library. It is Kogaki's one admission gate
// for Moves (kogaki#1418): each candidate is validated through the Adapter's own validator
// (src/move-validate.mjs), so a Move this stage admits is one the production Adapter reads. The library starts empty, so the
// near-duplicate check has no row to match and each proposal's screen is rendered with none.
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
sys.exit(1 if "refused" in result else 0)
`;

// THE AUDIENCE, RESOLVED ONCE (kogaki#1396). The flag if given, the `brief.audience_file`
// setting otherwise — resolved here and nowhere else, so every stage reads the one path the
// run used and the sheet reads it back from the record rather than the live setting.
function resolvedAudience(audience) {
  return audience || String(settingValue({ setting: "brief.audience_file" }));
}

// THE LANGUAGE THE RUN USED (kogaki#1417), recorded beside the Audience it was read from.
// An Audience declaring none records `null` here and is refused by name at the Brief stage,
// whose own read is the refusal; the record states what the run was given either way.
function recordedLanguage(audiencePath) {
  const l = audienceLanguage(resolve(REPO, audiencePath));
  return l.error ? null : l.language;
}

// THE STAGE ENGINE, shared by a fresh run and a resumed one. `priorStages`, a `Map` of stage
// name to its previous `run.json` entry, is `null` for a fresh run (and the copied stages for a reused one). A stage already `done`
// is kept as its own record and never re-entered; a stage short of that re-enters with its
// stage directory's existing `command.json` as the log it appends to, so a resumed attempt
// keeps the stopped one rather than replacing it.
function runStages(runDir, record, { slug, realPath, audienceArgs, priorStages }) {
  const legFiles = record.legs.map((l) => join(runDir, l.copy));
  const legArgs = legFiles.flatMap((f) => ["--leg", f]);
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
    const c = runCommand(d, "extract", [process.execPath, "src/proof-sheet/extract.mjs", "run", ...legArgs,
      "--out", d, ...(legFiles.length === 1 ? ["--passage", slug] : []), ...audienceArgs, ...resumeArgs], env, log);
    const extractorRun = (c.stdout.match(/^run directory: (.+)$/m) || [])[1] || (prev && prev.extractor_run) || null;
    if (c.exit !== 0) return { stopped: stopLine(c), extractor_run: extractorRun };
    if (!extractorRun) return { stopped: `\`extract\` exited 0 but printed no run directory: ${stopLine(c)}` };
    const written = JSON.parse(readFileSync(join(extractorRun, "extractions.json"), "utf8")).written;
    return { extractor_run: extractorRun, extractions: written };
  });

  // 2. The ingest, into this run's library. No model call.
  // With a library (kogaki#1521) its records are copied into the plan's directory here, after
  // the run's own ids are known and before the plan stage reads the directory.
  const ing = stage("ingest", (d, env, log) => {
    const lib = record.library;
    const plan = join(runDir, "moves");
    const moves = lib && lib.withhold_own ? join(runDir, OWN_MOVES_DIR) : plan;
    for (const dir of new Set([plan, moves])) {
      mkdirSync(dir, { recursive: true });
      copyFileSync(join(REPO, "moves", "ROLES.json"), join(dir, "ROLES.json"));
    }
    const paths = ex.extractions.map((f) => join(runDir, "extract", f));
    const c = runCommand(d, "ingest", ["python3", "-c", INGEST_PY, JSON.stringify(paths), moves, d], env, log);
    if (c.exit !== 0) return { stopped: stopLine(c) };
    const written = JSON.parse(readFileSync(join(d, "ingest.json"), "utf8")).written;
    if (!lib) return { moves_dir: moves, moves: written };
    const own = written.map((f) => basename(f, MOVE_RECORD_EXT));
    const now = readLibrary(lib.dir);
    if (now.error) return { stopped: now.error, moves_dir: moves, moves: written };
    if (now.sha256 !== lib.sha256) {
      return { stopped: `the library at ${lib.dir} has changed since the run started (recorded sha ${lib.sha256.slice(0, 12)}, now ${now.sha256.slice(0, 12)})`, moves_dir: moves, moves: written };
    }
    const clash = libraryClash(now.ids, own);
    if (clash) return { stopped: clash, moves_dir: moves, moves: written };
    for (const id of now.ids) copyFileSync(join(now.abs, `${id}${MOVE_RECORD_EXT}`), join(plan, `${id}${MOVE_RECORD_EXT}`));
    lib.ids = { library: now.ids, run: lib.withhold_own ? [] : own };
    return { moves_dir: moves, moves: written };
  });

  // 3. The Leg Brief composer, handed the run's own Moves for the Obligation rows they raise
  // (kogaki#1548).
  const brief = stage("brief", (d, env, log) => {
    const c = runCommand(d, "leg-brief", [process.execPath, "src/proof-sheet/leg-brief.mjs", "run", "--extractions", ex.extractor_run,
      "--out", d, "--slug", slug, "--moves", ing.moves_dir, "--ingest", join(runDir, "ingest", "ingest.json"), ...audienceArgs], env, log);
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

  // 5. /draft resolve, then section for each of the Brief's Legs in order. Resumed whole (out of scope).
  stage("draft", (d, env, log) => {
    const dr = (cmd, extra = [], e = env) => runCommand(d, `draft ${cmd}`, [process.execPath, "src/draft.mjs", cmd,
      "--brief", brief.brief, "--workspace", d, ...extra], e, log);
    const r = dr("resolve");
    if (r.exit !== 0) return { stopped: stopLine(r) };
    if (record.legs.length > 1) {
      const legIds = (parseYaml(readFileSync(brief.brief, "utf8"), brief.brief).reader_path || []).map((l) => l.leg_id);
      const sections = [];
      for (const legId of legIds) {
        const s = dr("section", ["--leg", legId], { ...env, KOGAKI_PROOF_SHEET_CALLS: join(d, `calls-${legId}.jsonl`) });
        if (s.exit !== 0) return { stopped: stopLine(s), leg_ids: legIds, leg_id: legId, workspace: join(d, slug), sections };
        sections.push(join(d, slug, "sections", `${legId}.md`));
      }
      return { leg_ids: legIds, workspace: join(d, slug), sections };
    }
    const legId = (readFileSync(brief.brief, "utf8").match(/^\s*-?\s*leg_id:\s*(\S+)/m) || [])[1];
    const s = dr("section", ["--leg", legId]);
    if (s.exit !== 0) return { stopped: stopLine(s), leg_id: legId, workspace: join(d, slug) };
    return { leg_id: legId, workspace: join(d, slug), section: join(d, slug, "sections", `${legId}.md`) };
  });

  record.finished_at = new Date().toISOString();
  save();
}

// A LIBRARY'S MOVE RECORDS (kogaki#1521): the ids of the `*.yaml` records directly under `dir`,
// sorted, and the sha256 of those records; `{ error }` where the directory cannot be read or
// holds no record.
export function readLibrary(dir) {
  const abs = resolve(REPO, dir);
  let names;
  try { names = readdirSync(abs); } catch (e) { return { error: `the library at ${dir} cannot be read (${e.message})` }; }
  const isRecord = (f) => f.endsWith(MOVE_RECORD_EXT) && statSync(join(abs, f)).isFile();
  const ids = names.filter(isRecord).map((f) => f.slice(0, -MOVE_RECORD_EXT.length)).sort();
  if (!ids.length) return { error: `the library at ${dir} holds no Move record (*${MOVE_RECORD_EXT})` };
  const lines = ids.map((id) => `${id}${MOVE_RECORD_EXT} ${createHash("sha256").update(readFileSync(join(abs, `${id}${MOVE_RECORD_EXT}`))).digest("hex")}`);
  return { abs, ids, sha256: createHash("sha256").update(lines.join("\n")).digest("hex") };
}

// The refusal for a Move id held by both the library and the run's own Moves, or null.
function libraryClash(libraryIds, ownIds) {
  const both = ownIds.filter((id) => libraryIds.includes(id));
  return both.length ? `the library and this run's own Moves both hold ${both.join(", ")} — an id held by both is refused` : null;
}

// The run record's `library` for `--library <dir>` and `--withhold-own`, or null with neither;
// a refusal ends the command with nothing started. `ids` is filled by the ingest.
function libraryRecord(library, withholdOwn) {
  if (withholdOwn && !library) fail("--withhold-own is valid only with --library <dir>. Nothing was started.");
  if (!library) return null;
  const lib = readLibrary(library);
  if (lib.error) fail(`${lib.error}. Nothing was started.`);
  return { dir: relFromRepo(lib.abs, REPO), sha256: lib.sha256, withhold_own: !!withholdOwn, ids: null };
}

// A DIRECTORY'S sha256: every file under it, in path order, as its relative path and the sha256
// of its bytes, one line each -- so two directories hash alike exactly when they hold the same
// files byte for byte. `keep`, where given, names the files counted.
export function dirSha256(dir, keep = () => true) {
  const lines = [];
  const walk = (d) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (keep(f)) lines.push(`${relative(dir, p).split(sep).join("/")} ${createHash("sha256").update(readFileSync(p)).digest("hex")}`);
    }
  };
  walk(dir);
  return createHash("sha256").update(lines.join("\n")).digest("hex");
}

// THE OWNER'S EDITS to a copied Extraction (kogaki#1512): each paragraph's record file read
// against the answer its Extractor wrote, one row per Segment field that differs -- a field the
// answer's Segment carries, compared as text, and a Segment present on one side only as the
// field `segment`. Returns the rows, in paragraph and Segment order.
export function extractionEdits(extractDir, extractions, extractorRun) {
  const edits = [];
  extractions.forEach((name, i) => {
    let rec = null;
    let answer = null;
    try { rec = parseYaml(readFileSync(join(extractDir, name), "utf8"), name); } catch { rec = null; }
    try { answer = JSON.parse(readFileSync(join(extractorRun, `p${i + 1}`, "answer.json"), "utf8")); } catch { answer = null; }
    if (!rec || !answer) return;
    const mine = Array.isArray(rec.segments) ? rec.segments : [];
    const raw = Array.isArray(answer.segments) ? answer.segments : [];
    for (let j = 0; j < Math.max(mine.length, raw.length); j++) {
      if (!mine[j] || !raw[j]) { edits.push({ paragraph: i + 1, segment: j + 1, field: "segment" }); continue; }
      for (const field of Object.keys(raw[j])) {
        if (String(mine[j][field] ?? "") !== String(raw[j][field] ?? "")) edits.push({ paragraph: i + 1, segment: j + 1, field });
      }
    }
  });
  return edits;
}

// COPY AN EARLIER RUN'S STAGES into a new run directory (kogaki#1512). Returns the stage records
// the engine keeps as `done`, each with its paths moved to the new run and `copied_from` naming
// the source, and the `reuse` record for `run.json`.
// `paragraphs`, where given, keeps the Extraction of the source's first `paragraphs` paragraphs
// over the Legs `legs` lists, which the copied Extractor run's index then names.
function copyStages(source, runDir, from, { legs = null, paragraphs = null } = {}) {
  const prior = JSON.parse(readFileSync(join(source, RUN_FILE), "utf8"));
  const priorStages = new Map((prior.stages || []).map((s) => [s.stage, s]));
  const relSource = relFromRepo(source, REPO);
  const moved = (v) => (typeof v === "string" && (v === source || v.startsWith(source + sep)) ? runDir + v.slice(source.length) : v);
  const kept = new Map();
  const copied = [];
  for (const name of REUSE_FROM[from]) {
    const prev = priorStages.get(name);
    if (!prev || prev.state !== "done") fail(`the run at ${source} records its ${name} stage ${prev ? prev.state : "absent"} — only a done stage is copied. Nothing was started.`);
    const exclude = REUSE_EXCLUDE[name] || [];
    cpSync(join(source, name), join(runDir, name), { recursive: true,
      filter: (p) => !exclude.includes(relative(join(source, name), p).split(sep).join("/")) });
    const rec = Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, moved(v)]));
    if (name === "extract" && paragraphs !== null) keepLeadingExtractions(join(runDir, name), rec, legs, paragraphs);
    kept.set(name, { ...rec, copied_from: relSource });
    copied.push({ stage: name, dir: name, sha256: dirSha256(join(runDir, name)) });
  }
  const ex = kept.get("extract");
  const edits = extractionEdits(join(runDir, "extract"), ex.extractions || [], ex.extractor_run);
  return { prior, kept, reuse: { source: relSource, ...(legs ? { legs: legs.length } : {}), from, copied, edits } };
}

// KEEP THE LEADING PARAGRAPHS of a copied extract stage (kogaki#1546): the first `paragraphs`
// Extraction records and answers stay, every later one is removed, and the Extractor run's
// `extractions.json` names the Legs kept -- in the one-Leg shape for one. Every Leg kept is a no-op.
function keepLeadingExtractions(dir, rec, legs, paragraphs) {
  if (paragraphs >= rec.extractions.length) return;
  const run = rec.extractor_run;
  const idx = JSON.parse(readFileSync(join(run, "extractions.json"), "utf8"));
  for (const f of rec.extractions.slice(paragraphs)) rmSync(join(dir, f), { force: true });
  for (let i = paragraphs; i < rec.extractions.length; i++) rmSync(join(run, `p${i + 1}`), { recursive: true, force: true });
  rec.extractions = rec.extractions.slice(0, paragraphs);
  const kept = idx.legs.slice(0, legs.length);
  writeJson(join(run, "extractions.json"), kept.length === 1
    ? { leg: kept[0].leg, passage: kept[0].passage, written: rec.extractions }
    : { legs: kept, written: rec.extractions });
}

// A LEG FILE'S SLUG: its name without the extension or a `.passage` suffix.
const legSlug = (legPath) => basename(legPath, extname(legPath)).replace(/\.passage$/, "");

// The Leg files, read: `{ path, text, paragraphs, slug }` in order. Refuses an unreadable or
// empty file, and two files sharing a slug, whose copies in the run would collide.
function readLegs(legPaths) {
  const legs = legPaths.map((legPath) => {
    let text;
    try { text = readFileSync(legPath, "utf8"); } catch (e) { fail(`the Leg at ${legPath} cannot be read (${e.message})`); }
    const paragraphs = legParagraphs(text);
    if (!paragraphs.length) fail(`the Leg at ${legPath} carries no paragraph — there is nothing to run`);
    return { path: legPath, text, paragraphs, slug: legSlug(legPath) };
  });
  const seen = legs.map((l) => l.slug).find((x, i, all) => all.indexOf(x) !== i);
  if (seen) fail(`two Leg files are named ${seen} — each Leg is kept in the run under its own name. Nothing was started.`);
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
export function runLeg(legPath, { out, passage = null, audience = null, provenance, resume = null, terms = null, reuse = null, from = null,
  legCount = null, library = null, withholdOwn = false }) {
  if (resume) return resumeLeg(resume, { provenance });
  if (reuse) return reuseLeg(reuse, { from, out, audience, provenance, terms, legCount, library, withholdOwn });
  const legs = readLegs([].concat(legPath));
  if (!provenance || !existsSync(provenance)) fail(`the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was started.`);
  if (terms) fail(TERMS_RETIRED);
  const lib = libraryRecord(library, withholdOwn);
  const slug = passage || (legs.length === 1 ? legs[0].slug : `${legs[0].slug}-to-${legs.at(-1).slug}`);
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const runDir = join(resolve(out), `leg-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const legsRecord = writeLegs(runDir, legs);
  writeFileSync(join(runDir, RECORDER_FILE), RECORDER_TEXT);
  chmodSync(join(runDir, RECORDER_FILE), 0o755);
  const audiencePath = resolvedAudience(audience);
  const record = { leg: legs.length === 1 ? resolve(legs[0].path) : null, passage: slug,
    paragraphs: legsRecord.reduce((a, l) => a + l.paragraphs, 0), legs: legsRecord, audience: audiencePath,
    language: recordedLanguage(audiencePath), model_command: realPath,
    library: lib, started_at: new Date().toISOString(), stages: [] };
  runStages(runDir, record, { slug, realPath, audienceArgs: ["--audience", audiencePath], priorStages: null });
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
}

// REUSE AN EARLIER LEG RUN'S STAGES BEFORE `from` (kogaki#1512). The Passage is the earlier
// run's `leg.md`; the Audience is the flag's or the earlier run's -- from `paragraph-plan` the
// earlier run's own, since its Brief is the one copied; the terms file is retired (kogaki#1529).
// With a library, a clash with the source's own Move ids is refused before anything is started.
// `legCount`, the `--legs` flag, keeps the source's first `legCount` Legs (kogaki#1546).
// Returns `{ runDir, stopped?, sheet }`.
export function reuseLeg(source, { from, out, audience = null, provenance, terms = null, legCount = null, library = null, withholdOwn = false }) {
  source = resolve(source);
  if (!Object.hasOwn(REUSE_FROM, from)) fail(`--from takes one of ${Object.keys(REUSE_FROM).join(", ")}, not ${from}. Nothing was started.`);
  if (!existsSync(join(source, RUN_FILE))) fail(`${source} carries no ${RUN_FILE} — there is no earlier run to reuse. Nothing was started.`);
  const sourceLegs = recordedLegs(JSON.parse(readFileSync(join(source, RUN_FILE), "utf8")));
  const k = legCount === null ? null : Number(legCount);
  if (k !== null && from !== "brief") fail(`--legs is valid only with --from brief: the Brief --from ${from} copies was composed over every Leg of the earlier run. Nothing was started.`);
  if (k !== null && !(Number.isInteger(k) && k >= 1 && k <= sourceLegs.length)) {
    fail(`--legs takes a count of leading Legs from 1 to ${sourceLegs.length}, the Legs the run at ${source} records, not ${legCount}. Nothing was started.`);
  }
  if (!provenance || !existsSync(provenance)) fail(`the provenance map at ${provenance} cannot be read — the sheet labels every cell from it. Nothing was started.`);
  if (terms) fail(TERMS_RETIRED);
  if (from === "paragraph-plan" && audience) fail(`--from paragraph-plan copies the earlier run's Brief, so it takes the Audience that Brief was composed under — drop --audience. Nothing was started.`);
  const lib = libraryRecord(library, withholdOwn);
  if (lib) {
    const ing = (JSON.parse(readFileSync(join(source, RUN_FILE), "utf8")).stages || []).find((st) => st.stage === "ingest") || {};
    const clash = libraryClash(readLibrary(lib.dir).ids, (ing.moves || []).map((f) => basename(f, MOVE_RECORD_EXT)));
    if (clash) fail(`${clash}. Nothing was started.`);
  }
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  const runDir = join(resolve(out), `leg-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const legsRecord = k === null ? sourceLegs : sourceLegs.slice(0, k);
  for (const l of legsRecord) {
    mkdirSync(dirname(join(runDir, l.copy)), { recursive: true });
    writeFileSync(join(runDir, l.copy), readFileSync(join(source, l.copy), "utf8"));
  }
  writeFileSync(join(runDir, RECORDER_FILE), RECORDER_TEXT);
  chmodSync(join(runDir, RECORDER_FILE), 0o755);
  const paragraphs = legsRecord.reduce((a, l) => a + l.paragraphs, 0);
  const { prior, kept, reuse } = copyStages(source, runDir, from, k === null ? {} : { legs: legsRecord, paragraphs });
  const audiencePath = audience ? resolvedAudience(audience) : prior.audience;
  const subset = legsRecord.length < sourceLegs.length;
  const slugs = legsRecord.map((l) => legSlug(l.copy));
  const record = { leg: subset ? (legsRecord.length === 1 ? legsRecord[0].file : null) : prior.leg,
    passage: subset ? (slugs.length === 1 ? slugs[0] : `${slugs[0]}-to-${slugs.at(-1)}`) : prior.passage, paragraphs, legs: legsRecord, audience: audiencePath,
    language: recordedLanguage(audiencePath), model_command: realPath,
    library: lib, reuse, started_at: new Date().toISOString(), stages: [] };
  runStages(runDir, record, { slug: record.passage, realPath, audienceArgs: ["--audience", audiencePath], priorStages: kept });
  const isMove = (f) => f.endsWith(MOVE_RECORD_EXT);
  record.reuse.moves = { source_sha256: existsSync(join(source, "moves")) ? dirSha256(join(source, "moves"), isMove) : null,
    sha256: existsSync(join(runDir, "moves")) ? dirSha256(join(runDir, "moves"), isMove) : null };
  writeJson(join(runDir, RUN_FILE), record);
  const sheet = join(runDir, "sheet.html");
  const built = buildSheet({ runs: [runDir], provenance, out: sheet });
  if (built.error) fail(`the sheet was not written: ${built.error}`);
  return { runDir, sheet, ...(record.stopped ? { stopped: record.stopped } : {}) };
}

// A RUN RECORD'S LEGS: its own `legs`, or for a record written before the list (kogaki#1532),
// its one Leg in `leg.md`.
function recordedLegs(record) {
  return Array.isArray(record.legs) ? record.legs : [{ file: record.leg, copy: "leg.md", paragraphs: record.paragraphs }];
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
  const record = { ...prior, legs: recordedLegs(prior), stages: [] };
  delete record.terms;
  delete record.stopped;
  delete record.finished_at;
  // THE JUDGE BINARY IS RE-RESOLVED, NOT FROZEN FROM THE STOPPED ATTEMPT: a resume is a fresh
  // process, and the point of resuming after a stop is that whatever stopped it can have been
  // fixed in the environment since. `record.model_command` is overwritten with the newly
  // resolved path, so the record keeps naming the binary the resumed run actually used.
  record.model_command = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
  runStages(runDir, record, { slug: record.passage, realPath: record.model_command,
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
      else if (key === "leg") { args.leg = [...(args.leg || []), next]; i++; }
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  const legs = Array.isArray(args.leg) ? args.leg : [];
  if (args.terms !== undefined) fail(TERMS_RETIRED);
  const usage = "usage: node src/proof-sheet/leg-run.mjs run --leg <file of the Leg's paragraphs, blank-line separated> [--leg <the next Leg's file> ...] --out <dir> "
    + "--provenance <the provenance map> [--passage <slug>] [--audience <audiences/<name>.md>] "
    + "[--library <a directory of Move records> [--withhold-own]] "
    + "| node src/proof-sheet/leg-run.mjs run --resume <Leg run directory> --provenance <the provenance map> "
    + `| node src/proof-sheet/leg-run.mjs run --reuse <earlier Leg run directory> --from <${Object.keys(REUSE_FROM).join("|")}> --out <dir> --provenance <the provenance map> [--legs <k>] [--audience <file>] [--library <dir> [--withhold-own]]`;
  const shapeOk = str("resume") ? !(args.leg !== undefined || str("out") || str("reuse") || args.library || args["withhold-own"])
    : str("reuse") ? !!(str("from") && str("out") && args.leg === undefined && !str("passage") && args.legs !== true)
      : !!(legs.length && str("out") && !str("from"));
  if (args._cmd !== "run" || !str("provenance") || !shapeOk || (args.legs !== undefined && !str("reuse")) || args.library === true || ![undefined, true].includes(args["withhold-own"])) fail(usage);
  const libraryArgs = { library: str("library"), withholdOwn: args["withhold-own"] === true };
  const r = str("resume")
    ? resumeLeg(str("resume"), { provenance: str("provenance") })
    : str("reuse")
      ? reuseLeg(str("reuse"), { from: str("from"), out: str("out"), audience: str("audience"), provenance: str("provenance"), legCount: str("legs"), ...libraryArgs })
      : runLeg(legs.length === 1 ? legs[0] : legs, { out: str("out"), passage: str("passage"), audience: str("audience"), provenance: str("provenance"),
      ...libraryArgs });
  console.log(`run directory: ${r.runDir}`);
  console.log(`sheet written: ${r.sheet}`);
  if (r.stopped) { console.log(`the run stopped at ${r.stopped}`); process.exitCode = 1; }
}
