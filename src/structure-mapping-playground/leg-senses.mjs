// A Leg's Senses (kogaki#1849, kogaki#1851): a Leg's Arguments and CentralClaim read five times for every Sense that
// holds between each pair, counted by code into each pair's Edge candidates, the candidates' two sentences joined by
// one more call, and, where a Move of moves/ is named, every filling of the Move's bound Segments by the Leg's
// sentences compared with those candidates; written to a run directory and a sheet.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   A Leg's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, readRowTable } from "../workflow/run-record.mjs";
import { installRecorder, stageEnv, declaredCommand } from "../move-extraction-playground/leg-run.mjs";
import { callDir, CALL_FILES, cliRecord } from "../workflow/call-record.mjs";
import { loadMoveContracts } from "../compose.mjs";
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
import { RUN_FILE, COUNTS_FILE, LEG_SENSES_USAGE } from "./leg-senses-section.mjs";

// The counting, the check of a reading and the comparison are production's (kogaki#1865), read from
// src/paragraph-plan/senses.mjs; the reading row is production's `paragraph_plan_name_senses`.
export { legSentences, pairsOf, nameRefusal, countPairs, NAME_ROW, CANDIDATES_SETTING };
// The run's files and usage line are held where the short Trial reads them (kogaki#1875).
export { RUN_FILE, COUNTS_FILE };
export const COMPARISON_FILE = "comparison.json";
export const SHEET_FILE = "sheet.html";
export const FLAGS = ["brief", "leg", "out"];
const USAGE = LEG_SENSES_USAGE;

const isText = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => ({ path: relFromRepo(path), sha256: sha256(path) });
const MOVES_DIR = "moves";

// The rows the joining call is handed: every Edge candidate of every pair, in order.
export const joinRows = (counted) => counted.flatMap((p) => candidatesOf(p).map((a) => ({ pair: p.pair, ...a })));

// THE COMPARISON of src/paragraph-plan/senses.mjs over the Move's Segments, as its Move file holds them (kogaki#1880).
export function compareMove(move, counted, sentenceCount, names) {
  return compareEdges({ segments: move.segments }, counted, sentenceCount, names);
}
// ---------------------------------------------------------------------------
// THE COMMAND.

function refusal(msg) {
  return { refused: `${msg}. Nothing was written and no model call was made.` };
}

// Every refusal before any model call, or the run's inputs.
export function readInputs({ brief, leg, out, move = null, moveEdges = null }) {
  if (moveEdges !== null)
    return refusal(
      "`--move-edges` is retired: the Move's Edges are read from its Move file under `--move <Move id>` (kogaki#1880)",
    );
  for (const k of FLAGS)
    if (!isText({ brief, leg, out }[k])) return refusal(`\`--${k}\` is required and takes a value`);
  if (move === true) return refusal("`--move` takes a Move id");
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    return refusal(`--out ${out} is not a directory under ${TRIALS_DIR}/`);
  if (existsSync(join(outDir, RUN_FILE))) return refusal(`--out ${out} already holds a run`);
  const briefPath = resolve(brief);
  const b = readBriefLeg(briefPath, leg);
  if (b.error) return refusal(b.error);
  const names = senseNames(loadSenses());
  let contract = null;
  if (move) {
    const lib = loadMoveContracts(resolve(REPO, MOVES_DIR));
    if (lib.error) return refusal(lib.error);
    contract = lib.moves.find((m) => m.id === move) || null;
    if (!contract) return refusal(`--move ${move} names no Move of ${MOVES_DIR}/`);
    if (!contract.segments.every((s) => Array.isArray(s.edges)))
      return refusal(`the Move ${move} carries no \`bind\` and \`edges\` on its Segments`);
  }
  const keep = Number(settingValue({ setting: CANDIDATES_SETTING }));
  return {
    outDir,
    briefPath,
    legId: leg,
    sentences: legSentences(b.structure, b.leg.relation),
    move: contract,
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
    move: inputs.move ? inputs.move.id : null,
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
  if (inputs.move) {
    comparison = compareMove(inputs.move, counted, sentences.length, names);
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
      move: inputs.move,
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
    move: args.move === true ? true : str("move"),
    moveEdges: Object.hasOwn(args, "move-edges") ? args["move-edges"] : null,
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
