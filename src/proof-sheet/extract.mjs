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
// ONE JOB PER PARAGRAPH, IN ORDER. Paragraph N's names are checked against the names the earlier
// paragraphs took, so N's input exists only once N-1 is written. `run` starts one supervisor per
// paragraph and waits on it before the next; after it passes, a second supervisor judges each
// Segment's `content` clause against its sentence (kogaki#1614), in `content-bound/`, and a third
// judges the record's `takes` and `leaves` against the Segments (kogaki#1698), in `constraints/`.
// The reader table and its state-bound call are retired (kogaki#1699).
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
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { readerPersona, personaPriorKnowledgeLine } from "../compose.mjs";
import { stringifyYaml, parseYaml } from "../yaml.mjs";
import { methodWordRefusal } from "../compose/leg-schema.mjs";
import { MOVE_CONSTRAINT_KINDS, moveConstraintsRefusal } from "../move-validate.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, readReaderPathJob, READER_PATH_JOB_STALL_S,
  jobHeartbeatMs } from "../workflow/detached-job.mjs";

export const EXTRACTION_TABLE = join(REPO, "src", "proof-sheet", "extraction-workflow.json");
export const STATUS_LINE = "status: unreviewed model draft (m2)";
// An Extraction file is its YAML record (kogaki#1413).
export const EXTRACTION_EXT = ".yaml";
const RECORD_KEYS = ["version", "paragraph", "source", "prior_text", "language", "subject_nouns", "answers",
  "what_it_does", "segments", "takes", "leaves", "why_this_order", "presupposes", "breaks", "description", "name", "notes"];
// `description` replaces the retired `technique` (kogaki#1412): one or two sentences for a
// person reading the library, with no machine role, bounded at the ingest's own limit
// (`DESCRIPTION_MAX` in tools/move_ingest.py) so an over-long one is asked again here rather
// than refused after the run.
export const DESCRIPTION_MAX = 200;
// Q4 Footing is retired (kogaki#1414): its one consumer went with kogaki#1280, and FORMAT
// says why. Purpose, Question and Disposition are unchanged.
const ANSWER_KEYS = ["q1", "q2", "q3"];
// `obligation` and `obligation_triggers` are retired from the Extraction (kogaki#1698): `leaves`
// names what a paragraph leaves for later, so an answer carrying either is refused by name.
const OBLIGATION_KEYS = ["obligation", "obligation_triggers"];
// `content_bound` is the content-bound call's verdict per Segment, written by the Harness too
// (kogaki#1614).
const OPTIONAL_RECORD_KEYS = ["content_bound"];
// A verdict's `why` is at most this many words (kogaki#1590).
export const OBLIGATION_WORDS_MAX = 12;
// kogaki#1604: the match is the instructing mood, `must` or `should` before the dash.
export const WORDING = /\b(?:must|should)\b[^—]*?\b(?:(?:open|begin|end|close) (?:with|on)|in (?:one|a single) sentence)\b/i;
// A Segment is three prose fields beside its content clause, and `breaks` is a list of prose
// tests (kogaki#1414): no label set is offered to the model or read back from it. `operation`
// was `does` until kogaki#1510; `manner` is empty unless the Segment's technique is one
// `operation` and `relation` together cannot name (kogaki#1510).
const SEGMENT_KEYS = ["content", "operation", "relation", "manner"];
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

// ---------------------------------------------------------------------------
// ONE PARAGRAPH'S INPUT AND PROMPT.

export function extractionUnitInput({ passage, paragraphs, index, namesTaken, persona }) {
  return {
    paragraph_you_must_extract: {
      passage, number: index + 1, of: paragraphs.length, text: paragraphs[index], sentences: sentencesOf(paragraphs[index]),
    },
    earlier_paragraphs: paragraphs.slice(0, index),
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
    segments: p.sentences.map((_, i) => ({ content: "<one clause, about this paragraph's own content>",
      operation: "<the step's operation in one clause, subject-free, never its effect on the reader>",
      relation: i === 0 ? "" : "<in prose, how it relates to the Segment before it>",
      manner: "" })),
    takes: [{ kind: "<one of the kinds, or leave the list empty>", what: "<what Segment 1 takes up, one subject-free line>" }],
    leaves: [{ kind: "<one of the kinds, or leave the list empty>", what: "<what is left for later, one subject-free line>",
      segment: "<the number of the Segment that leaves it>" }],
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

// `history` is the content-bound call's refusals of earlier answers (kogaki#1614), as
// `judgeRefusalBlock` takes them; the first ask carries none.
export function extractionUnitPrompt(row, input, history = null) {
  const held = bindFlow(FLOW);
  try { return withExtractionRecordSkeleton(judgePrompt(row, JSON.stringify(input, null, 2), input, history), input); }
  finally { bindFlow(held); }
}

// THE CONTENT-BOUND CALL'S INPUT (kogaki#1614): each Segment's `content` clause beside its
// sentence, and `subject_nouns` as the allowed vocabulary -- nothing of the general fields.
export function contentBoundUnitInput(record, input) {
  const sentences = input.paragraph_you_must_extract.sentences;
  return {
    subject_nouns: record.subject_nouns.map((s) => s.trim()).filter(Boolean),
    segments: record.segments.map((s, i) => ({ sentence: sentences[i], content: s.content.trim() })),
  };
}

export function contentBoundUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); }
  finally { bindFlow(held); }
}

