// A Leg's Senses (kogaki#1849): the sentences of one Leg of a Brief, its Arguments and its CentralClaim, read five
// times for every Sense that holds between each pair of them, counted by code into each pair's Edge candidates, the
// candidates' two sentences joined by one more call, and, where a Move's Edges file is given, every filling of the
// Move's Segments by the Leg's sentences compared with those candidates; written to a run directory and a sheet.
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
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { installRecorder, stageEnv, declaredCommand } from "../move-extraction-playground/leg-run.mjs";
import { callDir, CALL_FILES, cliRecord } from "../workflow/call-record.mjs";
import { parseYaml } from "../yaml.mjs";
import { retriedCall } from "./short.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR } from "./trial.mjs";
import { readBriefLeg } from "./move-structure.mjs";
import {
  READINGS,
  JOIN_ROW,
  loadSenses,
  senseNames,
  sensesText,
  canonicalAnswer,
  joinRefusal,
} from "./move-senses.mjs";
import { renderLegSensesSheet } from "./leg-senses-sheet.mjs";

export const NAME_ROW = "smp_name_senses";
export const RUN_FILE = "leg-senses-run.json";
export const COUNTS_FILE = "counts.json";
export const COMPARISON_FILE = "comparison.json";
export const SHEET_FILE = "sheet.html";
export const FLAGS = ["brief", "leg", "out"];
export const CANDIDATES_SETTING = "paragraph_plan.leg_edge_candidates";
const CENTRAL = "CentralClaim";
const USAGE =
  "usage: node src/structure-mapping-playground/leg-senses.mjs read --brief <Brief file> --leg <leg_id> " +
  "[--move-edges <file>] --out <dir under runs/structure-mapping-playground/>";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => ({ path: relFromRepo(path), sha256: sha256(path) });
const refuse = (group, text) => ({ group, text });
const answerKey = (a) => `${a.sense}|${a.played_by}`;

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// Every pair of `count` sentences, in the order (1, 2), (1, 3) and so on.
export function pairsOf(count) {
  const out = [];
  for (let i = 1; i <= count; i++) for (let j = i + 1; j <= count; j++) out.push([i, j]);
  return out;
}

// ---------------------------------------------------------------------------
// THE SENTENCES, read from the Brief with no model call: the Arguments in the order the relation lists them, then
// the CentralClaim. A relation's text is its `holds` with each `{<Role id>}` written as the Role's `name`; a Role's
// text is its `context`.

export function legSentences(structure, relationId) {
  const roles = new Map(structure.roles.map((r) => [r.id, r]));
  const relations = new Map([...structure.relations, ...structure.higher_order].map((r) => [r.id, r]));
  const named = (holds) => holds.replace(/\{([^{}]+)\}/g, (m, id) => (roles.has(id) ? roles.get(id).name : m));
  const central = relations.get(relationId);
  const args = Object.hasOwn(central, "relates")
    ? central.relates.map((id) => ({ id, sentence: named(relations.get(id).holds) }))
    : central.between.map((id) => ({ id, sentence: roles.get(id).context }));
  return [
    ...args.map((a, k) => ({ number: k + 1, id: a.id, kind: "Argument", sentence: a.sentence })),
    { number: args.length + 1, id: relationId, kind: CENTRAL, sentence: named(central.holds) },
  ];
}

// ---------------------------------------------------------------------------
// THE TWO VALIDATORS of this command, each refusal naming the place, or null.

// The `smp_name_senses` answer: every Sense that holds, per pair, in order.
export function nameRefusal(answer, sentenceCount, names) {
  const top = keysRefusal(answer, ["pairs"], "the record");
  if (top) return refuse("shape", top);
  const pairs = pairsOf(sentenceCount);
  if (!Array.isArray(answer.pairs)) return refuse("pairs", "the record's `pairs` is not a list");
  if (answer.pairs.length !== pairs.length)
    return refuse(
      "pairs",
      `\`pairs\` carries ${answer.pairs.length} entries, and ${sentenceCount} sentences have ${pairs.length} pairs — one entry per pair, in order`,
    );
  for (const [i, p] of answer.pairs.entries()) {
    const at = `pairs[${i}]`;
    const bad = keysRefusal(p, ["pair", "senses"], at);
    if (bad) return refuse("pairs", bad);
    const pair = pairs[i];
    if (JSON.stringify(p.pair) !== JSON.stringify(pair))
      return refuse(
        "pairs",
        `${at}.pair is ${JSON.stringify(p.pair)}, and the pair in that place is ${JSON.stringify(pair)}`,
      );
    if (!Array.isArray(p.senses)) return refuse("senses", `${at}.senses is not a list`);
    const seen = new Map();
    for (const [j, s] of p.senses.entries()) {
      const sat = `${at}.senses[${j}]`;
      const sb = keysRefusal(s, ["sense", "played_by"], sat);
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
      const key = answerKey(canonicalAnswer(s, pair, names));
      if (seen.has(key))
        return refuse(
          "senses",
          `${sat} says the same of the pair as ${at}.senses[${seen.get(key)}] — a pair's Senses are all different`,
        );
      seen.set(key, j);
    }
  }
  return null;
}

