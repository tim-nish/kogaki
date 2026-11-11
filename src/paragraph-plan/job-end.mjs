// paragraph-plan/job-end — the end of a job: the status lines, the stop lines and the ParagraphPlan file written when every Leg is done. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { paragraphPlanPathFor, paragraphPlanRecord, paragraphPlanRecordText, sha256 } from "../compose.mjs";
import { mappingDirFor, writeMappingRecord } from "../compose/mapping-record.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { readReaderPathJob, readerPathJobBounds, readerPathJobPath } from "../workflow/detached-job.mjs";
import { readAnalogy } from "../paragraph-plan-analogy.mjs";
import { readAxes, readMappingState } from "./axes.mjs";
import { paragraphPlanCollisions } from "./site-retry.mjs";
import { DONE_FILE, START_FILE, writeJson } from "./stage.mjs";
import { unitIdFor } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE END OF A JOB. Every Leg done writes the ParagraphPlan file, which is the record of
// the binding too (kogaki#1639); any Leg not done stops the stage naming the Leg and the
// paragraph, and writes nothing beside the Brief.

export function jobStatusLines(dir, job, now = Date.now()) {
  const startedAt = Date.parse(job.started_at || job.updated_at || new Date(now).toISOString());
  let bounds = null;
  try { bounds = readerPathJobBounds(job); } catch { bounds = null; }
  const lines = [`ParagraphPlan job at ${relFromRepo(readerPathJobPath(dir))} — ${job.state}, elapsed ${Math.floor((now - startedAt) / 1000)}s; `
    + `each Leg gets up to ${bounds ? bounds.unitRounds : "?"} rounds of at most ${bounds ? `${bounds.callLimitS}s` : "?"} per call:`];
  for (const u of job.units || []) {
    const phase = u.phase === "fit" ? "judge" : u.phase === "site" ? "site retry" : ["reading", "grounding"].includes(u.phase) ? u.phase : "plan";
    lines.push(`  unit ${u.id}: round ${u.rounds || 1}, ${phase}, ${u.status}, ${u.bytes || 0} byte(s)`);
  }
  return lines;
}

// The paragraphs a stopped unit's refusals name, read off the refusal text the validator
// and the judge write (`Leg <id>, paragraph <n>`); none where none is named, as for a call
// stopped at the per-call limit or a refusal of the whole Leg.
export function stoppedParagraphs(refusal) {
  const named = [...String(refusal || "").matchAll(/paragraph (\d+)/gi)].map((m) => Number(m[1]));
  return [...new Set(named)].filter((n) => n >= 1);
}

// The job's unit for each Leg of the start record, by id (kogaki#1641): a carried unit is
// written ahead of the spawned ones, so the record's order is not the Legs'.
function unitsByLeg(start, job) {
  const byId = new Map((job.units || []).map((u) => [u.id, u]));
  return start.legs.map((leg, i) => ({ leg, unit: byId.get(unitIdFor(i)) }));
}

// THE STOP LINES SAY WHAT WAS KEPT (kogaki#1641): the Legs that finished and are kept in the
// run directory, the Legs that ended refused or died with their last refusal, and that the
// next run on the same Brief plans the unfinished Legs only.
export function stopLines(start, job) {
  const rows = unitsByLeg(start, job);
  const kept = rows.filter((r) => r.unit && r.unit.status === "done");
  const unfinished = rows.filter((r) => !r.unit || r.unit.status !== "done");
  const lines = [`ParagraphPlan stopped: the job ended ${job.state}, and the Brief at ${start.brief} is unchanged — nothing was written beside it.`];
  if (kept.length) {
    lines.push(`  Kept: Leg ${kept.map((r) => r.leg.leg_id).join(", ")} finished and ${kept.length === 1 ? "is" : "are"} kept in the run directory`
      + `${kept.some((r) => r.unit.carried_from) ? ` (${kept.filter((r) => r.unit.carried_from).map((r) => `${r.leg.leg_id} carried from ${r.unit.carried_from}`).join("; ")})` : ""}.`);
  }
  for (const { leg, unit: u } of unfinished) {
    if (!u) { lines.push(`  Leg ${leg.leg_id}: no unit on the job record.`); continue; }
    const last = Array.isArray(u.refusals) && u.refusals.length ? u.refusals[u.refusals.length - 1]
      : (u.failure && u.failure.stderr_tail) || (job.failure && job.failure.note) || u.status;
    const ps = stoppedParagraphs(last);
    lines.push(`  Leg ${leg.leg_id}${ps.length ? `, paragraph ${ps.join(", ")}` : ""}: ${u.status} after ${u.rounds || 1} round(s) — ${String(last).split("\n").join(" ")}`);
  }
  if (job.failure && job.failure.note && !unfinished.length) lines.push(`  ${job.failure.note}`);
  if (unfinished.length) {
    lines.push(`  Next: run /paragraph-plan on the same Brief again; it plans Leg ${unfinished.map((r) => r.leg.leg_id).join(", ")} only`
      + `${kept.length ? " and carries the kept Legs" : ""}; the Reader Path is not composed again.`);
  }
  return lines;
}

