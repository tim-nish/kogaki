#!/usr/bin/env node
// The Structure-Mapping Playground's short Trial (kogaki#1669): one Strand, one Move, one paragraph,
// read on a sheet that compares the WBS with the RBS slot; with `projection`, a second paragraph (kogaki#1676).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, resolve, basename, relative, sep } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readerPersona, personaPriorKnowledgeLine, loadMoveContracts } from "../compose.mjs";
import { judgePrompt, resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "../workflow/run-record.mjs";
import { derivedRow } from "../proof-sheet/leg-brief.mjs";
import { installRecorder, stageEnv, declaredCommand, CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { planLeg, paragraphPlanUnitInput, validateParagraphPlanUnit, PARAGRAPH_PLAN_TABLE } from "../paragraph-plan.mjs";
import { renderPacket } from "../draft/render-packet.mjs";
import { splitPacketTemplate } from "../draft/packet.mjs";
import { sectionsOf, sectionOfLeg } from "../draft/workspace.mjs";
import { writerSettings, writerRefusal } from "../draft/writer.mjs";
import { parseYaml, stringifyYaml } from "../yaml.mjs";
import { parseStrandFile, validateStructure, structureClaims } from "./structure.mjs";
import { validateRbsTable, suppliedEntry, attributeHits } from "./rbs.mjs";
import { mapperRow } from "./sme.mjs";
import { PLAYGROUND_TABLE, TRIALS_DIR, TRIAL_FILE, READING_FILE, STRUCTURE_FILE } from "./trial.mjs";
import { renderShortSheet } from "./sheet.mjs";

export const RBS_ROW_PREFIX = "rbs_";
export const RBS_DEFAULT = "rbs_placeholder";
export const RBS_FILE = "rbs.yaml";
export const RBS_OWNER = "owner-authored";
export const BIND_FILE = "bind.yaml";
export const PACKET_FILE = "packet.md";
export const PARAGRAPH_FILE = "paragraph.md";
export const BIND2_FILE = "bind2.yaml";
export const PARAGRAPH2_FILE = "paragraph2.md";
export const SHEET_FILE = "sheet.html";
// `bind2` and `write2` run only when the table carries `projection` (kogaki#1676).
export const SHORT_STAGES = ["sme", "rbs", "bind", "write", "bind2", "write2"];
const LEG_ID = "smp";
const LEG2_ID = "smp-2";
const STRAND_CLAIM_ID = "S0";
const FLOW = { lane: "brief", label: "Structure-Mapping Playground" };
const PACKET_TEMPLATE = join(REPO, "src", "packet-template.md");
const USAGE = "usage: node src/mapping-playground/short.mjs run --strand <file> (--structure <file> | --mapper <sme_map_<variant>>) "
  + "--out <dir under runs/mapping-playground/> [--rbs <rbs_<variant>> | --rbs-file <file>] [--audience <audiences/<name>.md>] [--library <dir>]";

function fail(msg) {
  process.stderr.write(`short: ${msg}\n`);
  process.exit(1);
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fileRecord = (path) => (path && existsSync(path) ? { path: relFromRepo(path), sha256: sha256(path) } : null);
const readTable = () => JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));

// ---------------------------------------------------------------------------
// THE CORRESPONDENCE TABLE: a row `rbs_<variant>` fills it; `fill` names the code that does.

export function rbsRow(table, variant) {
  const rows = Object.keys(table).filter((k) => k.startsWith(RBS_ROW_PREFIX));
  if (!String(variant).startsWith(RBS_ROW_PREFIX) || !table[variant]) {
    return { error: `--rbs ${JSON.stringify(variant)} names no \`${RBS_ROW_PREFIX}<variant>\` row of the Playground's table — it declares ${rows.join(", ") || "none"}` };
  }
  const row = { id: variant, ...table[variant] };
  if (!Object.hasOwn(RBS_FILLS, row.fill)) {
    return { error: `the \`${variant}\` row's \`fill\` ${JSON.stringify(row.fill)} names no fill this runner carries — it carries ${Object.keys(RBS_FILLS).join(", ")}` };
  }
  return { row };
}

const RBS_FILLS = {
  // One pair per structure element, in the structure's order; the variant cannot say which WBS words it reads from.
  structure_elements: (structure) => [
    ...structure.roles.map((r) => ({ base: null, target: r.context })),
    ...structure.relations.map((r) => ({ base: null, target: r.holds })),
    { base: null, target: structure.higher_order.holds },
  ],
};

export function fillRbs(row, structure) {
  return { variant: row.id, placeholder: row.placeholder === true, base: { domain: null, kind: null }, pairs: RBS_FILLS[row.fill](structure) };
}

const targetLine = (target) => (typeof target === "string" ? target.trim() : stringifyYaml(target).trim().replace(/\s*\n\s*/g, "; "));

// ---------------------------------------------------------------------------
// THE ONE LEG: one Leg Waypoint whose `point` is the target texts in order, serving the structure's Claims.

// What the reader holds after paragraph one, composed from the first binding (kogaki#1676).
export function heldLine(rbs) {
  const domain = rbs.base && rbs.base.domain !== null && rbs.base.domain !== undefined ? rbs.base.domain : "null";
  return `The reader holds, in the base's objects (${domain}): ${rbs.waypoints.map((w) => String(w.point).trim()).join(" ")}`;
}

export function shortLeg(structure, rbs, persona) {
  const claims = structureClaims(structure);
  return {
    leg_id: LEG_ID,
    reader_state_before: personaPriorKnowledgeLine(persona),
    reader_state_after: Object.hasOwn(rbs, "projection") ? heldLine(rbs) : null,
    claims: claims.map((c) => ({ strand: c.claim_strand, proposition: c.holds })),
    waypoints: [{ point: rbs.pairs.map((p) => targetLine(p.target)).join(" "), serves: claims.map((c) => c.claim_strand) }],
    introduces: [],
    journeys: [],
  };
}

// THE PROJECTING LEG (kogaki#1676): after Leg 1, from the reader state it leaves, asserting the Strand's claim.
export function projectingLeg(leg1, claim) {
  return {
    leg_id: LEG2_ID,
    depends_on: [leg1.leg_id],
    reader_state_before: leg1.reader_state_after,
    reader_state_after: null,
    claims: [{ strand: STRAND_CLAIM_ID, proposition: claim }, ...leg1.claims],
    waypoints: [{ point: claim, serves: [STRAND_CLAIM_ID] }],
    introduces: [],
    "re-activate": leg1.claims.map((c) => `${leg1.leg_id} claim ${c.strand} as ${c.proposition}`),
    journeys: [],
  };
}

// ONE MODEL CALL through the run's recorder, bounded by `timeoutS`; the answer's text, or the stop.
function oneCall({ env, model, outputFormat, timeoutS, input }) {
  const argv = ["-p", "--model", model, "--output-format", outputFormat, "--tools", "", "--disable-slash-commands",
    "--strict-mcp-config", "--setting-sources", "", "--no-session-persistence"];
  const r = spawnSync(env.KOGAKI_JUDGE_CLI, argv, { input, env, encoding: "utf8", timeout: 1000 * timeoutS, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { stopped: `the call could not finish (${r.error.code || "spawn failed"}: ${r.error.message})` };
  if (r.status !== 0) return { stopped: `the call exited ${r.status === null ? `on ${r.signal}` : r.status}: ${String(r.stderr || "").trim().split("\n")[0] || "(no stderr)"}` };
  if (outputFormat !== "json") return { text: String(r.stdout) };
  try {
    const envl = JSON.parse(r.stdout);
    if (typeof envl === "string") return { text: envl };
    if (envl && typeof envl.result === "string") return { text: envl.result };
  } catch (e) { return { stopped: `the call's json answer does not parse (${e.message})` }; }
  return { stopped: "the call's json answer carries no string `result`" };
}

function answerRecord(text) {
  const stripped = String(text).trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
  try { return { record: JSON.parse(stripped) }; }
  catch (e) { return { stopped: `the binding answer is not one JSON record (${e.message})` }; }
}

function bindStage({ dir, env, leg, persona, libraryDir, table }) {
  const plan = JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
  const d = derivedRow(table, "smp_bind_unit", PLAYGROUND_TABLE);
  if (d.error) return { stopped: d.error };
  const row = { ...plan.paragraph_plan_unit, ...d.row, shared_text_file: plan.paragraph_plan_unit.shared_text_file };
  const library = loadMoveContracts(libraryDir);
  if (library.error) return { stopped: library.error };
  const planned = planLeg(leg);
  const input = paragraphPlanUnitInput(planned, library.moves, persona);
  const held = bindFlow(FLOW);
  let prompt;
  try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
  writeFileSync(join(dir, "prompt.md"), prompt);
  const call = oneCall({ env, model: String(settingValue(plan.judge.model)), outputFormat: String(plan.judge.output_format || "json"),
    timeoutS: Number(settingValue(plan.job.call_limit_s)), input: prompt });
  if (call.stopped) return { stopped: call.stopped };
  const a = answerRecord(call.text);
  if (a.stopped) return { stopped: a.stopped };
  writeFileSync(join(dir, "answer.json"), JSON.stringify(a.record, null, 2) + "\n");
  let v;
  try { v = validateParagraphPlanUnit(a.record, { legs: [planned], movesDir: libraryDir }, "leg-1"); }
  catch (e) { v = { error: String(e && e.message || e) }; }
  if (v.error) return { stopped: v.error.split("\n").join(" ") };
  return { entry: a.record.waypoints[0] };
}

// THE ONE PARAGRAPH: one Packet over a one-Leg, one-Waypoint Brief, and the writer called once with it.
// `before` is the Legs written above this one with their paragraphs, `{ leg, text }`, empty for paragraph one.
export function shortPacket({ leg, entry, audiencePath, before = [] }) {
  const split = splitPacketTemplate(readFileSync(PACKET_TEMPLATE, "utf8"));
  if (split.error) return { error: split.error };
  const packetLeg = { ...leg, waypoints: [{ ...leg.waypoints[0], paragraph_waypoints: entry.paragraph_waypoints }] };
  const brief = { record: { compose_path: relFromRepo(audiencePath) }, legs: [...before.map((b) => b.leg), packetLeg], strands: [] };
  return renderPacket({ template: split.packet, brief, leg: packetLeg, priorSections: before.map((b) => ({ leg_id: b.leg.leg_id, text: b.text })),
    section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
}

function writeStage({ dir, env, leg, entry, audiencePath, paragraphPath, before = [] }) {
  const p = shortPacket({ leg, entry, audiencePath, before });
  if (p.error) return { stopped: p.error };
  const packetPath = join(dir, PACKET_FILE);
  writeFileSync(packetPath, p.packet);
  const w = writerSettings();
  const call = oneCall({ env, model: w.model, outputFormat: w.output_format, timeoutS: w.timeout_s, input: p.packet });
  if (call.stopped) return { stopped: call.stopped, packet: relFromRepo(packetPath) };
  const refused = writerRefusal(call.text);
  if (refused) return { stopped: `the writer refused: ${refused}`, packet: relFromRepo(packetPath) };
  if (String(call.text).trim() === "") return { stopped: "the writer returned no prose", packet: relFromRepo(packetPath) };
  writeFileSync(paragraphPath, String(call.text).trim() + "\n");
  return { packet: relFromRepo(packetPath) };
}

// ---------------------------------------------------------------------------
// THE SHORT TRIAL.

function readStrand(strandFile) {
  let text;
  try { text = readFileSync(strandFile, "utf8"); } catch (e) { fail(`the strand file cannot be read (${e.message}). Nothing was started.`); }
  const strand = parseStrandFile(text);
  if (strand.error) fail(`${strand.error}. Nothing was started.`);
  return strand;
}

function readRbsFile(file, strand, libraryDir) {
  let record;
  try { record = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the correspondence table cannot be read (${e.message})` }; }
  const v = validateRbsTable(record, strand.claim, { movesDir: libraryDir });
  return v.error ? v : { record: { ...record, variant: RBS_OWNER, placeholder: false } };
}

function readStructure(file, strand) {
  let structure;
  try { structure = parseYaml(readFileSync(file, "utf8"), file); } catch (e) { return { error: `the structure cannot be read (${e.message})` }; }
  const v = validateStructure(structure, strand);
  return v.error ? v : { structure };
}

export function runShortTrial({ strand: strandFile, structure: givenStructure = null, mapper = null, out, rbs = RBS_DEFAULT,
  rbsFile = null, audience = null, library = null }) {
  const outDir = resolve(out);
  const rel = relative(resolve(REPO, TRIALS_DIR), outDir);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep)) fail(`--out ${out} is not a directory under ${TRIALS_DIR}/. Nothing was started.`);
  if (existsSync(join(outDir, TRIAL_FILE))) fail(`a Trial already exists at ${outDir}, and nothing was written over it. Nothing was started.`);
  const table = readTable();
  const rr = rbsFile ? { row: { id: RBS_OWNER, placeholder: false } } : rbsRow(table, rbs);
  if (rr.error) fail(`${rr.error}. Nothing was started.`);
  const strand = readStrand(strandFile);
  if (mapper) {
    const m = mapperRow(table, mapper);
    if (m.error) fail(`${m.error}. Nothing was started.`);
  } else {
    const s = readStructure(givenStructure, strand);
    if (s.error) fail(`${s.error}. Nothing was started.`);
  }
  const structureFile = mapper ? join(outDir, STRUCTURE_FILE) : resolve(givenStructure);
  const audiencePath = resolve(REPO, audience || String(settingValue({ setting: "brief.audience_file" })));
  const persona = readerPersona(audiencePath);
  if (persona.error) fail(`${persona.error}. Nothing was started.`);
  const libraryDir = resolve(REPO, library || "moves");
  if (!existsSync(libraryDir)) fail(`the library ${libraryDir} does not exist. Nothing was started.`);
  const owned = rbsFile ? readRbsFile(rbsFile, strand, libraryDir) : null;
  if (owned && owned.error) fail(`${owned.error}. Nothing was started.`);
  const realPath = resolveJudgeBinary(String(declaredCommand()), process.env.PATH).path;
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
    strand: { cite: strand.cite, path: relFromRepo(resolve(strandFile)), sha256: sha256(strandFile) },
    structure: mapper ? { path: relFromRepo(structureFile), sha256: null, author: "sme" }
      : { path: relFromRepo(structureFile), sha256: sha256(structureFile), author: "owner" },
    mapper: mapper ? { variant: mapper, prompt_sha256: null } : "owner-authored",
    rbs: { variant: rr.row.id, placeholder: rr.row.placeholder === true, path: null, sha256: null },
    bind: { move: null, grounds: null, path: null, sha256: null },
    paragraph: { path: null, sha256: null },
    ...(owned && Object.hasOwn(owned.record, "projection")
      ? { projection: { bind: { move: null, grounds: null, path: null, sha256: null }, paragraph: { path: null, sha256: null } } } : {}),
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
    record.stages.push({ stage: name, state: r.stopped ? "stopped" : "done", calls: existsSync(calls) ? relFromRepo(calls) : null, ...shown });
    if (r.stopped) record.stopped = `${name}: ${r.stopped}`;
    save();
    return r.stopped ? null : (value ?? {});
  };
  save();
  if (mapper) {
    stage("sme", (d, env) => {
      const job = join(d, "job");
      const c = spawnSync(process.execPath, ["src/mapping-playground/trial.mjs", "map", "--strand", resolve(strandFile), "--mapper", mapper,
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
  const table1 = stage("rbs", () => {
    const s = readStructure(structureFile, strand);
    if (s.error) return { stopped: s.error };
    structure = s.structure;
    if (owned) {
      copyFileSync(rbsFile, rbsPath);
      record.rbs = { variant: RBS_OWNER, placeholder: false, ...fileRecord(rbsPath) };
      return { value: owned.record };
    }
    const filled = fillRbs(rr.row, structure);
    const v = validateRbsTable(filled, strand.claim, { movesDir: libraryDir });
    if (v.error) return { stopped: v.error };
    writeFileSync(rbsPath, stringifyYaml(filled));
    record.rbs = { variant: filled.variant, placeholder: filled.placeholder, ...fileRecord(rbsPath) };
    return { value: filled };
  });
  const leg = table1 ? shortLeg(structure, table1, persona) : null;
  const entry = stage("bind", (d, env) => {
    const supplied = suppliedEntry(table1, leg.waypoints[0].serves);
    if (supplied) {
      writeFileSync(bindPath, stringifyYaml(supplied));
      record.bind = { state: "supplied", author: "owner", move: supplied.move, grounds: supplied.grounds, ...fileRecord(bindPath) };
      return { value: supplied };
    }
    const r = bindStage({ dir: d, env, leg, persona, libraryDir, table });
    if (r.stopped) return r;
    const bound = { ...r.entry, grounds: null };
    writeFileSync(bindPath, stringifyYaml(bound));
    record.bind = { move: bound.move, grounds: null, ...fileRecord(bindPath) };
    return { value: bound };
  });
  stage("write", (d, env) => {
    const r = writeStage({ dir: d, env, leg, entry, audiencePath, paragraphPath });
    if (!r.stopped) record.paragraph = fileRecord(paragraphPath);
    return r;
  });
  let leg2 = null;
  let entry2 = null;
  if (record.projection) {
    const projection = owned.record.projection;
    leg2 = leg ? projectingLeg(leg, strand.claim) : null;
    entry2 = stage("bind2", () => {
      const supplied = suppliedEntry(projection, leg2.waypoints[0].serves);
      const bound = { state: "supplied", author: "owner", ...supplied, attribute_hits: attributeHits(projection.waypoints, structure.attributes) };
      writeFileSync(join(outDir, BIND2_FILE), stringifyYaml(bound));
      record.projection.bind = { state: "supplied", author: "owner", move: bound.move, grounds: bound.grounds,
        attribute_hits: bound.attribute_hits, ...fileRecord(join(outDir, BIND2_FILE)) };
      return { value: bound };
    });
    stage("write2", (d, env) => {
      const paragraph2Path = join(outDir, PARAGRAPH2_FILE);
      const r = writeStage({ dir: d, env, leg: leg2, entry: entry2, audiencePath, paragraphPath: paragraph2Path,
        before: [{ leg: { ...leg, waypoints: [{ ...leg.waypoints[0], paragraph_waypoints: entry.paragraph_waypoints }] },
          text: readFileSync(paragraphPath, "utf8").trim() }] });
      if (!r.stopped) record.projection.paragraph = fileRecord(paragraph2Path);
      return r;
    });
  }
  record.finished_at = new Date().toISOString();
  save();
  const sheet = renderShortSheet({ outDir, record, strand, structure, table: table1, entry, paragraphPath, leg, entry2,
    paragraph2Path: join(outDir, PARAGRAPH2_FILE) });
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
  if (str("rbs") && str("rbs-file")) fail(`\`--rbs\` and \`--rbs-file\` are given together: a Trial's correspondence table is a variant row's or the owner's file, never both. Nothing was started. ${USAGE}`);
  if (str("structure") && str("mapper")) fail(`\`--structure\` and \`--mapper\` are given together: a Trial's structure is owner-authored or mapped, never both. Nothing was started. ${USAGE}`);
  for (const k of ["strand", ...(str("mapper") ? [] : ["structure"]), "out"]) if (!str(k)) fail(`\`--${k}\` is required. ${USAGE}`);
  const r = runShortTrial({ strand: str("strand"), structure: str("structure"), mapper: str("mapper"), out: str("out"),
    rbs: str("rbs") || RBS_DEFAULT, rbsFile: str("rbs-file"), audience: str("audience"), library: str("library") });
  console.log(`trial directory: ${r.outDir}`);
  if (r.stopped) { console.log(r.stopped); process.exitCode = 1; }
}
