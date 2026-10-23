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
// Obligation rows and the target mark, none of which this Brief carries.
//
// THE WORDS ARE THE SEGMENT CONTENT'S (kogaki#1495, owner decision 2026-10-21). The Leg's
// validator also runs the production recoverability criterion (`recoverabilityOf`,
// kogaki#1494): a Claim's `proposition` and a Leg Waypoint's `point` are recoverable from the
// Segment `content` clauses of the paragraph they serve, and the first word that is in none of
// them, in no `introduces` entry and is not a function word refuses the attempt, naming the
// word and the Segments. It runs with an EMPTY renderings record: the Extraction's `content`
// is already the article's own rendering of the source, so there is nothing to map. The run's
// `brief.json` records `anchored: true`, which is what the sheet's Brief badge reads.
//
// THE CLAIM REACHES ITS POINTS (kogaki#1547). After the recoverability criterion, every content
// word of a Claim's `proposition` — `recoverabilityOf`'s own word test — is in a `point` of a Leg
// Waypoint serving that Claim's strand or in an `introduces` entry; the first that is in neither
// refuses the attempt (`claimCoverageRefusal`). The plan judge reads the point, never the Claim.
//
// THE TERMS FILE IS RETIRED (kogaki#1529; kogaki#1498 before it). It mapped a term to `coined`
// or `established`, and every introduced term is coined (kogaki#1531): an `introduces` entry
// carries `term` and `meaning`, `--terms` is refused by name and `brief.json` carries no `terms`.
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
import { readerPersona, personaPriorKnowledgeLine, audienceLanguage, readerStateShapeRefusal, validateLegs, pathRule,
  introducesNearestRefusal, deriveReaderStatesBefore, legRecord, readerStateMap, briefRecordText, recoverabilityOf,
  parseIntroducesEntry, readerStateDimensionLine, FUNCTION_WORDS, wordsOf, wordForms } from "../compose.mjs";
import { wholeWordMatch } from "../compose/sections.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { startDetachedJobSupervisor, READER_PATH_JOB_STALL_S, jobHeartbeatMs } from "../workflow/detached-job.mjs";
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

// THE ARTICLE'S LANGUAGE (kogaki#1417) rides both inputs as `language`, the key the
// production rows' own language sentence names, so the derived rows read it unchanged.
export function readerStartUnitInput({ paragraphs, extractions, persona, language }) {
  return {
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    language,
    paragraph_1: paragraphs[0],
    extraction_1: extractions[0],
  };
}

// THE LEG CALL READS AN EXTRACTION'S PARAGRAPH CONTENT ONLY (kogaki#1449, owner decision
// 2026-10-19): `what_it_does`, the `reader` rows and each Segment's `content`. The parts that
// describe the Move rather than the paragraph — `why_this_order`, `breaks`, `presupposes`,
// `description`, `name`, `notes`, a Segment's `operation`, `relation` and `manner` — are not the Brief's
// material, and a word the Extractor coined in them reached a Leg Waypoint's point on the
// 2026-10-19 run. The original text stays, as the Strand substitute.
export function legCallExtraction(x) {
  return {
    what_it_does: x.what_it_does,
    reader: x.reader,
    segments: (x.segments || []).map((g) => ({ content: g.content })),
  };
}

// `strandOffset` is the count of the earlier Legs' paragraphs in a several-Leg Brief (kogaki#1532):
// a Strand id names its paragraph across the whole Brief.
export function legPathUnitInput({ paragraphs, extractions, readerStart, language, strandOffset = 0 }) {
  return {
    reader_start: readerStart,
    language,
    paragraphs: paragraphs.map((text, i) => ({ paragraph: i + 1, claim_strand: `L${strandOffset + i + 1}`, text,
      extraction: legCallExtraction(extractions[i]) })),
  };
}

// ---------------------------------------------------------------------------
// THE TERMS FILE, RETIRED (see the header).
export const TERMS_RETIRED = "`--terms` is retired (kogaki#1529): it fixed an `introduces` entry's `kind`, and an "
  + "introduced term carries `term` and `meaning` and no `kind`. Leave the flag off. Nothing was started.";

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
export function completedLeg(leg, n, offset = 0) {
  return { ...leg, materials: Array.from({ length: n }, (_, i) => `L${offset + i + 1}`), depends_on: [], no_move_fits: NO_MOVE_AT_THE_LEG };
}