// The Mapping Record's entries from each unit's mapping state (kogaki#1734): one per Leg, its
// structure read and its table grounded.
export function mappingEntries(dir, legs) {
  return legs.flatMap((leg, i) => {
    const state = readMappingState(dir, unitIdFor(i));
    if (!state || (!state.structure && !state.table)) return [];
    return [{ leg_id: leg.leg_id, ...(state.structure ? { structure: state.structure } : {}), ...(state.table ? { table: state.table } : {}) }];
  });
}

// Finish a terminal job. Returns `{ written }` or `{ stopped: lines }`.
export function finishParagraphPlan(dir) {
  const start = JSON.parse(readFileSync(join(dir, START_FILE), "utf8"));
  const job = readReaderPathJob(dir);
  if (!job) return { stopped: [`ParagraphPlan: no job record at ${relFromRepo(dir)}`] };
  // CARRIED AND FRESH UNITS ALIKE, EACH FOUND BY ITS LEG (kogaki#1641).
  const units = unitsByLeg(start, job).map((r) => r.unit);
  if (job.state !== "done" || units.some((u) => !u || u.status !== "done" || !u.candidate)) {
    return { stopped: stopLines(start, job) };
  }
  const briefPath = resolve(REPO, start.brief);
  const briefText = readFileSync(briefPath, "utf8");
  if (sha256(briefText) !== start.brief_sha256) {
    return { stopped: [`ParagraphPlan stopped: the Brief at ${start.brief} changed while the job ran (sha256 ${start.brief_sha256} `
      + `at the start, ${sha256(briefText)} now) — nothing was written; run /paragraph-plan on it again.`] };
  }
  // EACH LEG'S MOVE AND PARAGRAPHS RIDE INTO THE FILE (kogaki#1639, kogaki#1777): the bound Move's id
  // and each paragraph's schema fields, exactly as the validator passed them; the file is the record of
  // the binding.
  const legs = start.legs.map((leg, i) => ({ leg_id: leg.leg_id, move: units[i].candidate.move,
    ...(units[i].candidate.move_forced_by ? { move_forced_by: units[i].candidate.move_forced_by } : {}),
    paragraphs: units[i].candidate.paragraphs }));
  // THE MAPPING RECORD IS WRITTEN WITH THE PLAN (kogaki#1733), and the plan names it by path and
  // digest: each Leg's structure read and table grounded (kogaki#1734).
  const planPath = paragraphPlanPathFor(briefPath);
  const mapping = writeMappingRecord(mappingDirFor(planPath), mappingEntries(dir, start.legs));
  const record = paragraphPlanRecord({ briefPath, briefText, analogy: readAnalogy(dir), legs, mapping });
  writeFileSync(planPath, paragraphPlanRecordText(record));
  writeJson(join(dir, DONE_FILE), { written: relFromRepo(planPath), at: new Date().toISOString(),
    collisions: paragraphPlanCollisions(record.legs, readAxes().axes.map((a) => String(a.id))) });
  return { written: planPath };
}