// THE CONSTRAINTS CALL'S INPUT (kogaki#1698): the four kinds with their definitions, the
// Segments' `operation` and `relation`, and the record's `takes` and `leaves` to be judged. Read
// off an admitted Move record (`rejudge --constraints`), the lists are null, to be derived, and
// the record's `obligation` rides beside the Segments.
export function constraintsUnitInput(record) {
  return {
    kinds: { ...MOVE_CONSTRAINT_KINDS },
    segments: record.segments.map((s) => ({ operation: s.operation.trim(), relation: s.relation.trim() })),
    takes: record.takes.map((x) => ({ kind: String(x.kind).trim(), what: x.what.trim() })),
    leaves: record.leaves.map((x) => ({ kind: String(x.kind).trim(), what: x.what.trim(), segment: Number(x.segment) })),
    obligation: null,
  };
}

export function constraintsMoveInput(record) {
  return {
    kinds: { ...MOVE_CONSTRAINT_KINDS },
    segments: record.segments.map((s) => ({ operation: String((s && s.operation) || "").trim(), relation: String((s && s.relation) || "").trim() })),
    takes: null, leaves: null,
    obligation: Array.isArray(record.obligation) ? record.obligation : null,
  };
}

export function constraintsUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); }
  finally { bindFlow(held); }
}

// ---------------------------------------------------------------------------
// THE ANSWER, READ BACK AGAINST FORMAT (the declared validator). Returns `{ error }` — a
// refusal of the attempt, put verbatim into the next — or `{}`.

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
function keysRefusal(obj, keys, at, optional = []) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k) && !optional.includes(k));
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
const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const wordsOf = (s) => new Set(String(s).toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
// A `manner` RESTATES the `operation` when it adds no word of its own: every word of it longer
// than three letters is already in the operation (kogaki#1510). Short words -- "a", "the",
// "its", "one" -- are the clause's grammar and decide nothing.
export function mannerRestatesOperation(manner, operation) {
  const own = [...wordsOf(manner)].filter((w) => w.length > 3);
  const op = wordsOf(operation);
  return !own.length || own.every((w) => op.has(w));
}
function nounIn(nouns, text) {
  const ws = wordsOf(text);
  const lower = String(text).toLowerCase();
  return nouns.find((n) => (/\s/.test(n) ? lower.includes(n) : ws.has(n)));
}
// THE WHOLE MOVE IS GENERAL (kogaki#1519): every prose field of the record -- `operation`,
// `relation`, `manner`, each `breaks` test and each item of `obligation`
// (kogaki#1576) -- names none of `subject_nouns` and no word in the original's language;
// `content` is the one field bound to the source. A word in another script is a run of letters outside the Latin script, or of
// CJK or full-width punctuation, such as 「なぜなら」; dashes and quotes stay common punctuation.
const FOREIGN_RUN = /(?:(?!\p{Script=Latin})\p{L}|[\u3000-\u303F\uFF00-\uFFEF])+/u;
function wordingRefusal(text, at) {
  if (typeof text !== "string") return null;
  const phrase = (text.match(WORDING) || [])[0];
  return phrase ? `${at} carries "${phrase}", a wording instruction — \`breaks\` informs the Composer and shape no sentence (FORMAT "Where each field goes")` : null;
}
function generalRefusal(nouns, text, at) {
  if (typeof text !== "string") return null;
  const noun = nounIn(nouns, text);
  if (noun) return `${at} names "${noun}", one of your subject_nouns — it names no term of the original (FORMAT "The paragraph unit", rule 7)`;
  const run = text.match(FOREIGN_RUN);
  if (run) return `${at} carries "${run[0]}", a word outside the Latin script — it names no word of the original's language (FORMAT "The paragraph unit", rule 7)`;
  return null;
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
  const bad = keysRefusal(r, RECORD_KEYS, `${at}: the record`, OPTIONAL_RECORD_KEYS);
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
    for (const [i, t] of r.breaks.entries()) {
      const e = lineRefusal(t, `${at}: \`breaks\` test ${i + 1}`) || generalRefusal(nouns, t, `${at}: \`breaks\` test ${i + 1}`)
        || wordingRefusal(t, `${at}: \`breaks\` test ${i + 1}`);
      if (e) errors.push(e);
    }
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
      for (const k of ["content", "operation"]) {
        const e2 = lineRefusal(s[k], `${atS}: the \`${k}\` clause`);
        if (e2) errors.push(e2);
      }
      // The clause's opening verb states what it is about (FORMAT "The paragraph unit", rule 7).
      if (typeof s.content === "string") {
        const e2 = methodWordRefusal((s.content.trim().match(/^[A-Za-z]+/) || [""])[0], `${atS}: the \`content\` clause opens on`);
        if (e2) errors.push(e2);
      }
      // Segment 1 carries no `relation` (FORMAT "The paragraph unit", rule 5, kogaki#1510):
      // nothing downstream read the one it carried to the previous paragraph.
      { const e2 = lineRefusal(s.relation, `${atS}: the \`relation\` clause`, { empty: i === 0 }); if (e2) errors.push(e2); }
      if (i === 0 && typeof s.relation === "string" && s.relation.trim()) {
        errors.push(`${atS}: carries a \`relation\` — Segment 1 carries none; leave it empty`);
      }
      { const e2 = lineRefusal(s.manner, `${atS}: the \`manner\` clause`, { empty: true }); if (e2) errors.push(e2); }
      for (const k of SEGMENT_KEYS) {
        if (typeof s[k] === "string" && /—\s*(operation|relation|manner):/.test(s[k])) {
          errors.push(`${atS}: the \`${k}\` clause carries \`— operation:\`, \`— relation:\` or \`— manner:\`; the clauses are separate fields`);
        }
      }
      for (const k of ["operation", "relation", "manner"]) {
        const e2 = generalRefusal(nouns, s[k], `${atS}: the \`${k}\` clause`);
        if (e2) errors.push(e2);
      }
      if (typeof s.manner === "string" && s.manner.trim() && typeof s.operation === "string"
          && mannerRestatesOperation(s.manner, s.operation)) {
        errors.push(`${atS}: the \`manner\` clause restates the \`operation\` — it names a local realisation the operation cannot, or it is empty`);
      }
    }
  }
  if (typeof r.description === "string" && r.description.trim().length > DESCRIPTION_MAX) {
    errors.push(`${at}: \`description\` is ${r.description.trim().length} characters — at most ${DESCRIPTION_MAX}`);
  }

  // The Move's constraints (kogaki#1698): the shape is the Move's own, and every `what` is general.
  { const e = moveConstraintsRefusal(r, n, at); if (e) errors.push(e); }
  for (const field of ["takes", "leaves"]) {
    for (const [i, x] of (Array.isArray(r[field]) ? r[field] : []).entries()) {
      const e = isMap(x) && typeof x.what === "string" ? generalRefusal(nouns, x.what, `${at}: \`${field}\` entry ${i + 1}'s \`what\``) : null;
      if (e) errors.push(e);
    }
  }

  if (r.content_bound !== undefined) {
    errors.push(...verdictsRefusals(r.content_bound, Array.isArray(r.segments) ? r.segments : [], `${at}: \`content_bound\``));
  }

  if (!MOVE_ID.test(r.name)) errors.push(`${at}: \`name\` ${JSON.stringify(r.name)} is not in the library's id form — lower-case letters, digits and underscores`);
  else if (input.names_taken.includes(r.name)) errors.push(`${at}: \`name\` ${JSON.stringify(r.name)} is already taken by an earlier paragraph of this Leg`);

  return errors.length ? { error: errors.join("\n") } : {};
}

