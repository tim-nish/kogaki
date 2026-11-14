#!/usr/bin/env node
// The Structure-Mapping Playground's short Trial (kogaki#1669): one proposition, a Base Paragraph and, where `bind` declares
// its case apart, an Inference Paragraph, read on a sheet (kogaki#1719); the model route binds the Moves, fills one Mapping
// Table per bound Move (kogaki#1700, kogaki#1709), then plans ONE Leg under ONE Move and the Analogy Mapping (kogaki#1784).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, personaPriorKnowledgeLine, loadMoveContracts, readMoveRecord } from "../compose.mjs";
import { judgePrompt, refusalReach, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../move-extraction-playground/leg-run.mjs";
import {
  planLeg,
  paragraphPlanUnitInput,
  validateParagraphPlanUnit,
  segmentsForPlanCall,
  PARAGRAPH_PLAN_TABLE,
} from "../paragraph-plan.mjs";
import { withAnalogy } from "../paragraph-plan-analogy.mjs";
import { paragraphsPerLeg } from "../compose/record.mjs";
import { renderPacket } from "../draft/render-packet.mjs";
import { splitPacketTemplate } from "../draft/packet.mjs";
import { sectionsOf, sectionOfLeg } from "../draft/workspace.mjs";
import { writerSettings, writerRefusal } from "../draft/writer.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseProposition, validateStructure, higherOrderOf, firstPoint } from "./structure.mjs";
import {
  validateRbsTable,
  validateCorrespondenceTable,
  suppliedEntry,
  projectionsOf,
  boundMovesOf,
  correspondenceVocabularyRefusal,
} from "./rbs.mjs";
import { mapperRow, MAPPER_CALLS } from "./sme.mjs";
import { writeCallRecord, callsRoot, cliRecord, tableRecord } from "../workflow/call-record.mjs";
import { EXTRACTION_TABLE } from "../move-extraction-playground/extract.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR, TRIAL_FILE, READING_FILE, STRUCTURE_FILE } from "./trial.mjs";
import { renderShortSheet } from "./sheet.mjs";
import { audiencePathOf } from "../paragraph-plan/brief.mjs";
import { readBriefLeg, validateMoveStructure, validatePairing, unmatchedOf } from "./move-structure.mjs";
import {
  readMoveTable,
  tableMoveStructure,
  pairInOrder,
  tablePlanMove,
  tableSegments,
  TABLE_MOVE_ID,
} from "./move-table.mjs";

export const RBS_FILE = "rbs.yaml";
export const RBS_OWNER = "owner-authored";
export const RBS_COMPOSED = "composed";
export const BIND_FILE = "bind.yaml";
export const PACKET_FILE = "packet.md";
export const ANALOGY_FILE = "analogy.yaml";
export const PARAGRAPH_FILE = "paragraph.md";
export const SHEET_FILE = "sheet.html";
export const SHORT_STAGES = ["reading", "bind", "grounding", "waypoints", "write"];
// The Brief-Leg route (kogaki#1830): a Leg of an adopted Brief under a named Move.
export const MOVE_STAGES = ["move-reading", "pairing", "grounding", "waypoints", "write"];
export const MOVE_ROUTE_FLAGS = ["brief", "leg", "move"];
export const MOVE_TABLE_FLAG = "move-table";
export const MOVE_STRUCTURE_FILE = "move-structure.yaml";
export const PAIRING_FILE = "pairing.yaml";
export const LEG_STRUCTURE_FILE = "leg-structure.yaml";
const READ_MOVE_ROW = "smp_read_move";
const PAIR_ROW = "smp_pair_roles";
const PAIRED_PLAN_ROW = "smp_paired_plan";
const TABLE_PLAN_ROW = "smp_table_plan";
const LEG_ID = "smp";
const BIND_ROW = "smp_bind_move";
const CORRESPONDENCE_ROW = "smp_correspondence";
// The `waypoints` stage plans with the production row unchanged (kogaki#1784): `smp_waypoints_unit` is retired.
const PLAN_ROW = "paragraph_plan_unit";
const WRITER_UNIT = "writer";
const DRAFT_TABLE = "src/draft-workflow.json";
const CARRY = "carry";
// The Base Paragraph's case (kogaki#1719): the proposition's own, or a case apart from its domain.
const OWN = "own";
const APART = "apart";
export const CASES = [OWN, APART];
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
const PACKET_TEMPLATE = join(REPO, "src", "packet-template.md");
const USAGE =
  "usage: node src/structure-mapping-playground/short.mjs run --proposition <file> (--structure <file> | --mapper <sme_map_<variant>>) " +
  "--out <dir under runs/structure-mapping-playground/> (--compose | --rbs-file <file>) [--audience <audiences/<name>.md>] [--library <dir>]\n" +
  "   or: node src/structure-mapping-playground/short.mjs run --brief <Brief file> --leg <leg_id> --move <Move id> [--move-table <file>] " +
  "--out <dir under runs/structure-mapping-playground/> [--audience <audiences/<name>.md>] [--library <dir>]";

function fail(msg) {
  process.stderr.write(`short: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => (path && existsSync(path) ? { path: relFromRepo(path), sha256: sha256(path) } : null);
const readTable = () => JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));

// ---------------------------------------------------------------------------
// THE ONE LEG (kogaki#1681, kogaki#1700, kogaki#1784): its one claim is the proposition, in the Brief's form, and its `text` the
// structure in the expressions of the Leg's own table, the last grounded: the subject's under a case apart, whose base is the
// Analogy Mapping, and the proposition's own under `own`. The Leg binds one Move and carries no Brief Waypoint (kogaki#1775).
// A table's point is `firstPoint` (structure.mjs, kogaki#1688); the owner's file declares no case, so `legCase` reads it from the bindings (kogaki#1732).

// The case the Leg's first Waypoint takes: the `bind` stage's answer, or on the owner's route, where no case is declared,
// `apart` when the owner's file binds a Move after the first and `own` when it binds one alone, as `bindMoveRefusal`
// pairs an Inference Move with `apart` (kogaki#1732).
export function legCase(bind) {
  if (bind && CASES.includes(bind.case)) return bind.case;
  return bind && Array.isArray(bind.inference_moves) && bind.inference_moves.length ? APART : OWN;
}

export function shortLeg(proposition, tables, structure) {
  return {
    leg_id: LEG_ID,
    text: firstPoint(structure, tables[tables.length - 1]),
    claims: [{ strand: "L1", proposition }],
  };
}

// THE TRIAL'S ANALOGY MAPPING (kogaki#1778, kogaki#1784), written before the Leg: under a case apart, the base Move's table is
// the base domain -- its `base.domain` named, each Role's counterpart its expression and each relation's its `holds` in
// those expressions -- and under `own` there is none, the record naming why. In the shape `paragraph-plan.yaml` keeps it.
export const OWN_ANALOGY_REASON =
  "the Base Paragraph tells the proposition's own case, so no base domain is carried onto the subject.";
export function shortAnalogy(structure, tables, told) {
  if (told !== APART) return { none: OWN_ANALOGY_REASON };
  const t = tables[0];
  const say = new Map(
    t.correspondences.map((c) => [c.role, c.expression === null ? c.role : String(c.expression).trim()]),
  );
  const holds = (e) =>
    String(e.holds)
      .trim()
      .replace(/\{([^{}\s]+)\}/g, (all, id) => (say.has(id) ? say.get(id) : all));
  return {
    base_domain: { name: String(t.base.domain).trim(), description: firstPoint(structure, t) },
    roles: t.correspondences.map((c) => ({ role: c.role, counterpart: say.get(c.role) })),
    relations: [...structure.relations, ...higherOrderOf(structure)].map((e) => ({
      relation: e.id,
      counterpart: holds(e),
    })),
  };
}

// ONE MODEL CALL through the run's recorder, bounded by `timeoutS`; the answer's text, or the stop, with the call's own
// argv and stdout for its Call Record (kogaki#1717).
function oneCall({ env, model, outputFormat, timeoutS, input }) {
  const argv = [
    "-p",
    "--model",
    model,
    "--output-format",
    outputFormat,
    "--tools",
    "",
    "--disable-slash-commands",
    "--strict-mcp-config",
    "--setting-sources",
    "",
    "--no-session-persistence",
  ];
  const call = { argv: { argv, model, output_format: outputFormat, timeout_s: timeoutS } };
  const r = spawnSync(env.KOGAKI_JUDGE_CLI, argv, {
    input,
    env,
    encoding: "utf8",
    timeout: 1000 * timeoutS,
    maxBuffer: 64 * 1024 * 1024,
  });
  call.raw = String(r.stdout ?? "");
  if (r.error)
    return { ...call, stopped: `the call could not finish (${r.error.code || "spawn failed"}: ${r.error.message})` };
  if (r.status !== 0)
    return {
      ...call,
      stopped: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${
        String(r.stderr || "")
          .trim()
          .split("\n")[0] || "(no stderr)"
      }`,
    };
  if (outputFormat !== "json") return { ...call, text: String(r.stdout) };
  try {
    const envl = JSON.parse(r.stdout);
    if (typeof envl === "string") return { ...call, text: envl };
    if (envl && typeof envl.result === "string") return { ...call, text: envl.result };
  } catch (e) {
    return { ...call, stopped: `the call's json answer does not parse (${e.message})` };
  }
  return { ...call, stopped: "the call's json answer carries no string `result`" };
}

// The binary that answered: the recorder hands the call to KOGAKI_PROOF_SHEET_REAL_CLI.
const cliOfEnv = (env) => cliRecord(env.KOGAKI_PROOF_SHEET_REAL_CLI || env.KOGAKI_JUDGE_CLI);

// The writer's row as its table declares it, without the binary the settings resolved.
const writerRowOf = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== "binary" && k !== "stubbed"));

