#!/usr/bin/env node
// The Structure-Mapping Playground's short Trial (kogaki#1669): one proposition, a Base Paragraph and, where `bind` declares
// its case apart, an Inference Paragraph, read on a sheet (kogaki#1719); the model route binds the Moves first, then fills one Mapping Table per bound
// Move under its Segments, then writes each paragraph's Paragraph Waypoints from its own table (kogaki#1700, kogaki#1709).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, personaPriorKnowledgeLine, loadMoveContracts, readMoveRecord } from "../compose.mjs";
import { judgePrompt, refusalReach, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { derivedRow } from "../proof-sheet/leg-brief.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { planLeg, paragraphPlanUnitInput, validateParagraphPlanUnit, segmentsForPlanCall, PARAGRAPH_PLAN_TABLE } from "../paragraph-plan.mjs";
import { renderPacket } from "../draft/render-packet.mjs";
import { splitPacketTemplate } from "../draft/packet.mjs";
import { sectionsOf, sectionOfLeg } from "../draft/workspace.mjs";
import { writerSettings, writerRefusal } from "../draft/writer.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseProposition, validateStructure, higherOrderOf } from "./structure.mjs";
import { validateRbsTable, validateCorrespondenceTable, suppliedEntry, projectionsOf, boundMovesOf, correspondenceVocabularyRefusal } from "./rbs.mjs";
import { mapperRow, MAPPER_ATTEMPTS } from "./sme.mjs";
import { writeAttemptRecord, attemptsRoot, cliRecord, tableRecord } from "../workflow/attempt-record.mjs";
import { EXTRACTION_TABLE } from "../proof-sheet/extract.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR, TRIAL_FILE, READING_FILE, STRUCTURE_FILE } from "./trial.mjs";
import { renderShortSheet } from "./sheet.mjs";

export const RBS_FILE = "rbs.yaml";
export const RBS_OWNER = "owner-authored";
export const RBS_COMPOSED = "composed";
export const BIND_FILE = "bind.yaml";
export const PACKET_FILE = "packet.md";
export const PARAGRAPH_FILE = "paragraph.md";
export const SHEET_FILE = "sheet.html";
export const SHORT_STAGES = ["reading", "bind", "grounding", "waypoints", "write"];
const LEG_ID = "smp";
const BIND_ROW = "smp_bind_move";
const CORRESPONDENCE_ROW = "smp_correspondence";
const WAYPOINTS_ROW = "smp_waypoints_unit";
const WRITER_UNIT = "writer";
const DRAFT_TABLE = "src/draft-workflow.json";
const CARRY = "carry";
// The Base Paragraph's case (kogaki#1719): the proposition's own, or a case apart from its domain.
const OWN = "own";
const APART = "apart";
export const CASES = [OWN, APART];
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
const PACKET_TEMPLATE = join(REPO, "src", "packet-template.md");
const USAGE = "usage: node src/mapping-playground/short.mjs run --proposition <file> (--structure <file> | --mapper <sme_map_<variant>>) "
  + "--out <dir under runs/mapping-playground/> (--compose | --rbs-file <file>) [--audience <audiences/<name>.md>] [--library <dir>]";

function fail(msg) {
  process.stderr.write(`short: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => (path && existsSync(path) ? { path: relFromRepo(path), sha256: sha256(path) } : null);
const readTable = () => JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));

// ---------------------------------------------------------------------------
// THE ONE LEG (kogaki#1681, kogaki#1685, kogaki#1700, kogaki#1709): its one claim is the proposition, in the Brief's form; one Leg
// Waypoint per bound Move, each `point` the structure in the expressions of that Move's table: one per projecting binding of the
// owner's file after the first, and in the model route one where an Inference Move is bound, else none.
// A Leg Waypoint's point (kogaki#1688).
export function firstPoint(structure, table) {
  const base = new Map(table.correspondences.map((c) => [c.role, c.expression === null ? c.role : String(c.expression).trim()]));
  return [...structure.relations, ...higherOrderOf(structure)]
    .map((e) => String(e.holds).trim().replace(/\{([^{}\s]+)\}/g, (all, id) => (base.has(id) ? base.get(id) : all)))
    .map((h) => h.charAt(0).toUpperCase() + h.slice(1)).join(" ");
}

export function shortLeg(proposition, tables, persona, structure) {
  return {
    leg_id: LEG_ID,
    claims: [{ strand: "L1", proposition }],
    waypoints: tables.map((t) => ({ point: firstPoint(structure, t), serves: ["L1"] })),
    introduces: [],
    journeys: [],
  };
}

// ONE MODEL CALL through the run's recorder, bounded by `timeoutS`; the answer's text, or the stop, with the call's own
// argv and stdout for its Attempt Record (kogaki#1717).
function oneCall({ env, model, outputFormat, timeoutS, input }) {
  const argv = ["-p", "--model", model, "--output-format", outputFormat, "--tools", "", "--disable-slash-commands",
    "--strict-mcp-config", "--setting-sources", "", "--no-session-persistence"];
  const call = { argv: { argv, model, output_format: outputFormat, timeout_s: timeoutS } };
  const r = spawnSync(env.KOGAKI_JUDGE_CLI, argv, { input, env, encoding: "utf8", timeout: 1000 * timeoutS, maxBuffer: 64 * 1024 * 1024 });
  call.raw = String(r.stdout ?? "");
  if (r.error) return { ...call, stopped: `the call could not finish (${r.error.code || "spawn failed"}: ${r.error.message})` };
  if (r.status !== 0) return { ...call, stopped: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${String(r.stderr || "").trim().split("\n")[0] || "(no stderr)"}` };
  if (outputFormat !== "json") return { ...call, text: String(r.stdout) };
  try {
    const envl = JSON.parse(r.stdout);
    if (typeof envl === "string") return { ...call, text: envl };
    if (envl && typeof envl.result === "string") return { ...call, text: envl.result };
  } catch (e) { return { ...call, stopped: `the call's json answer does not parse (${e.message})` }; }
  return { ...call, stopped: "the call's json answer carries no string `result`" };
}

// The binary that answered: the recorder hands the call to KOGAKI_PROOF_SHEET_REAL_CLI.
const cliOfEnv = (env) => cliRecord(env.KOGAKI_PROOF_SHEET_REAL_CLI || env.KOGAKI_JUDGE_CLI);

// The writer's row as its table declares it, without the binary the settings resolved.
const writerRowOf = ({ binary, stubbed, ...row }) => row;

// Every `attempts/` directory a stage wrote, its own and each per-Move call's, in name order (kogaki#1717).
function attemptRootsUnder(d) {
  const dirs = [d, ...readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort().map((n) => join(d, n))];
  return dirs.map(attemptsRoot).filter((p) => existsSync(p)).map((p) => relFromRepo(p));
}

// ONE CALL'S ATTEMPT RECORD (kogaki#1717), under the stage's own directory.
function recordAttempt(dir, unit, n, { env, cli, call, prompt, input, row, tables, answer, refusal }) {
  writeAttemptRecord(dir, unit, n, { prompt, argv: call.argv, cli: cli || cliOfEnv(env), input,
    row: { row, tables: tables.map(tableRecord) }, raw: call.raw, answer, refusal });
}

export function answerRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; }
  catch (e) { return { stopped: `the binding answer is not one JSON record (${e.message})` }; }
}

