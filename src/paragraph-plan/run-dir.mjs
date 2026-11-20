// paragraph-plan/run-dir — the run directory and the start act that opens it. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { loadMoveContracts, personaPriorKnowledgeLine, readerPersona, sha256 } from "../compose.mjs";
import { resolveJudgeBinary, settingValue } from "../workflow/judge.mjs";
import { relFromRepo, readRowTable } from "../workflow/run-record.mjs";
import {
  jobHeartbeatMs,
  jobStallS,
  readReaderPathJob,
  readerPathJobPath,
  readerPathUnitCandidatePath,
  startDetachedJobSupervisor,
} from "../workflow/detached-job.mjs";
import { enterRun, laneDir } from "../runs.mjs";
import { audiencePathOf, readAdoptedBrief } from "./brief.mjs";
import { CANDIDATES_SETTING, NAME_ROW } from "./move-choice.mjs";
import { legSentences } from "../sme/arguments.mjs";
import { DONE_FILE, PARAGRAPH_PLAN_TABLE, START_FILE, fail, writeJson } from "./stage.mjs";
import { planLeg, planLegOptions, unitIdFor } from "./units.mjs";

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
  return readRowTable(PARAGRAPH_PLAN_TABLE);
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
// is not planned again. Its candidate file is copied into the new run directory and its row
// is written `done` with `carried_from` naming the earlier run; no call is made for it. A
// prior run whose plan file was already written carries nothing, as does one over a
// different Brief or library.
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
  const ids = new Set(legs.map((_, i) => unitIdFor(i)));
  return job.units
    .filter((u) => u.status === "done" && u.candidate && ids.has(u.id))
    .map((u) => {
      const to = readerPathUnitCandidatePath(dir, u.id);
      const copied = u.candidate_file && existsSync(u.candidate_file);
      if (copied) copyFileSync(u.candidate_file, to);
      return {
        id: u.id,
        status: "done",
        bytes: u.bytes || 0,
        rounds: u.rounds || 1,
        phase: u.phase || "reading",
        candidate: u.candidate,
        ...(copied ? { candidate_file: to } : {}),
        carried_from: relFromRepo(resolve(source)),
      };
    });
}

// THE LEG'S SENTENCES (kogaki#1865): its Arguments and CentralClaim, `legSentences` at the Leg's `relation` in the
// Brief's `structure`; the Senses are read between them. A Brief with no `structure`, or a Leg whose relation it
// does not carry, is refused before anything starts.
function sentencesOfLegs(brief) {
  const structure = brief.record.structure;
  if (!structure)
    fail(
      "the Brief carries no `structure`, and each Leg's Senses are read between the sentences of its relation in it (kogaki#1865). Nothing was started.",
    );
  const whole = {
    roles: structure.roles || [],
    relations: structure.relations || [],
    higher_order: structure.higher_order || [],
  };
  return brief.legs.map((leg) => {
    if (![...whole.relations, ...whole.higher_order].some((r) => r.id === leg.relation))
      fail(
        `the Brief's Leg ${leg.leg_id} names the relation ${JSON.stringify(leg.relation)}, which its \`structure\` does not carry, so the Leg has no sentences to read (kogaki#1865). Nothing was started.`,
      );
    return legSentences(whole, leg.relation);
  });
}

// START: read the adopted Brief, the Move library and the Audience's persona, and hand one unit per Leg to the shared
// supervisor, each unit's two steps run by `ParagraphPlanLegSteps` (src/paragraph-plan/steps.mjs, kogaki#1876).
// Returns the run directory. `priorRun` names the run whose finished Legs are carried; it is the latest run of the
// same Brief unless handed in (a fixture's run directories live outside the lane).
export function startParagraphPlan(briefPath, { runDir = null, movesDir = "moves", priorRun = undefined } = {}) {
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  const slug = slugOf(brief.record, briefPath);
  const latest = priorRun !== undefined ? priorRun || null : latestRunDir(slug);
  const prior = runDir ? (existsSync(readerPathJobPath(runDir)) ? runDir : null) : latest;
  if (prior) {
    const job = readReaderPathJob(prior);
    if (job && job.state === "running" && supervisorAlive(job.supervisor_pid)) {
      fail(
        `a ParagraphPlan job for this Brief is still running at ${relFromRepo(prior)} — run ` +
          `\`node src/paragraph-plan.mjs await --brief ${relFromRepo(resolve(briefPath))}\` to poll it. Nothing was started.`,
      );
    }
  }
  const table = loadTable();
  if (!table[NAME_ROW]) fail(`src/paragraph-plan-workflow.json declares no ${NAME_ROW} row. Nothing was started.`);
  const library = loadMoveContracts(movesDir);
  if (library.error) fail(library.error);
  if (!library.moves.length)
    fail(`the Move library at ${movesDir} holds no Move — there is nothing to choose. Nothing was started.`);
  const unedged = library.moves.find((m) => !m.segments.every((s) => Array.isArray(s.edges)));
  if (unedged)
    fail(
      `the Move ${unedged.id} in ${movesDir} carries no \`bind\` and \`edges\` on its Segments, and a Move is chosen by its Edges (kogaki#1865). Nothing was started.`,
    );
  const persona = readerPersona(audiencePathOf(brief.record));
  if (persona.error) fail(persona.error);
  const sentences = sentencesOfLegs(brief);
  const keep = Number(settingValue({ setting: CANDIDATES_SETTING }));
  if (!Number.isInteger(keep) || keep <= 0)
    fail(`kogaki.settings.json's \`${CANDIDATES_SETTING}\` is not a positive integer. Nothing was started.`);
  const callLimitS = positiveSetting(table.job, "call_limit_s");
  const unitRounds = positiveSetting(table.job, "unit_rounds");
  const declared = process.env.KOGAKI_JUDGE_CLI || table.judge.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const legOptions = planLegOptions(brief.legs, brief.record.structure || null, personaPriorKnowledgeLine(persona));
  const legs = brief.legs.map((leg, i) => planLeg(leg, legOptions[i]));
  const dir = runDir || enterRun("brief", `${runPrefix(slug)}${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(dir, { recursive: true });
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
  const units = legs
    .map((leg, i) => ({ id: unitIdFor(i), prompt: "", input: { leg_id: leg.leg_id, sentences: sentences[i] } }))
    .filter((u) => !carriedIds.has(u.id));
  startDetachedJobSupervisor(dir, {
    units,
    carried,
    command: binary.path,
    commandVersion: binary.version,
    model,
    outputFormat: String(table.judge.output_format || "json"),
    callLimitS,
    unitRounds,
    unitIsolation: table.job.unit_isolation === true,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
    recordArray: false,
    validator: { module: "src/paragraph-plan/steps.mjs", export: "validateParagraphPlanLeg" },
    mapper: {
      module: "src/paragraph-plan/steps.mjs",
      export: "ParagraphPlanLegSteps",
      inputs: { legs, sentences, moves: library.moves.map((m) => ({ id: m.id, segments: m.segments })), keep },
    },
  });
  return dir;
}
