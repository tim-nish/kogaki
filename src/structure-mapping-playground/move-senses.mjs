// A Move's Senses (kogaki#1847): the paragraph a Move was taken from, read five times for the three Senses that fit
// each pair of neighbouring sentences best, counted by code, the Sense most often placed first kept as the pair's
// Edge, and each shown Sense's two sentences joined by one more call; written to a run directory and a sheet.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   A Move's Senses
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { loadMoveContracts } from "../compose.mjs";
import { resolveJudgeBinary } from "../workflow/judge.mjs";
import { REPO, relFromRepo, readRowTable } from "../workflow/run-record.mjs";
import { installRecorder, stageEnv, declaredCommand } from "../move-extraction-playground/leg-run.mjs";
import { callDir, CALL_FILES, cliRecord } from "../workflow/call-record.mjs";
import { legParagraphs, sentencesOf } from "../move-extraction-playground/extract.mjs";
import { MOVE_RECORD_EXT } from "../compose/render.mjs";
import { retriedCall, PLAYGROUND_TABLE, TRIALS_DIR } from "./short.mjs";
import { renderSensesSheet } from "./senses-sheet.mjs";
import { SENSES_FILE, READINGS, loadSenses, senseNames, sensesText, canonicalAnswer } from "../sme/edges.mjs";

// The list of Senses and its names are production's (kogaki#1865), read from src/sme/edges.mjs.
export { SENSES_FILE, READINGS, loadSenses, senseNames, sensesText, canonicalAnswer };

export const RANK_ROW = "smp_rank_senses";
export const JOIN_ROW = "smp_join_senses";
export const RUN_FILE = "senses-run.json";
export const COUNTS_FILE = "counts.json";
export const SHEET_FILE = "sheet.html";
export const FLAGS = ["move", "source", "paragraph", "out"];
const PLACES = 3;
const USAGE =
  "usage: node src/structure-mapping-playground/move-senses.mjs read --move <Move id> --source <file> --paragraph <n> " +
  "--out <dir under runs/structure-mapping-playground/> [--library <dir>]";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => ({ path: relFromRepo(path), sha256: sha256(path) });
const refuse = (group, text) => ({ group, text });

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

const answerKey = (a) => `${a.sense}|${a.played_by}`;

// ---------------------------------------------------------------------------
// THE TWO VALIDATORS, each refusal naming the place, or null.

export function rankRefusal(answer, sentenceCount, names) {
  const top = keysRefusal(answer, ["pairs"], "the record");
  if (top) return refuse("shape", top);
  if (!Array.isArray(answer.pairs)) return refuse("pairs", "the record's `pairs` is not a list");
  if (answer.pairs.length !== sentenceCount - 1)
    return refuse(
      "pairs",
      `\`pairs\` carries ${answer.pairs.length} entries, and ${sentenceCount} sentences have ${sentenceCount - 1} pairs of neighbours — one entry per pair, in order`,
    );
  for (const [i, p] of answer.pairs.entries()) {
    const at = `pairs[${i}]`;
    const bad = keysRefusal(p, ["pair", "senses"], at);
    if (bad) return refuse("pairs", bad);
    const pair = [i + 1, i + 2];
    if (JSON.stringify(p.pair) !== JSON.stringify(pair))
      return refuse(
        "pairs",
        `${at}.pair is ${JSON.stringify(p.pair)}, and the pair in that place is ${JSON.stringify(pair)}`,
      );
    if (!Array.isArray(p.senses) || p.senses.length !== PLACES)
      return refuse(
        "senses",
        `${at}.senses carries ${Array.isArray(p.senses) ? p.senses.length : "no list of"} Senses, not exactly ${PLACES}`,
      );
    const seen = new Map();
    for (const [j, s] of p.senses.entries()) {
      const sat = `${at}.senses[${j}]`;
      const sb = keysRefusal(s, ["sense", "played_by", "holds"], sat);
      if (sb) return refuse("senses", sb);
      const n = names.get(s.sense);
      if (!n)
        return refuse(
          "senses",
          `${sat}.sense is ${JSON.stringify(s.sense)}, which is no name of \`senses\` — a Sense with a part word is written with it`,
        );
      if (n.part && !pair.includes(s.played_by))
        return refuse(
          "senses",
          `${sat}.played_by is ${JSON.stringify(s.played_by)}, and ${s.sense} is played by one of the pair's sentences, ${pair[0]} or ${pair[1]}`,
        );
      if (!n.part && s.played_by !== null)
        return refuse(
          "senses",
          `${sat}.played_by is ${JSON.stringify(s.played_by)}, and ${s.sense} has no part word: it is null`,
        );
      if (typeof s.holds !== "boolean")
        return refuse("senses", `${sat}.holds is ${JSON.stringify(s.holds)}, not true or false`);
      const key = answerKey(canonicalAnswer(s, pair, names));
      if (seen.has(key))
        return refuse(
          "senses",
          `${sat} says the same of the pair as ${at}.senses[${seen.get(key)}] — the three Senses of a pair are all different`,
        );
      seen.set(key, j);
    }
  }
  return null;
}

