#!/usr/bin/env node
// ParagraphPlan — the stage that generates Waypoints after the Brief
// (kogaki#1375, owner decision 2026-10-14).
//
// WHAT IT IS. The Brief's Reader Path plans an article down to Legs: one per relation the
// Thesis reaches (kogaki#1775). This stage plans each Leg under one Move (kogaki#1865, kogaki#1876)
// and hands the Leg's Segments to the Packet through one planning record,
// `theses/<slug>/paragraph-plan.yaml`. It is NOT Reiter and Dale's microplanning: word choice, reference
// and sentence shape stay inside the one Writer call. [see: SPEC-draft-pipeline "the ParagraphPlan stage"]
//
// THE TWO STEPS, one Detached Job unit per Leg on the shared supervisor (src/workflow/detached-job.mjs),
// run by `ParagraphPlanLegSteps` (src/paragraph-plan/steps.mjs): five calls of `paragraph_plan_name_senses`
// read the Leg's Senses, an answer refused being asked again once; the Move whose Edges the Leg meets best
// is chosen and fitted by code (src/paragraph-plan/senses.mjs). The Leg's entry of the file carries `leg_id`
// and `segments` and names no Move. The stage never writes the Brief, and the Brief names nothing
// downstream: the plan file names the Brief by path and content hash.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       SPEC-draft-pipeline
//
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PARAGRAPH_PLAN_FILE,
  paragraphPlanPathFor,
  paragraphPlanRecord,
  paragraphPlanRecordText,
  paragraphPlanShapeRefusal,
  paragraphWaypointsRefusal,
  readParagraphPlanBeside,
  sha256,
} from "./compose.mjs";
import { paragraphSchemaRefusal } from "./compose/record.mjs";
import { relFromRepo } from "./workflow/run-record.mjs";
import { jobHeartbeatMs, readReaderPathJob, readerPathJobPath } from "./workflow/detached-job.mjs";
import { readAdoptedBrief } from "./paragraph-plan/brief.mjs";
import { finishParagraphPlan, jobStatusLines } from "./paragraph-plan/job-end.mjs";
import { latestRunDir, slugOf, startParagraphPlan, supervisorAlive } from "./paragraph-plan/run-dir.mjs";
import { DONE_FILE, PARAGRAPH_PLAN_AWAIT_S, PARAGRAPH_PLAN_STILL_RUNNING_LINE, fail } from "./paragraph-plan/stage.mjs";
import { paragraphPlanView } from "./paragraph-plan/view.mjs";
export {
  PARAGRAPH_PLAN_TABLE,
  PARAGRAPH_PLAN_AXES,
  NO_PARAGRAPH_MOVE_FITS,
  PARAGRAPH_MOVE_ROLES,
  PARAGRAPH_PLAN_AWAIT_S,
  PARAGRAPH_PLAN_STILL_RUNNING_LINE,
} from "./paragraph-plan/stage.mjs";
export { readAdoptedBrief, audiencePathOf } from "./paragraph-plan/brief.mjs";
export {
  unitIdFor,
  planLeg,
  toldBefore,
  legRoles,
  planLegOptions,
  segmentsForPlanCall,
  paragraphPlanUnitInput,
  renderRowHead,
} from "./paragraph-plan/units.mjs";
export {
  criteriaOf,
  criteriaFailures,
  readAxes,
  axisSentenceRefusal,
  axisRecord,
  axesFailures,
  paragraphPlanUnitPrompt,
  boundMoveContract,
  validateParagraphPlanUnit,
  legStrand,
  mappingStatePath,
  readMappingState,
  noParagraphMoveFitsRefusal,
  paragraphPlanJudgeInput,
  paragraphPlanJudgePrompt,
  PARAGRAPH_PLAN_VERDICTS,
  BINDING_AXES,
  paragraphPlanJudgeVerdict,
  judgeSiteRefusal,
} from "./paragraph-plan/axes.mjs";
export { NAME_ROW, READINGS, chooseMove, compareMove, countPairs, fittedSegments } from "./paragraph-plan/senses.mjs";
export { ParagraphPlanLegSteps, validateParagraphPlanLeg } from "./paragraph-plan/steps.mjs";
export { latestRunDir, startParagraphPlan } from "./paragraph-plan/run-dir.mjs";
export {
  jobStatusLines,
  legLines,
  stoppedParagraphs,
  stopLines,
  finishParagraphPlan,
} from "./paragraph-plan/job-end.mjs";
export { legRefusals, paragraphPlanView } from "./paragraph-plan/view.mjs";
// THE FILE'S WRITER AND READER LIVE IN src/compose.mjs, shared code, because /draft reads the
// file too and a command module never imports another command's (kogaki#1302); this stage
// re-exports them so its checks reach the whole stage through one module.
export {
  PARAGRAPH_PLAN_FILE,
  sha256,
  paragraphPlanPathFor,
  paragraphPlanRecord,
  paragraphPlanRecordText,
  readParagraphPlanBeside,
  paragraphPlanShapeRefusal,
  paragraphWaypointsRefusal,
  paragraphSchemaRefusal,
};

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runDirFor(args, briefPath) {
  if (typeof args["run-dir"] === "string" && args["run-dir"] !== "") return resolve(args["run-dir"]);
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  return (
    latestRunDir(slugOf(brief.record, briefPath)) ||
    fail(
      `no ParagraphPlan job has been started for the Brief at ${briefPath} — run \`node src/paragraph-plan.mjs start --brief ${briefPath}\`.`,
    )
  );
}

