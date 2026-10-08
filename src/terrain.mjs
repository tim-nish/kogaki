#!/usr/bin/env node
// Terrain — the survey/selection surface (manifest item 1, specs/SPEC.md, the port manifest;
// kogaki#14 umbrella, kogaki#17 story 1.8; governing spec SPEC-terrain).
// Reads SERVED RENDERINGS only, through the seam (element_survey). Validates a survey record
// BEFORE writing it, with the rules checks/check-terrain-composition.sh applies after.
// Run state lives in `runs/terrain/<timestamp>/` (kogaki#750): machine state, never committed.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
// A spec name used here is a pointer to SPEC-terrain, except what `options_offered` is judged
// against (SPEC-gate-carrier) and "Human-facing files live where the human works" (specs/SPEC.md).
// THE ENTRY POINT ONLY (kogaki#1259): each stage lives in `src/terrain/` when only Terrain reads it,
// and in `src/workflow/` when another command runs on it; a command imports the stage it needs.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cmdComposeInput, cmdReport } from "./terrain/compose-input.mjs";
import { cmdCotags } from "./terrain/cotags.mjs";
import { GATE_WORK, STATE_WORK } from "./terrain/flows.mjs";
import { cmdSurvey, parseArgs, validateSurvey } from "./terrain/survey.mjs";
import { cmdJobSupervise } from "./workflow/detached-job.mjs";
import { cmdRun } from "./workflow/executor.mjs";
import {
  SKILL_EXPANSION_EXECUTOR, TERRAIN_LANE, advancedByFromPayload, fail, readHookPayload, readJson,
  setDefaultFlow,
} from "./workflow/run-record.mjs";

// ---- THE EXECUTOR --------------------------------------------------------
// ONE entry point, entered once per act (the re-entrant executor). It never blocks on input:
// `parseArgs` reads process.argv only; no stdin path.
// NO STOP IN THIS FLOW PRINTS AN INVOCATION (kogaki#856): owner reading rides the gate
// declaration. Records: kogaki#807; `checks/registry.json`.
// consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133

// THE EXECUTOR'S ONE BODY, ENTERED BY TWO ACTS (kogaki#1027). `advancedBy` is resolved
// by the CALLER, so a transition without a payload is refused BEFORE ANY WRITE.
// ---- THE TWO FLOW BINDINGS (kogaki#1108) ----------------------------------
// A flow is a table plus two maps plus a lane; everything below `runWorkflow` is shared.
//   lane: `runs/` lane (workspace, open-run pointer, capture prefix); label; startLine;
//   tablePath; newRunDir; stateWork; gateWork; runDirEnv/openRunEnv (per flow).
// `flow()` falls back to Terrain's binding for every caller outside `runWorkflow`.
const TERRAIN_FLOW = { ...TERRAIN_LANE, stateWork: STATE_WORK, gateWork: GATE_WORK };
setDefaultFlow(TERRAIN_FLOW);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

