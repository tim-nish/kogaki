#!/usr/bin/env node
// Replay (kogaki#1718): re-runs one part of one Call Record — the validator, the next
// Call's prompt renderer, or the model call — and writes its result beside the record,
// under `<call dir>/replays/<timestamp>/`. The record itself is never written.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Call Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readCallRecord, CALL_FILES, REPLAYS_DIR, REPLAY_RESULT } from "./call-record.mjs";
import { judgePrompt, refusalReach } from "./judge.mjs";
import { bindFlow } from "./run-record.mjs";
import { readerPathUnitRetryPrompt, loadReaderPathUnitValidator } from "./detached-job.mjs";
import { answerRecord, bindMoveRefusal, correspondenceRefusal } from "../mapping-playground/short.mjs";
import { writerRefusal } from "../draft/writer.mjs";
import { validateMapperAnswer } from "../mapping-playground/sme.mjs";

export const REPLAY_MODES = ["judge", "render", "model"];
const UNITS_FILE = "reader-path-job-units.json";

class ReplayRefusal extends Error {}
const refuse = (msg) => { throw new ReplayRefusal(msg); };
const json = (v) => JSON.stringify(v ?? null, null, 2) + "\n";
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// A detached job's record names its phase in row.json; the short Trial's and the synchronous judge's do not.
const isJobRecord = (rec) => rec.row && typeof rec.row === "object" && Object.hasOwn(rec.row, "phase");
const rowOf = (rec) => (rec.row && rec.row.row) || null;

// The Calls of one unit, by number: `<unit dir>/<n>/`.
function unitCalls(dir) {
  const unitDir = dirname(dir);
  return readdirSync(unitDir, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => Number(e.name)).sort((a, b) => a - b).map((n) => ({ n, dir: join(unitDir, String(n)) }));
}

// The job directory a job record sits under: `<job dir>/calls/<unit>/<n>/`.
const jobDirOf = (dir) => dirname(dirname(dirname(dir)));

// The answer text inside the call's stdout, by the recorded output format.
export function answerText(raw, outputFormat) {
  const text = String(raw ?? "");
  if (outputFormat === "stream-json") {
    const result = text.split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((e) => e && e.type === "result" && typeof e.result === "string").pop();
    return result ? result.result : null;
  }
  if (outputFormat !== "json") return text;
  try {
    const envl = JSON.parse(text);
    if (typeof envl === "string") return envl;
    return envl && typeof envl.result === "string" ? envl.result : null;
  } catch { return null; }
}

// THE VALIDATORS A REPLAY CAN RE-RUN, by the name `refusal.json` records. Each takes the record and returns
// `{ group, text }`, a bare text, or null; a name outside this set, and outside a job's units file, has no replay route.
const VALIDATORS = {
  bindMoveRefusal: (rec) => bindMoveRefusal(rec.answer, new Map(((rec.input && rec.input.moves) || []).map((m) => [m.id, m]))),
  correspondenceRefusal: (rec) => correspondenceRefusal(rec.answer, rec.input && rec.input.structure),
  // The Mapper's structure reading, in the short Trial's map job and inside a ParagraphPlan unit (kogaki#1734).
  validateMapperAnswer: (rec) => {
    const v = validateMapperAnswer(rec.answer, { cite: rec.input && rec.input.strand, proposition: rec.input && rec.input.proposition });
    return v.text ? v : null;
  },
  answerRecord: (rec) => {
    const a = answerRecord(answerText(rec.raw, rec.argv && rec.argv.output_format) ?? "");
    return a.stopped ? { group: "shape", text: a.stopped } : null;
  },
  writerRefusal: (rec) => {
    const why = writerRefusal(typeof rec.answer === "string" ? rec.answer : answerText(rec.raw, rec.argv && rec.argv.output_format));
    return why ? `the writer refused: ${why}` : null;
  },
};
// The validator a row's answer is judged by where the record names none (a passed Call), by row id.
const ROW_VALIDATORS = { smp_bind_move: "bindMoveRefusal", smp_correspondence: "correspondenceRefusal", sme_map_roles: "validateMapperAnswer",
  writer: "writerRefusal" };

