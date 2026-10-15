#!/usr/bin/env node
// The Extractor — one paragraph's Extraction, written by a fixed row (kogaki#1384, owner
// decision 2026-10-15).
//
// WHAT IT IS. An Extraction, the analysis of one paragraph under passages/FORMAT.md, is the
// source of every paragraph Move: `tools/move_ingest.py passage --from-extraction` derives the
// Move from its sections. Before this, the Extraction had no harness stage — a session wrote
// it — so a wrong Move could not be traced to the Extraction or to the ingest, and the stage
// could not be run again on the same input. This module is that stage for the Proof Sheet:
// the `extraction_unit` row of `src/proof-sheet/extraction-workflow.json`, rendered through
// the shared `judgePrompt` renderer and run on the shared Detached Job supervisor
// (src/workflow/detached-job.mjs) with the Brief's bounds. It changes no production
// executable.
//
// ONE JOB PER PARAGRAPH, IN ORDER. Paragraph N's `before` column is carried from paragraph
// N-1's Extraction (FORMAT "The paragraph unit", rule 3), so N's input exists only once N-1
// is written. `run` starts one supervisor per paragraph and waits on it before the next.
//
// WHAT THE HARNESS WRITES AND WHAT THE MODEL WRITES. The model answers a JSON record of
// FORMAT's sections; the Harness cuts the paragraph into sentences (one Segment each), and
// writes every line it can count or already knows — the status line, `unit:`, `length:`,
// `functions:` and each Segment's quoted opening words — then renders the file in FORMAT's
// layout. What it renders is what the ingest's own parser reads, which is why a record the
// validator passes is a file the ingest takes without edits.
//
// THE RUN DIRECTORY. `<out>/extractor-run-<instant>/`, one subdirectory per paragraph: the
// supervisor's own files (the prompt in `reader-path-job-units.json`, every attempt's raw
// answer in `reader-path-unit-<id>.stdout`, the job record), plus `prompt.md` (the prompt as
// rendered), `answer.json` (the record that passed) and `attempts.json` (the attempt count
// and every refusal).
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
//   The Extraction
//       passages/FORMAT.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join, resolve, basename, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { readerPersona, personaPriorKnowledgeLine } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, readReaderPathJob, READER_PATH_JOB_STALL_S,
  READER_PATH_JOB_HEARTBEAT_MS } from "../workflow/detached-job.mjs";

export const EXTRACTION_TABLE = join(REPO, "src", "proof-sheet", "extraction-workflow.json");
export const DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];
export const FUNCTIONS = ["raises", "advances", "settles"];
export const RELATIONS = ["cause", "consequence", "contrast", "elaboration", "evidence", "enumeration", "none"];
export const STATUS_LINE = "status: unreviewed model draft (m2)";
const RECORD_KEYS = ["version", "paragraph", "source", "prior_text", "language", "subject_nouns", "answers",
  "what_it_does", "reader", "segments", "why_this_order", "presupposes", "breaks", "technique", "name", "notes"];
const ANSWER_KEYS = ["q1", "q2", "q3", "q4"];
const ROW_KEYS = ["dimension", "before", "after", "segment"];
const SEGMENT_KEYS = ["function", "relation", "content", "generalized"];
const BREAK_KEYS = ["remove", "reorder", "extend"];
// The library's id form: the ingest's own `MOVE_ID` (tools/move_ingest.py).
const MOVE_ID = /^[a-z0-9_]+$/;
const FLOW = { lane: "brief", label: "Extractor" };