// Every `calls/` directory a stage wrote, its own and each per-Move call's, in name order (kogaki#1717).
function callRootsUnder(d) {
  const dirs = [
    d,
    ...readdirSync(d, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .map((n) => join(d, n)),
  ];
  return dirs
    .map(callsRoot)
    .filter((p) => existsSync(p))
    .map((p) => relFromRepo(p));
}

// ONE CALL'S CALL RECORD (kogaki#1717), under the stage's own directory.
function recordCall(dir, unit, n, { env, cli, call, prompt, input, row, tables, answer, refusal }) {
  writeCallRecord(dir, unit, n, {
    prompt,
    argv: call.argv,
    cli: cli || cliOfEnv(env),
    input,
    row: { row, tables: tables.map(tableRecord) },
    raw: call.raw,
    answer,
    refusal,
  });
}

export function answerRecord(text) {
  const stripped = String(text)
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "");
  try {
    return { record: JSON.parse(stripped) };
  } catch (e) {
    return { stopped: `the binding answer is not one JSON record (${e.message})` };
  }
}

// ONE JUDGMENT ROW UNDER THE MAPPER'S BOUND (kogaki#1700): each Call's prompt and answer are kept, and a refusal is put
// back verbatim into the next Call under its reach (kogaki#1708); the answer, or the stop naming the last refusal.
export function retriedCall({
  dir,
  env,
  row,
  input,
  refusalOf,
  validator = null,
  cli = null,
  tables = [PLAYGROUND_TABLE],
}) {
  const extraction = JSON.parse(readFileSync(EXTRACTION_TABLE, "utf8"));
  const history = [];
  for (let n = 1; n <= MAPPER_CALLS; n++) {
    const held = bindFlow(FLOW);
    let prompt;
    try {
      prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, history.length ? history : null);
    } finally {
      bindFlow(held);
    }
    const call = oneCall({
      env,
      model: String(settingValue(extraction.judge.model)),
      outputFormat: String(extraction.judge.output_format || "json"),
      timeoutS: Number(settingValue(extraction.job.call_limit_s)),
      input: prompt,
    });
    const record = (answer, refusal) =>
      recordCall(dir, row.id, n, { env, cli, call, prompt, input, row, tables, answer, refusal });
    if (call.stopped) {
      record(undefined, { text: call.stopped, validator: "oneCall" });
      return { stopped: call.stopped };
    }
    const a = answerRecord(call.text);
    const raw = a.stopped ? { group: "shape", text: a.stopped } : refusalOf(a.record);
    const r = raw ? refusalReach(row, raw) : null;
    record(
      a.record,
      r && {
        group: r.group,
        reach: r.reach,
        text: r.text,
        validator: a.stopped ? "answerRecord" : validator,
        sites: raw && raw.sites,
      },
    );
    if (!raw) return { answer: a.record, refusals: refusalsRecord(history) };
    history.push({ answer: a.record ?? null, refusal: r.text, group: r.group, reach: r.reach });
    if (r.undeclared) {
      return {
        stopped: `the \`${row.id}\` refusal names the group ${JSON.stringify(r.group)}, which the row does not declare; the refusal: ${r.text}`,
        refusals: refusalsRecord(history),
      };
    }
    if (r.reach === "stop") {
      return {
        stopped: `the \`${row.id}\` refusal of group "${r.group}" has reach stop; the refusal: ${r.text}`,
        refusals: refusalsRecord(history),
      };
    }
  }
  return {
    stopped: `the \`${row.id}\` answer was refused ${MAPPER_CALLS} times; the last refusal: ${history[history.length - 1].refusal}`,
    refusals: refusalsRecord(history),
  };
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
      return {
        id: m.id,
        description: r.error ? null : (r.record.description ?? null),
        segments: segmentsForPlanCall(m.segments),
        takes: m.takes,
        leaves: m.leaves,
      };
    }),
  };
}

