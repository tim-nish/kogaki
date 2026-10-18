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
// writes every field it can count or already knows — `status`, `unit`, `length` and each
// Segment's quoted `opening` words — then writes the file as FORMAT's YAML record
// (kogaki#1413). The ingest reads that record through the same YAML module, which is why a
// record the validator passes is a file the ingest takes without edits.
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
import { stringifyYaml } from "../yaml.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, readReaderPathJob, READER_PATH_JOB_STALL_S,
  jobHeartbeatMs } from "../workflow/detached-job.mjs";

export const EXTRACTION_TABLE = join(REPO, "src", "proof-sheet", "extraction-workflow.json");
export const DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];
export const STATUS_LINE = "status: unreviewed model draft (m2)";
// An Extraction file is its YAML record (kogaki#1413).
export const EXTRACTION_EXT = ".yaml";
const RECORD_KEYS = ["version", "paragraph", "source", "prior_text", "language", "subject_nouns", "answers",
  "what_it_does", "reader", "segments", "why_this_order", "presupposes", "breaks", "description", "name", "notes"];
// `description` replaces the retired `technique` (kogaki#1412): one or two sentences for a
// person reading the library, with no machine role, bounded at the ingest's own limit
// (`DESCRIPTION_MAX` in tools/move_ingest.py) so an over-long one is asked again here rather
// than refused after the run.
export const DESCRIPTION_MAX = 200;
// Q4 Footing is retired (kogaki#1414): its one consumer went with kogaki#1280, and FORMAT
// says why. Purpose, Question and Disposition are unchanged.
const ANSWER_KEYS = ["q1", "q2", "q3"];
const ROW_KEYS = ["dimension", "before", "after", "segment"];
// A Segment is two prose fields beside its content clause, and `breaks` is a list of prose
// tests (kogaki#1414): no label set is offered to the model or read back from it.
const SEGMENT_KEYS = ["content", "does", "relation"];
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

// THE RECORD'S SHAPE, SHOWN AS JSON (kogaki#1395): the paragraph number already filled as a
// number, `answers` holding exactly `q1` to `q3`, and every other value a placeholder naming
// what belongs there -- the two type slips a live run met (a string paragraph number, a
// top-level key nested inside `answers`) are constrained at generation this way rather than
// only caught by the validator after the fact.
function extractionRecordSkeleton(input) {
  const p = input.paragraph_you_must_extract;
  return {
    version: "1", paragraph: p.number, source: "<one line>", prior_text: "<one line>", language: "<one line>",
    subject_nouns: ["<a noun, or omit for none>"],
    answers: { q1: "<one sentence>", q2: "<one sentence>", q3: "<one sentence>" },
    what_it_does: "<one sentence>",
    reader: DIMENSIONS.map((dimension) => ({ dimension, before: "<the carried state, or your own for the first paragraph>",
      after: "unchanged | <the new state>", segment: "<Segment number(s), or empty where after is unchanged>" })),
    segments: p.sentences.map((_, i) => ({ content: "<one clause, about this paragraph's own content>",
      does: "<the step's operation in one clause, subject-free, never its effect on the reader>",
      relation: i === 0
        ? (input.earlier_paragraphs.length ? "<in prose, how it takes up the previous paragraph's last point>" : "")
        : "<in prose, how it relates to the Segment before it>" })),
    why_this_order: "<one sentence>", presupposes: "<two or three lines, as one string>",
    breaks: ["<one change a careful writer might make — what the reader loses>", "<another, naming a different change>"],
    description: `<one or two sentences, at most ${DESCRIPTION_MAX} characters>`, name: "<snake_case_verb_phrase>", notes: "",
  };
}

