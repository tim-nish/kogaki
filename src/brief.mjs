#!/usr/bin/env node
// brief — the Brief entry point (SPEC-draft-pipeline, the durable home and the
// entry point, v9 re-sequencing, kogaki#494; slug paired into the one gate at
// v11, kogaki#518; entry point v7, kogaki#482; stories 1.71, 1.72 and 1.76).
// The stage modules under src/brief/ are cut at this file's former named
// sections (kogaki#1466); this entry keeps the argument parser and the
// dispatch, and re-exports every name a file outside src/brief/ imports or a
// declaration names, so no importer changes.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the durable home and the entry point
//
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cmdAdopt, cmdEnter, cmdMint } from "./brief/candidates.mjs";
import { BRIEF_FLOW } from "./brief/job-verbs.mjs";
import { fail } from "./brief/run-state.mjs";
import { runWorkflow } from "./workflow/executor.mjs";
import {
  START_ACT_EXECUTOR, advancedByFromPayload, readHookPayload,
} from "./workflow/run-record.mjs";
export {
  composeBrief, composeThesisCandidates, deriveSlugCandidate,
} from "./brief/candidates.mjs";
export {
  strandClaims, briefAudienceFile, briefJobBounds, briefThesis,
  validateDifferentiationRecord, validateReviewPathUnit,
} from "./brief/run-state.mjs";
export {
  validateReaderPathUnit, readerPathFitInput, readerPathFitPrompt,
  readerPathFitVerdict, moveFitRefusal, composeJobFinished, composeJobExcluded,
  candidateSelectionExtra, excludedCandidateLines, noCandidateFitsReport,
} from "./brief/reader-path-unit.mjs";
export {
  readerPathJobStatusLines, READER_PATH_JOB_AWAIT_S, jobAwaitS,
  READER_PATH_JOB_STILL_RUNNING_LINE, REVIEW_PATH_JOB_STILL_RUNNING_LINE,
} from "./brief/job-verbs.mjs";

function parseArgs(argv) {
  const args = { _rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
    // EVERY POSITIONAL AFTER THE VERB IS KEPT (kogaki#1116). The settled Strand
    // set arrives on the command line as served addresses, so a parser that read
    // the verb and discarded the rest silently dropped the whole input — which
    // is the shape of the 2026-09-13 failure this issue closes, arriving one
    // layer down.
    else args._rest.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    // The standalone `enter` takes its addresses POSITIONALLY, exactly as
    // `start` does, so the fixture path and the started path spell the set the
    // same way (kogaki#1116).
    case "enter": cmdEnter({ ...args, addresses: args.addresses ?? args._rest }); break;
    case "adopt": cmdAdopt(args); break;
    case "mint": cmdMint(args); break;
    // ---- THE CONTROL PLANE'S ONE ADVANCE (kogaki#1108), entered once per act.
    //
    // THE PAYLOAD GATE, BEFORE ANY WRITE, is `src/terrain.mjs`'s own and is
    // reproduced here rather than shared for the reason it sits in that
    // dispatcher rather than inside `cmdRun`: it must refuse BEFORE a run
    // directory is opened, and the dispatcher is the only place before it.
    // `--status` is read-only and is exempt.
    case "run": {
      if (args.status) { runWorkflow(BRIEF_FLOW, args, null); break; }
      const advancedBy = advancedByFromPayload(readHookPayload());
      if (!advancedBy) {
        fail("the executor advances only inside a harness hook event, and no hook payload carrying "
          + "hook_event_name, session_id and tool_use_id was readable on stdin. Nothing was written. "
          + "A Brief run is STARTED by the brief skill's own `!` line (`node src/brief.mjs start`) and "
          + "ADVANCED inside the PostToolUse hook for the AskUserQuestion that answered its gate "
          + "(.claude/hooks/advance-brief.py); `run --status` is the only verb reachable from a Bash "
          + "command, and it is read-only.");
      }
      runWorkflow(BRIEF_FLOW, args, advancedBy);
      break;
    }
    // ---- THE START ACT. Executed by the harness's SKILL EXPANSION — the brief
    // skill file's one `!` line runs this before the model sees anything. It
    // opens the run, advances to its first wait, and stops; it refuses an
    // existing run record, so it never resumes one. Its transitions carry the
    // `start-act` executor kind and no hook fields, because no hook event
    // produced them and inventing one would be a fabricated attribution.
    case "start": runWorkflow(BRIEF_FLOW, args, START_ACT_EXECUTOR, { stopAtFirstWait: true }); break;
    default: fail("usage: brief.mjs start <served Lesson address> ... | run [--status] | enter <served Lesson address> ... [--run-state <path>] | adopt --run-state <path> --capture <gate capture> | mint --run-state <path> [--theses-dir <dir>] [--slug <caller-supplied home, never an owner question>] [--reader-file <path, defaults to src/brief-workflow.json's compose_path row>] [--external-authority on|off, defaults on]");
  }
}