// THE EXTRACTION CALL'S ANSWER carries no obligation: it is retired from the Extraction, and
// `leaves` names what the paragraph leaves for later (kogaki#1698).
export function validateExtractionAnswer(record, input) {
  const has = (x) => record && typeof record === "object" && Object.hasOwn(record, x);
  const at = `paragraph ${input.paragraph_you_must_extract.number}`;
  const k = OBLIGATION_KEYS.find(has);
  if (k) return { error: `${at}: the record carries \`${k}\`, which is retired — \`leaves\` names what the paragraph leaves for later (kogaki#1698)` };
  if (has("content_bound")) return { error: `${at}: the record carries \`content_bound\` — the Harness judges each \`content\` clause in a call of its own (kogaki#1614)` };
  return validateExtractionUnit(record, input);
}

// THE CONTENT-BOUND VERDICTS (kogaki#1614): one `{ bound, why }` per Segment, in order, and
// where `bound` is false `why` quotes, in double quotes, a phrase of that Segment's `content`
// clause -- the unresolved reference the refusal names. `at` names the list's place.
function verdictsRefusals(v, segments, at) {
  if (!Array.isArray(v) || v.length !== segments.length) {
    return [`${at} carries ${Array.isArray(v) ? v.length : "no"} verdict(s) for ${segments.length} Segment(s) — one per Segment, in order`];
  }
  const errors = [];
  for (const [i, x] of v.entries()) {
    const atV = `${at}, Segment ${i + 1}`;
    const bad = keysRefusal(x, ["bound", "why"], atV);
    if (bad) { errors.push(bad); continue; }
    if (typeof x.bound !== "boolean") errors.push(`${atV}: \`bound\` is ${JSON.stringify(x.bound)} — it is true or false`);
    const line = lineRefusal(x.why, `${atV}: \`why\``);
    if (line) { errors.push(line); continue; }
    if (wordCount(x.why) > OBLIGATION_WORDS_MAX) errors.push(`${atV}: \`why\` is ${wordCount(x.why)} words — it is one line of at most ${OBLIGATION_WORDS_MAX} words`);
    if (x.bound === false && !unresolvedReference(x.why, segments[i])) {
      errors.push(`${atV}: \`bound\` is false and \`why\` quotes no phrase of the \`content\` clause in double quotes — it names the unresolved reference`);
    }
  }
  return errors;
}

// The phrase a `why` quotes that stands in the Segment's `content` clause, or null.
function unresolvedReference(why, segment) {
  const clause = String((segment && segment.content) || "").toLowerCase();
  return [...String(why).matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1].trim()).find((q) => q && clause.includes(q.toLowerCase())) || null;
}

// THE CONTENT-BOUND CALL'S ANSWER, READ BACK (kogaki#1614): `{ verdicts: [...] }`. Only the
// answer's shape is refused here, spending this call's own attempts; a Segment judged unbound
// is the Extractor's refusal (`contentBoundRefusal`), not this call's.
export function validateContentBoundUnit(answer, { record, input }) {
  const at = `paragraph ${input.paragraph_you_must_extract.number}, the content-bound verdicts`;
  if (!isMap(answer)) return { error: `${at}: the answer is not a map` };
  const extra = Object.keys(answer).find((k) => k !== "verdicts");
  if (extra) return { error: `${at}: the answer carries \`${extra}\`, which it does not declare — it carries \`verdicts\`` };
  const errors = verdictsRefusals(answer.verdicts, record.segments, `${at}: \`verdicts\``);
  return errors.length ? { error: errors.join("\n") } : {};
}

