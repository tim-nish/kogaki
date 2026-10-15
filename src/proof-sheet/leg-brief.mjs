#!/usr/bin/env node
// The Leg Brief composer — a Brief of ONE original Leg, composed by two fixed rows copied
// from the production composer (kogaki#1385, owner decision 2026-10-15).
//
// WHAT IT IS. The Proof Sheet runs the production `/paragraph-plan` and `/draft` over an
// original Leg, and both read a Brief. The production composer (`/brief`) composes from
// served Strand addresses, and an original Leg's prose and its Extractions are nowhere on
// the served surface, so the owner drew the boundary at one Leg as the input unit and put
// the production composer outside it. This module composes that Brief: the
// `leg_reader_start_unit` and `leg_path_unit` rows of `src/proof-sheet/extraction-workflow.json`,
// each rendered through the shared `judgePrompt` renderer and run on the shared Detached Job
// supervisor (src/workflow/detached-job.mjs) with the Brief's bounds. It changes no
// production executable.
//
// THE ROWS ARE DERIVED, NOT AUTHORED. Each row names the production row it copies
// (`copy_of`) and the only differences from it (`substitutions`); `derivedRow` applies them
// to the production text at every run. A fix to the production row therefore reaches the
// Proof Sheet, and a production edit that moves a substituted span refuses naming the row,
// the substitution and its text, so the difference from production is always the declared
// list and never a silent drift. `diff` prints that list.
//
// THE VALIDATORS ARE PRODUCTION'S, IMPORTED: `readerStateShapeRefusal` (the `differentiation`
// state's Reader start shape check) for the Reader start, and `validateLegs` — which runs
// `waypointsRefusal` over the Leg Waypoints — for the Leg. Two of `validateLegs`' whole-path
// rules say where a Leg sits among others: Section grouping rule 3 (the first Leg opens a
// Section) and the Reader target Leg (exactly one Leg marked, never the first). A one-Leg
// Brief can satisfy neither, by the boundary the owner drew, so `validateLegPathUnit`
// admits exactly the Section-rule-3 refusal over a Leg carrying no `opens_section`, and then
// runs by hand the one whole-path rule that refusal skips and that can bind one Leg
// (`introducesNearestRefusal`); the rest it skips are about `opens_section`, defined terms,
// Closure rows and the target mark, none of which this Brief carries.
//
// THE RECORD. Written by the production `briefRecordText` writer: the composed fields and,
// for every field the parser requires that this composition does not compose, a fixed
// constant marked as such in a comment. `/paragraph-plan` and `/draft` read it unchanged.
//
// THE RUN DIRECTORY. `<out>/leg-brief-run-<instant>/`, one subdirectory per row
// (`reader-start/`, `leg-path/`): the supervisor's own files, plus `prompt.md` (the prompt
// as rendered), `answer.json` (the record that passed) and `attempts.json` (the attempt
// count and every refusal).
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
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { readerPersona, personaPriorKnowledgeLine, readerStateShapeRefusal, validateLegs, pathRule,
  introducesNearestRefusal, deriveReaderStatesBefore, legRecord, readerStateMap, briefRecordText } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, READER_PATH_JOB_STALL_S, READER_PATH_JOB_HEARTBEAT_MS } from "../workflow/detached-job.mjs";
import { EXTRACTION_TABLE, legParagraphs, awaitJob, lastRefusal, writeJson } from "./extract.mjs";

const FLOW = { lane: "brief", label: "Leg Brief composer" };
const ROWS = ["leg_reader_start_unit", "leg_path_unit"];
const LEG_KEYS = ["leg_id", "purpose", "rationale", "reader_state_after", "claims", "waypoints", "introduces"];
const LEG_REQUIRED = LEG_KEYS.filter((k) => k !== "introduces");
// What the Harness writes onto the composed Leg before the production validator reads it.
// `no_move_fits` exists only for that read — `validateLegs` takes exactly one of `move` and
// `no_move_fits` — and `legRecord` does not write it into the Brief.
export const NO_MOVE_AT_THE_LEG = "The Proof Sheet binds no Move at the Leg level: /paragraph-plan binds a paragraph "
  + "Move per Leg Waypoint, after the Brief (kogaki#1385).";