function fail(msg) {
  process.stderr.write(`extract: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// THE LEG AND ITS SENTENCES. A Leg file is its paragraphs, separated by blank lines. A block
// quotation, list or definition list announced by a paragraph belongs to it (FORMAT "The
// paragraph unit", rule 1): a block opening with `>`, a list marker or `: ` is joined to the
// paragraph before it rather than counted as a paragraph of its own.
const ANNOUNCED_BLOCK = /^(>|[-*+]\s|\d+[.)]\s|:\s)/;

export function legParagraphs(text) {
  const out = [];
  for (const block of String(text).split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (out.length && ANNOUNCED_BLOCK.test(block)) out[out.length - 1] += `\n\n${block}`;
    else out.push(block);
  }
  return out;
}

// The Harness's cut: a sentence ends at `.`, `!` or `?` followed by a space or the end, or
// at `。`, `！` or `？`, with any closing quotes or brackets kept on it. An abbreviation such
// as "e.g." is cut too — the model is handed the cut, so it writes to the same one.
export function sentencesOf(paragraph) {
  const t = String(paragraph).replace(/\s+/g, " ").trim();
  const out = [];
  let cur = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    cur += ch;
    if (!/[.!?。！？]/.test(ch)) continue;
    while (i + 1 < t.length && /[.!?。！？"'”’」』)）\]]/.test(t[i + 1])) cur += t[++i];
    if (i + 1 >= t.length || t[i + 1] === " " || /[。！？]/.test(ch)) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// A Segment's quoted opening words, written by the Harness from its sentence: the first six
// words (or twenty characters of unspaced text), with `"` turned into `'` so the ingest's
// `"<opening words>"` match holds.
export function openingWords(sentence) {
  const s = String(sentence).replace(/"/g, "'");
  const words = s.split(" ");
  if (words.length > 6) return `${words.slice(0, 6).join(" ")}...`;
  if (words.length === 1 && [...s].length > 20) return `${[...s].slice(0, 20).join("")}...`;
  return s;
}

// The state a paragraph leaves the reader in, row by row: its `after` where the row moved,
// its `before` where it did not (FORMAT "The paragraph unit", rule 3).
export function carriedState(record) {
  return Object.fromEntries(record.reader.map((r) => [r.dimension, isUnchanged(r.after) ? r.before : r.after]));
}

function isUnchanged(s) { return String(s).trim().toLowerCase() === "unchanged"; }

// ---------------------------------------------------------------------------
// ONE PARAGRAPH'S INPUT AND PROMPT.

export function extractionUnitInput({ passage, paragraphs, index, before, namesTaken, persona }) {
  return {
    paragraph_you_must_extract: {
      passage, number: index + 1, of: paragraphs.length, text: paragraphs[index], sentences: sentencesOf(paragraphs[index]),
    },
    earlier_paragraphs: paragraphs.slice(0, index),
    reader_state_before: before,
    names_taken: namesTaken,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
  };
}

export function extractionUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
}

// ---------------------------------------------------------------------------
// THE ANSWER, READ BACK AGAINST FORMAT (the declared validator). Returns `{ error }` — a
// refusal of the attempt, put verbatim into the next — or `{}`.

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  if (missing) return `${at} carries no \`${missing}\``;
  return null;
}
function lineRefusal(v, at, { empty = false } = {}) {
  if (typeof v !== "string") return `${at} is not a string`;
  if (!empty && v.trim() === "") return `${at} is empty`;
  if (/[\r\n]/.test(v)) return `${at} carries a line break — every string is one line`;
  if (v.includes("|")) return `${at} carries \`|\`, which would break section 2's table`;
  return null;
}
const wordsOf = (s) => new Set(String(s).toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
function nounIn(nouns, text) {
  const ws = wordsOf(text);
  const lower = String(text).toLowerCase();
  return nouns.find((n) => (/\s/.test(n) ? lower.includes(n) : ws.has(n)));
}

export function validateExtractionUnit(record, input) {
  const p = input.paragraph_you_must_extract;
  const at = `paragraph ${p.number}`;
  const r = record || {};
  const bad = keysRefusal(r, RECORD_KEYS, `${at}: the record`);
  if (bad) return { error: bad };
  if (String(r.version) !== "1") return { error: `${at}: the record's version is ${JSON.stringify(r.version)}, not "1"` };
  if (r.paragraph !== p.number) return { error: `${at}: the record names paragraph ${JSON.stringify(r.paragraph)}, not ${p.number}` };
  for (const k of ["source", "prior_text", "language", "what_it_does", "why_this_order", "presupposes", "technique", "name"]) {
    const e = lineRefusal(r[k], `${at}: \`${k}\``);
    if (e) return { error: e };
  }
  { const e = lineRefusal(r.notes, `${at}: \`notes\``, { empty: true }); if (e) return { error: e }; }
  if (/(^|\s)split:/.test(r.notes)) return { error: `${at}: \`notes\` carries a \`split:\` line — the paragraph's boundary is the source's own, and the ingest refuses an undismissed split note` };
  if (!Array.isArray(r.subject_nouns) || r.subject_nouns.some((n) => lineRefusal(n, "noun") || n.includes(","))) {
    return { error: `${at}: \`subject_nouns\` is not an array of one-line strings without commas` };
  }
  { const e = keysRefusal(r.answers, ANSWER_KEYS, `${at}: \`answers\``); if (e) return { error: e }; }
  for (const k of ANSWER_KEYS) { const e = lineRefusal(r.answers[k], `${at}: answer ${k.toUpperCase()}`); if (e) return { error: e }; }
  { const e = keysRefusal(r.breaks, BREAK_KEYS, `${at}: \`breaks\``); if (e) return { error: e }; }
  for (const k of BREAK_KEYS) { const e = lineRefusal(r.breaks[k], `${at}: \`breaks.${k}\``); if (e) return { error: e }; }

  // Section 3: one Segment per sentence, both clauses on every one.
  const n = p.sentences.length;
  if (!Array.isArray(r.segments) || r.segments.length !== n) {
    return { error: `${at}: \`segments\` carries ${Array.isArray(r.segments) ? r.segments.length : "no"} entr(ies) for the paragraph's ${n} sentence(s) — one Segment per sentence, in order` };
  }
  const nouns = r.subject_nouns.map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const [i, s] of r.segments.entries()) {
    const atS = `${at}, Segment ${i + 1}`;
    const e = keysRefusal(s, SEGMENT_KEYS, atS);
    if (e) return { error: e };
    if (!FUNCTIONS.includes(s.function)) return { error: `${atS}: function ${JSON.stringify(s.function)} is outside ${FUNCTIONS.join(" | ")}` };
    if (!RELATIONS.includes(s.relation)) return { error: `${atS}: relation ${JSON.stringify(s.relation)} is outside ${RELATIONS.join(" | ")}` };
    for (const k of ["content", "generalized"]) {
      const e2 = lineRefusal(s[k], `${atS}: the \`${k}\` clause`);
      if (e2) return { error: e2 };
    }
    if (/—\s*generalized:/.test(s.content)) return { error: `${atS}: the \`content\` clause carries \`— generalized:\`; the two clauses are two fields` };
    const noun = nounIn(nouns, s.generalized);
    if (noun) return { error: `${atS}: the \`generalized\` clause names "${noun}", one of your subject_nouns — it names no term of the original` };
  }
  if (input.earlier_paragraphs.length && r.segments[0].relation === "none") {
    return { error: `${at}, Segment 1: relation is \`none\`, and earlier paragraphs exist — it is the relation to the previous paragraph's last point (FORMAT "The paragraph unit", rule 5)` };
  }
  if (input.earlier_paragraphs.length && !wordsOf(r.what_it_does).has(r.segments[0].relation)) {
    return { error: `${at}: \`what_it_does\` does not name Segment 1's relation to the previous paragraph, \`${r.segments[0].relation}\` — section 1 names that relation too (FORMAT "The paragraph unit", rule 5)` };
  }
  { const noun = nounIn(nouns, r.technique); if (noun) return { error: `${at}: \`technique\` names "${noun}", one of your subject_nouns — section 6 is subject-free` }; }

  // Section 2: the five dimensions, the carried before column, a Segment for every change.
  if (!Array.isArray(r.reader) || r.reader.length !== DIMENSIONS.length) {
    return { error: `${at}: \`reader\` carries ${Array.isArray(r.reader) ? r.reader.length : "no"} row(s) — five, one per dimension, in the order ${DIMENSIONS.join(", ")}` };
  }
  let changed = 0;
  for (const [i, row] of r.reader.entries()) {
    const atR = `${at}, section 2 row ${i + 1}`;
    const e = keysRefusal(row, ROW_KEYS, atR);
    if (e) return { error: e };
    if (row.dimension !== DIMENSIONS[i]) return { error: `${atR}: names ${JSON.stringify(row.dimension)}, not ${DIMENSIONS[i]} — the rows run ${DIMENSIONS.join(", ")}` };
    const atD = `${at}, the \`${row.dimension}\` row`;
    for (const k of ["before", "after"]) { const e2 = lineRefusal(row[k], `${atD}'s \`${k}\``); if (e2) return { error: e2 }; }
    { const e2 = lineRefusal(row.segment, `${atD}'s \`segment\``, { empty: true }); if (e2) return { error: e2 }; }
    const want = input.reader_state_before && input.reader_state_before[row.dimension];
    if (typeof want === "string" && row.before.trim() !== want.trim()) {
      return { error: `${atD}'s \`before\` is ${JSON.stringify(row.before)}, and the previous paragraph left it ${JSON.stringify(want)} — the before column is carried, not drafted (FORMAT "The paragraph unit", rule 3)` };
    }
    if (isUnchanged(row.after)) continue;
    changed += 1;
    const nums = row.segment.split(",").map((x) => x.trim()).filter(Boolean);
    if (!nums.length) return { error: `${atD} records a change naming no Segment` };
    const off = nums.find((x) => !/^\d+$/.test(x) || Number(x) < 1 || Number(x) > n);
    if (off !== undefined) return { error: `${atD} names Segment ${JSON.stringify(off)}, and the paragraph has Segments 1 to ${n}` };
  }
  if (!changed) return { error: `${at}: section 2 records no changed row — the ingest reads \`before\` and \`after\` from the changed rows, so at least one moves` };

  if (!MOVE_ID.test(r.name)) return { error: `${at}: \`name\` ${JSON.stringify(r.name)} is not in the library's id form — lower-case letters, digits and underscores` };
  if (input.names_taken.includes(r.name)) return { error: `${at}: \`name\` ${JSON.stringify(r.name)} is already taken by an earlier paragraph of this Leg` };
  return {};
}

// ---------------------------------------------------------------------------
// THE FILE, IN FORMAT'S LAYOUT.

export function extractionFileText(record, input, runRel) {
  const p = input.paragraph_you_must_extract;
  const segs = record.segments;
  const nouns = record.subject_nouns.map((s) => s.trim()).filter(Boolean);
  const table = [
    "| dimension   | before | after | Segment |",
    "|-------------|--------|-------|---------|",
    ...record.reader.map((row) => `| ${row.dimension.padEnd(11)} | ${row.before.trim()} | ${isUnchanged(row.after) ? "unchanged" : row.after.trim()} | ${isUnchanged(row.after) ? "" : row.segment.trim()} |`),
  ];
  const changed = record.reader.filter((row) => !isUnchanged(row.after)).length;
  return [
    `${STATUS_LINE} — written by the Extractor run ${runRel}`,
    "",
    `# Extraction: ${record.name}`,
    "",
    `source: ${record.source.trim()}`,
    `functions: ${segs.map((s) => s.function).join(", ")}`,
    `subject nouns: ${nouns.length ? nouns.join(", ") : "none"}`,
    `prior text: ${record.prior_text.trim()}`,
    `length: ${p.sentences.length} sentence${p.sentences.length === 1 ? "" : "s"}, 1 paragraph`,
    `language: ${record.language.trim()}`,
    `unit: paragraph ${p.number} of ${p.of} in ${p.passage}`,
    "",
    "## Passage",
    "",
    p.text,
    "",
    "## Answers",
    "",
    "Q1 Purpose",
    `  answer: model — ${record.answers.q1.trim()}`,
    "",
    "Q2 Question",
    `  answer: model — ${record.answers.q2.trim()}`,
    "",
    "Q3 Disposition",
    `  answer: model — ${record.answers.q3.trim()}`,
    "",
    "Q4 Footing",
    `  answer: model — ${record.answers.q4.trim()}`,
    "",
    "## 1. What the Passage does",
    "",
    record.what_it_does.trim(),
    "",
    "## 2. Reader before and after",
    "",
    ...table,
    "",
    `dimensions changed: ${changed}`,
    "",
    "## 3. The order inside the Passage",
    "",
    ...segs.map((s, i) => `${i + 1}. "${openingWords(p.sentences[i])}" — ${s.function} — ${s.relation} — ${s.content.trim()} — generalized: ${s.generalized.trim()}`),
    "",
    record.why_this_order.trim(),
    "",
    "## 4. What the Passage presupposes",
    "",
    record.presupposes.trim(),
    "",
    "## 5. Where it would break",
    "",
    `remove:  ${record.breaks.remove.trim()}`,
    `reorder: ${record.breaks.reorder.trim()}`,
    `extend:  ${record.breaks.extend.trim()}`,
    "",
    "## 6. The technique, subject-free",
    "",
    record.technique.trim(),
    "",
    "## 7. Candidate name",
    "",
    record.name,
    "",
    "## 8. Notes",
    "",
    record.notes.trim() || "nothing",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// THE RUN.

export function writeJson(path, doc) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, path);
}

function positiveSetting(row, key) {
  const n = Number(settingValue(row && row[key]));
  return Number.isInteger(n) && n > 0 ? n
    : fail(`src/proof-sheet/extraction-workflow.json's \`job\` declares no positive \`${key}\` — it names a setting in kogaki.settings.json. Nothing was started.`);
}

function supervisorAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Wait on one job until it is no longer running. Returns the job record. Exported for the
// Leg Brief composer (src/proof-sheet/leg-brief.mjs, kogaki#1385), which runs its two rows
// on the same supervisor.
export function awaitJob(dir, heartbeatMs) {
  for (;;) {
    const job = readReaderPathJob(dir);
    if (job && job.state !== "running") return job;
    if (job && !supervisorAlive(job.supervisor_pid)) {
      sleepSync(200);
      const again = readReaderPathJob(dir);
      if (again && again.state !== "running") return again;
      return { ...again, state: "died", failure: { note: `the supervisor (pid ${job.supervisor_pid}) is gone while its record still reads running` } };
    }
    sleepSync(Math.min(heartbeatMs, 1000));
  }
}

export function lastRefusal(job) {
  const u = (job.units || [])[0] || {};
  if (Array.isArray(u.refusals) && u.refusals.length) return u.refusals[u.refusals.length - 1];
  return (u.failure && (u.failure.result || u.failure.stderr_tail)) || (job.failure && job.failure.note) || u.status || job.state;
}

// RUN THE EXTRACTOR over a Leg's paragraphs. Writes one Extraction per paragraph into `out`
// and returns `{ written: [paths], runDir }`, or `{ stopped: line, written, runDir }`.
export function runExtractor(legPath, { out, passage = null, audience = null } = {}) {
  let text;
  try { text = readFileSync(legPath, "utf8"); } catch (e) { fail(`the Leg at ${legPath} cannot be read (${e.message})`); }
  const paragraphs = legParagraphs(text);
  if (!paragraphs.length) fail(`the Leg at ${legPath} carries no paragraph — there is nothing to extract`);
  const slug = passage || basename(legPath, extname(legPath));
  const table = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const row = table.extraction_unit || fail("src/proof-sheet/extraction-workflow.json declares no extraction_unit row. Nothing was started.");
  const persona = readerPersona(resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" }))));
  if (persona.error) fail(persona.error);
  const callLimitS = positiveSetting(table.job, "call_limit_s");
  const unitAttempts = positiveSetting(table.job, "unit_attempts");
  const binary = resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || table.judge.command), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const heartbeatMs = Number(table.job.heartbeat_ms) || READER_PATH_JOB_HEARTBEAT_MS;
  const outDir = resolve(out);
  const runDir = join(outDir, `extractor-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const runRel = relFromRepo(runDir, outDir);
  const written = [];
  let before = null;
  const namesTaken = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const dir = join(runDir, `p${i + 1}`);
    mkdirSync(dir, { recursive: true });
    const input = extractionUnitInput({ passage: slug, paragraphs, index: i, before, namesTaken: [...namesTaken], persona });
    const prompt = extractionUnitPrompt(row, input);
    writeFileSync(join(dir, "prompt.md"), prompt);
    startDetachedJobSupervisor(dir, {
      units: [{ id: `p${i + 1}`, prompt }], command: binary.path, model, outputFormat: String(table.judge.output_format || "json"),
      callLimitS, unitAttempts, stallS: Number(table.job.stall_s) || READER_PATH_JOB_STALL_S, heartbeatMs,
      recordArray: "segments",
      validator: { module: "src/proof-sheet/extract.mjs", export: "validateExtractionUnit", inputs: input },
    });
    const job = awaitJob(dir, heartbeatMs);
    const u = (job.units || [])[0] || {};
    writeJson(join(dir, "attempts.json"), { paragraph: i + 1, state: job.state, status: u.status || null,
      attempts: u.attempts || 1, refusals: u.refusals || [], ...(u.timed_out ? { timed_out: u.timed_out } : {}) });
    if (job.state !== "done" || u.status !== "done" || !u.candidate) {
      return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${paragraphs.length}: the job ended ${job.state}`
        + ` after ${u.attempts || 1} attempt(s) — ${String(lastRefusal(job)).split("\n").join(" ")}` };
    }
    writeJson(join(dir, "answer.json"), u.candidate);
    const file = join(outDir, `${u.candidate.name}.md`);
    // NEVER OVER AN EARLIER FILE: an Extraction the owner has already reviewed carries no
    // status line and nothing here could tell it from a draft.
    if (existsSync(file)) {
      return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${paragraphs.length}: an Extraction named `
        + `${u.candidate.name} already exists at ${file}, and nothing was written over it — the answer is in ${join(dir, "answer.json")}` };
    }
    writeFileSync(file, extractionFileText(u.candidate, input, runRel));
    written.push(file);
    namesTaken.push(u.candidate.name);
    before = carriedState(u.candidate);
  }
  writeJson(join(runDir, "extractions.json"), { leg: legPath, passage: slug, written: written.map((f) => basename(f)) });
  return { written, runDir };
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
  if (args._cmd !== "run" || typeof args.leg !== "string" || typeof args.out !== "string") {
    fail("usage: node src/proof-sheet/extract.mjs run --leg <file of the Leg's paragraphs, blank-line separated> --out <dir> "
      + "[--passage <slug>] [--audience <audiences/<name>.md>]");
  }
  const r = runExtractor(args.leg, { out: args.out, passage: typeof args.passage === "string" ? args.passage : null,
    audience: typeof args.audience === "string" ? args.audience : null });
  for (const f of r.written) console.log(`Extraction written: ${f}`);
  console.log(`run directory: ${r.runDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