// ONE JUDGMENT ROW UNDER THE MAPPER'S BOUND (kogaki#1700): each attempt's prompt and answer are kept, and a refusal is put
// back verbatim into the next attempt under its reach (kogaki#1708); the answer, or the stop naming the last refusal.
export function retriedCall({ dir, env, row, input, refusalOf, validator = null, cli = null, tables = [PLAYGROUND_TABLE] }) {
  const extraction = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const history = [];
  for (let attempt = 1; attempt <= MAPPER_ATTEMPTS; attempt++) {
    const held = bindFlow(FLOW);
    let prompt;
    try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, history.length ? history : null); } finally { bindFlow(held); }
    const call = oneCall({ env, model: String(settingValue(extraction.judge.model)), outputFormat: String(extraction.judge.output_format || "json"),
      timeoutS: Number(settingValue(extraction.job.call_limit_s)), input: prompt });
    const record = (answer, refusal) => recordAttempt(dir, row.id, attempt, { env, cli, call, prompt, input, row, tables, answer, refusal });
    if (call.stopped) { record(undefined, { text: call.stopped, validator: "oneCall" }); return { stopped: call.stopped }; }
    const a = answerRecord(call.text);
    const raw = a.stopped ? { group: "shape", text: a.stopped } : refusalOf(a.record);
    const r = raw ? refusalReach(row, raw) : null;
    record(a.record, r && { group: r.group, reach: r.reach, text: r.text, validator: a.stopped ? "answerRecord" : validator,
      sites: raw && raw.sites });
    if (!raw) return { answer: a.record, refusals: refusalsRecord(history) };
    history.push({ answer: a.record ?? null, refusal: r.text, group: r.group, reach: r.reach });
    if (r.undeclared) {
      return { stopped: `the \`${row.id}\` refusal names the group ${JSON.stringify(r.group)}, which the row does not declare; the refusal: ${r.text}`,
        refusals: refusalsRecord(history) };
    }
    if (r.reach === "stop") {
      return { stopped: `the \`${row.id}\` refusal of group "${r.group}" has reach stop; the refusal: ${r.text}`, refusals: refusalsRecord(history) };
    }
  }
  return { stopped: `the \`${row.id}\` answer was refused ${MAPPER_ATTEMPTS} times; the last refusal: ${history[history.length - 1].refusal}`,
    refusals: refusalsRecord(history) };
}

