// workflow/detached-job/job-state — the job record: its file, its states, its reductions and its
// failure block. Cut from src/workflow/detached-job.mjs along its headed sections (kogaki#1800);
// the design and its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { readJson } from "../run-record.mjs";
import { RETIRED_NAMES } from "../call-record.mjs";

const READER_PATH_JOB_FILE = "reader-path-job.json";
// A UNIT IS BOUNDED PER CALL AND PER ROUND COUNT, NEVER BY A WHOLE-JOB LIMIT
// (kogaki#1355, superseding kogaki#1273's one retry that fits). `call_limit_s` and
// `unit_rounds` are read by the job's starter from `kogaki.settings.json` and written
// onto the job record, which the supervisor enforces and `job await` reads back. A job's
// longest run is `unit_rounds` x (calls per Round + `unit_rounds` malformed
// respawns, each a full call spending no Round) x `call_limit_s`.
// NO BYTE GROWTH ON ANY STILL-RUNNING UNIT FOR THIS LONG is read as a stall — a declared
// heuristic, kept narrower than the per-call limit.
// Per kogaki#1193 comment 3, this one output-byte bound stands in for both of the Issue's
// heartbeat and output signals.
export const READER_PATH_JOB_STALL_S = 90;

export function readerPathJobPath(dir) {
  return join(dir, READER_PATH_JOB_FILE);
}
export function readerPathJobStopFlagPath(dir) {
  return join(dir, "reader-path-job.stop");
}