// Each paragraph's Segment `content` clauses, in order: the material the Leg's words are
// recovered from.
export function segmentContents(extractions) {
  return extractions.map((x) => (Array.isArray(x && x.segments) ? x.segments : []).map((g) => String((g && g.content) ?? "")));
}

// THE RECOVERABILITY CRITERION over the one Leg (see the header). `segments` is
// `segmentContents`' answer; an absent or mis-sized one refuses, so a validator handed no
// material never reads as one whose Leg held. Returns the refusal, or null.
export function anchoredRefusal(leg, segments, n, offset = 0) {
  if (!Array.isArray(segments) || segments.length !== n || !segments.every(Array.isArray)) {
    return `the Leg's validator was handed ${Array.isArray(segments) ? segments.length : "no"} paragraph(s) of Segment content for the original Leg's ${n} — `
      + "the recoverability criterion reads every paragraph's Segment content (kogaki#1495)";
  }
  const material = Object.fromEntries(segments.map((cs, i) => [`L${offset + i + 1}`, cs.join("\n")]));
  const [v] = recoverabilityOf([leg], { material, renderings: [] });
  if (!v || v.verdict !== "fails") return null;
  const m = /^(claims|waypoints)\[(\d+)\]/.exec(v.field) || [];
  const item = m[1] ? leg[m[1]][Number(m[2])] : null;
  const ids = !item ? [] : m[1] === "claims" ? [item.strand] : item.serves;
  const where = ids.map((id) => Number(String(id).replace(/^L/, "")) - offset).filter((k) => k >= 1 && k <= n).map((k) => {
    const count = segments[k - 1].length;
    return `paragraph ${k}'s ${count === 1 ? "Segment 1" : `Segments 1–${count}`}`;
  }).join(" and ");
  return `leg 1${leg.leg_id ? ` (${leg.leg_id})` : ""}: \`${v.field}\` carries "${v.word}", which is in no Segment \`content\` of ${where || "the paragraph it serves"}, `
    + "in no `introduces` entry, and is not a function word — a Claim's proposition and a Leg Waypoint's point are written in "
    + "the words of the Segment content they serve, and this Brief composes no renderings record, since the Extraction's "
    + "content is already the article's own rendering (kogaki#1495)";
}

// THE CLAIM'S WORDS IN ITS POINTS (see the header). Returns the refusal, or null.
export function claimCoverageRefusal(leg, at = "leg 1") {
  const formsOf = (texts) => new Set(texts.flatMap((t) => wordsOf(t)).flatMap((w) => [...wordForms(w)]));
  const entries = (Array.isArray(leg.introduces) ? leg.introduces : []).map(parseIntroducesEntry)
    .filter((e) => !e.error).map((e) => `${e.term} ${e.meaning ?? e.anchor ?? ""}`);
  for (const [i, g] of leg.claims.entries()) {
    const serving = leg.waypoints.map((w, j) => [j + 1, w]).filter(([, w]) => isMap(w) && Array.isArray(w.serves) && w.serves.includes(g.strand));
    const allowed = formsOf([...serving.map(([, w]) => String(w.point ?? "")), ...entries]);
    const word = wordsOf(g.proposition).find((w) => !FUNCTION_WORDS.has(w) && !/^[\p{N}]+$/u.test(w)
      && ![...wordForms(w)].some((f) => allowed.has(f)));
    if (!word) continue;
    const read = serving.length ? serving.map(([j]) => `waypoint ${j}`).join(" and ") : "no Leg Waypoint, since none serves it";
    return `${at}: Claim ${i + 1} (${g.strand}) carries "${word}" in its \`proposition\`, which is in no \`point\` of the Leg Waypoints `
      + `serving ${g.strand} (read: ${read}) and in no \`introduces\` entry — a Leg Waypoint's point carries every content word of `
      + "the Claim it serves, since the ParagraphPlan is judged against the point and the Writer reads the Claim (kogaki#1547)";
  }
  return null;
}