// The run record's view of a row's refusals (kogaki#1708): each refusal's group, reach and text, without the answer.
const refusalsRecord = (history) => history.map((h) => ({ group: h.group, reach: h.reach, refusal: h.refusal }));

const playgroundRow = (table, id) => ({ id, ...table[id] });
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const undeclared = (answer, keys) => (isMap(answer) ? Object.keys(answer).find((k) => !keys.includes(k)) : null);
const carryOf = (list) => (list || []).find((x) => x.kind === CARRY) || null;

// THE `bind` ROW (kogaki#1700): the structure, the Persona's line and every Move of the library as `{ id, description, segments,
// takes, leaves }`.
export function bindMoveInput(structure, persona, moves, libraryDir) {
  return {
    structure,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    moves: moves.map((m) => {
      const r = readMoveRecord(m.id, libraryDir);
      return { id: m.id, description: r.error ? null : (r.record.description ?? null), segments: segmentsForPlanCall(m.segments),
        takes: m.takes, leaves: m.leaves };
    }),
  };
}

export function bindMoveRefusal(answer, contracts) {
  const KEYS = ["base_move", "case", "inference_move"];
  if (!isMap(answer)) return { group: "shape", text: "the answer is not one `{ base_move, case, inference_move }` record" };
  const extra = undeclared(answer, KEYS);
  if (extra) return { group: "shape", text: `the answer carries \`${extra}\`, which the row does not declare — it carries base_move, case and inference_move` };
  for (const k of KEYS) if (!Object.hasOwn(answer, k)) return { group: "shape", text: `the answer carries no \`${k}\`` };
  if (!CASES.includes(answer.case)) return { group: "shape", text: `case ${JSON.stringify(answer.case)} is neither \`${OWN}\` nor \`${APART}\`` };
  const base = contracts.get(answer.base_move);
  if (!base) return { group: "library", text: `base_move ${JSON.stringify(answer.base_move)} names no Move of the library` };
  if (answer.inference_move === null) {
    return answer.case === APART ? { group: "case", text: `inference_move is null, and case is \`${APART}\` — the case told apart is owed an Inference Paragraph carrying it onto the subject` } : null;
  }
  if (answer.case === OWN) return { group: "case", text: `inference_move is given, and case is \`${OWN}\` — the proposition's own case is owed no Inference Paragraph` };
  const inference = contracts.get(answer.inference_move);
  if (!inference) return { group: "library", text: `inference_move ${JSON.stringify(answer.inference_move)} names no Move of the library` };
  if (!carryOf(inference.takes)) return { group: "carry", text: `the inference Move "${inference.id}" takes no \`${CARRY}\` — an Inference Paragraph takes up what the Base Paragraph carries` };
  return null;
}