export function joinRefusal(answer, rows) {
  const top = keysRefusal(answer, ["rows"], "the record");
  if (top) return refuse("shape", top);
  if (!Array.isArray(answer.rows) || answer.rows.length !== rows.length)
    return refuse(
      "rows",
      `\`rows\` carries ${Array.isArray(answer.rows) ? answer.rows.length : "no list of"} entries, and the input has ${rows.length} — one per input row, in order`,
    );
  for (const [i, r] of answer.rows.entries()) {
    const at = `rows[${i}]`;
    const bad = keysRefusal(r, ["pair", "sense", "played_by", "word", "second"], at);
    if (bad) return refuse("rows", bad);
    for (const k of ["pair", "sense", "played_by"])
      if (JSON.stringify(r[k]) !== JSON.stringify(rows[i][k]))
        return refuse(
          "rows",
          `${at}.${k} is ${JSON.stringify(r[k])}, and its input row's is ${JSON.stringify(rows[i][k])}`,
        );
    for (const k of ["word", "second"]) if (!isText(r[k])) return refuse("rows", `${at}.${k} is empty`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// THE COUNTING, by code with no model call.

// Per pair, each different answer: among the three in how many readings, its places, held in how many; in order.
export function countPairs(readings, sentenceCount, names) {
  return Array.from({ length: sentenceCount - 1 }, (_, i) => {
    const pair = [i + 1, i + 2];
    const byKey = new Map();
    for (const reading of readings)
      reading.pairs[i].senses.forEach((s, place) => {
        const c = canonicalAnswer(s, pair, names);
        const key = answerKey(c);
        if (!byKey.has(key)) byKey.set(key, { ...c, among: 0, places: Array(PLACES).fill(0), held: 0 });
        const row = byKey.get(key);
        row.among++;
        row.places[place]++;
        if (s.holds) row.held++;
      });
    const placeSum = (r) => r.places.reduce((t, n, k) => t + n * (k + 1), 0);
    const answers = [...byKey.values()].sort(
      (a, b) =>
        b.among - a.among ||
        placeSum(a) - placeSum(b) ||
        names.get(a.sense).order - names.get(b.sense).order ||
        a.played_by - b.played_by,
    );
    const most = Math.max(...answers.map((a) => a.places[0]));
    const first = answers.filter((a) => a.places[0] === most);
    return {
      pair,
      answers,
      kept: first.length === 1 ? { sense: first[0].sense, played_by: first[0].played_by } : null,
      tie: first.length > 1 ? first.map((a) => ({ sense: a.sense, played_by: a.played_by })) : null,
    };
  });
}

// THE EDGES: each kept Sense carried by the Segment playing its part, or the later one; none on a tie or a double.
export function edgesOf(counted, segmentCount) {
  const tied = counted.find((p) => p.tie);
  if (tied)
    return {
      segments: null,
      none: `no Edges are written: in the pair (${tied.pair.join(", ")}) ${tied.tie.map((t) => t.sense).join(" and ")} tie for the most first places`,
    };
  const segments = Array.from({ length: segmentCount }, (_, k) => ({ segment: k + 1, discourse_relation: null }));
  for (const p of counted) {
    const carrier = p.kept.played_by ?? p.pair[1];
    const to = p.pair.find((n) => n !== carrier);
    const seg = segments[carrier - 1];
    if (seg.discourse_relation)
      return {
        segments: null,
        none: `no Edges are written: Segment ${carrier} would carry two Edges, ${seg.discourse_relation.sense} and ${p.kept.sense}`,
      };
    seg.discourse_relation = { sense: p.kept.sense, rel_type: null, to: [to] };
  }
  return { segments, none: null };
}

// The rows the joining call is handed: each pair's first three answers in order.
export const joinRows = (counted) =>
  counted.flatMap((p) =>
    p.answers.slice(0, PLACES).map((a) => ({ pair: p.pair, sense: a.sense, played_by: a.played_by })),
  );

// ---------------------------------------------------------------------------
// THE COMMAND.

function refusal(msg) {
  return { refused: `${msg}. Nothing was written and no model call was made.` };
}

// Every refusal before any model call, or the run's inputs.
export function readInputs({ move, source, paragraph, out, library }) {
  for (const k of FLAGS)
    if (!isText({ move, source, paragraph, out }[k])) return refusal(`\`--${k}\` is required and takes a value`);
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    return refusal(`--out ${out} is not a directory under ${TRIALS_DIR}/`);
  if (existsSync(join(outDir, RUN_FILE))) return refusal(`--out ${out} already holds a run`);
  const libraryDir = resolve(REPO, library || "moves");
  const lib = loadMoveContracts(libraryDir);
  if (lib.error) return refusal(lib.error);
  const contract = lib.moves.find((m) => m.id === move);
  if (!contract)
    return refusal(`--move ${JSON.stringify(move)} names no Move of the library ${relFromRepo(libraryDir)}`);
  const sourcePath = resolve(source);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) return refusal(`--source ${source} names no file`);
  const paragraphs = legParagraphs(readFileSync(sourcePath, "utf8"));
  const n = Number(paragraph);
  if (!/^\d+$/.test(paragraph) || n < 1 || n > paragraphs.length)
    return refusal(
      `--paragraph ${paragraph} is not a whole number from 1 to ${paragraphs.length}, the number of paragraphs of ${source}`,
    );
  const segmentCount = contract.segments.length;
  if (segmentCount < 2) return refusal(`the Move ${move} has one Segment, and one Segment has no pair to read`);
  const sentences = sentencesOf(paragraphs[n - 1]);
  if (sentences.length !== segmentCount)
    return refusal(
      `paragraph ${n} has ${sentences.length} sentences, and the Move ${move} has ${segmentCount} Segments — one sentence per Segment`,
    );
  return {
    outDir,
    moveId: move,
    movePath: join(libraryDir, `${move}${MOVE_RECORD_EXT}`),
    sourcePath,
    paragraph: n,
    sentences,
    segmentCount,
  };
}

const playgroundRow = (id) => ({ id, ...readRowTable(PLAYGROUND_TABLE)[id] });
const promptOf = (dir, unit) => {
  const p = join(callDir(dir, unit, 1), CALL_FILES.prompt);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

export function readMoveSenses(flags) {
  const inputs = readInputs(flags);
  if (inputs.refused) return inputs;
  const { outDir, sentences, segmentCount } = inputs;
  const senses = loadSenses();
  const names = senseNames(senses);
  const judge = resolveJudgeBinary(String(declaredCommand()), process.env.PATH);
  const cli = cliRecord(judge.path, judge.version);
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const record = {
    move: { id: inputs.moveId, ...fileRecord(inputs.movePath) },
    source: fileRecord(inputs.sourcePath),
    paragraph: inputs.paragraph,
    sentences,
    model_command: judge.path,
    started_at: new Date().toISOString(),
    calls: [],
    state: "running",
    stopped: null,
    counts: null,
    sheet: null,
  };
  const save = () => writeFileSync(join(outDir, RUN_FILE), JSON.stringify(record, null, 2) + "\n");
  save();
  const numbered = sentences.map((sentence, k) => ({ number: k + 1, sentence }));
  const listText = sensesText(senses);
  const call = (name, row, input, refusalOf, validator) => {
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    const r = retriedCall({ dir: d, env: stageEnv(outDir, d, judge.path), cli, row, input, refusalOf, validator });
    record.calls.push({ call: name, state: r.stopped ? "stopped" : "done", refusals: r.refusals || [] });
    if (r.stopped) {
      record.state = "stopped";
      record.stopped = `${name}: ${r.stopped}`;
    }
    save();
    return { ...r, prompt: promptOf(d, row.id) };
  };
  const rank = playgroundRow(RANK_ROW);
  const readings = [];
  let rankPrompt = null;
  for (let k = 1; k <= READINGS; k++) {
    const r = call(
      `reading-${k}`,
      rank,
      { sentences: numbered, senses: listText },
      (a) => rankRefusal(a, sentences.length, names),
      "rankRefusal",
    );
    rankPrompt ??= r.prompt;
    if (r.stopped) return { outDir, stopped: record.stopped };
    readings.push(r.answer);
  }
  const counted = countPairs(readings, sentences.length, names);
  const edges = edgesOf(counted, segmentCount);
  const counts = { pairs: counted, segments: edges.segments, none: edges.none };
  writeFileSync(join(outDir, COUNTS_FILE), JSON.stringify(counts, null, 2) + "\n");
  record.counts = fileRecord(join(outDir, COUNTS_FILE));
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
    renderSensesSheet({
      moveId: inputs.moveId,
      paragraph: inputs.paragraph,
      sentences,
      counts,
      joins: j.answer.rows,
      readings,
      prompts: [rankPrompt, j.prompt],
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
    process.stderr.write(`move-senses: ${USAGE}\n`);
    process.exit(1);
  }
  const r = readMoveSenses({
    move: str("move"),
    source: str("source"),
    paragraph: str("paragraph"),
    out: str("out"),
    library: str("library"),
  });
  if (r.refused) {
    process.stderr.write(`move-senses: ${r.refused} ${USAGE}\n`);
    process.exit(1);
  }
  console.log(`run directory: ${r.outDir}`);
  if (r.stopped) {
    console.log(r.stopped);
    process.exitCode = 1;
  }
}