export function validateLegPathUnit(record, inputs) {
  const n = inputs.paragraph_count;
  const o = inputs.strand_offset || 0;
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
    if (!isMap(g) || g.strand !== `L${o + i + 1}`) {
      return { error: `${at}: Claim ${i + 1} names ${JSON.stringify(isMap(g) ? g.strand : g)}, not L${o + i + 1} — Claim N is paragraph N's, addressed by its \`claim_strand\`` };
    }
  }
  if (!Array.isArray(leg.waypoints) || leg.waypoints.length !== n) {
    return { error: `${at}: carries ${Array.isArray(leg.waypoints) ? leg.waypoints.length : "no"} Leg Waypoint(s) for the original Leg's ${n} paragraph(s) — one Leg Waypoint per paragraph, in order` };
  }
  for (const [i, w] of leg.waypoints.entries()) {
    if (isMap(w) && Array.isArray(w.serves) && !w.serves.includes(`L${o + i + 1}`)) {
      return { error: `${at}: waypoint ${i + 1} serves ${JSON.stringify(w.serves)} and not L${o + i + 1} — Leg Waypoint N serves the Claim of paragraph N` };
    }
  }
  if ((inputs.taken_leg_ids || []).includes(leg.leg_id)) {
    return { error: `${at}: the leg_id ${JSON.stringify(leg.leg_id)} is already carried by an earlier Leg of this Brief — every Leg of the Brief has its own id (kogaki#1532)` };
  }
  const full = completedLeg(leg, n, o);
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
  const anchored = anchoredRefusal(full, inputs.segments, n, o);
  if (anchored) return { error: anchored };
  const covered = claimCoverageRefusal(full, at);
  if (covered) return { error: covered };
  // THE LAST LEG OF SEVERAL (kogaki#1532) completes the path: its cross-Leg fields are derived
  // and the production `validateLegs` runs over the whole path with no rule skipped.
  if (inputs.path) {
    const { legs } = crossLegPath([...inputs.path.prior_legs, leg], inputs.path.counts, inputs.path.segments);
    const r2 = validateLegs(legs, inputs.path.reader_start, [], []);
    if (r2.error) return { error: `the whole path, with this Leg last and its cross-Leg fields derived (kogaki#1532): ${r2.error}` };
  }
  return {};
}

// ---------------------------------------------------------------------------
// THE CROSS-LEG FIELDS OF SEVERAL LEGS, DERIVED (kogaki#1532, owner decision 2026-10-23). No
// model call fills any of them: each Leg after the first depends on the Leg before it; the first
// Leg opens the one Section, its destination the last Leg's after-state `orientation` line; the
// last Leg reaches the target; and a term an earlier Leg introduces is re-activated by the first
// later Leg whose Extraction Segment `content` uses it, which then depends on the introducing Leg
// too, since a Leg re-activates only material of a Leg it depends on. `legs` are the composed
// Legs in order, `counts` their paragraph counts and `segments` their Segment content per
// paragraph (`segmentContents`). Returns `{ legs, derived }`: the completed Legs, and one row per
// derived field naming the Leg, the field, its value and the rule.
export const DERIVED_RULES = {
  depends_on: "the Leg before it",
  opens_section: "the last Leg's after-state orientation line",
  reaches_target: "the last Leg",
  "re-activate": "the first later Leg whose Extraction content uses a term an earlier Leg introduces",
};
export function crossLegPath(legs, counts, segments) {
  const offsets = counts.map((_, k) => counts.slice(0, k).reduce((a, b) => a + b, 0));
  const out = legs.map((leg, k) => completedLeg(leg, counts[k], offsets[k]));
  const derived = [];
  const mark = (k, field, value) => derived.push({ leg_id: out[k].leg_id, field, value, rule: DERIVED_RULES[field] });
  if (out.length < 2) return { legs: out, derived };
  for (let k = 1; k < out.length; k++) out[k].depends_on = [out[k - 1].leg_id];
  for (let j = 0; j < out.length - 1; j++) {
    for (const raw of Array.isArray(out[j].introduces) ? out[j].introduces : []) {
      const p = parseIntroducesEntry(raw);
      if (p.error) continue;
      const k = out.findIndex((_, x) => x > j && (segments[x] || []).flat().some((c) => wholeWordMatch(p.term, c)));
      if (k < 0) continue;
      out[k]["re-activate"] = [...(out[k]["re-activate"] || []), `${out[j].leg_id} term ${p.term}`];
      const deps = new Set([...out[k].depends_on, out[j].leg_id]);
      out[k].depends_on = out.slice(0, k).map((l) => l.leg_id).filter((id) => deps.has(id));
    }
  }
  const last = out.length - 1;
  out[0].opens_section = readerStateDimensionLine(out[last].reader_state_after, "orientation") || "";
  out[last].reaches_target = true;
  out.forEach((l, k) => {
    if (k > 0) mark(k, "depends_on", l.depends_on);
    if (l["re-activate"]) mark(k, "re-activate", l["re-activate"]);
  });
  mark(0, "opens_section", out[0].opens_section);
  mark(last, "reaches_target", true);
  return { legs: out, derived };
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
    obligations: [],
    tradeoffs: {},
    bridged: {},
  };
}
export const CONSTANT_COMMENT = "# PROOF SHEET CONSTANT (kogaki#1385): not composed — the parser requires it.";