// SPLICED RIGHT AFTER THE RECORD-SHAPE PARAGRAPH `judgePrompt` already renders (its
// `REQUIRED RECORD SHAPE:` line) -- the skeleton follows what it describes, never stands
// apart from it.
function withExtractionRecordSkeleton(prompt, input) {
  const marker = "\nREQUIRED RECORD SHAPE:";
  const at = prompt.indexOf(marker);
  const lineEnd = at < 0 ? -1 : prompt.indexOf("\n", at + 1);
  const skeleton = ["", "THE RECORD'S SHAPE AS JSON, with this paragraph's number filled as a number and `answers`",
    "holding exactly q1 to q3 -- every other value is a placeholder naming what belongs there:",
    JSON.stringify(extractionRecordSkeleton(input), null, 2)].join("\n");
  if (lineEnd < 0) return `${prompt}\n${skeleton}`;
  return `${prompt.slice(0, lineEnd)}\n${skeleton}${prompt.slice(lineEnd)}`;
}

export function extractionUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return withExtractionRecordSkeleton(judgePrompt(row, JSON.stringify(input, null, 2), input, null), input); }
  finally { bindFlow(held); }
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

// EVERY FAILING FIELD, NOT ONLY THE FIRST (kogaki#1395). A record read back against FORMAT
// used to return on its first bad field, so an answer with two slips reported one and spent
// its attempt on a refusal naming only one of them. `errors` collects one line per field, in
// (approximately) the record shape's own order, and each later check guards on the shape it
// reads so one bad field never throws reading another. Only the record's own top-level key
// set returns at once -- a record missing or inventing a top-level key is a different class
// of refusal than a field within an otherwise-complete record.
export function validateExtractionUnit(record, input) {
  const p = input.paragraph_you_must_extract;
  const at = `paragraph ${p.number}`;
  const r = record || {};
  const bad = keysRefusal(r, RECORD_KEYS, `${at}: the record`);
  if (bad) return { error: bad };
  const errors = [];
  if (String(r.version) !== "1") errors.push(`${at}: the record's version is ${JSON.stringify(r.version)}, not "1"`);
  if (r.paragraph !== p.number) errors.push(`${at}: the record names paragraph ${JSON.stringify(r.paragraph)}, not ${p.number}`);
  for (const k of ["source", "prior_text", "language", "what_it_does", "why_this_order", "presupposes", "description", "name"]) {
    const e = lineRefusal(r[k], `${at}: \`${k}\``);
    if (e) errors.push(e);
  }
  { const e = lineRefusal(r.notes, `${at}: \`notes\``, { empty: true }); if (e) errors.push(e); }
  if (typeof r.notes === "string" && /(^|\s)split:/.test(r.notes)) {
    errors.push(`${at}: \`notes\` carries a \`split:\` line — the paragraph's boundary is the source's own, and the ingest refuses an undismissed split note`);
  }
  if (!Array.isArray(r.subject_nouns) || r.subject_nouns.some((n) => lineRefusal(n, "noun") || n.includes(","))) {
    errors.push(`${at}: \`subject_nouns\` is not an array of one-line strings without commas`);
  }
  const nouns = Array.isArray(r.subject_nouns)
    ? r.subject_nouns.filter((s) => typeof s === "string").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

  const answersBad = keysRefusal(r.answers, ANSWER_KEYS, `${at}: \`answers\``);
  if (answersBad) errors.push(answersBad);
  else for (const k of ANSWER_KEYS) { const e = lineRefusal(r.answers[k], `${at}: answer ${k.toUpperCase()}`); if (e) errors.push(e); }

  if (!Array.isArray(r.breaks) || !r.breaks.length) {
    errors.push(`${at}: \`breaks\` is not a list of prose tests — one or more one-line strings, each a change and what the reader loses`);
  } else {
    for (const [i, t] of r.breaks.entries()) { const e = lineRefusal(t, `${at}: \`breaks\` test ${i + 1}`); if (e) errors.push(e); }
  }

  // Section 3: one Segment per sentence, both clauses on every one.
  const n = p.sentences.length;
  const segmentsOk = Array.isArray(r.segments) && r.segments.length === n;
  if (!segmentsOk) {
    errors.push(`${at}: \`segments\` carries ${Array.isArray(r.segments) ? r.segments.length : "no"} entr(ies) for the paragraph's ${n} sentence(s) — one Segment per sentence, in order`);
  }
  if (Array.isArray(r.segments)) {
    for (const [i, s] of r.segments.entries()) {
      const atS = `${at}, Segment ${i + 1}`;
      const e = keysRefusal(s, SEGMENT_KEYS, atS);
      if (e) { errors.push(e); continue; }
      for (const k of ["content", "does"]) {
        const e2 = lineRefusal(s[k], `${atS}: the \`${k}\` clause`);
        if (e2) errors.push(e2);
      }
      const firstWithNothingBefore = i === 0 && !input.earlier_paragraphs.length;
      { const e2 = lineRefusal(s.relation, `${atS}: the \`relation\` clause`, { empty: firstWithNothingBefore }); if (e2) errors.push(e2); }
      if (firstWithNothingBefore && typeof s.relation === "string" && s.relation.trim()) {
        errors.push(`${atS}: carries a \`relation\`, and nothing comes before this paragraph — leave it empty`);
      }
      for (const k of SEGMENT_KEYS) {
        if (typeof s[k] === "string" && /—\s*(does|relation):/.test(s[k])) {
          errors.push(`${atS}: the \`${k}\` clause carries \`— does:\` or \`— relation:\`; the clauses are separate fields`);
        }
      }
      if (typeof s.does === "string") {
        const noun = nounIn(nouns, s.does);
        if (noun) errors.push(`${atS}: the \`does\` clause names "${noun}", one of your subject_nouns — it names no term of the original`);
      }
    }
  }
  if (typeof r.description === "string" && r.description.trim().length > DESCRIPTION_MAX) {
    errors.push(`${at}: \`description\` is ${r.description.trim().length} characters — at most ${DESCRIPTION_MAX}`);
  }

  // Section 2: the five dimensions, the carried before column, a Segment for every change.
  const readerOk = Array.isArray(r.reader) && r.reader.length === DIMENSIONS.length;
  if (!readerOk) {
    errors.push(`${at}: \`reader\` carries ${Array.isArray(r.reader) ? r.reader.length : "no"} row(s) — five, one per dimension, in the order ${DIMENSIONS.join(", ")}`);
  }
  let changed = 0;
  if (Array.isArray(r.reader)) {
    for (const [i, row] of r.reader.entries()) {
      const atR = `${at}, section 2 row ${i + 1}`;
      const e = keysRefusal(row, ROW_KEYS, atR);
      if (e) { errors.push(e); continue; }
      if (i >= DIMENSIONS.length) continue;
      if (row.dimension !== DIMENSIONS[i]) { errors.push(`${atR}: names ${JSON.stringify(row.dimension)}, not ${DIMENSIONS[i]} — the rows run ${DIMENSIONS.join(", ")}`); continue; }
      const atD = `${at}, the \`${row.dimension}\` row`;
      let rowOk = true;
      for (const k of ["before", "after"]) { const e2 = lineRefusal(row[k], `${atD}'s \`${k}\``); if (e2) { errors.push(e2); rowOk = false; } }
      { const e2 = lineRefusal(row.segment, `${atD}'s \`segment\``, { empty: true }); if (e2) { errors.push(e2); rowOk = false; } }
      if (!rowOk) continue;
      const want = input.reader_state_before && input.reader_state_before[row.dimension];
      if (typeof want === "string" && row.before.trim() !== want.trim()) {
        errors.push(`${atD}'s \`before\` is ${JSON.stringify(row.before)}, and the previous paragraph left it ${JSON.stringify(want)} — the before column is carried, not drafted (FORMAT "The paragraph unit", rule 3)`);
      }
      if (isUnchanged(row.after)) continue;
      changed += 1;
      const nums = row.segment.split(",").map((x) => x.trim()).filter(Boolean);
      if (!nums.length) { errors.push(`${atD} records a change naming no Segment`); continue; }
      const off = nums.find((x) => !/^\d+$/.test(x) || Number(x) < 1 || Number(x) > n);
      if (off !== undefined) errors.push(`${atD} names Segment ${JSON.stringify(off)}, and the paragraph has Segments 1 to ${n}`);
    }
  }
  if (readerOk && !changed) errors.push(`${at}: section 2 records no changed row — the ingest reads \`before\` and \`after\` from the changed rows, so at least one moves`);

  if (!MOVE_ID.test(r.name)) errors.push(`${at}: \`name\` ${JSON.stringify(r.name)} is not in the library's id form — lower-case letters, digits and underscores`);
  else if (input.names_taken.includes(r.name)) errors.push(`${at}: \`name\` ${JSON.stringify(r.name)} is already taken by an earlier paragraph of this Leg`);

  return errors.length ? { error: errors.join("\n") } : {};
}

