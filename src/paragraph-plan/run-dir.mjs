// paragraph-plan/run-dir — the run directory and the start act that opens it. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { loadMoveContracts, paragraphsPerLeg, personaPriorKnowledgeLine, readerPersona, sha256 } from "../compose.mjs";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { relFromRepo } from "../workflow/run-record.mjs";
import {
  jobHeartbeatMs,
  jobStallS,
  readReaderPathJob,
  readerPathJobPath,
  readerPathUnitCandidatePath,
  readerPathUnitSpecializationPath,
  startDetachedJobSupervisor,
} from "../workflow/detached-job.mjs";
import { enterRun, laneDir } from "../runs.mjs";
import {
  ANALOGY_DIR,
  ANALOGY_FILE,
  ANALOGY_ROW,
  ANALOGY_UNIT,
  NO_STRUCTURE_REASON,
  analogyMappingInput,
  analogyRecord,
  readAnalogy,
  writeAnalogy,
} from "../paragraph-plan-analogy.mjs";
import {
  axesFailures,
  criteriaFailures,
  legStrand,
  mappingStatePath,
  paragraphPlanUnitPrompt,
  readAxes,
} from "./axes.mjs";
import { audiencePathOf, readAdoptedBrief } from "./brief.mjs";
import { paragraphPlanInputPath, planCallInputRow } from "./selection-input.mjs";
import { DONE_FILE, LEG_JOB_FILE, PARAGRAPH_PLAN_TABLE, START_FILE, fail, writeJson } from "./stage.mjs";
import { paragraphPlanUnitInput, planLeg, planLegOptions, renderRowHead, unitIdFor } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE RUN DIRECTORY. In the Brief's lane, under the Brief's slug and the start instant,
// so a re-run on the same Brief opens a new one and the newest is found by name.

function runPrefix(slug) {
  return `paragraph-plan-${slug}-`;
}

export function latestRunDir(slug, root = laneDir("brief")) {
  if (!existsSync(root)) return null;
  const names = readdirSync(root)
    .filter((n) => n.startsWith(runPrefix(slug)))
    .sort();
  return names.length ? join(root, names[names.length - 1]) : null;
}

export function supervisorAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

export function slugOf(record, briefPath) {
  return typeof record.slug === "string" && record.slug !== "" ? record.slug : basename(dirname(resolve(briefPath)));
}

function loadTable() {
  return JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
}

function positiveSetting(row, key) {
  const n = Number(settingValue(row && row[key]));
  return Number.isInteger(n) && n > 0
    ? n
    : fail(
        `src/paragraph-plan-workflow.json's \`job\` declares no positive \`${key}\` -- it names a setting in kogaki.settings.json. Nothing was started.`,
      );
}

// THE LEGS A PRIOR RUN FINISHED, CARRIED INTO THIS ONE (kogaki#1641, owner decision
// 2026-10-31): a ParagraphPlan is designed for one Leg alone, so a Leg a prior run of the
// SAME inputs already finished -- the same Brief by content hash, the same Move library --
// is not planned again. Its candidate and verdict files are copied into the new run
// directory and its row is written `done` with `carried_from` naming the earlier run; no
// session is spawned for it. A prior run whose plan file was already written carries
// nothing, as does one over a different Brief or library.
function carriedUnits(source, dir, { briefSha, movesDir, legs }) {
  if (!source || resolve(source) === resolve(dir)) return [];
  if (existsSync(join(source, DONE_FILE)) || !existsSync(join(source, START_FILE))) return [];
  const job = readReaderPathJob(source);
  if (!job || !Array.isArray(job.units)) return [];
  let start;
  try {
    start = JSON.parse(readFileSync(join(source, START_FILE), "utf8"));
  } catch {
    return [];
  }
  if (start.brief_sha256 !== briefSha || start.moves_dir !== movesDir) return [];
  // A KEPT LEG WAS PLANNED UNDER ITS RUN'S ANALOGY MAPPING (kogaki#1778), so the mapping is carried with it.
  if (!existsSync(join(source, ANALOGY_FILE))) return [];
  const ids = new Set(legs.map((_, i) => unitIdFor(i)));
  const copy = (from, to) => {
    if (from && existsSync(from)) {
      copyFileSync(from, to);
      return to;
    }
    return undefined;
  };
  return job.units
    .filter((u) => u.status === "done" && u.candidate && ids.has(u.id))
    .map((u) => {
      const candidateFile = copy(u.candidate_file, readerPathUnitCandidatePath(dir, u.id));
      const specializationFile = copy(u.specialization_file, readerPathUnitSpecializationPath(dir, u.id));
      if (existsSync(mappingStatePath(source, u.id))) {
        mkdirSync(dirname(mappingStatePath(dir, u.id)), { recursive: true });
        copy(mappingStatePath(source, u.id), mappingStatePath(dir, u.id));
      }
      return {
        id: u.id,
        status: "done",
        bytes: u.bytes || 0,
        rounds: u.rounds || 1,
        phase: u.phase || "fit",
        candidate: u.candidate,
        ...(candidateFile ? { candidate_file: candidateFile } : {}),
        ...(u.specialization ? { specialization: u.specialization } : {}),
        ...(specializationFile ? { specialization_file: specializationFile } : {}),
        carried_from: relFromRepo(resolve(source)),
      };
    });
}