// The Move's Edges file, written by hand for one Move: refused naming the place, or null.
export function moveEdgesRefusal(doc, names) {
  const top = keysRefusal(doc, ["segments"], "the file");
  if (top) return top;
  if (!Array.isArray(doc.segments) || !doc.segments.length) return "the file's `segments` is not a list of Segments";
  const count = doc.segments.length;
  const binds = new Map();
  for (const [k, s] of doc.segments.entries()) {
    const at = `segments[${k}]`;
    const bad = keysRefusal(s, ["bind", "discourse_relation"], at);
    if (bad) return bad;
    if (typeof s.bind !== "string" || !(s.bind === CENTRAL || /^Arg[1-9][0-9]*$/.test(s.bind)))
      return `${at}.bind is ${JSON.stringify(s.bind)}, and a bind is Arg1, Arg2 and so on, or ${CENTRAL}`;
    if (binds.has(s.bind)) return `${at}.bind is ${s.bind}, which segments[${binds.get(s.bind)}].bind already is`;
    binds.set(s.bind, k);
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
  const args = [...binds.keys()].filter((b) => b !== CENTRAL).map((b) => Number(b.slice(3)));
  args.sort((a, b) => a - b);
  const gap = args.findIndex((n, k) => n !== k + 1);
  if (gap >= 0) return `the binds run ${args.map((n) => `Arg${n}`).join(", ")}, and Arg numbers run from 1 with no gap`;
  return null;
}

// ---------------------------------------------------------------------------
// THE COUNTING, by code with no model call.

// Per pair, each different answer: in how many readings named, its places; in order, the first `keep` the candidates.
export function countPairs(readings, sentenceCount, names, keep) {
  return pairsOf(sentenceCount).map((pair, i) => {
    const byKey = new Map();
    for (const reading of readings)
      reading.pairs[i].senses.forEach((s, place) => {
        const c = canonicalAnswer(s, pair, names);
        const key = answerKey(c);
        if (!byKey.has(key)) byKey.set(key, { ...c, named: 0, place_sum: 0 });
        const row = byKey.get(key);
        row.named++;
        row.place_sum += place + 1;
      });
    const answers = [...byKey.values()].sort(
      (a, b) =>
        b.named - a.named ||
        a.place_sum - b.place_sum ||
        names.get(a.sense).order - names.get(b.sense).order ||
        a.played_by - b.played_by,
    );
    answers.forEach((a, k) => (a.candidate = k < keep));
    return { pair, answers };
  });
}

const candidatesOf = (p) =>
  p.answers.filter((a) => a.candidate).map((a) => ({ sense: a.sense, played_by: a.played_by }));

// The rows the joining call is handed: every Edge candidate of every pair, in order.
export const joinRows = (counted) => counted.flatMap((p) => candidatesOf(p).map((a) => ({ pair: p.pair, ...a })));

// ---------------------------------------------------------------------------
// THE COMPARISON, by code with no model call: every filling of the Move's Args by the Leg's Arguments.

function fillingsOf(argCount, legArgs) {
  const out = [];
  const walk = (taken) => {
    if (taken.length === argCount) return out.push([...taken]);
    for (let n = 1; n <= legArgs; n++) if (!taken.includes(n)) walk([...taken, n]);
  };
  walk([]);
  return out;
}

export function compareMove(moveEdges, counted, sentenceCount, names) {
  const legArgs = sentenceCount - 1;
  const segments = moveEdges.segments;
  const argCount = segments.filter((s) => s.bind !== CENTRAL).length;
  if (argCount > legArgs)
    return {
      chosen: false,
      fillings: [],
      none: `the Move has ${argCount} Args and the Leg has ${legArgs} Arguments, so there is no filling`,
    };
  const fillings = fillingsOf(argCount, legArgs).map((taken) => {
    const sentenceOf = (k) => {
      const b = segments[k - 1].bind;
      return b === CENTRAL ? sentenceCount : taken[Number(b.slice(3)) - 1];
    };
    const fill = Object.fromEntries(segments.map((s, k) => [s.bind, sentenceOf(k + 1)]));
    const edges = segments.flatMap((s, k) => {
      const r = s.discourse_relation;
      if (!r) return [];
      const carrier = sentenceOf(k + 1);
      const other = sentenceOf(r.to[0]);
      const pair = [Math.min(carrier, other), Math.max(carrier, other)];
      const wanted = canonicalAnswer(
        { sense: r.sense, played_by: names.get(r.sense).part ? carrier : null },
        pair,
        names,
      );
      const candidates = candidatesOf(counted.find((p) => p.pair[0] === pair[0] && p.pair[1] === pair[1]));
      const met = candidates.some((c) => answerKey(c) === answerKey(wanted));
      return [{ segment: k + 1, sense: r.sense, to: r.to, pair, wanted, candidates, met }];
    });
    return { filling: fill, edges, met: edges.every((e) => e.met) };
  });
  return { chosen: fillings.some((f) => f.met), fillings, none: null };
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

const playgroundRow = (id) => ({ id, ...JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"))[id] });
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
  const nameRow = playgroundRow(NAME_ROW);
  const readings = [];
  let namePrompt = null;
  for (let k = 1; k <= READINGS; k++) {
    const r = call(
      `reading-${k}`,
      nameRow,
      { sentences: numbered, senses: listText },
      (a) => nameRefusal(a, sentences.length, names),
      "nameRefusal",
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