// kogaki#1719: the model writes no rationale.
export function bindingRationale({ base_move: base, case: told, inference_move: inference }) {
  return told === APART
    ? `case ${APART}: the Base Paragraph tells a case apart from the proposition's domain under "${base}", and the Inference Paragraph carries it onto the subject under "${inference}".`
    : `case ${OWN}: the Base Paragraph tells the proposition's own case under "${base}", and no Inference Paragraph is owed.`;
}

// What a binding leaves: specs/spec-draft-pipeline/SPEC.md §"What each binding leaves", kogaki#1719.
export function bindingLeaves(contract, told, table) {
  const own = ((contract && contract.leaves) || []).map((x) => ({ kind: x.kind, what: x.what, ...(x.segment !== undefined ? { segment: x.segment } : {}) }));
  if (told !== APART) return own;
  const last = ((contract && contract.segments) || []).length;
  return [...own, { kind: CARRY, what: `the structure as told in ${table.base.domain}, to be brought onto the subject`, segment: last }];
}

// THE `correspondence` ROW (kogaki#1700, kogaki#1709, kogaki#1719): the structure, the Persona's line, the paragraph's case and
// the bound Move's Segments; the inference call adds `prior_tables`, the tables of the Moves bound before it.
export function correspondenceInput(structure, persona, move, told, priorTables = []) {
  return {
    structure,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    case: told,
    segments: segmentsForPlanCall(move.segments),
    ...(priorTables.length ? { prior_tables: priorTables } : {}),
  };
}

export function correspondenceRefusal(answer, structure) {
  const extra = undeclared(answer, ["base", "correspondences"]);
  if (extra) return { group: "shape", text: `the answer carries \`${extra}\`, which the row does not declare — it carries base and correspondences` };
  const v = validateCorrespondenceTable(answer, { structure });
  return v.error ? { group: v.group, text: v.error } : null;
}

// THE `waypoints` ROW (kogaki#1700): one call over the Leg with each Leg Waypoint's Move fixed; an answer binding another Move is
// refused naming the Waypoint, the record is a ParagraphPlan unit's, and each paragraph's points keep to its own table (kogaki#1709).
function waypointsStage({ dir, env, cli, leg, persona, libraryDir, playground, tables, moves, contracts, leaves }) {
  const plan = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const d = derivedRow(playground, WAYPOINTS_ROW, PLAYGROUND_TABLE);
  if (d.error) return { stopped: d.error };
  const row = { ...plan.paragraph_plan_unit, ...d.row, shared_text_file: plan.paragraph_plan_unit.shared_text_file };
  const planned = planLeg(leg, { priorKnowledge: personaPriorKnowledgeLine(persona) });
  // kogaki#1719: a later Leg Waypoint stands to take up what the binding before it leaves (kogaki#1701).
  const fixed = { ...planned, waypoints: planned.waypoints.map((w, i) => ({ ...w, move: moves[i],
    ...(i > 0 ? { stands_to_be_taken_up: leaves[i - 1].map((x) => ({ kind: x.kind, what: x.what, left_by: `Leg Waypoint ${i}` })) } : {}) })) };
  const bound = [...new Set(moves)].map((id) => contracts.get(id));
  const input = { ...paragraphPlanUnitInput(fixed, bound, persona), tables };
  const held = bindFlow(FLOW);
  let prompt;
  try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
  const call = oneCall({ env, model: String(settingValue(plan.judge.model)), outputFormat: String(plan.judge.output_format || "json"),
    timeoutS: Number(settingValue(plan.job.call_limit_s)), input: prompt });
  const record = (answer, text, validator) => recordAttempt(dir, WAYPOINTS_ROW, 1, { env, cli, call, prompt, input, row,
    tables: [PLAYGROUND_TABLE, PARAGRAPH_PLAN_TABLE], answer, refusal: text ? { text, validator } : null });
  const stop = (answer, text, validator) => { record(answer, text, validator); return { stopped: text }; };
  if (call.stopped) return stop(undefined, call.stopped, "oneCall");
  const a = answerRecord(call.text);
  if (a.stopped) return stop(undefined, a.stopped, "answerRecord");
  const entries = isMap(a.record) && Array.isArray(a.record.waypoints) ? a.record.waypoints : [];
  for (const [i, e] of entries.slice(0, moves.length).entries()) {
    const got = isMap(e) ? e.move : e;
    if (got !== moves[i]) return stop(a.record, `Waypoint ${i + 1}: the answer binds ${JSON.stringify(got)}, and the Move bound to it at \`bind\` is "${moves[i]}"`, "waypointsStage");
  }
  let v;
  try { v = validateParagraphPlanUnit(a.record, { legs: [planned], movesDir: libraryDir }, "leg-1"); }
  catch (e) { v = { error: String(e && e.message || e) }; }
  if (v.error) return stop(a.record, v.error.split("\n").join(" "), "validateParagraphPlanUnit");
  for (const [i, t] of tables.entries()) {
    const vocabulary = correspondenceVocabularyRefusal(a.record.waypoints[i].paragraph_waypoints, t, tables.slice(0, i), i + 1);
    if (vocabulary) return stop(a.record, vocabulary, "correspondenceVocabularyRefusal");
  }
  record(a.record, null);
  return { entries: a.record.waypoints };
}