// ---------------------------------------------------------------------------
// THE FILE IS THE RECORD, AS YAML (kogaki#1413). The Extraction is written as the record
// passages/FORMAT.md "The Extraction" declares -- section 2 a map of dimension rows, section 3
// a list of Segment maps, section 5 a list of prose tests -- through the Brief's YAML writer,
// and `tools/move_ingest.py passage --from-extraction` reads it through the same module's
// reader, unedited. `extractionMarkdown` renders the record for reading; nothing reads that
// rendering back.

export function extractionRecord(record, input, runRel) {
  const p = input.paragraph_you_must_extract;
  const nouns = record.subject_nouns.map((s) => s.trim()).filter(Boolean);
  const reader = {};
  for (const row of record.reader) {
    const unchanged = isUnchanged(row.after);
    reader[row.dimension] = { before: row.before.trim(), after: unchanged ? "unchanged" : row.after.trim(),
      segment: unchanged ? "" : row.segment.trim() };
  }
  return {
    status: `${STATUS_LINE.slice("status: ".length)} — written by the Extractor run ${runRel}`,
    name: record.name,
    source: record.source.trim(),
    subject_nouns: nouns,
    prior_text: record.prior_text.trim(),
    length: `${p.sentences.length} sentence${p.sentences.length === 1 ? "" : "s"}, 1 paragraph`,
    language: record.language.trim(),
    unit: `paragraph ${p.number} of ${p.of} in ${p.passage}`,
    passage: p.text,
    answers: Object.fromEntries(ANSWER_KEYS.map((k) => [k, { answer: `model — ${record.answers[k].trim()}` }])),
    what_it_does: record.what_it_does.trim(),
    reader,
    dimensions_changed: record.reader.filter((row) => !isUnchanged(row.after)).length,
    segments: record.segments.map((s, i) => ({ opening: openingWords(p.sentences[i]), content: s.content.trim(), does: s.does.trim(),
      ...(s.relation.trim() ? { relation: s.relation.trim() } : {}) })),
    why_this_order: record.why_this_order.trim(),
    presupposes: record.presupposes.trim(),
    breaks: record.breaks.map((x) => x.trim()),
    description: record.description.trim(),
    notes: record.notes.trim(),
  };
}