// AWAIT: poll the job for at most `PARAGRAPH_PLAN_AWAIT_S` (or `--wait-s`), then either
// print the still-running line, or finish the job.
export function awaitParagraphPlan(dir, waitS = PARAGRAPH_PLAN_AWAIT_S) {
  if (existsSync(join(dir, DONE_FILE))) {
    const d = JSON.parse(readFileSync(join(dir, DONE_FILE), "utf8"));
    console.log(`ParagraphPlan already finished: ${d.written} was written at ${d.at}.`);
    return 0;
  }
  const until = Date.now() + waitS * 1000;
  let job = readReaderPathJob(dir);
  for (;;) {
    if (!job) {
      console.log(`ParagraphPlan: no job record at ${relFromRepo(dir)}`);
      return 1;
    }
    const live = job.state === "running" && supervisorAlive(job.supervisor_pid);
    if (job.state !== "running") break;
    if (!live) {
      console.log(
        `ParagraphPlan stopped: the job's supervisor (pid ${job.supervisor_pid}) is gone while its record still reads running.`,
      );
      return 1;
    }
    if (Date.now() >= until) {
      for (const l of jobStatusLines(dir, job)) console.log(l);
      console.log(PARAGRAPH_PLAN_STILL_RUNNING_LINE);
      return 0;
    }
    sleepSync(Math.min(jobHeartbeatMs(), Math.max(0, until - Date.now())));
    job = readReaderPathJob(dir);
  }
  const r = finishParagraphPlan(dir);
  if (r.written) {
    console.log(`ParagraphPlan written: ${relFromRepo(r.written)}`);
    for (const l of r.notes || []) console.log(`  ${l}`);
    return 0;
  }
  for (const l of r.stopped) console.log(l);
  return 1;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else {
        args[key] = next;
        i++;
      }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (args._cmd === "view") {
    if (typeof args.plan !== "string" || args.plan === "")
      fail("view needs --plan <path to theses/<slug>/paragraph-plan.yaml>");
    const v = paragraphPlanView(resolve(args.plan), {
      runDir: typeof args.run === "string" ? resolve(args.run) : null,
    });
    if (v.error) fail(v.error);
    console.log(v.lines.join("\n"));
  } else {
    runStageCommand(args);
  }
}

function runStageCommand(args) {
  const briefPath =
    typeof args.brief === "string" && args.brief !== ""
      ? args.brief
      : fail("this command needs --brief <path to theses/<slug>/brief.yaml>");
  switch (args._cmd) {
    case "start": {
      const dir = startParagraphPlan(briefPath, {
        runDir: typeof args["run-dir"] === "string" ? resolve(args["run-dir"]) : null,
        movesDir: typeof args["moves-dir"] === "string" ? args["moves-dir"] : "moves",
        // `--prior-run <dir>` names the run whose finished Legs are carried (kogaki#1641); an
        // empty value carries nothing; absent, the latest run of the same Brief is read.
        ...(typeof args["prior-run"] === "string"
          ? { priorRun: args["prior-run"] === "" ? null : resolve(args["prior-run"]) }
          : {}),
      });
      console.log(
        `ParagraphPlan job started at ${relFromRepo(readerPathJobPath(dir))}, ` +
          `one unit per Leg — run ` +
          `\`node src/paragraph-plan.mjs await --brief ${briefPath}\` to poll it.`,
      );
      break;
    }
    case "status": {
      const dir = runDirFor(args, briefPath);
      const job = readReaderPathJob(dir);
      if (!job) fail(`no job record at ${relFromRepo(dir)}`);
      for (const l of jobStatusLines(dir, job)) console.log(l);
      break;
    }
    case "await": {
      const dir = runDirFor(args, briefPath);
      const waitS = Number(args["wait-s"]);
      process.exitCode = awaitParagraphPlan(dir, Number.isFinite(waitS) && waitS >= 0 ? waitS : PARAGRAPH_PLAN_AWAIT_S);
      break;
    }
    default:
      fail(
        "usage: node src/paragraph-plan.mjs start|status|await --brief <theses/<slug>/brief.yaml> [--moves-dir <dir>] | view --plan <theses/<slug>/paragraph-plan.yaml> [--run <dir>]",
      );
  }
}