function main() {
const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  case "cotags": cmdCotags(args); break;
  case "compose-input": cmdComposeInput(args); break;
  case "report": cmdReport(args); break;
  // the control plane's ONE ENTRY POINT, entered once per act (the re-entrant executor). Every standalone
  // owner-facing act is now a state of the table, reachable only through here.
  case "run": {
    // ---- THE PAYLOAD GATE, BEFORE ANY WRITE (kogaki#1027 item 4).
    //
    // `--status` is read-only and is the ONE verb the PreToolUse deny admits
    // from a Bash command, so it must not require a payload: an inspection
    // route that needed a hook event would leave a stuck run unreadable by the
    // one person able to unstick it.
    //
    // EVERYTHING ELSE REFUSES HERE, which is before `runDir` -- so a refused
    // act creates no run directory, writes no record and prunes no lane. That
    // ordering is the item's own wording ("refused before any write") and it
    // is why this gate sits in the dispatcher rather than inside `cmdRun`.
    if (args.status) { cmdRun(args, null); break; }
    const advancedBy = advancedByFromPayload(readHookPayload());
    if (!advancedBy) {
      fail(`the executor advances only inside a harness hook event, and no hook payload carrying `
        + `hook_event_name, session_id and tool_use_id was readable on stdin. Nothing was written. `
        + `A Terrain run is STARTED by the terrain skill's own \`!\` line (\`node src/terrain.mjs start\`) and `
        + `ADVANCED inside the PostToolUse hook for the AskUserQuestion that answered its gate `
        + `(.claude/hooks/advance-terrain.py); \`run --status\` is the only verb reachable from a Bash `
        + `command, and it is read-only (kogaki#1027).`);
    }
    cmdRun(args, advancedBy);
    break;
  }
  // ---- THE START ACT (kogaki#1027 item 1). Executed by the harness's skill
  // expansion -- the terrain skill file's one `!` line runs this before the
  // model sees anything. It opens the run, runs to the first wait, and stops;
  // its transitions carry the `skill-expansion` executor kind and no hook
  // fields, because no hook event produced them and inventing one would be the
  // fabricated attribution this issue removes.
  case "start": cmdRun(args, SKILL_EXPANSION_EXECUTOR, { stopAtFirstWait: true }); break;
  // ---- THE DETACHED JOB'S SUPERVISOR ENTRYPOINT (kogaki#1193). Reached only
  // by `startDetachedJobSupervisor`'s own `spawn(process.execPath, [scriptPath,
  // "job-supervise", ...])` -- never by a Bash command a session could type:
  // `.claude/hooks/gate-terrain-executor.py`'s admitted shape is `run --status`,
  // and `job-supervise` is a different `cmd` entirely, not a `--job` value under
  // it.
  case "job-supervise": cmdJobSupervise(args); break;
  case "validate": {
    const record = readJson(String(args.survey || fail("validate needs --survey <file>")));
    const v = validateSurvey(record);
    if (v.length) { v.forEach((line) => console.log(`FAIL ${line}`)); process.exit(1); }
    console.log("survey record conforms (the same rules the registered check applies)");
    break;
  }
  default:
    console.log(`usage: terrain.mjs <start|run|survey|cotags|compose-input|report|validate> [--run-dir DIR] ...
  start [--run-dir D] [--workflow F]        THE START ACT, executed by the harness's skill
                                            expansion — the terrain skill file's one \`!\` line.
                                            Opens the run, runs to its first wait, stops. It
                                            refuses an existing run record: start opens a run,
                                            it never resumes one (kogaki#1027).
  run [--run-dir D] [--workflow F]
      (the hook payload is read from stdin; there is no flag for the owner's answer, and
       --input, --at and --enter are DELETED and refused by name — kogaki#1027)
      [--claims F] [--subdivisions F] [--classification F] [--neighborhood F] [--thesis-candidates F]
      [--judge-model M] [--judge-effort E] [--judge-binary-version V]
      (the five record flags are OPTIONAL since kogaki#1030: a judgment state whose
       flag is absent INVOKES THE JUDGE ITSELF, using the model src/terrain-workflow.json's
       \`judge\` block pins -- never one inherited from the session -- and retries a
       refused response the number of times that state declares before failing with
       the refusal text. A flag that IS supplied still wins, unchanged.)
                                            THE CONTROL PLANE. One entry point, entered once
                                            per act: reads the run record, executes the states
                                            src/terrain-workflow.json declares until the
                                            next declared WAIT or the TERMINAL, writes that
                                            state's artifact, and stops. It never asks — a wait is
                                            the executor stopping and the owner speaking, so
                                            re-enter with --input '<what they said>'. Order,
                                            kinds, waits, write bindings, grammar surfaces,
                                            conditionality and judgment placement are read from
                                            the table on every run and are held nowhere in this
                                            file. --workflow runs an alternate table (the
                                            evolvability fixture). It advances ONLY inside a
                                            harness hook event: a transition arriving with no
                                            payload on stdin is refused before any write, and
                                            every transition it does write names the hook that
                                            executed it. No conditional state is entered — the
                                            selector that entered one was --enter, and it is
                                            deleted.
  run --status [--run-dir D] [--workflow F]  counts this run from its record alone, beside the
                                            counts derived from the table's states array and the
                                            table's own counted_baseline (#625 acceptance item 2).
  survey                                    compose the survey from the seam (element_survey)
  compose-input --survey F --tag T          the BOUNDED input for the claim and subdivision
                                            composers (the rendering rule): one tag-scoped shard pair, fetched
                                            once, material keyed by member id and groups
                                            carrying ids only — so a member in several groups
                                            is read once and the read count does not grow with
                                            the placements. Run it BEFORE composing --claims.
  cotags --survey F --tag T [--group G] [--claims F]
         [--subdivisions F --judge-model M --judge-effort E [--judge-binary-version V]] [--connective F]
                                            the second navigation step (the co-tag navigation step) — narrows nothing.
                                            The heading carries the GroupID, Lesson count and
                                            member IDs, claim beneath (the display's serve rule v5); SubGroups
                                            where semantic subdivision's conditions bind (the SubGroup threshold). --claims and
                                            --subdivisions are maps keyed by group name; a
                                            group missing a claim is MARKED, never substituted.
  report --survey F --tag T (--group G | --all-groups) [--claims F]
         [--subdivisions F] [--neighborhood F] [--thesis-candidates F]
         [--judge-model M --judge-effort E [--judge-binary-version V]] [--report-dir D]
                                            the Full Report — untruncated Claims and
                                            Glosses, identified by the QUADRUPLE (substrate pin,
                                            co-tag query, judge pin, neighborhood judgment
                                            record — widened from the triple at kogaki#741).
                                            TWO ARTIFACTS (location and naming v11):
                                            --neighborhood carries the judgment layer: one
                                            level (core|useful|background), one claim and one
                                            target per candidate, keyed by slug (the neighborhood section's shape,
                                            kogaki#686, kogaki#861). The target is
                                            {"candidate":"TC<n>","role":"…"} and names a
                                            Thesis candidate of THIS pull, so a judged
                                            neighborhood REQUIRES --thesis-candidates: the
                                            absent-candidates fallback does not apply to it.
                                            the machine RECORD in the run workspace, and the
                                            owner RENDERING — exactly ONE file,
                                            reports/FullReport.md, overwritten per pull
                                            (location and naming v12) — repo-visible and still never
                                            committed. Both are
                                            written in the same act; --no-render opts out of the
                                            rendering. A rerun under the same identity is
                                            idempotent, not a duplicate. --all-groups is the open questions's
                                            decided EAGER reading (v5): the co-tag view
                                            generates one report per composed group.
  validate --survey F                       run the composition rules on a record

 At a wait that declares a gate, the executor WRITES the run declaration and names its path.
 Beside it, the byte-fixed gate call the harness renders; the exclusivity hook admits that payload and
 no other (kogaki#1028).
 THE RE-ENTRY IS NOT YOURS TO MAKE: .claude/hooks/advance-terrain.py runs the executor inside the
 PostToolUse hook for that question, after .claude/hooks/write-gate-capture.py has written the
 owner's answer. A Bash command naming this file with any verb but --status is denied.`);
    process.exit(cmd ? 1 : 0);
}
}
