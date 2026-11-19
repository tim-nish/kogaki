// A Leg's Senses (kogaki#1849, kogaki#1851): a Leg's Arguments and CentralClaim read five times for every Sense that
// holds between each pair, counted by code into each pair's Edge candidates, the candidates' two sentences joined by
// one more call, and, where a Move's Edges file is given, every filling of the Move's bound Segments by the Leg's
// sentences compared with those candidates; written to a run directory and a sheet.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   A Leg's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, readRowTable } from "../workflow/run-record.mjs";
import { installRecorder, stageEnv, declaredCommand } from "../move-extraction-playground/leg-run.mjs";
import { callDir, CALL_FILES, cliRecord } from "../workflow/call-record.mjs";
import { parseYaml } from "../yaml.mjs";
import { retriedCall } from "./short.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR } from "./trial.mjs";
import { readBriefLeg } from "./move-structure.mjs";
import { JOIN_ROW, joinRefusal } from "./move-senses.mjs";
import {
  READINGS,
  NAME_ROW,
  CANDIDATES_SETTING,
  loadSenses,
  senseNames,
  sensesText,
  legSentences,
  pairsOf,
  nameRefusal,
  countPairs,
  candidatesOf,
  compareMove as compareEdges,
} from "../paragraph-plan/senses.mjs";
import { PARAGRAPH_PLAN_TABLE } from "../paragraph-plan/stage.mjs";
import { renderLegSensesSheet } from "./leg-senses-sheet.mjs";

// The counting, the check of a reading and the comparison are production's (kogaki#1865), read from
// src/paragraph-plan/senses.mjs; the reading row is production's `paragraph_plan_name_senses`.
export { legSentences, pairsOf, nameRefusal, countPairs, NAME_ROW, CANDIDATES_SETTING };
export const RUN_FILE = "leg-senses-run.json";
export const COUNTS_FILE = "counts.json";
export const COMPARISON_FILE = "comparison.json";
export const SHEET_FILE = "sheet.html";
export const FLAGS = ["brief", "leg", "out"];
const USAGE =
  "usage: node src/structure-mapping-playground/leg-senses.mjs read --brief <Brief file> --leg <leg_id> " +
  "[--move-edges <file>] --out <dir under runs/structure-mapping-playground/>";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => ({ path: relFromRepo(path), sha256: sha256(path) });

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// ---------------------------------------------------------------------------
// THE VALIDATOR of the Move's Edges file; a reading is checked by `nameRefusal` of src/paragraph-plan/senses.mjs.

// The Move's Edges file, written by hand for one Move: refused naming the place, or null. A `bind` is a whole number
// from 1 naming a Bind target, or null for a Segment with nothing bound.
export function moveEdgesRefusal(doc, names) {
  const top = keysRefusal(doc, ["segments"], "the file");
  if (top) return top;
  if (!Array.isArray(doc.segments) || !doc.segments.length) return "the file's `segments` is not a list of Segments";
  const count = doc.segments.length;
  let bound = 0;
  for (const [k, s] of doc.segments.entries()) {
    const at = `segments[${k}]`;
    const bad = keysRefusal(s, ["bind", "discourse_relation"], at);
    if (bad) return bad;
    if (s.bind !== null && !(Number.isInteger(s.bind) && s.bind >= 1))
      return `${at}.bind is ${JSON.stringify(s.bind)}, and a bind is a whole number from 1, or null`;
    if (s.bind !== null && s.bind !== ++bound)
      return `${at}.bind is ${s.bind}, and the bound Segments are numbered 1, 2 and so on in Segment order: this one is ${bound}`;
    const r = s.discourse_relation;
    if (r === null) continue;
    const rb = keysRefusal(r, ["sense", "rel_type", "to"], `${at}.discourse_relation`);
    if (rb) return rb;
    if (!names.has(r.sense))
      return `${at}.discourse_relation.sense is ${JSON.stringify(r.sense)}, which is no name of the list of Senses`;
    if (r.rel_type !== null) return `${at}.discourse_relation.rel_type is ${JSON.stringify(r.rel_type)}, not null`;
    const ok =
      Array.isArray(r.to) &&
      r.to.length === 1 &&
      Number.isInteger(r.to[0]) &&
      r.to[0] >= 1 &&
      r.to[0] <= count &&
      r.to[0] !== k + 1;
    if (!ok)
      return `${at}.discourse_relation.to is ${JSON.stringify(r.to)}, and it is one Segment number from 1 to ${count} other than the Segment's own, ${k + 1}`;
  }
  return null;
}