export function extractionFileText(record, input, runRel) {
  return stringifyYaml(extractionRecord(record, input, runRel), { width: 100, header: `Extraction: ${record.name}` });
}

// THE RECORD RENDERED FOR READING, in the order FORMAT's sections run. Every value comes off
// the record; a field the record does not carry renders nothing.
const ANSWER_TITLES = { q1: "Q1 Purpose", q2: "Q2 Question", q3: "Q3 Disposition" };
export function extractionMarkdown(rec) {
  const r = rec || {};
  const line = (v) => String(v ?? "").trim();
  const cell = (v) => line(v).replace(/\|/g, "\\|");
  const head = ["source", "subject_nouns", "prior_text", "length", "language", "unit", "contains"]
    .filter((k) => r[k] !== undefined && r[k] !== null && !(Array.isArray(r[k]) && !r[k].length))
    .map((k) => `${k.replace(/_/g, " ")}: ${Array.isArray(r[k]) ? r[k].join(", ") : line(r[k])}`);
  const answers = Object.entries(r.answers || {}).flatMap(([k, a]) => [ANSWER_TITLES[k] || k,
    ...((a && a.candidates) || []).map((c, i) => `  ${i + 1}. ${line(c)}`), `  answer: ${line(a && a.answer)}`, ""]);
  const rows = Object.entries(r.reader || {}).map(([d, row]) => `| ${d} | ${cell(row.before)} | ${cell(row.after)} | ${cell(row.segment)} |`);
  const segs = (r.segments || []).map((s, i) => `${i + 1}. "${line(s.opening)}" — ${line(s.content)} — does: ${line(s.does)}`
    + (line(s.relation) ? ` — relation: ${line(s.relation)}` : ""));
  const splits = (r.split_notes || []).flatMap((n) => [`split: ${line(n.note)}`, ...(n.dismissed ? [`dismissed: ${line(n.dismissed)}`] : [])]);
  return [
    ...(r.status ? [`status: ${line(r.status)}`, ""] : []),
    `# Extraction: ${line(r.name)}`, "", ...head, "",
    "## Passage", "", line(r.passage), "",
    "## Answers", "", ...answers,
    "## 1. What the Passage does", "", line(r.what_it_does), "",
    "## 2. Reader before and after", "", "| dimension | before | after | Segment |", "|---|---|---|---|", ...rows, "",
    `dimensions changed: ${line(r.dimensions_changed)}`, "",
    "## 3. The order inside the Passage", "", ...segs, "", line(r.why_this_order), "",
    "## 4. What the Passage presupposes", "", line(r.presupposes), "",
    "## 5. Where it would break", "", ...(r.breaks || []).map((x) => `- ${line(x)}`), "",
    "## 6. Description", "", line(r.description), "",
    "## 7. Candidate name", "", line(r.name), "",
    "## 8. Notes", "", line(r.notes) || "nothing", ...splits, "",
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
// `resume`, an earlier `runDir` of this same Extractor, re-enters at the first paragraph that
// carries no `answer.json` and no written Extraction, carrying the reader state the last
// written Extraction left (kogaki#1396) — every earlier paragraph is skipped, not re-asked.
export function runExtractor(legPath, { out, passage = null, audience = null, resume = null } = {}) {
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
  const heartbeatMs = jobHeartbeatMs(table.job.heartbeat_ms);
  const outDir = resolve(out);
  const runDir = resume ? resolve(resume) : join(outDir, `extractor-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const runRel = relFromRepo(runDir, outDir);
  const written = [];
  let before = null;
  const namesTaken = [];
  let start = 0;
  if (resume) {
    for (let i = 0; i < paragraphs.length; i++) {
      const dir = join(runDir, `p${i + 1}`);
      let answer = null;
      try { answer = JSON.parse(readFileSync(join(dir, "answer.json"), "utf8")); } catch { answer = null; }
      const file = answer ? join(outDir, `${answer.name}${EXTRACTION_EXT}`) : null;
      if (!answer || !file || !existsSync(file)) break;
      written.push(file);
      namesTaken.push(answer.name);
      before = carriedState(answer);
      start = i + 1;
    }
  }
  for (let i = start; i < paragraphs.length; i++) {
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
    const file = join(outDir, `${u.candidate.name}${EXTRACTION_EXT}`);
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
      + "[--passage <slug>] [--audience <audiences/<name>.md>] [--resume <earlier Extractor run directory>]");
  }
  const r = runExtractor(args.leg, { out: args.out, passage: typeof args.passage === "string" ? args.passage : null,
    audience: typeof args.audience === "string" ? args.audience : null, resume: typeof args.resume === "string" ? args.resume : null });
  for (const f of r.written) console.log(`Extraction written: ${f}`);
  console.log(`run directory: ${r.runDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