// The validator for one record: its own name, else its row's, else a job's declared compose validator.
async function validatorFor(rec, name) {
  if (isJobRecord(rec)) {
    const units = join(jobDirOf(rec.dir), UNITS_FILE);
    if (!existsSync(units)) refuse(`the job record's units file ${units} does not exist, so its validator cannot be loaded`);
    const declared = JSON.parse(readFileSync(units, "utf8")).validator;
    const wanted = name || (rec.row.phase === "compose" && declared ? declared.export : null);
    if (!declared || wanted !== declared.export) {
      refuse(`validator ${JSON.stringify(wanted)} of phase ${JSON.stringify(rec.row.phase)} has no replay route: only the units file's compose validator ${JSON.stringify(declared && declared.export)} is re-run`);
    }
    const run = await loadReaderPathUnitValidator(declared);
    return { name: wanted, run: (r) => run(r.answer, basename(dirname(r.dir))) };
  }
  const wanted = name || ROW_VALIDATORS[(rowOf(rec) || {}).id] || null;
  if (!wanted) refuse(`the record names no validator, and its row ${JSON.stringify((rowOf(rec) || {}).id)} has none a replay can run`);
  if (!VALIDATORS[wanted]) refuse(`validator ${JSON.stringify(wanted)} has no replay route; the routes are ${Object.keys(VALIDATORS).join(", ")} and a job's compose validator`);
  return { name: wanted, run: VALIDATORS[wanted] };
}

// One validator run, as refusal.json writes it.
function judged(rec, v, result) {
  if (!result) return null;
  const text = typeof result === "string" ? result : String(result.text ?? result.error ?? "");
  const group = typeof result === "object" ? result.group ?? null : null;
  const row = rowOf(rec);
  const reach = typeof result === "object" && result.reach !== undefined ? result.reach
    : row && row.refusal_reach && group !== null ? refusalReach(row, { group, text }).reach : null;
  return { group, reach, text, validator: v.name };
}

async function judgeMode(rec) {
  if (!rec.refusal || !rec.refusal.validator) refuse(`${rec.dir}: refusal.json names no validator, so there is no refusal to re-run`);
  const v = await validatorFor(rec, rec.refusal.validator);
  const refusal = judged(rec, v, await v.run(rec));
  const recorded = rec.refusal.text;
  const replayed = refusal ? refusal.text : null;
  return { files: { [CALL_FILES.refusal]: json(refusal) }, verdict: recorded === replayed ? "same" : "drift", recorded, replayed };
}