// `legs`, in place of `leg`, is a several-Leg Brief's composed Legs with `counts` and `segments`
// for `crossLegPath` (kogaki#1532); the Reader target is then the last Leg.
export function legBriefText({ slug, composePath, paragraphs, readerStart, leg, legs = null, counts = null, segments = null }) {
  const path = legs ? crossLegPath(legs, counts, segments).legs : [completedLeg(leg, paragraphs.length)];
  const full = deriveReaderStatesBefore(path, readerStart);
  const constants = constantFields({ slug, paragraphs, legId: full.at(-1).leg_id });
  const text = briefRecordText({
    slug, compose_path: composePath, ...constants,
    reader_start: readerStateMap(readerStart),
    reader_path: full.map(legRecord),
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
// `p<N>/answer.json` holds paragraph N's Extraction record. The Leg is cut by the
// Extractor's own `legParagraphs` (The paragraph unit, rule 1), so paragraph N here is the
// paragraph Extraction N was written for.
// An Extractor run over several Legs (kogaki#1532) lists them in `extractions.json`; the answer
// then also carries `legs`, each Leg's Passage and paragraph count in order, and `paragraphs`
// and `extractions` run across them.
export function readExtractorRun(runDir, legOverride = null) {
  const idx = join(runDir, "extractions.json");
  let doc;
  try { doc = JSON.parse(readFileSync(idx, "utf8")); }
  catch (e) { return { error: `the Extractor run at ${runDir} carries no readable extractions.json (${e.message}) — run src/proof-sheet/extract.mjs to completion first` }; }
  if (Array.isArray(doc.legs) && legOverride) return { error: `the Extractor run at ${runDir} ran several Legs, which it names itself — leave --leg off` };
  const legPaths = Array.isArray(doc.legs) ? doc.legs.map((l) => l.leg) : [legOverride || doc.leg];
  const paragraphs = [];
  const legs = [];
  for (const legPath of legPaths) {
    let text;
    try { text = readFileSync(legPath, "utf8"); }
    catch (e) { return { error: `the Leg at ${legPath} cannot be read (${e.message}); name it with --leg` }; }
    const ps = legParagraphs(text);
    legs.push({ passage: basename(legPath).replace(/\.[^.]*$/, ""), paragraphs: ps.length });
    paragraphs.push(...ps);
  }
  const legPath = legPaths[0];
  const written = Array.isArray(doc.written) ? doc.written : [];
  if (written.length !== paragraphs.length) {
    return { error: `the Extractor run at ${runDir} wrote ${written.length} Extraction(s) for the Leg's ${paragraphs.length} paragraph(s)` };
  }
  const extractions = [];
  for (let i = 0; i < paragraphs.length; i++) {
    try { extractions.push(JSON.parse(readFileSync(join(runDir, `p${i + 1}`, "answer.json"), "utf8"))); }
    catch (e) { return { error: `paragraph ${i + 1}'s Extraction cannot be read from ${join(runDir, `p${i + 1}`, "answer.json")} (${e.message})` }; }
  }
  return { paragraphs, extractions, passage: doc.passage || basename(legPath), ...(Array.isArray(doc.legs) ? { legs } : {}) };
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
export function runLegBrief({ extractions: extractorRun, out, leg = null, slug = null, audience = null, terms = null }) {
  const material = readExtractorRun(resolve(extractorRun), leg);
  if (material.error) fail(material.error);
  if (terms) fail(TERMS_RETIRED);
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
  const lang = audienceLanguage(audiencePath);
  if (lang.error) fail(`${lang.error} Nothing was started.`);
  const language = lang.language;
  const outDir = resolve(out);
  const briefPath = join(outDir, "brief.yaml");
  // NEVER OVER AN EARLIER BRIEF: /paragraph-plan and /draft record its hash, so a Brief
  // replaced under them is a plan made from a different Brief.
  if (existsSync(briefPath)) fail(`a Brief already exists at ${briefPath}, and nothing was written over it. Nothing was started.`);
  const bounds = {
    command: resolveJudgeBinary(String(process.env.KOGAKI_JUDGE_CLI || table.judge.command), process.env.PATH).path,
    model: String(settingValue(table.judge.model)), outputFormat: String(table.judge.output_format || "json"),
    callLimitS: positiveSetting(table.job, "call_limit_s"), unitAttempts: positiveSetting(table.job, "unit_attempts"),
    stallS: Number(table.job.stall_s) || READER_PATH_JOB_STALL_S, heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
  };
  const runDir = join(outDir, `leg-brief-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(runDir, { recursive: true });

  const rs = runRow({ dir: join(runDir, "reader-start"), unitId: "reader-start", row: rows.leg_reader_start_unit,
    input: readerStartUnitInput({ paragraphs, extractions, persona, language }), recordArray: "reader_start",
    validatorExport: "validateLegReaderStartUnit", inputs: {}, bounds });
  if (rs.stopped) return { stopped: rs.stopped, runDir };
  const readerStart = readerStartText(rs.record);

  if (material.legs) return composeLegs({ material, rows, runDir, outDir, briefPath, name, audiencePath, language, readerStart, extractorRun, bounds });
  const lp = runRow({ dir: join(runDir, "leg-path"), unitId: "leg-path", row: rows.leg_path_unit,
    input: legPathUnitInput({ paragraphs, extractions, readerStart, language }), recordArray: "legs",
    validatorExport: "validateLegPathUnit", bounds,
    inputs: { paragraph_count: paragraphs.length, reader_start: readerStart, segments: segmentContents(extractions) } });
  if (lp.stopped) return { stopped: lp.stopped, runDir };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(briefPath, legBriefText({ slug: name, composePath: relFromRepo(audiencePath), paragraphs, readerStart, leg: lp.record.legs[0] }));
  writeJson(join(runDir, "brief.json"), { extractor_run: resolve(extractorRun), brief: briefPath, language, anchored: true });
  return { brief: briefPath, runDir };
}

// SEVERAL LEGS (kogaki#1532): the Leg row once per Leg, in order, each in `leg-path-<k>/`, each Leg
// beginning at the Reader start or the previous Leg's after-state, and the last one validated with
// the whole path (`validateLegPathUnit`'s `path`). `brief.json` records the Legs and the derived
// cross-Leg fields, which the sheet marks.
function composeLegs({ material, rows, runDir, outDir, briefPath, name, audiencePath, language, readerStart, extractorRun, bounds }) {
  const counts = material.legs.map((l) => l.paragraphs);
  const segments = [];
  const composed = [];
  for (const [k, n] of counts.entries()) {
    const o = counts.slice(0, k).reduce((a, b) => a + b, 0);
    const paragraphs = material.paragraphs.slice(o, o + n);
    const extractions = material.extractions.slice(o, o + n);
    const start = k === 0 ? readerStart : composed[k - 1].reader_state_after;
    segments.push(segmentContents(extractions));
    const last = k === counts.length - 1;
    const lp = runRow({ dir: join(runDir, `leg-path-${k + 1}`), unitId: `leg-path-${k + 1}`, row: rows.leg_path_unit,
      input: legPathUnitInput({ paragraphs, extractions, readerStart: start, language, strandOffset: o }), recordArray: "legs",
      validatorExport: "validateLegPathUnit", bounds,
      inputs: { paragraph_count: n, strand_offset: o, reader_start: start, segments: segments[k],
        taken_leg_ids: composed.map((l) => l.leg_id),
        ...(last ? { path: { prior_legs: composed, counts, segments, reader_start: readerStart } } : {}) } });
    if (lp.stopped) return { stopped: `Leg ${k + 1} of ${counts.length} (${material.legs[k].passage}): ${lp.stopped}`, runDir };
    composed.push(lp.record.legs[0]);
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(briefPath, legBriefText({ slug: name, composePath: relFromRepo(audiencePath), paragraphs: material.paragraphs, readerStart,
    legs: composed, counts, segments }));
  const { legs, derived } = crossLegPath(composed, counts, segments);
  writeJson(join(runDir, "brief.json"), { extractor_run: resolve(extractorRun), brief: briefPath, language, anchored: true,
    legs: material.legs.map((l, k) => ({ passage: l.passage, paragraphs: l.paragraphs, leg_id: legs[k].leg_id })), derived });
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
  if (args.terms !== undefined) fail(TERMS_RETIRED);
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