function fail(msg) {
  process.stderr.write(`leg-brief: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// THE ROWS, DERIVED FROM THE PRODUCTION ROWS THEY COPY.

function sourceRow(copyOf, at) {
  const file = resolve(REPO, String(copyOf.file));
  let table;
  try { table = JSON.parse(readFileSync(file, "utf8")); }
  catch (e) { return { error: `${at}: the production table ${copyOf.file} cannot be read (${e.message})` }; }
  const row = copyOf.state
    ? (Array.isArray(table.states) ? table.states : []).find((s) => s && s.id === copyOf.state)
    : table[copyOf.row];
  if (!row) return { error: `${at}: ${copyOf.file} declares no ${copyOf.state ? `state \`${copyOf.state}\`` : `row \`${copyOf.row}\``}` };
  if (typeof row[copyOf.field] !== "string") return { error: `${at}: ${copyOf.file}'s row carries no \`${copyOf.field}\` text` };
  return { text: row[copyOf.field] };
}

// Apply a row's substitutions to the production text. Every `from` must occur exactly once,
// and a `cut_from` exactly once; anything else refuses naming the substitution, because a
// span the production row no longer carries is a difference nobody has declared.
export function applySubstitutions(text, substitutions, at) {
  let out = text;
  for (const [i, s] of (substitutions || []).entries()) {
    const nth = `${at}, substitution ${i + 1}`;
    const span = typeof s.cut_from === "string" ? s.cut_from : s.from;
    if (typeof span !== "string" || span === "") return { error: `${nth} names no \`from\` or \`cut_from\` text` };
    const first = out.indexOf(span);
    if (first < 0) return { error: `${nth}: the production text no longer carries ${JSON.stringify(span)} — the row it copies has moved; restate the substitution against it` };
    if (out.indexOf(span, first + 1) >= 0) return { error: `${nth}: the production text carries ${JSON.stringify(span)} more than once — a substitution names one span` };
    out = typeof s.cut_from === "string"
      ? out.slice(0, first)
      : out.slice(0, first) + String(s.to ?? "") + out.slice(first + span.length);
  }
  return { text: out };
}

// The row as `judgePrompt` renders it: the table's own entry, its `judgment_point` derived.
export function derivedRow(table, key) {
  const row = table[key];
  const at = `src/proof-sheet/extraction-workflow.json's \`${key}\``;
  if (!row || !row.copy_of) return { error: `${at} is not declared, or names no production row it copies` };
  const src = sourceRow(row.copy_of, at);
  if (src.error) return src;
  const r = applySubstitutions(src.text, row.substitutions, at);
  if (r.error) return r;
  return { row: { ...row, [row.copy_of.field]: r.text }, production: src.text };
}

// ---------------------------------------------------------------------------
// THE INPUTS.

export function readerStartUnitInput({ paragraphs, extractions, persona }) {
  return {
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    paragraph_1: paragraphs[0],
    extraction_1: extractions[0],
  };
}

export function legPathUnitInput({ paragraphs, extractions, readerStart }) {
  return {
    reader_start: readerStart,
    paragraphs: paragraphs.map((text, i) => ({ paragraph: i + 1, claim_strand: `L${i + 1}`, text, extraction: extractions[i] })),
  };
}

function unitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
}

// ---------------------------------------------------------------------------
// THE ANSWERS, READ BACK (the declared validators). Each returns `{ error }` — a refusal of
// the attempt, put verbatim into the next — or `{}`.

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
function keysRefusal(obj, keys, at, required = keys) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = required.find((k) => !(k in obj));
  if (missing) return `${at} carries no \`${missing}\``;
  return null;
}

export function readerStartText(record) {
  return record.reader_start.map((l) => l.trim()).join("\n");
}

export function validateLegReaderStartUnit(record) {
  const at = "the Reader start record";
  const bad = keysRefusal(record, ["version", "reader_start"], at);
  if (bad) return { error: bad };
  if (String(record.version) !== "1") return { error: `${at}'s version is ${JSON.stringify(record.version)}, not "1"` };
  const lines = record.reader_start;
  if (!Array.isArray(lines) || !lines.length || lines.some((l) => typeof l !== "string" || l.trim() === "" || /[\r\n]/.test(l))) {
    return { error: `${at}: \`reader_start\` is not a non-empty array of one-line strings, one \`dimension: value\` line each` };
  }
  const shape = readerStateShapeRefusal(readerStartText(record), "reader_start", "reader_start");
  if (shape) return { error: shape };
  return {};
}