// START: read the adopted Brief, the Move library and the Audience's persona, render one
// prompt per Leg, and hand the units to the shared supervisor. Returns the run directory.
// `priorRun` names the run whose finished Legs are carried; it is the latest run of the same
// Brief unless handed in (a fixture's run directories live outside the lane).
export function startParagraphPlan(briefPath, { runDir = null, movesDir = "moves", priorRun = undefined } = {}) {
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  const slug = slugOf(brief.record, briefPath);
  const latest = priorRun !== undefined ? priorRun || null : latestRunDir(slug);
  const prior = runDir
    ? [runDir, analogyDir(runDir)].some((d) => existsSync(readerPathJobPath(d)))
      ? runDir
      : null
    : latest;
  if (prior) {
    const job = readReaderPathJob(prior);
    const opening = readReaderPathJob(analogyDir(prior));
    if ([job, opening].some((j) => j && j.state === "running" && supervisorAlive(j.supervisor_pid))) {
      fail(
        `a ParagraphPlan job for this Brief is still running at ${relFromRepo(prior)} — run ` +
          `\`node src/paragraph-plan.mjs await --brief ${relFromRepo(resolve(briefPath))}\` to poll it. Nothing was started.`,
      );
    }
  }
  const table = loadTable();
  const library = loadMoveContracts(movesDir);
  if (library.error) fail(library.error);
  if (!library.moves.length)
    fail(`the Move library at ${movesDir} holds no Move — there is nothing to bind. Nothing was started.`);
  const persona = readerPersona(audiencePathOf(brief.record));
  if (persona.error) fail(persona.error);
  const row =
    table.paragraph_plan_unit ||
    fail("src/paragraph-plan-workflow.json declares no paragraph_plan_unit row. Nothing was started.");
  const judgeRow =
    table.paragraph_plan_judge_unit ||
    fail("src/paragraph-plan-workflow.json declares no paragraph_plan_judge_unit row. Nothing was started.");
  const siteRow =
    table.paragraph_plan_site_unit ||
    fail("src/paragraph-plan-workflow.json declares no paragraph_plan_site_unit row. Nothing was started.");
  const unbounded = criteriaFailures(table);
  if (unbounded.length)
    fail(
      `src/paragraph-plan-workflow.json's rows are not named criteria under their bound (kogaki#1511): ${unbounded.join("; ")}. Nothing was started.`,
    );
  const unjustified = axesFailures(readAxes());
  if (unjustified.length)
    fail(
      `src/paragraph-plan-axes.json is not a registry of kept axes (kogaki#1533): ${unjustified.join("; ")}. Nothing was started.`,
    );
  const callLimitS = positiveSetting(table.job, "call_limit_s");
  const unitRounds = positiveSetting(table.job, "unit_rounds");
  const siteRetry =
    table.job.site_retry ||
    fail("src/paragraph-plan-workflow.json's `job` declares no `site_retry` (kogaki#1642). Nothing was started.");
  const legRevisions = positiveSetting(siteRetry, "leg_revisions");
  // THE BOUND ON A LEG'S PARAGRAPHS (kogaki#1777), read once at the start and handed to every reader.
  const bound = paragraphsPerLeg();
  // THE MAPPER (kogaki#1734): reading, bind, grounding and the Waypoints call, in that order, per Leg.
  const mapping = settingValue(table.job.mapper) === true;
  const declared = process.env.KOGAKI_JUDGE_CLI || table.judge.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const legOptions = planLegOptions(brief.legs, brief.record.structure || null, personaPriorKnowledgeLine(persona));
  const legs = brief.legs.map((leg, i) => planLeg(leg, legOptions[i]));
  const dir = runDir || enterRun("brief", `${runPrefix(slug)}${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const briefSha = sha256(brief.text);
  const carried = carriedUnits(latest, dir, { briefSha, movesDir, legs });
  const carriedIds = new Set(carried.map((u) => u.id));
  writeJson(join(dir, START_FILE), {
    brief: relFromRepo(resolve(briefPath)),
    brief_sha256: briefSha,
    started_at: new Date().toISOString(),
    moves_dir: movesDir,
    legs,
    ...(carried.length
      ? {
          carried: carried.map((u) => ({
            unit: u.id,
            leg_id: legs[Number(u.id.split("-")[1]) - 1].leg_id,
            from: u.carried_from,
          })),
        }
      : {}),
  });
  const unitInputs = legs.map((leg) => paragraphPlanUnitInput(leg, library.moves, persona, bound));
  for (const [i, leg] of legs.entries()) {
    const id = unitIdFor(i);
    const prior = carriedIds.has(id) && latest ? paragraphPlanInputPath(latest, id) : null;
    if (prior && existsSync(prior)) copyFileSync(prior, paragraphPlanInputPath(dir, id));
    else
      writeJson(paragraphPlanInputPath(dir, id), {
        leg_id: leg.leg_id,
        unit: id,
        plan_call: planCallInputRow(unitInputs[i]),
        site_calls: [],
      });
  }
  const units = legs
    .map((leg, i) => ({ id: unitIdFor(i), prompt: paragraphPlanUnitPrompt(row, unitInputs[i]), input: unitInputs[i] }))
    .filter((u) => !carriedIds.has(u.id));
  const planned = { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) };
  const planHead = renderRowHead({ id: "paragraph_plan_unit", ...row });
  const legJob = {
    units,
    carried,
    command: binary.path,
    commandVersion: binary.version,
    model,
    outputFormat: String(table.judge.output_format || "json"),
    rows: Object.fromEntries(
      [
        ["compose", "paragraph_plan_unit"],
        ["fit", "paragraph_plan_judge_unit"],
        ["site", "paragraph_plan_site_unit"],
        ["suffix", "paragraph_plan_unit"],
      ].map(([phase, id]) => [phase, { id, table: relFromRepo(PARAGRAPH_PLAN_TABLE) }]),
    ),
    callLimitS,
    unitRounds,
    unitIsolation: table.job.unit_isolation === true,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
    recordArray: "paragraphs",
    validator: {
      module: "src/paragraph-plan.mjs",
      export: "validateParagraphPlanUnit",
      inputs: { legs, movesDir, runDir: dir, mapping, bound },
    },
    ...(mapping
      ? {
          mapper: {
            module: "src/paragraph-plan-mapper.mjs",
            export: "ParagraphPlanMapper",
            inputs: {
              legs,
              strands: brief.legs.map((leg) => legStrand(leg, brief.record.strands)),
              movesDir,
              persona: planned,
              planHead,
              structure: brief.record.structure || null,
            },
          },
        }
      : {}),
    fitJudge: {
      module: "src/paragraph-plan.mjs",
      prompt_export: "paragraphPlanJudgePrompt",
      verdict_export: "paragraphPlanJudgeVerdict",
      // The run directory and the Mapper flag carry the Leg's grounded table to the judge (kogaki#1811).
      inputs: { legs, movesDir, runDir: dir, mapping, promptHead: renderRowHead(judgeRow) },
    },
    // THE SITE LOOP (kogaki#1642): a refusal naming a paragraph is retried there alone.
    siteRetry: {
      module: siteRetry.module,
      site_prompt_export: siteRetry.site_prompt_export,
      site_validator_export: siteRetry.site_validator_export,
      suffix_prompt_export: siteRetry.suffix_prompt_export,
      suffix_validator_export: siteRetry.suffix_validator_export,
      mark_export: siteRetry.mark_export,
      repair_export: siteRetry.repair_export,
      leg_revisions: legRevisions,
      record_array: "paragraphs",
      site_label: "paragraph",
      inputs: {
        legs,
        movesDir,
        runDir: dir,
        mapping,
        bound,
        persona: planned,
        axes: readAxes().axes.map((a) => String(a.id)),
        siteHead: renderRowHead({ id: "paragraph_plan_site_unit", ...siteRow }),
        planHead,
      },
    },
  };
  const bounds = {
    binary,
    model,
    outputFormat: String(table.judge.output_format || "json"),
    callLimitS,
    unitRounds,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
  };
  // THE ANALOGY MAPPING COMES FIRST (kogaki#1778): carried with the kept Legs, `none` for a Brief with no
  // structure, or one judgment run before the Leg job, which `await` starts once it is resolved.
  if (carried.length) copyFileSync(join(latest, ANALOGY_FILE), join(dir, ANALOGY_FILE));
  else if (!brief.record.structure) writeAnalogy(dir, { none: NO_STRUCTURE_REASON });
  if (readAnalogy(dir)) startLegJob(dir, legJob);
  else {
    writeJson(join(dir, LEG_JOB_FILE), legJob);
    startAnalogyJob(dir, table, brief.record.structure, persona, bounds);
  }
  return dir;
}

// The Leg job, every reader handed the run's Analogy Mapping.
function startLegJob(dir, legJob) {
  const analogy = readAnalogy(dir);
  const add = (o) => (o ? { ...o, inputs: { ...o.inputs, analogy } } : o);
  startDetachedJobSupervisor(dir, {
    ...legJob,
    mapper: add(legJob.mapper),
    fitJudge: add(legJob.fitJudge),
    siteRetry: add(legJob.siteRetry),
  });
}

// THE OPENING STEP (kogaki#1778): one unit, `analogy_mapping`, in the run directory's `analogy/`.
export const analogyDir = (dir) => join(dir, ANALOGY_DIR);
function startAnalogyJob(dir, table, structure, persona, b) {
  const row =
    table[ANALOGY_ROW] || fail(`src/paragraph-plan-workflow.json declares no ${ANALOGY_ROW} row. Nothing was started.`);
  const input = analogyMappingInput(structure, persona);
  mkdirSync(analogyDir(dir), { recursive: true });
  startDetachedJobSupervisor(analogyDir(dir), {
    units: [{ id: ANALOGY_UNIT, prompt: paragraphPlanUnitPrompt(row, input), input }],
    command: b.binary.path,
    commandVersion: b.binary.version,
    model: b.model,
    outputFormat: b.outputFormat,
    rows: { compose: { id: ANALOGY_ROW, table: relFromRepo(PARAGRAPH_PLAN_TABLE) } },
    callLimitS: b.callLimitS,
    unitRounds: b.unitRounds,
    stallS: b.stallS,
    heartbeatMs: b.heartbeatMs,
    recordArray: false,
    validator: { module: "src/paragraph-plan-analogy.mjs", export: "validateAnalogyMapping", inputs: { structure } },
  });
}

// The opening step's end: the mapping written and the Leg job started, or `{ stopped: lines }`.
export function finishAnalogyJob(dir) {
  const job = readReaderPathJob(analogyDir(dir));
  const u = job && (job.units || [])[0];
  if (!job || job.state !== "done" || !u || u.status !== "done" || !u.candidate) {
    const last =
      u && Array.isArray(u.refusals) && u.refusals.length
        ? u.refusals[u.refusals.length - 1]
        : (u && u.failure && u.failure.stderr_tail) ||
          (job && job.failure && job.failure.note) ||
          (u ? u.status : "no unit");
    const start = JSON.parse(readFileSync(join(dir, START_FILE), "utf8"));
    return {
      stopped: [
        `ParagraphPlan stopped: the Analogy Mapping ended ${job ? job.state : "with no job record"} before any Leg ` +
          `was planned, and the Brief at ${start.brief} is unchanged — nothing was written beside it.`,
        `  Analogy Mapping: ${String(last).split("\n").join(" ")}`,
        "  Next: run /paragraph-plan on the same Brief again; it chooses the Analogy Mapping first.",
      ],
    };
  }
  writeAnalogy(dir, analogyRecord(u.candidate));
  startLegJob(dir, JSON.parse(readFileSync(join(dir, LEG_JOB_FILE), "utf8")));
  return {};
}