// THE EXTRACTION'S REFUSAL FROM THE VERDICTS (kogaki#1614): one line per Segment judged
// unbound, naming the Segment and the reference, or null where every clause is bound.
export function contentBoundRefusal(verdicts, record, input) {
  const at = `paragraph ${input.paragraph_you_must_extract.number}`;
  const lines = verdicts.map((v, i) => (v.bound ? null
    : `${at}, Segment ${i + 1}: the \`content\` clause leaves "${unresolvedReference(v.why, record.segments[i])}" unresolved — `
      + `${v.why.trim()}; the clause states the sentence's proposition, every definite reference resolving to a subject noun or to words of the sentence (kogaki#1614)`))
    .filter(Boolean);
  return lines.length ? lines.join("\n") : null;
}

export function withContentBound(record, verdicts) {
  return { ...record, content_bound: verdicts.map((v) => ({ bound: v.bound, why: v.why.trim() })) };
}

// THE CONSTRAINTS VERDICTS (kogaki#1698): `{ takes, leaves, unnamed }`. Where the input gives the
// lists, `takes` and `leaves` repeat them entry for entry, each with `{ supported, why }`, and
// `unnamed` lists each question, term, base or principle a Segment leaves that no entry names;
// where the input's lists are null, `takes` and `leaves` are the lists derived, every entry
// supported, and `unnamed` is empty. Only the shape is refused here, spending this call's own
// attempts; an unsupported entry or an unnamed one is the Extractor's refusal (`constraintsRefusal`).
const VERDICT_KEYS = ["supported", "why"];
export function constraintsAnswerRefusal(answer, input) {
  if (!isMap(answer)) return "the answer is not a map";
  const top = keysRefusal(answer, ["takes", "leaves", "unnamed"], "the answer");
  if (top) return top;
  const n = input.segments.length;
  const derive = input.takes === null;
  const errors = [];
  const lists = {};
  for (const field of ["takes", "leaves"]) {
    const v = answer[field];
    if (!Array.isArray(v)) { errors.push(`\`${field}\` is not a list`); continue; }
    const base = field === "leaves" ? ["kind", "what", "segment"] : ["kind", "what"];
    lists[field] = [];
    for (const [i, x] of v.entries()) {
      const atE = `\`${field}\` entry ${i + 1}`;
      const bad = keysRefusal(x, [...base, ...VERDICT_KEYS], atE);
      if (bad) { errors.push(bad); continue; }
      if (typeof x.supported !== "boolean") errors.push(`${atE}.supported is ${JSON.stringify(x.supported)} — it is true or false`);
      const line = lineRefusal(x.why, `${atE}.why`);
      if (line) errors.push(line);
      else if (wordCount(x.why) > OBLIGATION_WORDS_MAX) errors.push(`${atE}.why is ${wordCount(x.why)} words — it is one line of at most ${OBLIGATION_WORDS_MAX} words`);
      if (derive && x.supported === false) errors.push(`${atE} is judged unsupported in a list you derived — derive only entries the Segments support`);
      lists[field].push(Object.fromEntries(base.map((k) => [k, x[k]])));
    }
  }
  if (errors.length) return errors.join("\n");
  const shape = moveConstraintsRefusal(lists, n, "the answer");
  if (shape) return shape;
  if (!derive) {
    for (const field of ["takes", "leaves"]) {
      const given = input[field];
      const got = lists[field];
      const same = got.length === given.length && got.every((x, i) => String(x.kind).trim() === given[i].kind && x.what.trim() === given[i].what
        && (field === "takes" || Number(x.segment) === given[i].segment));
      if (!same) errors.push(`\`${field}\` does not repeat the input's ${given.length} entr(ies) in order — judge each given entry, adding and changing none`);
    }
  }
  if (!Array.isArray(answer.unnamed)) errors.push("`unnamed` is not a list");
  else if (derive && answer.unnamed.length) errors.push("`unnamed` is not empty in a list you derived — name every such thing in `leaves`");
  else {
    for (const [i, x] of answer.unnamed.entries()) {
      const atE = `\`unnamed\` entry ${i + 1}`;
      const bad = keysRefusal(x, ["kind", "what", "segment", "why"], atE);
      if (bad) { errors.push(bad); continue; }
      const e = moveConstraintsRefusal({ takes: [], leaves: [{ kind: x.kind, what: x.what, segment: x.segment }] }, n, atE);
      if (e) errors.push(e);
      const line = lineRefusal(x.why, `${atE}.why`);
      if (line) errors.push(line);
      else if (wordCount(x.why) > OBLIGATION_WORDS_MAX) errors.push(`${atE}.why is ${wordCount(x.why)} words — it is one line of at most ${OBLIGATION_WORDS_MAX} words`);
    }
  }
  return errors.length ? errors.join("\n") : null;
}

export function validateConstraintsUnit(answer, { input, at }) {
  const bad = constraintsAnswerRefusal(answer, input);
  return bad ? { error: `${at}, the constraints: ${bad}` } : {};
}