// The composed Leg with what the Harness writes: every paragraph's Strand id as its
// material, no dependency, and the no-Move sentence the production validator reads.
export function completedLeg(leg, n) {
  return { ...leg, materials: Array.from({ length: n }, (_, i) => `L${i + 1}`), depends_on: [], no_move_fits: NO_MOVE_AT_THE_LEG };
}

export function validateLegPathUnit(record, inputs) {
  const n = inputs.paragraph_count;
  const bad = keysRefusal(record, ["legs"], "the record");
  if (bad) return { error: bad };
  if (!Array.isArray(record.legs) || record.legs.length !== 1) {
    return { error: `the record carries ${Array.isArray(record.legs) ? record.legs.length : "no"} Leg(s) — the Proof Sheet's Brief is ONE Leg (kogaki#1385)` };
  }
  const leg = record.legs[0];
  const at = `leg 1${isMap(leg) && leg.leg_id ? ` (${leg.leg_id})` : ""}`;
  const badLeg = keysRefusal(leg, LEG_KEYS, at, LEG_REQUIRED);
  if (badLeg) {
    return { error: `${badLeg}. The Harness writes \`materials\` and \`depends_on\`, and no \`move\`, \`no_move_fits\`, `
      + "`opens_section`, `reaches_target`, `journeys` or `reader_state_before` is composed (kogaki#1385)" };
  }
  if (!Array.isArray(leg.claims) || leg.claims.length !== n) {
    return { error: `${at}: carries ${Array.isArray(leg.claims) ? leg.claims.length : "no"} Claim(s) for the original Leg's ${n} paragraph(s) — one Claim per paragraph, in order` };
  }
  for (const [i, g] of leg.claims.entries()) {
    if (!isMap(g) || g.strand !== `L${i + 1}`) {
      return { error: `${at}: Claim ${i + 1} names ${JSON.stringify(isMap(g) ? g.strand : g)}, not L${i + 1} — Claim N is paragraph N's, addressed by its \`claim_strand\`` };
    }
  }
  if (!Array.isArray(leg.waypoints) || leg.waypoints.length !== n) {
    return { error: `${at}: carries ${Array.isArray(leg.waypoints) ? leg.waypoints.length : "no"} Leg Waypoint(s) for the original Leg's ${n} paragraph(s) — one Leg Waypoint per paragraph, in order` };
  }
  for (const [i, w] of leg.waypoints.entries()) {
    if (isMap(w) && Array.isArray(w.serves) && !w.serves.includes(`L${i + 1}`)) {
      return { error: `${at}: waypoint ${i + 1} serves ${JSON.stringify(w.serves)} and not L${i + 1} — Leg Waypoint N serves the Claim of paragraph N` };
    }
  }
  const full = completedLeg(leg, n);
  const r = validateLegs([full], inputs.reader_start, [], []);
  // THE ONE ADMITTED REFUSAL (see the header): Section grouping rule 3 over a Leg that opens
  // no Section. `validateLegs` stops there, so the whole-path rule after it that binds one
  // Leg — at most one `nearest` — runs here.
  if (r.error) {
    const rule3 = `leg 1 (${full.leg_id}): ${pathRule("section_rule_3").name} — `;
    if (full.opens_section !== undefined || !r.error.startsWith(rule3)) return { error: r.error };
    const nearest = introducesNearestRefusal([full]);
    if (nearest) return { error: nearest };
  }
  return {};
}

// ---------------------------------------------------------------------------
// THE RECORD.

// Every field the Brief parser requires that this composition does not compose, with the
// fixed value it carries, and why. No downstream stage of the Proof Sheet reads them for
// anything it composes from.
export function constantFields({ slug, paragraphs, legId }) {
  return {
    external_authority: "on",
    strands: paragraphs.map((_, i) => ({ id: `L${i + 1}`, slug: `${slug}-paragraph-${i + 1}`,
      cite: `proof-sheet::paragraph/${slug}-paragraph-${i + 1}` })),
    thesis: `The original Leg ${slug}.`,
    reader_target: legId,
    strand_coverage: [],
    journey_coverage: [],
    closure: [],
    tradeoffs: {},
    bridged: {},
  };
}
export const CONSTANT_COMMENT = "# PROOF SHEET CONSTANT (kogaki#1385): not composed — the parser requires it.";