// The flow label the recorded prompt was rendered under, read from its first line.
function flowLabelOf(prompt) {
  const m = String(prompt).match(/^You are the judge at the (.+) workflow's `/m);
  return m ? m[1] : null;
}

// Call n+1's prompt, re-rendered from the records 1..n.
function renderedNext(rec, earlier) {
  if (isJobRecord(rec)) {
    const other = earlier.find((r) => !["compose", "fit"].includes(r.row.phase));
    if (other) refuse(`call ${basename(other.dir)} is a ${other.row.phase} call: a site loop's prompts are not re-rendered`);
    let composed = null;
    const history = [];
    for (const r of earlier) {
      if (r.row.phase === "compose") composed = r.answer ?? null;
      if (r.refusal && r.refusal.validator) {
        history.push({ answer: r.row.phase === "fit" ? composed : r.answer ?? null, refusal: r.refusal.text,
          ...(r.refusal.reach ? { group: r.refusal.group, reach: r.refusal.reach } : {}) });
      }
    }
    const first = earlier[0].prompt;
    return history.length ? readerPathUnitRetryPrompt(first, history) : first;
  }
  const row = rowOf(rec);
  if (!row) refuse(`${rec.dir}: row.json carries no row to render a prompt from`);
  const label = flowLabelOf(earlier[0].prompt);
  if (!label) refuse(`${earlier[0].dir}: the recorded prompt names no judge flow, so it was not rendered by judgePrompt`);
  const history = earlier.filter((r) => r.refusal).map((r) => ({ answer: r.answer ?? null, refusal: r.refusal.text,
    ...(r.refusal.reach ? { group: r.refusal.group, reach: r.refusal.reach } : {}) }));
  const input = rec.input;
  const inputText = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const held = bindFlow({ lane: "replay", label });
  try { return judgePrompt(row, inputText, input, history.length ? history : null); } finally { bindFlow(held); }
}

function renderMode(rec) {
  const n = Number(basename(rec.dir));
  const all = unitCalls(rec.dir);
  const next = all.find((a) => a.n === n + 1);
  if (!next) refuse(`${rec.dir}: the unit has no call ${n + 1} to render against`);
  const earlier = all.filter((a) => a.n <= n).map((a) => readCallRecord(a.dir));
  const prompt = renderedNext(rec, earlier);
  const recorded = readFileSync(join(next.dir, CALL_FILES.prompt), "utf8");
  return { files: { [CALL_FILES.prompt]: prompt }, verdict: prompt === recorded ? "same" : "drift",
    against: next.dir, ...(prompt === recorded ? {} : { recorded, replayed: prompt }) };
}

async function modelMode(rec, promptFile) {
  const cli = rec.cli || {};
  if (!cli.path) refuse(`${rec.dir}: cli.json names no binary`);
  if (!existsSync(cli.path)) refuse(`the binary ${cli.path} that cli.json names does not exist`);
  const now = sha256(cli.path);
  if (now !== cli.sha256) refuse(`the binary ${cli.path} has sha256 ${now}, and cli.json records ${cli.sha256}`);
  const argv = rec.argv || {};
  if (!Array.isArray(argv.argv)) refuse(`${rec.dir}: argv.json carries no argument list`);
  const prompt = promptFile ? readFileSync(promptFile, "utf8") : rec.prompt;
  const r = spawnSync(cli.path, argv.argv, { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    ...(argv.timeout_s > 0 ? { timeout: 1000 * argv.timeout_s } : {}), env: { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" } });
  const raw = String(r.stdout ?? "");
  const files = { [CALL_FILES.raw]: raw };
  if (r.error || r.status !== 0) {
    const text = r.error ? `the call could not finish (${r.error.code || r.error.message})` : `the call exited ${r.status}`;
    files[CALL_FILES.refusal] = json({ group: null, reach: null, text, validator: null });
    return { files, verdict: "refused", refusal: text };
  }
  const text = answerText(raw, argv.output_format);
  const parsed = text === null ? { stopped: "the call's output carries no answer text" } : answerRecord(text);
  const isWriter = (rowOf(rec) || {}).id === "writer";
  const fresh = { ...rec, raw, answer: isWriter ? text : parsed.record };
  if (!isWriter && parsed.stopped) {
    files[CALL_FILES.refusal] = json({ group: "shape", reach: null, text: parsed.stopped, validator: "answerRecord" });
    return { files, verdict: "refused", refusal: parsed.stopped };
  }
  files[CALL_FILES.answer] = json(fresh.answer);
  const v = await validatorFor(rec, rec.refusal && rec.refusal.validator !== "answerRecord" ? rec.refusal.validator : null);
  const refusal = judged(fresh, v, await v.run(fresh));
  files[CALL_FILES.refusal] = json(refusal);
  return { files, verdict: refusal ? "refused" : "passed", ...(refusal ? { refusal: refusal.text } : {}) };
}

// ONE REPLAY: the mode's result, written under `<dir>/replays/<timestamp>/` beside `result.json`.
export async function replayCall(dir, mode, { prompt = null, now = new Date() } = {}) {
  if (!REPLAY_MODES.includes(mode)) refuse(`--mode is one of ${REPLAY_MODES.join(", ")}, not ${JSON.stringify(mode)}`);
  if (prompt && mode !== "model") refuse("--prompt is read in --mode model alone");
  const rec = readCallRecord(resolve(dir));
  if (rec.error) refuse(rec.error);
  const r = mode === "judge" ? await judgeMode(rec) : mode === "render" ? renderMode(rec) : await modelMode(rec, prompt);
  const out = join(rec.dir, REPLAYS_DIR, now.toISOString().replace(/[:.]/g, "-"));
  mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(r.files)) writeFileSync(join(out, name), text);
  const { files, ...result } = r;
  const written = { mode, call: rec.dir, ...(prompt ? { prompt: resolve(prompt) } : {}), ...result, files: Object.keys(files) };
  writeFileSync(join(out, REPLAY_RESULT), json(written));
  return { out, ...written };
}

function usage() {
  return "usage: node src/workflow/replay.mjs <call dir> --mode judge|render|model [--prompt <file>]";
}

async function main(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mode" || argv[i] === "--prompt") args[argv[i].slice(2)] = argv[++i];
    else if (argv[i].startsWith("--")) refuse(`unknown flag ${argv[i]}. ${usage()}`);
    else args._.push(argv[i]);
  }
  if (args._.length !== 1 || !args.mode) refuse(usage());
  const r = await replayCall(args._[0], args.mode, { prompt: args.prompt || null });
  console.log(`${r.mode}: ${r.verdict}`);
  if (r.mode === "judge" && r.verdict === "drift") console.log(`  recorded: ${r.recorded}\n  replayed: ${r.replayed}`);
  if (r.mode === "render") console.log(`  against: ${r.against}`);
  if (r.refusal) console.log(`  refusal: ${r.refusal}`);
  console.log(`  written: ${r.out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof ReplayRefusal ? `replay refused: ${e.message}` : e.stack || String(e));
    process.exit(e instanceof ReplayRefusal ? 2 : 1);
  });
}