// An entry judged unsupported, or a thing a Segment leaves that no entry names, refuses the
// Extraction naming the entry or the Segment; the line goes back to the Extractor verbatim.
export function constraintsRefusal(answer, at) {
  const lines = [];
  for (const field of ["takes", "leaves"]) {
    for (const [i, x] of answer[field].entries()) {
      if (x.supported) continue;
      const seg = field === "takes" ? "Segment 1" : `Segment ${x.segment}`;
      lines.push(`${at}: the \`${field}\` entry ${i + 1} (${x.kind}: ${JSON.stringify(x.what.trim())}) is not supported by ${seg} — ${x.why.trim()}`);
    }
  }
  for (const x of answer.unnamed) {
    lines.push(`${at}, Segment ${x.segment}: leaves ${LEFT_THING[String(x.kind).trim()] || "a thing"}`
      + ` no \`leaves\` entry names (${x.kind}: ${JSON.stringify(x.what.trim())}) — ${x.why.trim()}`);
  }
  return lines.length ? lines.join("\n") : null;
}

// What a Segment leaves, by kind, as the refusal names it.
const LEFT_THING = { answer: "a question", explain: "a term", carry: "a base", apply: "a principle" };

// The lists as a record carries them: the verdict keys dropped, each `what` trimmed.
export function constraintLists(answer) {
  return {
    takes: answer.takes.map((x) => ({ kind: String(x.kind).trim(), what: x.what.trim() })),
    leaves: answer.leaves.map((x) => ({ kind: String(x.kind).trim(), what: x.what.trim(), segment: Number(x.segment) })),
  };
}

// ---------------------------------------------------------------------------
// THE FILE IS THE RECORD, AS YAML (kogaki#1413). The Extraction is written as the record
// passages/FORMAT.md "The Extraction" declares -- section 3 a list of Segment maps, section 5 a list of prose tests -- through the Brief's YAML writer,
// and `tools/move_ingest.py passage --from-extraction` reads it through the same module's
// reader, unedited. `extractionMarkdown` renders the record for reading; nothing reads that
// rendering back.

export function extractionRecord(record, input, runRel) {
  const p = input.paragraph_you_must_extract;
  const nouns = record.subject_nouns.map((s) => s.trim()).filter(Boolean);
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
    segments: record.segments.map((s, i) => ({ opening: openingWords(p.sentences[i]), content: s.content.trim(), operation: s.operation.trim(),
      ...(s.relation.trim() ? { relation: s.relation.trim() } : {}), ...(s.manner.trim() ? { manner: s.manner.trim() } : {}) })),
    why_this_order: record.why_this_order.trim(),
    presupposes: record.presupposes.trim(),
    breaks: record.breaks.map((x) => x.trim()),
    ...(record.content_bound ? { content_bound: record.content_bound.map((v) => ({ bound: v.bound, why: v.why.trim() })) } : {}),
    ...constraintLists({ takes: record.takes, leaves: record.leaves }),
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
  // A clause judged unbound carries its verdict's reason (kogaki#1614); a bound one, nothing.
  const unbound = (i) => { const v = (r.content_bound || [])[i]; return v && v.bound === false ? ` — not bound: ${line(v.why)}` : ""; };
  const segs = (r.segments || []).map((s, i) => `${i + 1}. "${line(s.opening)}" — ${line(s.content)}${unbound(i)} — operation: ${line(s.operation)}`
    + (line(s.relation) ? ` — relation: ${line(s.relation)}` : "") + (line(s.manner) ? ` — manner: ${line(s.manner)}` : ""));
  const splits = (r.split_notes || []).flatMap((n) => [`split: ${line(n.note)}`, ...(n.dismissed ? [`dismissed: ${line(n.dismissed)}`] : [])]);
  return [
    ...(r.status ? [`status: ${line(r.status)}`, ""] : []),
    `# Extraction: ${line(r.name)}`, "", ...head, "",
    "## Passage", "", line(r.passage), "",
    "## Answers", "", ...answers,
    "## 1. What the Passage does", "", line(r.what_it_does), "",
    "## 3. The order inside the Passage", "", ...segs, "", line(r.why_this_order), "",
    "## 4. What the Passage presupposes", "", line(r.presupposes), "",
    "## 5. Where it would break", "", ...(r.breaks || []).map((x) => `- ${line(x)}`), "",
    ...(Array.isArray(r.takes) ? [`takes: ${r.takes.map((x) => `${line(x.kind)}: ${line(x.what)}`).join("; ") || "nothing"}`] : []),
    ...(Array.isArray(r.leaves) ? [`leaves: ${r.leaves.map((x) => `${line(x.kind)}: ${line(x.what)} (Segment ${line(x.segment)})`).join("; ") || "nothing"}`, ""] : []),
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

// THE JUDGE AND THE JOB BOUNDS, read once per run from the workflow table (kogaki#1618: the
// Extractor and the library re-judge read the same row, so neither can drift from the other).
function judgeSetup(table) {
  return {
    callLimitS: positiveSetting(table.job, "call_limit_s"),
    unitAttempts: positiveSetting(table.job, "unit_attempts"),
    binary: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || table.judge.command), process.env.PATH),
    model: String(settingValue(table.judge.model)),
    outputFormat: String(table.judge.output_format || "json"),
    stallS: Number(table.job.stall_s) || READER_PATH_JOB_STALL_S,
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
  };
}