export function legBriefText({ slug, composePath, paragraphs, readerStart, leg }) {
  const full = deriveReaderStatesBefore([completedLeg(leg, paragraphs.length)], readerStart)[0];
  const constants = constantFields({ slug, paragraphs, legId: full.leg_id });
  const text = briefRecordText({
    slug, compose_path: composePath, ...constants,
    reader_start: readerStateMap(readerStart),
    reader_path: [legRecord(full)],
  });
  // Mark each constant above its key; a comment is never read back.
  const keys = new Set(Object.keys(constants));
  return text.split("\n").flatMap((line) => {
    const m = /^([a-z_]+):/.exec(line);
    return m && keys.has(m[1]) ? [CONSTANT_COMMENT, line] : [line];
  }).join("\n");
}

// ---------------------------------------------------------------------------
// THE RUN.

function positiveSetting(job, key) {
  const n = Number(settingValue(job && job[key]));
  return Number.isInteger(n) && n > 0 ? n
    : fail(`src/proof-sheet/extraction-workflow.json's \`job\` declares no positive \`${key}\` — it names a setting in kogaki.settings.json. Nothing was started.`);
}

// Read the Extractor run: its `extractions.json` names the Leg and the files written, and
// `p<N>/answer.json` holds paragraph N's Extraction record.
export function readExtractorRun(runDir, legOverride = null) {
  const idx = join(runDir, "extractions.json");
  let doc;
  try { doc = JSON.parse(readFileSync(idx, "utf8")); }
  catch (e) { return { error: `the Extractor run at ${runDir} carries no readable extractions.json (${e.message}) — run src/proof-sheet/extract.mjs to completion first` }; }
  const legPath = legOverride || doc.leg;
  let text;
  try { text = readFileSync(legPath, "utf8"); }
  catch (e) { return { error: `the Leg at ${legPath} cannot be read (${e.message}); name it with --leg` }; }
  const paragraphs = legParagraphs(text);
  const written = Array.isArray(doc.written) ? doc.written : [];
  if (written.length !== paragraphs.length) {
    return { error: `the Extractor run at ${runDir} wrote ${written.length} Extraction(s) for the Leg's ${paragraphs.length} paragraph(s)` };
  }
  const extractions = [];
  for (let i = 0; i < paragraphs.length; i++) {
    try { extractions.push(JSON.parse(readFileSync(join(runDir, `p${i + 1}`, "answer.json"), "utf8"))); }
    catch (e) { return { error: `paragraph ${i + 1}'s Extraction cannot be read from ${join(runDir, `p${i + 1}`, "answer.json")} (${e.message})` }; }
  }
  return { paragraphs, extractions, passage: doc.passage || basename(legPath) };
}

// One row as one job: render, run on the supervisor, wait, record the attempts.
function runRow({ dir, unitId, row, input, recordArray, validatorExport, inputs, bounds }) {
  mkdirSync(dir, { recursive: true });
  const prompt = unitPrompt(row, input);
  writeFileSync(join(dir, "prompt.md"), prompt);
  startDetachedJobSupervisor(dir, {
    units: [{ id: unitId, prompt }], ...bounds, recordArray,
    validator: { module: "src/proof-sheet/leg-brief.mjs", export: validatorExport, inputs },
  });
  const job = awaitJob(dir, bounds.heartbeatMs);
  const u = (job.units || [])[0] || {};
  writeJson(join(dir, "attempts.json"), { row: row.id, state: job.state, status: u.status || null,
    attempts: u.attempts || 1, refusals: u.refusals || [], ...(u.timed_out ? { timed_out: u.timed_out } : {}) });
  if (job.state !== "done" || u.status !== "done" || !u.candidate) {
    return { stopped: `the Leg Brief composer stopped at \`${row.id}\`: the job ended ${job.state} after ${u.attempts || 1} attempt(s) — `
      + String(lastRefusal(job)).split("\n").join(" ") };
  }
  writeJson(join(dir, "answer.json"), u.candidate);
  return { record: u.candidate };
}