export function bindMoveRefusal(answer, contracts) {
  const KEYS = ["base_move", "case", "inference_move"];
  if (!isMap(answer))
    return { group: "shape", text: "the answer is not one `{ base_move, case, inference_move }` record" };
  const extra = undeclared(answer, KEYS);
  if (extra)
    return {
      group: "shape",
      text: `the answer carries \`${extra}\`, which the row does not declare — it carries base_move, case and inference_move`,
    };
  for (const k of KEYS)
    if (!Object.hasOwn(answer, k)) return { group: "shape", text: `the answer carries no \`${k}\`` };
  if (!CASES.includes(answer.case))
    return { group: "shape", text: `case ${JSON.stringify(answer.case)} is neither \`${OWN}\` nor \`${APART}\`` };
  const base = contracts.get(answer.base_move);
  if (!base)
    return { group: "library", text: `base_move ${JSON.stringify(answer.base_move)} names no Move of the library` };
  if (answer.inference_move === null) {
    return answer.case === APART
      ? {
          group: "case",
          text: `inference_move is null, and case is \`${APART}\` — the case told apart is owed an Inference Paragraph carrying it onto the subject`,
        }
      : null;
  }
  if (answer.case === OWN)
    return {
      group: "case",
      text: `inference_move is given, and case is \`${OWN}\` — the proposition's own case is owed no Inference Paragraph`,
    };
  const inference = contracts.get(answer.inference_move);
  if (!inference)
    return {
      group: "library",
      text: `inference_move ${JSON.stringify(answer.inference_move)} names no Move of the library`,
    };
  if (!carryOf(inference.takes))
    return {
      group: "carry",
      text: `the inference Move "${inference.id}" takes no \`${CARRY}\` — an Inference Paragraph takes up what the Base Paragraph carries`,
    };
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
  const own = ((contract && contract.leaves) || []).map((x) => ({
    kind: x.kind,
    what: x.what,
    ...(x.segment !== undefined ? { segment: x.segment } : {}),
  }));
  if (told !== APART) return own;
  const last = ((contract && contract.segments) || []).length;
  return [
    ...own,
    {
      kind: CARRY,
      what: `the structure as told in ${table.base.domain}, to be brought onto the subject`,
      segment: last,
    },
  ];
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
  if (extra)
    return {
      group: "shape",
      text: `the answer carries \`${extra}\`, which the row does not declare — it carries base and correspondences`,
    };
  const v = validateCorrespondenceTable(answer, { structure });
  return v.error ? { group: v.group, text: v.error } : null;
}

// THE `waypoints` STAGE, COMPOSED (kogaki#1784): one Leg bound to one Move, planned by the production `paragraph_plan_unit`
// row unchanged, the Leg carrying its structure, its Move and its own table as the plan's Mapper hands a grounded Leg, and an
// analogy Move handed the Analogy Mapping. The answer is read back by `validateParagraphPlanUnit`; then it keeps the Move
// bound at `bind`, a case apart is owed two paragraphs, and each paragraph's Waypoints keep to their table (kogaki#1709):
// the Base Paragraph to the base domain's, the Inference Paragraph to the subject's with the base's beside it.
export function shortPlanInput({ leg, structure, tables, move, contract, persona, analogy }) {
  const own = tables[tables.length - 1];
  const planned = {
    ...planLeg(leg, { priorKnowledge: personaPriorKnowledgeLine(persona) }),
    structure,
    move,
    table: { base: own.base, correspondences: own.correspondences },
  };
  return withAnalogy(paragraphPlanUnitInput(planned, [contract], persona, paragraphsPerLeg()), analogy);
}