// ONE UNIT, ONE JOB: starts the detached supervisor over one unit in `jobDir`, awaits it, writes
// its `attempts.json` beside the job's own files (`label` names the unit for a reader), and
// returns `{ job, u }`, with `failed: true` where the job or the unit did not end `done`.
function runUnit(jobDir, setup, { id, prompt, recordArray, validator, attempts = setup.unitAttempts, label = {} }) {
  startDetachedJobSupervisor(jobDir, {
    units: [{ id, prompt }], command: setup.binary.path, model: setup.model, outputFormat: setup.outputFormat,
    callLimitS: setup.callLimitS, unitAttempts: attempts, stallS: setup.stallS, heartbeatMs: setup.heartbeatMs, recordArray, validator,
  });
  const job = awaitJob(jobDir, setup.heartbeatMs);
  const u = (job.units || [])[0] || {};
  writeJson(join(jobDir, "attempts.json"), { ...label, state: job.state, status: u.status || null,
    attempts: u.attempts || 1, refusals: u.refusals || [], ...(u.timed_out ? { timed_out: u.timed_out } : {}) });
  return job.state !== "done" || u.status !== "done" || !u.candidate ? { job, u, failed: true } : { job, u };
}

// SEVERAL CONSECUTIVE LEGS (kogaki#1532): `legPath` may be a list of Leg files, in order. Every
// paragraph of every Leg is extracted in that order, as one sequence: `p<N>` numbers it across
// the Legs, the names taken carry over a Leg boundary, and each Leg's first
// paragraph reads the previous Leg's last paragraph as its earlier text (FORMAT "The paragraph
// unit", rule 2). Each Leg's paragraphs are numbered within it, under its own file's name as the
// Passage, and `extractions.json` lists the Legs. One file runs exactly as before.
function legsOf(paths, passage) {
  return paths.map((legPath) => {
    let text;
    try { text = readFileSync(legPath, "utf8"); } catch (e) { fail(`the Leg at ${legPath} cannot be read (${e.message})`); }
    const paragraphs = legParagraphs(text);
    if (!paragraphs.length) fail(`the Leg at ${legPath} carries no paragraph — there is nothing to extract`);
    return { legPath, paragraphs, slug: (paths.length === 1 && passage) || basename(legPath, extname(legPath)) };
  });
}

