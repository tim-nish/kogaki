// paragraph-plan/job-end — the end of a job: the status lines, the stop lines and the ParagraphPlan file written when every Leg is done. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { paragraphPlanPathFor, paragraphPlanRecord, paragraphPlanRecordText, sha256 } from "../compose.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { readReaderPathJob, readerPathJobPath } from "../workflow/detached-job.mjs";
import { DONE_FILE, START_FILE, writeJson } from "./stage.mjs";
import { unitIdFor } from "./units.mjs";

// ---------------------------------------------------------------------------
// THE END OF A JOB. Every Leg done writes the ParagraphPlan file, which is the record of
// the binding too (kogaki#1639); any Leg not done stops the stage naming the Leg and the
// paragraph, and writes nothing beside the Brief.

// The status lines (kogaki#1865): per Leg its unit, the step it is in, and, once done, what its record says.
const STEP = { reading: "reading the Senses", points: "writing Points" };
export function jobStatusLines(dir, job, now = Date.now()) {
  const startedAt = Date.parse(job.started_at || job.updated_at || new Date(now).toISOString());
  const lines = [
    `ParagraphPlan job at ${relFromRepo(readerPathJobPath(dir))} — ${job.state}, elapsed ${Math.floor((now - startedAt) / 1000)}s; ` +
      `each Leg reads its Senses, takes the Move that fits it best and writes Points once:`,
  ];
  for (const u of job.units || []) {
    lines.push(
      `  unit ${u.id}: ${STEP[u.phase] || u.phase || "reading the Senses"}, ${u.status}, ${u.bytes || 0} byte(s)`,
    );
    if (u.status === "done" && u.candidate) lines.push(...legLines(u.candidate).map((l) => `    ${l}`));
  }
  return lines;
}

// What one finished Leg's record says: the Move taken and its fit, or why it carries none, and why it carries no Points.
export function legLines(candidate) {
  const c = candidate || {};
  return [
    ...(c.move ? [`Leg ${c.leg_id}: Move ${c.move}, ${c.fit.met} of ${c.fit.compared} compared Edge(s) met`] : []),
    ...(typeof c.note === "string" ? [c.note] : []),
  ];
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
  const lines = [
    `ParagraphPlan stopped: the job ended ${job.state}, and the Brief at ${start.brief} is unchanged — nothing was written beside it.`,
  ];
  if (kept.length) {
    lines.push(
      `  Kept: Leg ${kept.map((r) => r.leg.leg_id).join(", ")} finished and ${kept.length === 1 ? "is" : "are"} kept in the run directory` +
        `${
          kept.some((r) => r.unit.carried_from)
            ? ` (${kept
                .filter((r) => r.unit.carried_from)
                .map((r) => `${r.leg.leg_id} carried from ${r.unit.carried_from}`)
                .join("; ")})`
            : ""
        }.`,
    );
  }
  for (const { leg, unit: u } of unfinished) {
    if (!u) {
      lines.push(`  Leg ${leg.leg_id}: no unit on the job record.`);
      continue;
    }
    const last =
      Array.isArray(u.refusals) && u.refusals.length
        ? u.refusals[u.refusals.length - 1]
        : (u.failure && u.failure.stderr_tail) || (job.failure && job.failure.note) || u.status;
    const ps = stoppedParagraphs(last);
    lines.push(
      `  Leg ${leg.leg_id}${ps.length ? `, paragraph ${ps.join(", ")}` : ""}: ${u.status} after ${u.rounds || 1} round(s) — ${String(last).split("\n").join(" ")}`,
    );
  }
  if (job.failure && job.failure.note && !unfinished.length) lines.push(`  ${job.failure.note}`);
  if (unfinished.length) {
    lines.push(
      `  Next: run /paragraph-plan on the same Brief again; it plans Leg ${unfinished.map((r) => r.leg.leg_id).join(", ")} only` +
        `${kept.length ? " and carries the kept Legs" : ""}; the Reader Path is not composed again.`,
    );
  }
  return lines;
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
    return {
      stopped: [
        `ParagraphPlan stopped: the Brief at ${start.brief} changed while the job ran (sha256 ${start.brief_sha256} ` +
          `at the start, ${sha256(briefText)} now) — nothing was written; run /paragraph-plan on it again.`,
      ],
    };
  }
  // EACH LEG'S RECORD RIDES INTO THE FILE (kogaki#1865): the Move taken, its fit, the fitted Segments and the Points,
  // where each was written; the note beside it is the status line's alone.
  const legs = start.legs.map((leg, i) => {
    const c = units[i].candidate;
    return {
      leg_id: leg.leg_id,
      ...(c.move ? { move: c.move, fit: c.fit, segments: c.segments } : {}),
      ...(Array.isArray(c.points) ? { points: c.points } : {}),
    };
  });
  const planPath = paragraphPlanPathFor(briefPath);
  const record = paragraphPlanRecord({ briefPath, briefText, legs });
  writeFileSync(planPath, paragraphPlanRecordText(record));
  writeJson(join(dir, DONE_FILE), { written: relFromRepo(planPath), at: new Date().toISOString() });
  return { written: planPath, notes: units.flatMap((u) => legLines(u.candidate)) };
}