// The rows the joining call is handed: every Edge candidate of every pair, in order.
export const joinRows = (counted) => counted.flatMap((p) => candidatesOf(p).map((a) => ({ pair: p.pair, ...a })));

// THE COMPARISON of src/paragraph-plan/senses.mjs over the Edges file: each Segment's one `discourse_relation` is its
// one entry of `edges` (kogaki#1865).
export function compareMove(moveEdges, counted, sentenceCount, names) {
  const segments = moveEdges.segments.map((s) => ({
    bind: s.bind,
    edges: s.discourse_relation ? [{ sense: s.discourse_relation.sense, to: [...s.discourse_relation.to] }] : [],
  }));
  return compareEdges({ segments }, counted, sentenceCount, names);
}

// ---------------------------------------------------------------------------
// THE COMMAND.

function refusal(msg) {
  return { refused: `${msg}. Nothing was written and no model call was made.` };
}

// Every refusal before any model call, or the run's inputs.
export function readInputs({ brief, leg, out, moveEdges }) {
  for (const k of FLAGS)
    if (!isText({ brief, leg, out }[k])) return refusal(`\`--${k}\` is required and takes a value`);
  if (moveEdges === true) return refusal("`--move-edges` takes a value");
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    return refusal(`--out ${out} is not a directory under ${TRIALS_DIR}/`);
  if (existsSync(join(outDir, RUN_FILE))) return refusal(`--out ${out} already holds a run`);
  const briefPath = resolve(brief);
  const b = readBriefLeg(briefPath, leg);
  if (b.error) return refusal(b.error);
  const names = senseNames(loadSenses());
  let edges = null;
  let edgesPath = null;
  if (moveEdges) {
    edgesPath = resolve(moveEdges);
    if (!existsSync(edgesPath) || !statSync(edgesPath).isFile())
      return refusal(`--move-edges ${moveEdges} names no file`);
    let doc;
    try {
      doc = parseYaml(readFileSync(edgesPath, "utf8"), moveEdges);
    } catch (e) {
      return refusal(`--move-edges ${moveEdges} is not YAML (${e.message})`);
    }
    const bad = moveEdgesRefusal(doc, names);
    if (bad) return refusal(`--move-edges ${moveEdges}: ${bad}`);
    edges = doc;
  }
  const keep = Number(settingValue({ setting: CANDIDATES_SETTING }));
  return {
    outDir,
    briefPath,
    legId: leg,
    sentences: legSentences(b.structure, b.leg.relation),
    edgesPath,
    edges,
    names,
    keep,
  };
}