export function shortPlanRefusal(answer, { input, tables, move, told, libraryDir }) {
  if (isMap(answer) && Object.hasOwn(answer, "move") && answer.move !== null && answer.move !== move) {
    return {
      group: "plan",
      text: `the answer binds ${JSON.stringify(answer.move)}, and the Move bound to the Leg at \`bind\` is "${move}"`,
    };
  }
  let v;
  try {
    v = validateParagraphPlanUnit(answer, { legs: [input.leg_you_must_plan], movesDir: libraryDir }, "leg-1");
  } catch (e) {
    v = { error: String((e && e.message) || e) };
  }
  if (v.error) return { group: "plan", text: v.error.split("\n").join(" "), sites: v.sites };
  const ps = answer.paragraphs;
  if (told === APART && ps.length !== 2) {
    return {
      group: "plan",
      text: `the answer writes ${ps.length} paragraph(s), and the case told apart is owed two: the Base Paragraph in the Analogy Mapping's base domain, then the Inference Paragraph carrying it onto the subject`,
    };
  }
  for (const [i, e] of ps.entries()) {
    const at = told === APART ? i : 0;
    const vocabulary = correspondenceVocabularyRefusal(e.paragraph_waypoints, tables[at], tables.slice(0, at), i + 1);
    if (vocabulary) return { group: "plan", text: vocabulary, sites: [i + 1] };
  }
  return null;
}

function waypointsStage({ dir, env, cli, leg, structure, tables, move, contract, persona, analogy, told, libraryDir }) {
  const plan = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const input = shortPlanInput({ leg, structure, tables, move, contract, persona, analogy });
  const r = retriedCall({
    dir,
    env,
    cli,
    row: { id: PLAN_ROW, ...plan[PLAN_ROW] },
    input,
    tables: [PARAGRAPH_PLAN_TABLE],
    refusalOf: (answer) => shortPlanRefusal(answer, { input, tables, move, told, libraryDir }),
    validator: "shortPlanRefusal",
  });
  return r.stopped ? r : { plan: r.answer, refusals: r.refusals };
}

// THE PARAGRAPHS: one Packet over a one-Leg Brief whose Leg carries its paragraphs, and the writer called once (kogaki#1784).
export function shortPacket({ leg, paragraphs, audiencePath }) {
  const split = splitPacketTemplate(readFileSync(PACKET_TEMPLATE, "utf8"));
  if (split.error) return { error: split.error };
  const serves = leg.claims.map((g) => g.strand);
  const packetLeg = {
    ...leg,
    move: paragraphs[0].move,
    paragraphs: paragraphs.map((p, i) => ({
      paragraph: i + 1,
      materials: serves,
      ...(typeof p.join === "string" ? { join: p.join } : {}),
      paragraph_waypoints: p.paragraph_waypoints,
    })),
  };
  const brief = { record: { compose_path: relFromRepo(audiencePath) }, legs: [packetLeg], strands: [] };
  return renderPacket({
    template: split.packet,
    brief,
    leg: packetLeg,
    priorSections: [],
    section: sectionOfLeg(brief.legs).get(leg.leg_id),
    sections: sectionsOf(brief.legs),
  });
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
  const why = call.stopped
    ? [call.stopped, "oneCall"]
    : refused
      ? [`the writer refused: ${refused}`, "writerRefusal"]
      : empty
        ? ["the writer returned no prose", "writeStage"]
        : null;
  recordCall(dir, WRITER_UNIT, 1, {
    env,
    cli,
    call,
    prompt: p.packet,
    input: { leg, paragraphs, audience: relFromRepo(audiencePath) },
    row: { id: WRITER_UNIT, ...writerRowOf(w) },
    tables: [DRAFT_TABLE],
    answer: call.stopped ? undefined : String(call.text),
    refusal: why && { text: why[0], validator: why[1] },
  });
  if (why) return { stopped: why[0], packet: relFromRepo(packetPath) };
  writeFileSync(paragraphPath, String(call.text).trim() + "\n");
  return { packet: relFromRepo(packetPath) };
}

// ---------------------------------------------------------------------------
// THE SHORT TRIAL.

function readProposition(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (e) {
    fail(`the proposition file cannot be read (${e.message}). Nothing was started.`);
  }
  const proposition = parseProposition(text);
  if (proposition.error) fail(`${proposition.error}. Nothing was started.`);
  return proposition;
}

function readRbsFile(file, proposition, libraryDir, structure) {
  let record;
  try {
    record = parseYaml(readFileSync(file, "utf8"), file);
  } catch (e) {
    return { error: `the correspondence table cannot be read (${e.message})` };
  }
  const v = validateRbsTable(record, proposition.proposition, { movesDir: libraryDir, structure });
  if (v.error) return v;
  if (!Object.hasOwn(record, "projection")) {
    return {
      error:
        "the correspondence table carries no `projection`: the owner's table binds the paragraph whose point is the proposition, " +
        "and a Trial that never states the proposition has no reading (kogaki#1689)",
    };
  }
  return { record: { ...record, variant: RBS_OWNER } };
}

function readStructure(file, proposition) {
  let structure;
  try {
    structure = parseYaml(readFileSync(file, "utf8"), file);
  } catch (e) {
    return { error: `the structure cannot be read (${e.message})` };
  }
  const v = validateStructure(structure, proposition);
  return v.error ? v : { structure };
}