// THE PARAGRAPHS: one Packet over a one-Leg Brief, each Leg Waypoint carrying its binding's points, and the writer called once.
export function shortPacket({ leg, paragraphs, audiencePath }) {
  const split = splitPacketTemplate(readFileSync(PACKET_TEMPLATE, "utf8"));
  if (split.error) return { error: split.error };
  const packetLeg = { ...leg, waypoints: leg.waypoints.map((w, i) => ({ ...w, paragraph_waypoints: paragraphs[i].paragraph_waypoints })) };
  const brief = { record: { compose_path: relFromRepo(audiencePath) }, legs: [packetLeg], strands: [] };
  return renderPacket({ template: split.packet, brief, leg: packetLeg, priorSections: [],
    section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
}

function writeStage({ dir, env, cli, leg, paragraphs, audiencePath, paragraphPath }) {
  const p = shortPacket({ leg, paragraphs, audiencePath });
  if (p.error) return { stopped: p.error };
  const packetPath = join(dir, PACKET_FILE);
  writeFileSync(packetPath, p.packet);
  const w = writerSettings();
  const call = oneCall({ env, model: w.model, outputFormat: w.output_format, timeoutS: w.timeout_s, input: p.packet });
  const refused = call.stopped ? null : writerRefusal(call.text);
  const empty = !call.stopped && !refused && String(call.text).trim() === "";
  const why = call.stopped ? [call.stopped, "oneCall"] : refused ? [`the writer refused: ${refused}`, "writerRefusal"]
    : empty ? ["the writer returned no prose", "writeStage"] : null;
  recordAttempt(dir, WRITER_UNIT, 1, { env, cli, call, prompt: p.packet, input: { leg, paragraphs, audience: relFromRepo(audiencePath) },
    row: { id: WRITER_UNIT, ...writerRowOf(w) }, tables: [DRAFT_TABLE], answer: call.stopped ? undefined : String(call.text),
    refusal: why && { text: why[0], validator: why[1] } });
  if (why) return { stopped: why[0], packet: relFromRepo(packetPath) };
  writeFileSync(paragraphPath, String(call.text).trim() + "\n");
  return { packet: relFromRepo(packetPath) };
}

// ---------------------------------------------------------------------------
// THE SHORT TRIAL.

function readProposition(file) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch (e) { fail(`the proposition file cannot be read (${e.message}). Nothing was started.`); }
  const proposition = parseProposition(text);
  if (proposition.error) fail(`${proposition.error}. Nothing was started.`);
  return proposition;
}

function readRbsFile(file, proposition, libraryDir, structure) {
  let record;
  try { record = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the correspondence table cannot be read (${e.message})` }; }
  const v = validateRbsTable(record, proposition.proposition,
    { movesDir: libraryDir, structure });
  if (v.error) return v;
  if (!Object.hasOwn(record, "projection")) {
    return { error: "the correspondence table carries no `projection`: the owner's table binds the paragraph whose point is the proposition, "
      + "and a Trial that never states the proposition has no reading (kogaki#1689)" };
  }
  return { record: { ...record, variant: RBS_OWNER } };
}

function readStructure(file, proposition) {
  let structure;
  try { structure = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the structure cannot be read (${e.message})` }; }
  const v = validateStructure(structure, proposition);
  return v.error ? v : { structure };
}