const playgroundRow = (id) => ({ id, ...readRowTable(PLAYGROUND_TABLE)[id] });
const productionRow = (id) => ({ id, ...readRowTable(PARAGRAPH_PLAN_TABLE)[id] });
const promptOf = (dir, unit) => {
  const p = join(callDir(dir, unit, 1), CALL_FILES.prompt);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

export function readLegSenses(flags) {
  const inputs = readInputs(flags);
  if (inputs.refused) return inputs;
  const { outDir, sentences, names, keep } = inputs;
  const senses = loadSenses();
  const judge = resolveJudgeBinary(String(declaredCommand()), process.env.PATH);
  const cli = cliRecord(judge.path, judge.version);
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const record = {
    brief: { leg: inputs.legId, ...fileRecord(inputs.briefPath) },
    move_edges: inputs.edgesPath ? fileRecord(inputs.edgesPath) : null,
    sentences,
    leg_edge_candidates: keep,
    model_command: judge.path,
    started_at: new Date().toISOString(),
    calls: [],
    state: "running",
    stopped: null,
    counts: null,
    comparison: null,
    sheet: null,
  };
  const save = () => writeFileSync(join(outDir, RUN_FILE), JSON.stringify(record, null, 2) + "\n");
  save();
  const numbered = sentences.map((s) => ({ number: s.number, sentence: s.sentence }));
  const listText = sensesText(senses);
  const call = (name, row, input, refusalOf, validator, tables = [PLAYGROUND_TABLE]) => {
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    const env = stageEnv(outDir, d, judge.path);
    const r = retriedCall({ dir: d, env, cli, row, input, refusalOf, validator, tables });
    record.calls.push({ call: name, state: r.stopped ? "stopped" : "done", refusals: r.refusals || [] });
    if (r.stopped) {
      record.state = "stopped";
      record.stopped = `${name}: ${r.stopped}`;
    }
    save();
    return { ...r, prompt: promptOf(d, row.id) };
  };
  const nameRow = productionRow(NAME_ROW);
  const readings = [];
  let namePrompt = null;
  for (let k = 1; k <= READINGS; k++) {
    const r = call(
      `reading-${k}`,
      nameRow,
      { sentences: numbered, senses: listText },
      (a) => nameRefusal(a, sentences.length, names),
      "nameRefusal",
      [PARAGRAPH_PLAN_TABLE],
    );
    namePrompt ??= r.prompt;
    if (r.stopped) return { outDir, stopped: record.stopped };
    readings.push(r.answer);
  }
  const counted = countPairs(readings, sentences.length, names, keep);
  writeFileSync(join(outDir, COUNTS_FILE), JSON.stringify({ pairs: counted }, null, 2) + "\n");
  record.counts = fileRecord(join(outDir, COUNTS_FILE));
  let comparison = null;
  if (inputs.edges) {
    comparison = compareMove(inputs.edges, counted, sentences.length, names);
    writeFileSync(join(outDir, COMPARISON_FILE), JSON.stringify(comparison, null, 2) + "\n");
    record.comparison = fileRecord(join(outDir, COMPARISON_FILE));
  }
  save();
  const rows = joinRows(counted);
  const j = call(
    "join",
    playgroundRow(JOIN_ROW),
    { sentences: numbered, senses: listText, rows },
    (a) => joinRefusal(a, rows),
    "joinRefusal",
  );
  if (j.stopped) return { outDir, stopped: record.stopped };
  const sheetPath = join(outDir, SHEET_FILE);
  writeFileSync(
    sheetPath,
    renderLegSensesSheet({
      brief: record.brief.path,
      legId: inputs.legId,
      sentences,
      counted,
      comparison,
      moveEdges: inputs.edges,
      joins: j.answer.rows,
      readings,
      prompts: [namePrompt, j.prompt],
      names,
      readingCount: READINGS,
    }),
  );
  record.sheet = relFromRepo(sheetPath);
  record.state = "finished";
  record.finished_at = new Date().toISOString();
  save();
  return { outDir, stopped: null };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[a.slice(2)] = true;
      else {
        args[a.slice(2)] = next;
        i++;
      }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  if (args._cmd !== "read") {
    process.stderr.write(`leg-senses: ${USAGE}\n`);
    process.exit(1);
  }
  const r = readLegSenses({
    brief: str("brief"),
    leg: str("leg"),
    out: str("out"),
    moveEdges: args["move-edges"] === true ? true : str("move-edges"),
  });
  if (r.refused) {
    process.stderr.write(`leg-senses: ${r.refused} ${USAGE}\n`);
    process.exit(1);
  }
  console.log(`run directory: ${r.outDir}`);
  if (r.stopped) {
    console.log(r.stopped);
    process.exitCode = 1;
  }
}