// RUN THE EXTRACTOR over a Leg's paragraphs. Writes one Extraction per paragraph into `out`
// and returns `{ written: [paths], runDir }`, or `{ stopped: line, written, runDir }`.
// `resume`, an earlier `runDir` of this same Extractor, re-enters at the first paragraph that
// carries no `answer.json` and no written Extraction, carrying the names the written
// Extractions took (kogaki#1396) — every earlier paragraph is skipped, not re-asked.
export function runExtractor(legPath, { out, passage = null, audience = null, resume = null } = {}) {
  const legs = legsOf([].concat(legPath), passage);
  const units = legs.flatMap((leg, k) => leg.paragraphs.map((_, i) => ({ leg, k, i })));
  const total = units.length;
  const table = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const row = table.extraction_unit || fail("src/proof-sheet/extraction-workflow.json declares no extraction_unit row. Nothing was started.");
  const boundRow = table.content_bound_unit || fail("src/proof-sheet/extraction-workflow.json declares no content_bound_unit row. Nothing was started.");
  const constraintsRow = table.constraints_unit || fail("src/proof-sheet/extraction-workflow.json declares no constraints_unit row. Nothing was started.");
  const persona = readerPersona(resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" }))));
  if (persona.error) fail(persona.error);
  const setup = judgeSetup(table);
  const { unitAttempts } = setup;
  const outDir = resolve(out);
  const runDir = resume ? resolve(resume) : join(outDir, `extractor-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const runRel = relFromRepo(runDir, outDir);
  const written = [];
  const namesTaken = [];
  let start = 0;
  if (resume) {
    for (let i = 0; i < total; i++) {
      const dir = join(runDir, `p${i + 1}`);
      let answer = null;
      try { answer = JSON.parse(readFileSync(join(dir, "answer.json"), "utf8")); } catch { answer = null; }
      const file = answer ? join(outDir, `${answer.name}${EXTRACTION_EXT}`) : null;
      if (!answer || !file || !existsSync(file)) break;
      written.push(file);
      namesTaken.push(answer.name);
      start = i + 1;
    }
  }
  for (let i = start; i < total; i++) {
    const dir = join(runDir, `p${i + 1}`);
    mkdirSync(dir, { recursive: true });
    const u0 = units[i];
    const input = extractionUnitInput({ passage: u0.leg.slug, paragraphs: u0.leg.paragraphs, index: u0.i, namesTaken: [...namesTaken], persona });
    if (u0.k > 0 && u0.i === 0) input.earlier_paragraphs = [legs[u0.k - 1].paragraphs.at(-1)];
    const prompt = extractionUnitPrompt(row, input);
    writeFileSync(join(dir, "prompt.md"), prompt);
    const unitJob = (jobDir, id, unitPrompt, recordArray, validator, attempts = unitAttempts) =>
      runUnit(jobDir, setup, { id, prompt: unitPrompt, recordArray, validator, attempts, label: { paragraph: i + 1 } });
    // THE CONTENT CLAUSE, JUDGED SOURCE-BOUND (kogaki#1614): after the record passes, a call over
    // each Segment's `content` beside its sentence; a Segment judged unbound refuses the
    // Extraction, and the Extractor is asked again with that refusal, within its own attempt
    // budget. Round 1 runs in the paragraph's directory, a later round in `extract-<k>/`, and
    // each round's verdict call in `content-bound/` (`content-bound-<k>/` from round 2).
    let ex;
    let verdicts;
    let spent = 0;
    let boundAttempts = 0;
    let constraintsAttempts = 0;
    const history = [];
    const refusals = [];
    for (let k = 1; ; k++) {
      const xdir = k === 1 ? dir : join(dir, `extract-${k}`);
      mkdirSync(xdir, { recursive: true });
      const xPrompt = k === 1 ? prompt : extractionUnitPrompt(row, input, history);
      ex = unitJob(xdir, `p${i + 1}`, xPrompt, "segments",
        { module: "src/proof-sheet/extract.mjs", export: "validateExtractionAnswer", inputs: input }, unitAttempts - spent);
      spent += ex.u.attempts || 1;
      refusals.push(...(ex.u.refusals || []));
      if (ex.failed) {
        return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${total}: the job ended ${ex.job.state}`
          + ` after ${spent} attempt(s) — ${String(lastRefusal(ex.job)).split("\n").join(" ")}` };
      }
      const cdir = join(dir, k === 1 ? "content-bound" : `content-bound-${k}`);
      mkdirSync(cdir, { recursive: true });
      const cInput = contentBoundUnitInput(ex.u.candidate, input);
      const cPrompt = contentBoundUnitPrompt(boundRow, cInput);
      writeFileSync(join(cdir, "prompt.md"), cPrompt);
      const cb = unitJob(cdir, `p${i + 1}-content-bound`, cPrompt, "verdicts",
        { module: "src/proof-sheet/extract.mjs", export: "validateContentBoundUnit", inputs: { record: ex.u.candidate, input } });
      boundAttempts += cb.u.attempts || 1;
      if (cb.failed) {
        return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${total}: the content-bound job ended ${cb.job.state}`
          + ` after ${cb.u.attempts || 1} attempt(s) — ${String(lastRefusal(cb.job)).split("\n").join(" ")}` };
      }
      verdicts = cb.u.candidate.verdicts;
      let refusal = contentBoundRefusal(verdicts, ex.u.candidate, input);
      let refusedBy = "content-bound";
      // THE CONSTRAINTS, JUDGED AGAINST THE SEGMENTS (kogaki#1698): over a record whose clauses are
      // bound, a call over its `takes` and `leaves` beside the Segments' `operation` and
      // `relation`; an unsupported entry, or a thing a Segment leaves that no entry names, refuses
      // the Extraction as an unbound clause does, in `constraints/` (`constraints-<k>/` from round 2).
      if (!refusal) {
        const tdir = join(dir, k === 1 ? "constraints" : `constraints-${k}`);
        mkdirSync(tdir, { recursive: true });
        const tInput = constraintsUnitInput(ex.u.candidate);
        const tPrompt = constraintsUnitPrompt(constraintsRow, tInput);
        writeFileSync(join(tdir, "prompt.md"), tPrompt);
        const tb = unitJob(tdir, `p${i + 1}-constraints`, tPrompt, false,
          { module: "src/proof-sheet/extract.mjs", export: "validateConstraintsUnit", inputs: { input: tInput, at: `paragraph ${i + 1}` } });
        constraintsAttempts += tb.u.attempts || 1;
        if (tb.failed) {
          return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${total}: the constraints job ended ${tb.job.state}`
            + ` after ${tb.u.attempts || 1} attempt(s) — ${String(lastRefusal(tb.job)).split("\n").join(" ")}` };
        }
        refusal = constraintsRefusal(tb.u.candidate, `paragraph ${i + 1}`);
        refusedBy = "constraints";
      }
      if (!refusal) break;
      refusals.push(refusal);
      history.push({ answer: ex.u.candidate, refusal });
      if (spent >= unitAttempts) {
        return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${total}: the ${refusedBy} call refused`
          + ` the Extraction after ${spent} attempt(s) — ${refusal.split("\n").join(" ")}` };
      }
    }
    // THE RUN RECORD NAMES EVERY CALL'S ATTEMPTS (kogaki#1614, kogaki#1698): the
    // Extractor's across every round, with every refusal in order, beside the judging calls'.
    writeJson(join(dir, "attempts.json"), { paragraph: i + 1, state: ex.job.state, status: ex.u.status || null,
      attempts: spent, refusals, content_bound_attempts: boundAttempts,
      constraints_attempts: constraintsAttempts });
    ex = { ...ex, u: { ...ex.u, candidate: withContentBound(ex.u.candidate, verdicts) } };
    const u = { candidate: ex.u.candidate };
    writeJson(join(dir, "answer.json"), u.candidate);
    const file = join(outDir, `${u.candidate.name}${EXTRACTION_EXT}`);
    // NEVER OVER AN EARLIER FILE: an Extraction the owner has already reviewed carries no
    // status line and nothing here could tell it from a draft.
    if (existsSync(file)) {
      return { written, runDir, stopped: `the Extractor stopped at paragraph ${i + 1} of ${total}: an Extraction named `
        + `${u.candidate.name} already exists at ${file}, and nothing was written over it — the answer is in ${join(dir, "answer.json")}` };
    }
    writeFileSync(file, extractionFileText(u.candidate, input, runRel));
    written.push(file);
    namesTaken.push(u.candidate.name);
  }
  const names = written.map((f) => basename(f));
  writeJson(join(runDir, "extractions.json"), legs.length === 1
    ? { leg: legs[0].legPath, passage: legs[0].slug, written: names }
    : { legs: legs.map((l) => ({ leg: l.legPath, passage: l.slug, paragraphs: l.paragraphs.length })), written: names });
  return { written, runDir };
}

// DERIVE A LIBRARY'S CONSTRAINTS (kogaki#1698). Every `*.yaml` record in `library` carrying
// `segments` is put through the constraints call over its `segments` and `obligation`, with no
// list given, so the answer is the derived `takes` and `leaves`. With `write`, the two keys'
// top-level blocks are cut from the file's text and the new ones appended, so every other field
// stays byte-identical; with `retireState` too, the retired `before`, `after` and `after_segment`
// blocks are cut as well (kogaki#1699); without `write` no record is changed. The calls are
// recorded in a run directory beside the library, one subdirectory per record, and
// `constraints.json` lists the records. Returns `{ derived, written, skipped, runDir }`, or with `stopped`.
const RECORD_BLOCK = (key) => new RegExp(`^${key}:[^\\n]*\\n(?:(?:[ \\t]+[^\\n]*|)\\n)*`, "m");
export const RETIRED_STATE_KEYS = ["before", "after", "after_segment"];
export function spliceConstraints(text, { takes, leaves }, { retireState = false } = {}) {
  let out = text;
  for (const key of ["takes", "leaves", ...(retireState ? RETIRED_STATE_KEYS : [])]) out = out.replace(RECORD_BLOCK(key), "");
  out = out.replace(/\s*$/, "\n");
  return `${out}${stringifyYaml({ takes, leaves }, { width: 100 }).replace(/\s*$/, "\n")}`;
}

export function runConstraintsRejudge(library, { write = false, retireState = false } = {}) {
  const dir = resolve(library);
  let names;
  try { names = readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort(); } catch (e) { fail(`the library at ${dir} cannot be read (${e.message})`); }
  if (!names.length) fail(`the library at ${dir} carries no .yaml record — there is nothing to re-judge`);
  const table = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const row = table.constraints_unit || fail("src/proof-sheet/extraction-workflow.json declares no constraints_unit row. Nothing was started.");
  const setup = judgeSetup(table);
  const runDir = join(dirname(dir), `rejudge-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });
  const derived = [];
  const written = [];
  const skipped = [];
  const report = (extra = {}) => {
    writeJson(join(runDir, "constraints.json"), { library: dir, write, retire_state: retireState, derived, written, skipped });
    return { derived, written, skipped, runDir, ...extra };
  };
  for (const name of names) {
    const file = join(dir, name);
    const text = readFileSync(file, "utf8");
    let record;
    try { record = parseYaml(text, file); } catch (e) { return report({ stopped: `the re-judge stopped at ${name}: ${e.message}` }); }
    if (!record || !Array.isArray(record.segments) || !record.segments.length) { skipped.push(name); continue; }
    const id = typeof record.id === "string" && record.id ? record.id : basename(name, ".yaml");
    const jobDir = join(runDir, id);
    mkdirSync(jobDir, { recursive: true });
    const input = constraintsMoveInput(record);
    const prompt = constraintsUnitPrompt(row, input);
    writeFileSync(join(jobDir, "prompt.md"), prompt);
    const tb = runUnit(jobDir, setup, { id: `${id}-constraints`, prompt, recordArray: false,
      validator: { module: "src/proof-sheet/extract.mjs", export: "validateConstraintsUnit", inputs: { input, at: `move ${id}` } }, label: { move: id } });
    if (tb.failed) {
      return report({ stopped: `the re-judge stopped at ${name}: the constraints job ended ${tb.job.state} after ${tb.u.attempts || 1} attempt(s) — `
        + `${String(lastRefusal(tb.job)).split("\n").join(" ")}` });
    }
    const lists = constraintLists(tb.u.candidate);
    writeJson(join(jobDir, "answer.json"), lists);
    derived.push(name);
    if (write) { writeFileSync(file, spliceConstraints(text, lists, { retireState })); written.push(name); }
  }
  return report();
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
  if (args._cmd === "rejudge") {
    // `--state` is deleted (kogaki#1699); `--retire-state` rides `--write` alone.
    if (typeof args.library !== "string" || args.constraints !== true || args.state !== undefined
      || (args["retire-state"] === true && args.write !== true)) {
      fail("usage: node src/proof-sheet/extract.mjs rejudge --constraints --library <directory of Move records> [--write [--retire-state]]");
    }
    const retireState = args["retire-state"] === true;
    const r = runConstraintsRejudge(args.library, { write: args.write === true, retireState });
    for (const f of r.written) console.log(`Move rewritten with takes and leaves${retireState ? ", before, after and after_segment removed" : ""}: ${f}`);
    for (const f of r.skipped) console.log(`Move left as it was (no segments): ${f}`);
    console.log(`Moves derived: ${r.derived.length}; ${args.write === true ? `written: ${r.written.length}` : "no record was changed (no --write)"}`);
    console.log(`run directory: ${r.runDir}`);
    if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
    process.exit();
  }
  if (args._cmd !== "run" || !Array.isArray(args.leg) || typeof args.out !== "string" || (args.leg.length > 1 && args.passage !== undefined)) {
    fail("usage: node src/proof-sheet/extract.mjs run --leg <file of the Leg's paragraphs, blank-line separated> [--leg <the next Leg's file> ...] --out <dir> "
      + "[--passage <slug>, with one Leg] [--audience <audiences/<name>.md>] [--resume <earlier Extractor run directory>]");
  }
  const r = runExtractor(args.leg.length === 1 ? args.leg[0] : args.leg, { out: args.out, passage: typeof args.passage === "string" ? args.passage : null,
    audience: typeof args.audience === "string" ? args.audience : null, resume: typeof args.resume === "string" ? args.resume : null });
  for (const f of r.written) console.log(`Extraction written: ${f}`);
  console.log(`run directory: ${r.runDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