export function runShortTrial({ proposition: propositionFile, structure: givenStructure = null, mapper = null, out, compose = false,
  rbsFile = null, audience = null, library = null }) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep)) fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE))) fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  if (Boolean(compose) === Boolean(rbsFile)) fail(`a Trial's route is \`--compose\` or \`--rbs-file\`, exactly one of the two (kogaki#1700). Nothing was started. ${USAGE}`);
  const table = readTable();
  const proposition = readProposition(propositionFile);
  let given = null;
  if (mapper) {
    const m = mapperRow(table, mapper);
    if (m.error) fail(`${m.error}. Nothing was started.`);
  } else {
    const s = readStructure(givenStructure, proposition);
    if (s.error) fail(`${s.error}. Nothing was started.`);
    given = s.structure;
  }
  const structureFile = mapper ? join(outDir, STRUCTURE_FILE) : resolve(givenStructure);
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(`${persona.error}. Nothing was started.`);
  const libraryDir = resolve(REPO, library || "moves");
  if (!existsSync(libraryDir)) fail(`the library ${libraryDir} does not exist. Nothing was started.`);
  const owned = rbsFile ? readRbsFile(rbsFile, proposition, libraryDir, given) : null;
  if (owned && owned.error) fail(`${owned.error}. Nothing was started.`);
  const judge = resolveJudgeBinary(String(declaredCommand()), process.env.PATH);
  const realPath = judge.path;
  const cli = cliRecord(judge.path, judge.version);
  const slug = basename(outDir).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trial";
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const reading = join(outDir, READING_FILE);
  writeFileSync(reading, `# Reading of Trial ${slug}\n`);
  const rbsPath = join(outDir, RBS_FILE);
  const bindPath = join(outDir, BIND_FILE);
  const paragraphPath = join(outDir, PARAGRAPH_FILE);
  const sheetPath = join(outDir, SHEET_FILE);
  const record = {
    trial: slug,
    kind: "short",
    proposition: { cite: proposition.cite, proposition: proposition.proposition, path: relFromRepo(resolve(propositionFile)), sha256: sha256(propositionFile) },
    structure: mapper ? { path: relFromRepo(structureFile), sha256: null, author: "mapper" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    rbs: { variant: rbsFile ? RBS_OWNER : RBS_COMPOSED, path: null, sha256: null },
    bind: { move: null, case: null, binding_rationale: null, path: null, sha256: null },
    paragraph: { path: null, sha256: null },
    sheet: relFromRepo(sheetPath),
    audience: relFromRepo(audiencePath),
    library: relFromRepo(libraryDir),
    model_command: realPath,
    started_at: new Date().toISOString(),
    stages: [],
    reading: relFromRepo(reading),
  };
  const save = () => writeFileSync(join(outDir, TRIAL_FILE), JSON.stringify(record, null, 2) + "\n");
  const stage = (name, body) => {
    if (record.stopped) { record.stages.push({ stage: name, state: "not run" }); save(); return null; }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try { r = body(d, stageEnv(outDir, d, realPath)); }
    catch (e) { r = { stopped: `the stage threw: ${String(e && e.message || e).split("\n")[0]}` }; }
    const calls = join(d, CALLS_FILE);
    const { value, ...shown } = r;
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", calls: existsSync(calls) ? relFromRepo(calls) : null,
      attempt_records: attemptRootsUnder(d), ...shown });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : (value ?? {});
  };
  save();
  if (mapper) {
    stage("reading", (d, env) => {
      const job = join(d, "job");
      const c = spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "map", "--strand", resolve(propositionFile), "--mapper", mapper,
        "--out", job, "--structure-out", structureFile, "--audience", audiencePath], { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const prompt = join(job, "prompt.md");
      if (existsSync(prompt)) record.mapper.prompt_sha256 = sha256(prompt);
      if (c.status !== 0 || !existsSync(structureFile)) {
        const said = `${c.stdout || ""}\n${c.stderr || ""}`.split("\n").map((l) => l.trim()).filter(Boolean);
        return { stopped: `\`map\` exited ${c.status === null ? "on a signal" : c.status}: ${said.slice(-3).join(" ") || "(no output)"}` };
      }
      record.structure.sha256 = sha256(structureFile);
      return {};
    });
  }
  let structure = null;
  let contracts = null;
  const writeRbs = (t) => {
    writeFileSync(rbsPath, stringifyYaml(t));
    record.rbs = { variant: t.variant, ...fileRecord(rbsPath), ...(owned ? { source: fileRecord(resolve(rbsFile)) } : {}) };
  };
  // THE MOVES (kogaki#1700): the owner's file names them, or one `smp_bind_move` call binds them before any base is named.
  const moves = stage("bind", (d, env) => {
    const s = readStructure(structureFile, proposition);
    if (s.error) return { stopped: s.error };
    structure = s.structure;
    if (owned) {
      const v = readRbsFile(rbsFile, proposition, libraryDir, structure);
      if (v.error) return { stopped: v.error };
      const ids = boundMovesOf(owned.record);
      record.bind = { state: "supplied", author: "owner", move: ids[0], base_move: ids[0], inference_moves: ids.slice(1),
        binding_rationale: Object.hasOwn(owned.record, "binding_rationale") ? String(owned.record.binding_rationale).trim() : null };
      return { value: ids };
    }
    const library = loadMoveContracts(libraryDir);
    if (library.error) return { stopped: library.error };
    contracts = new Map(library.moves.map((m) => [m.id, m]));
    const r = retriedCall({ dir: d, env, cli, row: playgroundRow(table, BIND_ROW), input: bindMoveInput(structure, persona, library.moves, libraryDir),
      refusalOf: (answer) => bindMoveRefusal(answer, contracts), validator: "bindMoveRefusal" });
    if (r.stopped) return r;
    const { base_move: base, case: told, inference_move: inference } = r.answer;
    record.bind = { author: BIND_ROW, move: base, base_move: base, case: told, inference_move: inference, binding_rationale: bindingRationale(r.answer) };
    return { value: inference === null ? [base] : [base, inference], refusals: r.refusals };
  });
  // THE MAPPING TABLES (kogaki#1700, kogaki#1709): the owner's, or one `smp_correspondence` call per bound Move, the base Move's
  // first, each under its Move's Segments and each later one given the tables before it.
  const rbsTables = stage("grounding", (d, env) => {
    if (owned) {
      const t = { variant: RBS_OWNER, tables: owned.record.tables };
      writeRbs(t);
      return { value: t };
    }
    const tables = [];
    // Each Move's call keeps its own refusals; the stage records them in the order the Moves were called (kogaki#1708).
    const refusals = [];
    // kogaki#1719: only the base Move's table takes the declared case.
    for (const [i, move] of moves.entries()) {
      const md = join(d, move);
      mkdirSync(md, { recursive: true });
      const told = i === 0 ? record.bind.case : OWN;
      const r = retriedCall({ dir: md, env, cli, row: playgroundRow(table, CORRESPONDENCE_ROW), input: correspondenceInput(structure, persona, contracts.get(move), told, tables),
        refusalOf: (answer) => correspondenceRefusal(answer, structure), validator: "correspondenceRefusal" });
      refusals.push(...(r.refusals || []));
      if (r.stopped) return { stopped: `${move}: ${r.stopped}`, refusals };
      tables.push({ move, base: r.answer.base, correspondences: r.answer.correspondences });
    }
    const t = { variant: RBS_COMPOSED, tables };
    writeRbs(t);
    return { value: t, refusals };
  });
  const leg = rbsTables ? shortLeg(proposition.proposition, rbsTables.tables, persona, structure) : null;
  // THE PARAGRAPH WAYPOINTS (kogaki#1700): the owner's points, or one `smp_waypoints_unit` call with each Move fixed.
  const paragraphs = stage("waypoints", (d, env) => {
    let listed;
    if (owned) {
      const serves = leg.waypoints[0].serves;
      const all = [suppliedEntry(owned.record, serves), ...projectionsOf(owned.record).map((p) => suppliedEntry(p, serves))];
      const library = loadMoveContracts(libraryDir);
      const owner = new Map((library.error ? [] : library.moves).map((m) => [m.id, m]));
      listed = all.map((e) => ({ move: e.move, binding_rationale: e.binding_rationale, leaves: bindingLeaves(owner.get(e.move), null, null),
        paragraph_waypoints: e.paragraph_waypoints }));
    } else {
      const leaves = moves.map((m, i) => bindingLeaves(contracts.get(m), i === 0 ? record.bind.case : OWN, rbsTables.tables[i]));
      const r = waypointsStage({ dir: d, env, cli, leg, persona, libraryDir, playground: table, tables: rbsTables.tables, moves, contracts, leaves });
      if (r.stopped) return r;
      listed = r.entries.map((e, i) => ({ move: e.move, binding_rationale: record.bind.binding_rationale, leaves: leaves[i],
        paragraph_waypoints: e.paragraph_waypoints }));
    }
    writeFileSync(bindPath, stringifyYaml({ move: listed[0].move, binding_rationale: listed[0].binding_rationale, paragraphs: listed }));
    record.bind = { ...record.bind, paragraphs: listed, ...fileRecord(bindPath) };
    writeRbs({ ...rbsTables, bindings: listed });
    return { value: listed };
  });
  stage("write", (d, env) => {
    const r = writeStage({ dir: d, env, cli, leg, paragraphs, audiencePath, paragraphPath });
    if (!r.stopped) record.paragraph = fileRecord(paragraphPath);
    return r;
  });
  record.finished_at = new Date().toISOString();
  save();
  const sheet = renderShortSheet({ outDir, record, proposition, structure, tables: rbsTables ? rbsTables.tables : null, leg, paragraphs, paragraphPath });
  writeFileSync(sheetPath, sheet);
  return { outDir, stopped: record.stopped || null };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[a.slice(2)] = true;
      else { args[a.slice(2)] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const str = (k) => (typeof args[k] === "string" ? args[k] : null);
  if (args._cmd !== "run") fail(USAGE);
  if (Object.hasOwn(args, "rbs")) fail(`\`--rbs\` is retired with the \`rbs_<variant>\` family: the model route is \`--compose\` and the owner's table is \`--rbs-file\` (kogaki#1700). Nothing was started. ${USAGE}`);
  if (Object.hasOwn(args, "compose") && args.compose !== true) fail(`\`--compose\` takes no value. Nothing was started. ${USAGE}`);
  if (args.compose === true && str("rbs-file")) fail(`\`--compose\` and \`--rbs-file\` are given together: a Trial's Moves, Correspondence column and Paragraph Waypoints are composed or the owner's file, never both. Nothing was started. ${USAGE}`);
  if (args.compose !== true && !str("rbs-file")) fail(`neither \`--compose\` nor \`--rbs-file\` is given: a Trial composes its Moves, Correspondence column and Paragraph Waypoints, or reads them from the owner's file (kogaki#1700). Nothing was started. ${USAGE}`);
  if (str("structure") && str("mapper")) fail(`\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`);
  if (Object.hasOwn(args, "strand")) fail(`\`--strand\` is no flag of the short Trial: its input is \`--proposition <file>\` (kogaki#1685). Nothing was started. ${USAGE}`);
  for (const k of ["proposition", ...(str("mapper") ? [] : ["structure"]), "out"]) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
  const r = runShortTrial({ proposition: str("proposition"), structure: str("structure"), mapper: str("mapper"), out: str("out"),
    compose: args.compose === true, rbsFile: str("rbs-file"), audience: str("audience"), library: str("library") });
  console.log(`trial directory: ${r.outDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