// COMPOSE the Leg's Brief. Writes `<out>/brief.yaml` and returns `{ brief, runDir }`, or
// `{ stopped, runDir }`.
export function runLegBrief({ extractions: extractorRun, out, leg = null, slug = null, audience = null }) {
  const material = readExtractorRun(resolve(extractorRun), leg);
  if (material.error) fail(material.error);
  const { paragraphs, extractions } = material;
  const name = slug || material.passage;
  const table = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const rows = {};
  for (const key of ROWS) {
    const d = derivedRow(table, key);
    if (d.error) fail(`${d.error}. Nothing was started.`);
    rows[key] = d.row;
  }
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(persona.error);
  const outDir = resolve(out);
  const briefPath = join(outDir, "brief.yaml");
  // NEVER OVER AN EARLIER BRIEF: /paragraph-plan and /draft record its hash, so a Brief
  // replaced under them is a plan made from a different Brief.
  if (existsSync(briefPath)) fail(`a Brief already exists at ${briefPath}, and nothing was written over it. Nothing was started.`);
  const bounds = {
    command: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || table.judge.command), process.env.PATH).path,
    model: String(settingValue(table.judge.model)), outputFormat: String(table.judge.output_format || "json"),
    callLimitS: positiveSetting(table.job, "call_limit_s"), unitAttempts: positiveSetting(table.job, "unit_attempts"),
    stallS: Number(table.job.stall_s) || READER_PATH_JOB_STALL_S, heartbeatMs: Number(table.job.heartbeat_ms) || READER_PATH_JOB_HEARTBEAT_MS,
  };
  const runDir = join(outDir, `leg-brief-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });

  const rs = runRow({ dir: join(runDir, "reader-start"), unitId: "reader-start", row: rows.leg_reader_start_unit,
    input: readerStartUnitInput({ paragraphs, extractions, persona }), recordArray: "reader_start",
    validatorExport: "validateLegReaderStartUnit", inputs: {}, bounds });
  if (rs.stopped) return { stopped: rs.stopped, runDir };
  const readerStart = readerStartText(rs.record);

  const lp = runRow({ dir: join(runDir, "leg-path"), unitId: "leg-path", row: rows.leg_path_unit,
    input: legPathUnitInput({ paragraphs, extractions, readerStart }), recordArray: "legs",
    validatorExport: "validateLegPathUnit", inputs: { paragraph_count: paragraphs.length, reader_start: readerStart }, bounds });
  if (lp.stopped) return { stopped: lp.stopped, runDir };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(briefPath, legBriefText({ slug: name, composePath: relFromRepo(audiencePath), paragraphs, readerStart, leg: lp.record.legs[0] }));
  writeJson(join(runDir, "brief.json"), { extractor_run: resolve(extractorRun), brief: briefPath });
  return { brief: briefPath, runDir };
}

// THE DIFFERENCE FROM PRODUCTION, printed: per row, the production row it copies and each
// substitution as a removed and an added line.
export function rowsDiffText(table) {
  const L = [];
  for (const key of ROWS) {
    const row = table[key] || {};
    const c = row.copy_of || {};
    L.push(`${key} — a copy of ${c.file} ${c.state ? `state ${c.state}` : `row ${c.row}`}, field ${c.field}`);
    for (const [i, s] of (row.substitutions || []).entries()) {
      if (typeof s.cut_from === "string") L.push(`  ${i + 1}. - ${s.cut_from} … (to the end)`);
      else { L.push(`  ${i + 1}. - ${s.from}`); L.push(`     + ${s.to}`); }
    }
    const d = derivedRow(table, key);
    L.push(d.error ? `  REFUSED: ${d.error}` : "  applies cleanly to the production text");
    L.push("");
  }
  return L.join("\n");
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
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  if (args._cmd === "diff") {
    const text = rowsDiffText(JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8")));
    process.stdout.write(`${text}\n`);
    if (text.includes("REFUSED:")) process.exitCode = 1;
  } else if (args._cmd === "run" && str("extractions") && str("out")) {
    const r = runLegBrief({ extractions: str("extractions"), out: str("out"), leg: str("leg"), slug: str("slug"), audience: str("audience") });
    if (r.brief) console.log(`Brief written: ${r.brief}`);
    console.log(`run directory: ${r.runDir}`);
    if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
  } else {
    fail("usage: node src/proof-sheet/leg-brief.mjs run --extractions <an Extractor run directory> --out <dir> "
      + "[--leg <the Leg's file>] [--slug <slug>] [--audience <audiences/<name>.md>]\n"
      + "       node src/proof-sheet/leg-brief.mjs diff");
  }
}