export function readReaderPathJob(dir) {
  const p = readerPathJobPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

export function writeReaderPathJob(dir, doc) {
  doc.updated_at = new Date().toISOString();
  const p = readerPathJobPath(dir);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n");
  renameSync(tmp, p);
  return doc;
}

// THE THREE SYSTEM-FAILURE STATES (kogaki#1273). A candidate REFUSAL is the
// unit's own answer failing its checks; these three are the job itself going
// wrong -- a unit that exited non-zero or never spawned (`died`), no output
// growth for the stall bound (`stalled`), and the supervisor's own catch-all
// (`other`). The owner's 2026-10-05 ruling: a system failure is a defect in
// /brief, never retried and never raised as a question, and it ends the Brief.
export const READER_PATH_JOB_SYSTEM_FAILURE_STATES = ["died", "stalled", "other"];

// THE REDUCTION OVER A FINISHED SET (kogaki#1273). One finished Candidate is
// enough: the job is `done` when at least one unit is `done`, whatever its
// siblings ended as, and `refused` only when every unit was refused.
// UNDER UNIT ISOLATION (kogaki#1641) every unit is its own job: `done` only when
// every unit is `done`, otherwise the worst unit state in this order -- `died`,
// then `refused`.
function reduceFinishedReaderPathUnits(units, { unitIsolation = false } = {}) {
  if (unitIsolation) {
    if (units.some((u) => u.status === "died")) return "died";
    if (units.some((u) => u.status === "refused")) return "refused";
    return "done";
  }
  if (units.some((u) => u.status === "done")) return "done";
  if (units.some((u) => u.status === "refused")) return "refused";
  return "done";
}

// THE OVERALL JOB STATE, REDUCED FROM ITS UNITS (kogaki#1193, revised
// kogaki#1204, kogaki#1273 and kogaki#1355). A REFUSED unit does not end the job
// while a sibling is still running -- killing a running sibling on one unit's own
// refusal is exactly the loss #1204 was filed over. A DIED unit does, at once
// (kogaki#1273): it is a system failure, so it is answered on the tick it is
// seen rather than after its siblings finish. `stop_requested` is read first,
// because the owner's stop click is answered whatever a unit is doing; the stall
// bound is read only while a unit is still running. There is no whole-job time
// bound (kogaki#1355): a call past `call_limit_s` is the unit's own Round to
// spend, answered by the supervisor, never a state of the job.

// UNDER UNIT ISOLATION (kogaki#1641, owner decision 2026-10-31) a died unit ends
// that unit alone: its siblings keep running, and the job is reduced from the
// finished set once none is. The owner's stop and the supervisor's own stall are
// still read on their tick, as they are facts about the job rather than a unit.
export function classifyDetachedJobState(
  units,
  { stopRequested, stalledS, stallS = READER_PATH_JOB_STALL_S, unitIsolation = false } = {},
) {
  if (stopRequested) return "stopped";
  if (!unitIsolation && units.some((u) => u.status === "died")) return "died";
  const running = units.filter((u) => u.status === "running");
  if (running.length === 0) return reduceFinishedReaderPathUnits(units, { unitIsolation });
  if (stalledS >= stallS) return "stalled";
  return "running";
}

// THE RETIRED JOB-LIMIT KEYS (kogaki#1355): the two settings and the record field
// they were written onto. A record still carrying one is refused naming it, as a
// missing key is refused: a whole-job limit that silently stopped binding would
// read as one still in force.
export const RETIRED_JOB_LIMIT_KEYS = ["compose_job_limit_s", "review_job_limit_s", "absolute_limit_s"];

// THE JOB'S OWN TWO BOUNDS, READ OFF ITS RECORD (kogaki#1355): `call_limit_s` and
// `unit_rounds` as its starter wrote them from `kogaki.settings.json`, never a
// constant of this file and never defaulted.
export function readerPathJobBounds(job) {
  for (const k of RETIRED_JOB_LIMIT_KEYS) {
    if (job && Object.prototype.hasOwnProperty.call(job, k)) {
      throw new Error(
        `the job record carries \`${k}\`, a whole-job limit retired by kogaki#1355 -- a unit is bounded by \`call_limit_s\` and \`unit_rounds\` alone.`,
      );
    }
  }
  if (job && Object.prototype.hasOwnProperty.call(job, RETIRED_NAMES.unitBound)) {
    throw new Error(
      `the job record carries \`${RETIRED_NAMES.unitBound}\`, renamed \`unit_rounds\` (kogaki#1760) -- a job written under the old name is not resumed.`,
    );
  }
  const callLimitS = job && Number(job.call_limit_s);
  if (!Number.isFinite(callLimitS) || callLimitS <= 0) {
    throw new Error(
      "the job record carries no positive `call_limit_s` -- the job's starter writes it from kogaki.settings.json (kogaki#1355).",
    );
  }
  const unitRounds = job && Number(job.unit_rounds);
  if (!Number.isInteger(unitRounds) || unitRounds <= 0) {
    throw new Error(
      "the job record carries no positive integer `unit_rounds` -- the job's starter writes it from kogaki.settings.json (kogaki#1355).",
    );
  }
  return { callLimitS, unitRounds };
}

// THE READER-PATH AWAIT'S OWN PER-POLL DECISION (kogaki#1213), pulled out of
// `awaitReaderPathJob` in `src/brief.mjs` as a pure function so a fixture can
// drive it without a live, 10-second heartbeat wait: the job record's units
// classified against the CURRENT stall reading. THIS POLL READS NO TIME LIMIT
// (kogaki#1355): the per-call limit is the supervisor's to enforce on its own
// children, and there is no whole-job limit left for a second clock to read. The
// record's bounds are still checked, so a record carrying a retired key is refused.
export function readerPathAwaitStep(job, { stopRequested, stalledS } = {}) {
  readerPathJobBounds(job);
  const raw = job.units || [];
  return {
    units: raw,
    state: classifyDetachedJobState(raw, { stopRequested, stalledS, unitIsolation: job.unit_isolation === true }),
  };
}

function readerPathRefusedUnits(unitRows) {
  return unitRows
    .filter((x) => x.status === "refused")
    .map((x) => ({
      id: x.id,
      rounds: x.rounds || 1,
      ...(x.failure && x.failure.file ? { file: x.failure.file } : {}),
    }));
}

// THE UNITS A `done` JOB DID NOT FINISH, NAMED ON ITS RECORD (kogaki#1273). A
// `done` job carries no `failure` block, so the refused units beside its
// finished Candidates ride as their own top-level field.
export function readerPathDoneJobUnfinished(unitRows) {
  const refused_units = readerPathRefusedUnits(unitRows);
  return refused_units.length ? { refused_units } : {};
}

// THE `failure` BLOCK FOR A NON-`done` JOB RECORD (kogaki#1193 acceptance 2:
// "every state but `done` carries `failure`"). A `died`/`refused` job's
// failure is the offending unit's own -- already shaped by
// `classifyDetachedJobUnit` -- carried up rather than re-described; the two
// whole-job exits (`stalled`, `stopped`) and the catch-all `other`
// state each a fact ABOUT THE JOB, so they are described here.
export function readerPathJobFailure(state, unitRows, { stalledS, note } = {}) {
  if (state === "died" || state === "refused") {
    const u = unitRows.find((x) => x.status === state);
    // THE FINISHED SIBLINGS' CANDIDATES, NAMED (kogaki#1204 acceptance 2): a
    // `died`/`refused` job's failure block used to name only the offending
    // unit, leaving a reader of the record to notice by hand that its
    // siblings finished. Every `done` row beside it is named here, by id and
    // by the file `cmdJobSupervise` already wrote for it the moment it
    // classified `done` — the record pointing at bytes that are still there.
    const kept_candidates = unitRows
      .filter((x) => x.status === "done" && x.candidate_file)
      .map((x) => ({ id: x.id, file: x.candidate_file }));
    // THE SIBLINGS A DIED UNIT ENDED (kogaki#1273): a system failure kills
    // every unit still running on the same tick, and the record names them.
    const killed_units = unitRows.filter((x) => x.status === "killed").map((x) => x.id);
    // EVERY REFUSED UNIT, NOT ONLY THE FIRST (kogaki#1273): a job ends
    // `refused` only when all of its units were refused.
    const refused_units = state === "refused" ? readerPathRefusedUnits(unitRows) : undefined;
    return {
      unit: u ? u.id : null,
      ...(u && u.failure ? u.failure : {}),
      kept_candidates,
      ...(killed_units.length ? { killed_units } : {}),
      ...(refused_units ? { refused_units } : {}),
    };
  }
  if (state === "stalled") {
    return {
      stalled_s: stalledS,
      note: "no unit produced new output for the stall bound; nothing written so far is deleted.",
    };
  }
  if (state === "stopped") {
    return { note: "the owner's stop click ended the job; every unit's partial output stands." };
  }
  // `other` (kogaki#1193's catch-all): an exit the supervisor's own top-level
  // catch reaches, naming what actually happened rather than folding it into
  // one of the named exits it does not match.
  return { note: note || `unclassified exit (${state})` };
}