export function runShortTrial({
  proposition: propositionFile,
  structure: givenStructure = null,
  mapper = null,
  out,
  compose = false,
  rbsFile = null,
  audience = null,
  library = null,
}) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE)))
    fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  if (Boolean(compose) === Boolean(rbsFile))
    fail(
      `a Trial's route is \`--compose\` or \`--rbs-file\`, exactly one of the two (kogaki#1700). Nothing was started. ${USAGE}`,
    );
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
  const slug =
    basename(outDir)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trial";
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
    proposition: {
      cite: proposition.cite,
      proposition: proposition.proposition,
      path: relFromRepo(resolve(propositionFile)),
      sha256: sha256(propositionFile),
    },
    structure: mapper
      ? { path: relFromRepo(structureFile), sha256: null, author: "mapper" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    rbs: { variant: rbsFile ? RBS_OWNER : RBS_COMPOSED, path: null, sha256: null },
    bind: { move: null, case: null, binding_rationale: null, path: null, sha256: null },
    analogy: { path: null, sha256: null },
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
    if (record.stopped) {
      record.stages.push({ stage: name, state: "not run" });
      save();
      return null;
    }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try {
      r = body(d, stageEnv(outDir, d, realPath));
    } catch (e) {
      r = { stopped: `the stage threw: ${String((e && e.message) || e).split("\n")[0]}` };
    }
    const calls = join(d, CALLS_FILE);
    const { value, ...shown } = r;
    record.stages.push({
      stage: name,
      state: r.stopped ? "stopped" : "done",
      calls: existsSync(calls) ? relFromRepo(calls) : null,
      call_records: callRootsUnder(d),
      ...shown,
    });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : (value ?? {});
  };
  save();
  if (mapper) {
    stage("reading", (d, env) => {
      const job = join(d, "job");
      const c = spawnSync(
        process.execPath,
        [
          "src/structure-mapping-playground/trial.mjs",
          "map",
          "--strand",
          resolve(propositionFile),
          "--mapper",
          mapper,
          "--out",
          job,
          "--structure-out",
          structureFile,
          "--audience",
          audiencePath,
        ],
        { cwd: REPO, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      );
      const prompt = join(job, "prompt.md");
      if (existsSync(prompt)) record.mapper.prompt_sha256 = sha256(prompt);
      if (c.status !== 0 || !existsSync(structureFile)) {
        const said = `${c.stdout || ""}\n${c.stderr || ""}`
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        return {
          stopped: `\`map\` exited ${c.status === null ? "on a signal" : c.status}: ${said.slice(-3).join(" ") || "(no output)"}`,
        };
      }
      record.structure.sha256 = sha256(structureFile);
      return {};
    });
  }
  let structure = null;
  let contracts = null;
  const writeRbs = (t) => {
    writeFileSync(rbsPath, stringifyYaml(t));
    record.rbs = {
      variant: t.variant,
      ...fileRecord(rbsPath),
      ...(owned ? { source: fileRecord(resolve(rbsFile)) } : {}),
    };
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
      record.bind = {
        state: "supplied",
        author: "owner",
        move: ids[0],
        base_move: ids[0],
        inference_moves: ids.slice(1),
        binding_rationale: Object.hasOwn(owned.record, "binding_rationale")
          ? String(owned.record.binding_rationale).trim()
          : null,
      };
      return { value: ids };
    }
    const library = loadMoveContracts(libraryDir);
    if (library.error) return { stopped: library.error };
    contracts = new Map(library.moves.map((m) => [m.id, m]));
    const r = retriedCall({
      dir: d,
      env,
      cli,
      row: playgroundRow(table, BIND_ROW),
      input: bindMoveInput(structure, persona, library.moves, libraryDir),
      refusalOf: (answer) => bindMoveRefusal(answer, contracts),
      validator: "bindMoveRefusal",
    });
    if (r.stopped) return r;
    const { base_move: base, case: told, inference_move: inference } = r.answer;
    record.bind = {
      author: BIND_ROW,
      move: base,
      base_move: base,
      case: told,
      inference_move: inference,
      binding_rationale: bindingRationale(r.answer),
    };
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
      const r = retriedCall({
        dir: md,
        env,
        cli,
        row: playgroundRow(table, CORRESPONDENCE_ROW),
        input: correspondenceInput(structure, persona, contracts.get(move), told, tables),
        refusalOf: (answer) => correspondenceRefusal(answer, structure),
        validator: "correspondenceRefusal",
      });
      refusals.push(...(r.refusals || []));
      if (r.stopped) return { stopped: `${move}: ${r.stopped}`, refusals };
      tables.push({ move, base: r.answer.base, correspondences: r.answer.correspondences });
    }
    const t = { variant: RBS_COMPOSED, tables };
    writeRbs(t);
    return { value: t, refusals };
  });
  const leg = rbsTables ? shortLeg(proposition.proposition, rbsTables.tables, structure) : null;
  // THE WAYPOINTS (kogaki#1700, kogaki#1784): the owner's points, or the one Leg planned under its one Move.
  const paragraphs = stage("waypoints", (d, env) => {
    let listed;
    if (owned) {
      const serves = leg.claims.map((g) => g.strand);
      const all = [
        suppliedEntry(owned.record, serves),
        ...projectionsOf(owned.record).map((p) => suppliedEntry(p, serves)),
      ];
      const library = loadMoveContracts(libraryDir);
      const owner = new Map((library.error ? [] : library.moves).map((m) => [m.id, m]));
      listed = all.map((e) => ({
        move: e.move,
        binding_rationale: e.binding_rationale,
        leaves: bindingLeaves(owner.get(e.move), null, null),
        paragraph_waypoints: e.paragraph_waypoints,
      }));
    } else {
      // The Analogy Mapping is written before the Leg is planned (kogaki#1778); the Leg's one Move is the last bound.
      const told = record.bind.case;
      const analogy = shortAnalogy(structure, rbsTables.tables, told);
      const analogyPath = join(outDir, ANALOGY_FILE);
      writeFileSync(analogyPath, stringifyYaml({ analogy }));
      record.analogy = fileRecord(analogyPath);
      const move = moves[moves.length - 1];
      const r = waypointsStage({
        dir: d,
        env,
        cli,
        leg,
        structure,
        tables: rbsTables.tables,
        move,
        contract: contracts.get(move),
        persona,
        analogy,
        told,
        libraryDir,
      });
      if (r.stopped) return r;
      const leaves = bindingLeaves(contracts.get(move), OWN, null);
      record.bind = { ...record.bind, move, plan_rationale: r.plan.rationale };
      listed = r.plan.paragraphs.map((e, i) => ({
        move,
        binding_rationale: record.bind.binding_rationale,
        leaves: i === r.plan.paragraphs.length - 1 ? leaves : [],
        ...(typeof e.join === "string" ? { join: e.join } : {}),
        paragraph_waypoints: e.paragraph_waypoints,
      }));
      writeFileSync(
        bindPath,
        stringifyYaml({ move, binding_rationale: record.bind.binding_rationale, paragraphs: listed }),
      );
      record.bind = { ...record.bind, paragraphs: listed, ...fileRecord(bindPath) };
      writeRbs({ ...rbsTables, bindings: listed });
      return { value: listed, refusals: r.refusals };
    }
    writeFileSync(
      bindPath,
      stringifyYaml({ move: listed[0].move, binding_rationale: listed[0].binding_rationale, paragraphs: listed }),
    );
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
  const sheet = renderShortSheet({
    outDir,
    record,
    proposition,
    structure,
    tables: rbsTables ? rbsTables.tables : null,
    leg,
    paragraphs,
    paragraphPath,
  });
  writeFileSync(sheetPath, sheet);
  return { outDir, stopped: record.stopped || null };
}

// ---------------------------------------------------------------------------
// THE BRIEF-LEG ROUTE (kogaki#1830): a Leg of an adopted Brief under a named Move, the Move read whole, then paired with
// the Leg, grounded under `own` and planned; specs/spec-draft-pipeline/SPEC.md, The short Trial.

export function moveReadingInput(contract, libraryDir) {
  const r = readMoveRecord(contract.id, libraryDir);
  return {
    move: {
      id: contract.id,
      description: r.error ? null : (r.record.description ?? null),
      segments: segmentsForPlanCall(contract.segments),
      takes: contract.takes,
      leaves: contract.leaves,
    },
  };
}

// The production plan row with the Playground's one sentence appended; the production table is read, never written.
export function pairedPlanRow(plan, table, rowId = PAIRED_PLAN_ROW) {
  const row = plan[PLAN_ROW];
  return { id: PLAN_ROW, ...row, judgment_point: `${row.judgment_point} ${table[rowId].judgment_point}` };
}

// Under a Move table the plan call is offered the Move as `move`; the Harness writes the named Move's id back (kogaki#1840).
function tablePlanRefusal(answer, moveId, refusalOf) {
  if (isMap(answer) && typeof answer.move === "string") {
    if (answer.move !== TABLE_MOVE_ID)
      return {
        group: "plan",
        text: `the answer binds ${JSON.stringify(answer.move)}, and the one Move offered is "${TABLE_MOVE_ID}"`,
      };
    answer.move = moveId;
  }
  return refusalOf(answer);
}

export function runMoveTrial({
  brief,
  leg: legId,
  move: moveId,
  moveTable = null,
  out,
  audience = null,
  library = null,
}) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep))
    fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE)))
    fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  const briefPath = resolve(brief);
  const b = readBriefLeg(briefPath, legId);
  if (b.error) fail(`${b.error}. Nothing was started.`);
  const libraryDir = resolve(REPO, library || "moves");
  const lib = loadMoveContracts(libraryDir);
  if (lib.error) fail(`${lib.error}. Nothing was started.`);
  const contract = lib.moves.find((m) => m.id === moveId);
  if (!contract)
    fail(
      `--move ${JSON.stringify(moveId)} names no Move of the library ${relFromRepo(libraryDir)}. Nothing was started.`,
    );
  const tablePath = moveTable ? resolve(moveTable) : null;
  const t = tablePath ? readMoveTable(tablePath, contract.segments.length, b.structure, legId) : null;
  if (t && t.error) fail(`${t.error}. Nothing was started.`);
  const moveTableRecord = t ? t.table : null;
  const table = readTable();
  const audiencePath = audience ? resolve(REPO, audience) : audiencePathOf(b.record);
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(`${persona.error}. Nothing was started.`);
  const judge = resolveJudgeBinary(String(declaredCommand()), process.env.PATH);
  const cli = cliRecord(judge.path, judge.version);
  const slug =
    basename(outDir)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trial";
  mkdirSync(outDir, { recursive: true });
  installRecorder(outDir);
  const reading = join(outDir, READING_FILE);
  writeFileSync(reading, `# Reading of Trial ${slug}\n`);
  const structure = b.structure;
  const structurePath = join(outDir, LEG_STRUCTURE_FILE);
  writeFileSync(structurePath, stringifyYaml(structure));
  const leg = { leg_id: b.leg.leg_id, text: b.leg.text, claims: b.leg.claims };
  const proposition = { proposition: leg.text, cite: `${relFromRepo(briefPath)}, Leg ${leg.leg_id}` };
  const rbsPath = join(outDir, RBS_FILE);
  const bindPath = join(outDir, BIND_FILE);
  const paragraphPath = join(outDir, PARAGRAPH_FILE);
  const sheetPath = join(outDir, SHEET_FILE);
  const record = {
    trial: slug,
    kind: "short",
    route: "brief-leg",
    brief: { ...fileRecord(briefPath), leg: leg.leg_id, relation: b.leg.relation },
    proposition: { proposition: leg.text },
    structure: { ...fileRecord(structurePath), author: "brief" },
    move_table: tablePath ? fileRecord(tablePath) : null,
    move_structure: { path: null, sha256: null },
    pairing: { path: null, sha256: null },
    rbs: { variant: RBS_COMPOSED, path: null, sha256: null },
    bind: {
      author: "owner",
      move: moveId,
      base_move: moveId,
      case: OWN,
      inference_move: null,
      binding_rationale: bindingRationale({ base_move: moveId, case: OWN, inference_move: null }),
    },
    analogy: { path: null, sha256: null },
    paragraph: { path: null, sha256: null },
    sheet: relFromRepo(sheetPath),
    audience: relFromRepo(audiencePath),
    library: relFromRepo(libraryDir),
    model_command: judge.path,
    started_at: new Date().toISOString(),
    stages: [],
    reading: relFromRepo(reading),
  };
  const save = () => writeFileSync(join(outDir, TRIAL_FILE), JSON.stringify(record, null, 2) + "\n");
  const stage = (name, body) => {
    if (record.stopped) {
      record.stages.push({ stage: name, state: "not run" });
      save();
      return null;
    }
    const d = join(outDir, name);
    mkdirSync(d, { recursive: true });
    let r;
    try {
      r = body(d, stageEnv(outDir, d, judge.path));
    } catch (e) {
      r = { stopped: `the stage threw: ${String((e && e.message) || e).split("\n")[0]}` };
    }
    const calls = join(d, CALLS_FILE);
    const { value, ...shown } = r;
    record.stages.push({
      stage: name,
      state: r.stopped ? "stopped" : "done",
      calls: existsSync(calls) ? relFromRepo(calls) : null,
      call_records: callRootsUnder(d),
      ...shown,
    });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : (value ?? {});
  };
  const writeYaml = (file, key, value) => {
    const p = join(outDir, file);
    writeFileSync(p, stringifyYaml(value));
    record[key] = fileRecord(p);
  };
  save();
  const segmentCount = contract.segments.length;
  // Under a Move table the Harness writes the move structure and the pairing, and neither stage calls the model (kogaki#1840).
  const moveStructure = stage(MOVE_STAGES[0], (d, env) => {
    if (moveTableRecord) {
      const written = tableMoveStructure(moveTableRecord);
      writeYaml(MOVE_STRUCTURE_FILE, "move_structure", written);
      return { value: written };
    }
    const r = retriedCall({
      dir: d,
      env,
      cli,
      row: playgroundRow(table, READ_MOVE_ROW),
      input: moveReadingInput(contract, libraryDir),
      refusalOf: (answer) => validateMoveStructure(answer, segmentCount),
      validator: "validateMoveStructure",
    });
    if (r.stopped) return r;
    writeYaml(MOVE_STRUCTURE_FILE, "move_structure", r.answer);
    return { value: r.answer, refusals: r.refusals };
  });
  const pairing = stage(MOVE_STAGES[1], (d, env) => {
    if (moveTableRecord) {
      const written = pairInOrder(moveTableRecord, structure);
      writeYaml(PAIRING_FILE, "pairing", written);
      return { value: written };
    }
    const r = retriedCall({
      dir: d,
      env,
      cli,
      row: playgroundRow(table, PAIR_ROW),
      input: { move_structure: moveStructure, leg_structure: structure },
      refusalOf: (answer) => validatePairing(answer, moveStructure, structure),
      validator: "validatePairing",
    });
    if (r.stopped) return r;
    const written = { ...r.answer, unmatched: unmatchedOf(r.answer, structure) };
    writeYaml(PAIRING_FILE, "pairing", written);
    return { value: written, refusals: r.refusals };
  });
  const tables = stage("grounding", (d, env) => {
    const r = retriedCall({
      dir: d,
      env,
      cli,
      row: playgroundRow(table, CORRESPONDENCE_ROW),
      input: moveTableRecord
        ? { ...correspondenceInput(structure, persona, contract, OWN), segments: tableSegments(moveTableRecord) }
        : correspondenceInput(structure, persona, contract, OWN),
      refusalOf: (answer) => correspondenceRefusal(answer, structure),
      validator: "correspondenceRefusal",
    });
    if (r.stopped) return r;
    const t = {
      variant: RBS_COMPOSED,
      tables: [{ move: moveId, base: r.answer.base, correspondences: r.answer.correspondences }],
    };
    writeFileSync(rbsPath, stringifyYaml(t));
    record.rbs = { variant: RBS_COMPOSED, ...fileRecord(rbsPath) };
    return { value: t, refusals: r.refusals };
  });
  const paragraphs = stage("waypoints", (d, env) => {
    const plan = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
    const composed = shortPlanInput({
      leg,
      structure,
      tables: tables.tables,
      move: moveTableRecord ? TABLE_MOVE_ID : moveId,
      contract,
      persona,
      analogy: { none: OWN_ANALOGY_REASON },
    });
    const input = {
      ...composed,
      ...(moveTableRecord ? { paragraph_moves_you_may_bind: [tablePlanMove(moveTableRecord)] } : {}),
      move_structure: moveStructure,
      pairing,
    };
    const refusalOf = (answer) =>
      shortPlanRefusal(answer, { input, tables: tables.tables, move: moveId, told: OWN, libraryDir });
    const r = retriedCall({
      dir: d,
      env,
      cli,
      row: pairedPlanRow(plan, table, moveTableRecord ? TABLE_PLAN_ROW : PAIRED_PLAN_ROW),
      input,
      tables: [PARAGRAPH_PLAN_TABLE, PLAYGROUND_TABLE],
      refusalOf: moveTableRecord ? (answer) => tablePlanRefusal(answer, moveId, refusalOf) : refusalOf,
      validator: moveTableRecord ? "tablePlanRefusal" : "shortPlanRefusal",
    });
    if (r.stopped) return r;
    const leaves = bindingLeaves(contract, OWN, null);
    const listed = r.answer.paragraphs.map((e, i) => ({
      move: moveId,
      binding_rationale: record.bind.binding_rationale,
      leaves: i === r.answer.paragraphs.length - 1 ? leaves : [],
      ...(typeof e.join === "string" ? { join: e.join } : {}),
      paragraph_waypoints: e.paragraph_waypoints,
    }));
    writeFileSync(
      bindPath,
      stringifyYaml({ move: moveId, binding_rationale: record.bind.binding_rationale, paragraphs: listed }),
    );
    record.bind = { ...record.bind, plan_rationale: r.answer.rationale, paragraphs: listed, ...fileRecord(bindPath) };
    writeFileSync(rbsPath, stringifyYaml({ ...tables, bindings: listed }));
    record.rbs = { variant: RBS_COMPOSED, ...fileRecord(rbsPath) };
    return { value: listed, refusals: r.refusals };
  });
  stage("write", (d, env) => {
    const r = writeStage({ dir: d, env, cli, leg, paragraphs, audiencePath, paragraphPath });
    if (!r.stopped) record.paragraph = fileRecord(paragraphPath);
    return r;
  });
  record.finished_at = new Date().toISOString();
  save();
  writeFileSync(
    sheetPath,
    renderShortSheet({
      outDir,
      record,
      proposition,
      structure,
      tables: tables ? tables.tables : null,
      paragraphs,
      paragraphPath,
      moveRoute: { move: moveId, moveStructure, pairing, table: moveTableRecord },
    }),
  );
  return { outDir, stopped: record.stopped || null };
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
  if (args._cmd !== "run") fail(USAGE);
  // THE BRIEF-LEG ROUTE (kogaki#1830): its three flags together, and none of the first route's.
  const given = MOVE_ROUTE_FLAGS.filter((k) => Object.hasOwn(args, k));
  // The Move table (kogaki#1840) is a flag of the Brief-Leg route alone, and takes a file.
  if (Object.hasOwn(args, MOVE_TABLE_FLAG) && !given.length)
    fail(
      `\`--${MOVE_TABLE_FLAG}\` is a flag of the Brief-Leg route: it is given with --brief, --leg and --move. Nothing was started. ${USAGE}`,
    );
  if (Object.hasOwn(args, MOVE_TABLE_FLAG) && !str(MOVE_TABLE_FLAG))
    fail(`\`--${MOVE_TABLE_FLAG}\` takes a file. Nothing was started. ${USAGE}`);
  if (given.length) {
    const missing = MOVE_ROUTE_FLAGS.find((k) => !str(k));
    if (missing)
      fail(
        `\`--${missing}\` is required beside \`--${given[0]}\`: the Brief-Leg route takes --brief, --leg and --move together. Nothing was started. ${USAGE}`,
      );
    for (const k of ["proposition", "structure", "mapper", "compose", "rbs-file"])
      if (Object.hasOwn(args, k))
        fail(
          `\`--${k}\` is no flag of the Brief-Leg route: it reads its proposition and structure from the Brief's Leg and holds the Move given. Nothing was started. ${USAGE}`,
        );
    if (!str("out")) fail(`\`--out\` is required. ${USAGE}`);
    const r = runMoveTrial({
      brief: str("brief"),
      leg: str("leg"),
      move: str("move"),
      moveTable: str(MOVE_TABLE_FLAG),
      out: str("out"),
      audience: str("audience"),
      library: str("library"),
    });
    console.log(`trial directory: ${r.outDir}`);
    if (r.stopped) {
      console.log(r.stopped);
      process.exitCode = 1;
    }
  } else {
    if (Object.hasOwn(args, "rbs"))
      fail(
        `\`--rbs\` is retired with the \`rbs_<variant>\` family: the model route is \`--compose\` and the owner's table is \`--rbs-file\` (kogaki#1700). Nothing was started. ${USAGE}`,
      );
    if (Object.hasOwn(args, "compose") && args.compose !== true)
      fail(`\`--compose\` takes no value. Nothing was started. ${USAGE}`);
    if (args.compose === true && str("rbs-file"))
      fail(
        `\`--compose\` and \`--rbs-file\` are given together: a Trial's Moves, Correspondence column and Waypoints are composed or the owner's file, never both. Nothing was started. ${USAGE}`,
      );
    if (args.compose !== true && !str("rbs-file"))
      fail(
        `neither \`--compose\` nor \`--rbs-file\` is given: a Trial composes its Moves, Correspondence column and Waypoints, or reads them from the owner's file (kogaki#1700). Nothing was started. ${USAGE}`,
      );
    if (str("structure") && str("mapper"))
      fail(
        `\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`,
      );
    if (Object.hasOwn(args, "strand"))
      fail(
        `\`--strand\` is no flag of the short Trial: its input is \`--proposition <file>\` (kogaki#1685). Nothing was started. ${USAGE}`,
      );
    for (const k of ["proposition", ...(str("mapper") ? [] : ["structure"]), "out"])
      if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
    const r = runShortTrial({
      proposition: str("proposition"),
      structure: str("structure"),
      mapper: str("mapper"),
      out: str("out"),
      compose: args.compose === true,
      rbsFile: str("rbs-file"),
      audience: str("audience"),
      library: str("library"),
    });
    console.log(`trial directory: ${r.outDir}`);
    if (r.stopped) {
      console.log(r.stopped);
      process.exitCode = 1;
    }
  }
}
