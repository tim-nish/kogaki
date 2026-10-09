// The workflow engine — the executor, `runWorkflow`, and its advance loop.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  DetachedJobStarted, READER_PATH_JOB_AWAIT_COMMAND, READER_PATH_JOB_STATUS_COMMAND,
  readReaderPathJob, readerPathJobStopFlagPath,
} from "./detached-job.mjs";
import {
  GATE_CALL_SUFFIX, JUDGMENT_RETRY_GATE_ID, READER_PATH_JOB_GATE_ID, emitGateDeclaration,
  openGateDir, readCapturedAnswer, refreshWrittenGateCall, restoreOpenGatePointer,
} from "./gate.mjs";
import { JudgeTimeout, JudgmentExhausted, ensureJudgeBinary } from "./judge.mjs";
import {
  KIND_SEMANTICS, REPO, bindFlow, checkpointRun, classifyWriteOutcome, clearOpenRunPointer,
  completeState, derivedBaseline, endRunOnJudgeTimeout, fail, flow, loadWorkflowTable,
  mostRecentDoneRun, newRunRecord, openRunPointerPath, readJson, readOpenRunPointer, readRunRecord,
  relFromRepo, runCounts, runDir, runRecordPath, setOpenedBy, setRunPersist, writeOpenRunPointer,
  writeRunRecord,
} from "./run-record.mjs";

// WRITE AUTHORITY, CARRIED AT THE WRITE (SPEC-terrain, write authority v28,
// kogaki#681, successor to #680; #681 kept `cotags`/`report` as entry points).
// The refusal binds the WRITE, not the entry point: `cotags`/`report` stay composition routes but
// cannot land an owner artifact out of order. The discriminator is the RESOLVED destination —
// never a flag or env var. The composition itself remains callable out of order.
export let WRITING_STATE = null;

// THE ONE ENTRY A SECOND RUNTIME USES. `src/brief.mjs` composes its own
// binding and calls this; it never reimplements the loop, which is what makes
// "the executor advances from hook payloads" one implementation rather than
// two that can drift.
export async function runWorkflow(binding, args, advancedBy, opts = {}) {
  const held = bindFlow(binding);
  // SCOPED BY try/finally rather than by setting and clearing around the call,
  // on `WRITING_STATE`'s own argument one screen up: a refusal inside the loop
  // would otherwise leave one flow's binding standing for whatever ran next in
  // the same process.
  try { return await cmdRun(args, advancedBy, opts); }
  finally { bindFlow(held); }
}

// `stopAtFirstWait` bounds the start act to what the owner licensed it to
// produce -- `survey` and the stop at TAG_SELECTION -- so a start invocation
// cannot walk a whole run under one skill-expansion attribution.
export async function cmdRun(args, advancedBy, { stopAtFirstWait = false } = {}) {
  // The attribution the caller resolved is also what every open-gate pointer
  // this act writes records as `opened_by` (kogaki#1051). Set here rather than
  // at the writer because here is where it is known.
  setOpenedBy(advancedBy);
  // THE START ACT OPENS a workspace; an ADVANCE RESOLVES the one that is open
  // (PR #1034 round 1). An explicit `--run-dir` still wins for both, because a
  // caller who named a directory named it because they hold it -- that is the
  // fixture path and the second-repository path, and it is unchanged.
  let dir;
  // `start --status` is refused BEFORE any workspace is opened (PR #1040
  // round 1, blocking finding): the start act mints a workspace and repoints
  // the open run, and a status read must never do either. `run --status` is
  // the one read-only route.
  if (stopAtFirstWait && args.status) {
    fail("`start --status` is refused: `start` opens a run and `--status` reads one, and the two are not one act. "
      + `The read-only route is this runtime's own \`run --status\` (kogaki#1038).`);
  }
  // `start` READS NO ARGUMENTS FROM THE SESSION (kogaki#1163); refused before `runDir`,
  // so a refused start opens no workspace and prunes no lane.
  // An ALLOWLIST (PR #1168 round 1): only `--run-dir` and `--workflow` pass.
  // Applies only when `_` is present (the `parseArgs` CLI): `runWorkflow` and
  // the Brief runtime's own parser pass other options.
  const START_READS = new Set(["run-dir", "workflow"]);
  if (stopAtFirstWait && Array.isArray(args._)) {
    const positionals = args._;
    const unread = Object.keys(args)
      .filter((k) => k !== "_" && !START_READS.has(k))
      .map((k) => `--${k}`)
      .concat(positionals);
    if (unread.length) {
      fail(`\`start\` reads no arguments from the session (kogaki#1163) — it opens a fresh ${flow().label} `
        + `workspace on every invocation and takes no run identity, so ${JSON.stringify(unread)} names nothing `
        + `this act can act on. A run already open is read with this runtime's own \`run --status\`, which is `
        + `the read-only route to an existing run's position; there is no argument that resumes one. `
        + `(\`--run-dir\` and \`--workflow\` are read, and are the fixture's route: a caller who names a `
        + `directory or a table holds it.)`);
    }
  }
  // THE PIN IS READ THROUGH THE BINDING, NOT BY NAME (PR #1109 round 1).
  // `runDir` one screen up reads `process.env[flow().runDirEnv]`, and these two
  // conditions read `KOGAKI_RUN_DIR` literally -- so with two flows the readers
  // disagreed in BOTH directions. `KOGAKI_BRIEF_RUN_DIR=/w node src/brief.mjs
  // run` took the `else` arm and refused "no Brief run is open" over a pinned
  // workspace; worse, with Terrain's `KOGAKI_RUN_DIR` standing in an inherited
  // environment a Brief advance took the pinned arm, `runDir` found no
  // `KOGAKI_BRIEF_RUN_DIR`, and every advance minted a fresh Brief workspace
  // and abandoned the open run. One reader of the pin, named by the binding.
  const pinned = process.env[flow().runDirEnv];
  // THE PRIOR RUN IS READ BEFORE THE NEW ONE IS MINTED (kogaki#1163 acceptance
  // 3). `runDir`'s default branch prunes the lane and creates this run's own
  // directory, so a read taken after it would already be looking at a lane
  // holding this run alongside whatever it did not prune. Read here, while the
  // lane still holds only what the LAST run left behind.
  const mintingFresh = stopAtFirstWait && !args["run-dir"] && !pinned;
  const priorDoneRun = mintingFresh ? mostRecentDoneRun(flow().lane) : null;
  if (stopAtFirstWait || args["run-dir"] || pinned) {
    dir = runDir(args);
    if (stopAtFirstWait && !args["run-dir"] && !pinned) writeOpenRunPointer(dir);
  } else {
    dir = readOpenRunPointer()
      || fail(`no ${flow().label} run is open: ${openRunPointerPath()} names none, and an advance is an advance OF a run. `
        + `A run is opened by ${flow().startLine}, which writes that pointer; `
        + `the pointer is removed when the run reaches its terminal. Nothing was written (kogaki#1027).`);
  }
  const tablePath = args.workflow ? String(args.workflow) : flow().tablePath;
  const table = loadWorkflowTable(tablePath);

  // THE DETACHED-JOB VERBS RIDE `run --status` (kogaki#1193), because that is
  // the one shape `.claude/hooks/gate-terrain-executor.py` admits from a Bash
  // command — the hook's own `admitted()` reads `args[0] === "run"` and
  // `"--status"` present and nothing about `--job`. `status` and `await` are
  // the two verbs a session can reach this way; `start` and `stop` are refused
  // by the flow's own `jobWork`, because both run in-process from a
  // hook-driven advance and neither is a read. A flow that declares no
  // `jobWork` (Terrain's own) has no detached-job states and `--job` names
  // nothing on it.
  if (args.status && args.job) {
    if (!flow().jobWork) {
      fail(`${flow().label} declares no detached-job work, so \`--job ${args.job}\` names nothing here (kogaki#1193).`);
    }
    return flow().jobWork(dir, String(args.job), table, tablePath, args);
  }
  if (args.status) return reportRunStatus(dir, tablePath, table);

  let rec = readRunRecord(dir);
  // THE START ACT PRODUCES EXACTLY ONE STOP, and this is where that bound is
  // enforced (owner constraint, 2026-09-09). `start` opens a run; it does not
  // resume one. Were it allowed to run against an existing record it could
  // walk states the hook route is supposed to execute, and every one of them
  // would be attributed to the skill expansion -- the attribution defect this
  // issue closes, reintroduced by the one act licensed to carry that kind.
  if (stopAtFirstWait && rec) {
    fail(`a run record already exists at ${runRecordPath(dir)}, so this is a resumption and not a start. `
      + `The start act opens a run and stops at its first wait; every advance after that is executed inside the `
      + `PostToolUse hook for the AskUserQuestion that answered the gate (kogaki#1027).`);
  }
  if (!rec) {
    rec = newRunRecord(tablePath, table);
  } else if (rec.workflow.version !== (table.version ?? null)) {
    // RESUMPTION REFUSES rather than guesses (#625 acceptance item 5). A
    // record written against another version of the table cannot be resumed
    // against this one: the position it names may not mean what it meant.
    fail(`run record ${runRecordPath(dir)} was written against workflow table version ${rec.workflow.version} and this table is version ${table.version}. The run cannot be resumed across a table version change — start a fresh run directory.`);
  }
  // ---- THE JUDGE BINARY, RESOLVED BEFORE THE SURVEY (kogaki#1076 item 1).
  //
  // BEFORE `setRunPersist`, so a start whose resolution fails writes nothing at
  // all: it refuses ahead of the survey and leaves no record naming a run that
  // never began. It stands here rather than at the first judgment state because
  // the fact it establishes -- which executable this run's judgments run -- must
  // be settled by the session that STARTS the run, and a judgment state is
  // reached inside an advance fired from whatever session answered a gate.
  //
  // AND IT RUNS ON EVERY ACT, not only on the start: a record already carrying a
  // resolution is returned untouched, so this is a resolution exactly once per
  // run and a no-op on every advance after it.
  ensureJudgeBinary(rec, table);
  rec._dir = dir;
  // ARMED FROM HERE (kogaki#808). Every refusal raised for the rest of this act
  // — an owner-input refusal, a capture refusal, a judgment state's missing
  // typed record — now persists the transitions this act completed before it,
  // instead of exiting with them on disk and unnamed by the record. The release
  // is at the loop's own write below.
  setRunPersist(dir, rec);

  // ---- THE OWNER-INPUT ENTRY POINT IS DELETED (kogaki#1027 item 5).
  //
  // `--input` carried the owner's words into the executor from a Bash command
  // the model composed, and `--at` bound them to a wait. Both are gone, with
  // NO STUB: a deprecated channel is a channel, and the finding was that this
  // one existed at all. Every wait in the shipped table declares a gate, and a
  // gate is answered by the harness's own capture -- so the route this
  // removes is the route by which the model supplied a fact rather than a
  // selector.
  //
  // REFUSED BY NAME, never ignored. An ignored flag is a session quietly
  // getting a different act than it asked for.
  for (const dead of ["input", "at", "enter"]) {
    if (args[dead] !== undefined) {
      fail(`--${dead} is DELETED (kogaki#1027). The ${flow().label} executor is invoked by hooks only: `
        + `it is started by ${flow().startLine} and advanced inside the PostToolUse hook for the `
        + `AskUserQuestion that answered a gate, and every transition names the hook that executed it. `
        + `There is no stub and no replacement flag -- a wait is answered by the owner's click, which `
        + `.claude/hooks/write-gate-capture.py records and the executor reads.`);
    }
  }

  // ---- THE CAPTURED ANSWER, READ RATHER THAN ARGUED (kogaki#890).
  //
  // The three flags that used to carry the owner's answer into this branch —
  // `--capture-option`, `--capture-free-text`, `--tool-use-id` — are REMOVED
  // and refused by name. Removed rather than deprecated, for the reason
  // kogaki#891 gives one lane over: a deprecated channel is a channel, and the
  // whole finding was that this one existed at all.
  for (const dead of ["capture-option", "capture-free-text", "tool-use-id"]) {
    if (args[dead] !== undefined) {
      fail(`--${dead} is REMOVED (kogaki#890). The owner's answer at a declared gate is written by `
        + `.claude/hooks/write-gate-capture.py at the moment the question is answered, from the harness's own payload, and is never composed by the session. `
        + `The gate's byte-fixed call is written beside its declaration and is the one payload the exclusivity hook admits (kogaki#1028); the answer is recorded when the harness reports it, and the advance runs inside that hook. Nothing here is re-entered by hand.`);
    }
  }
  //
  // THE READ IS UNCONDITIONAL AT AN OUTSTANDING DECLARED GATE, which is the
  // structural half of the change. There is no argument to branch on any more,
  // so a re-entry at such a wait either finds the harness's row and advances,
  // or refuses — and "the session did not pass a capture" has stopped being a
  // state the run can be in.
  if (rec.awaiting) {
    const owed = rec.gate_declarations_owed.find((g) => g.state === rec.awaiting);
    if (owed && owed.declaration) {
      // RECORDED REPO-RELATIVE, READ REPO-RELATIVE (PR #671 rounds 1 and 2). Read with
      // `resolve(REPO, …)`: the exact inverse of `relFromRepo`, correct for absolute /tmp
      // paths and repo-relative ones, independent of cwd.
      const decl = readJson(resolve(REPO, owed.declaration));
      // THE PAYLOAD'S OWN ID IS PASSED, and it is the one `advancedBy` already
      // carries: `advancedByFromPayload` copied it out of the harness event
      // that spawned this act, so the two readers of *which question drove
      // this* are one field rather than two (kogaki#1075).
      const captured = readCapturedAnswer(dir, decl, advancedBy && advancedBy.tool_use_id);
      const capOption = captured.option;
      const capFree = captured.freeText;
      const capPath = captured.path;
      const row = captured.row;
      // THE JUDGMENT-RETRY GATE ANSWERS ITSELF, RATHER THAN THROUGH THE
      // GENERIC WAIT-ANSWER APPLICATION BELOW (kogaki#1172 item 3). The
      // generic path calls `completeState`, which would mark the JUDGMENT
      // STATE complete on a "retry" click — the one thing that must NOT
      // happen, because the whole point of "retry" is that the state is
      // re-entered by the ordinary table loop on the next advance. "abandon"
      // has no state to complete at all: it ends the run.
      if (owed.gate_id === JUDGMENT_RETRY_GATE_ID) {
        const retryState = rec.awaiting;
        rec.owner_input[retryState] = capOption !== null ? capOption : capFree;
        rec.awaiting = null;
        try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
        if (capOption === "abandon") {
          // THE OPEN-RUN POINTER IS CLEARED, AND `done` IS SET (kogaki#1172
          // item 3's acceptance 4). `done: true` is reused rather than a new
          // field invented beside it: `mostRecentDoneRun` already reads it to
          // tell an owner starting a fresh run that a prior one is over, and
          // that reading is exactly true of an abandoned run too — it will
          // not be resumed by anything, `start` included.
          rec.done = true;
          rec.judgment_abandoned = { state: retryState, at: new Date().toISOString() };
          clearOpenRunPointer();
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the run is ABANDONED at ${retryState}; the open-run pointer is cleared and nothing further is asked.`);
        } else {
          // "retry", or any free-text answer -- retried by default, since
          // abandon is the one way to stop and is named as its own option
          // rather than left to a wording guess over free text.
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the judgment at ${retryState} is RE-ASKED; the state was never marked complete, so the advance below re-enters it (kogaki#1172).`);
        }
      } else if (owed.gate_id === READER_PATH_JOB_GATE_ID) {
        // THE ARM ANSWERS ITSELF, ON THE SAME GROUND `JUDGMENT_RETRY_GATE_ID`
        // DOES ONE ROW UP (kogaki#1193). `stop` ends the RUN, and "stop" always
        // means the open-run pointer clears, never that one judgment retries.
        const jobState = rec.awaiting;
        rec.owner_input[jobState] = capOption !== null ? capOption : capFree;
        rec.awaiting = null;
        try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
        if (capOption === "stop") {
          rec.done = true;
          rec.reader_path_job_stopped = { state: jobState, at: new Date().toISOString() };
          clearOpenRunPointer();
          // THE STOP FLAG IS WHAT THE SUPERVISOR ITSELF POLLS (kogaki#1193):
          // without it a still-running supervisor process would carry on to its
          // own ceiling or stall rather than ending promptly on the owner's
          // click. Best-effort kill of the recorded pid alongside it, since the
          // flag alone still costs one heartbeat's delay.
          // A JOB KEPT IN ITS OWN DIRECTORY (kogaki#1301's path-review job) is
          // named on the run record by the state that started it.
          const jobDir = rec.detached_job_dirs && rec.detached_job_dirs[jobState] ? join(dir, rec.detached_job_dirs[jobState]) : dir;
          try { writeFileSync(readerPathJobStopFlagPath(jobDir), `${new Date().toISOString()}\n`); } catch { /* the record is the truth; the flag is only a nudge */ }
          try {
            const job = readReaderPathJob(jobDir);
            if (job && Number.isInteger(job.supervisor_pid)) process.kill(job.supervisor_pid, "SIGTERM");
          } catch { /* already gone, or never ours to signal */ }
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the reader-path job at ${jobState} is STOPPED; the run is not resumed and the open-run pointer is cleared.`);
        } else {
          // ANY OTHER ANSWER (a free-text one): nothing is acted on, the state
          // was never marked complete, and the advance below re-enters
          // `compose_path`, which reads the job record again.
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the answer at ${jobState} is not stop, so nothing is acted on; the advance below re-enters the state and reads the job record again.`);
        }
      } else {
        // AN OPTION THE DECLARATION ROUTES NOWHERE IS CAPTURED AND THEN REFUSED (PR #898 round 1).
        // Capture first, refuse after; never advance. Routing is data in `src/gate-registry.json`.
        // The wait stays outstanding (`rec.awaiting` untouched; refusal persists per kogaki#808),
        // so re-entering re-offers the same gate.
        const unrouted = (decl.unrouted_options || {})[capOption];
        if (unrouted) {
          fail(`${JSON.stringify(capOption)} is an option gate ${owed.gate_id} declares as ROUTED NOWHERE, so the run does not advance past ${rec.awaiting}. `
            + `The answer was recorded (${capPath}) and the wait is still outstanding — the gate is re-offered at its next raising, and a different answer is captured there. `
            + `The declaration's own reason: ${unrouted}`);
        }
        // The answer IS the owner input for this wait. Adoption, ratification and
        // strand selection are all this one act (the claim re-offer wait: adoption is applying the
        // captured answer), which is why no second command remains to apply it.
        rec.owner_input[rec.awaiting] = capOption !== null ? capOption : capFree;
        completeState(rec, rec.awaiting, advancedBy);
        rec.awaiting = null;
        // THE POINTER IS RETIRED AT THE ADVANCE, not only by the hook. The hook
        // removes it after writing, and this is the second remover rather than a
        // duplicate one: a pointer left behind by a hook that wrote its row and
        // then failed to unlink makes the NEXT question with the same text read
        // as ambiguous, and the hook's own stderr note says exactly that. The
        // advance is the moment the gate stops being outstanding, so it is the
        // moment the forwarding address stops being true.
        try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
        console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — written by the harness at the question, never argued.`);
      }
    }
  }

  // ---- The advance. Order, kind, conditionality and stopping all come from
  // the table; nothing below names a state.
  // Every conditional state is SKIPPED and recorded so (kogaki#1027 item 5). TRIM_RATIFICATION
  // is unreachable until a child of kogaki#1025 makes its condition computable;
  // CLAIM_REOFFER was deleted by kogaki#1030.
  const entered = new Set();
  let stopped = null;
  // SURVIVES THE LOOP, UNLIKE `detachedJobStarted` ITSELF (kogaki#1193 PR
  // #1195 review round 1, finding 3). The generic `rec.awaiting === stopped.id`
  // read after the loop cannot otherwise tell a spent judgment bound from a
  // detached job that merely started or is still running — both set
  // `rec.awaiting = st.id` and `stopped = st` — and printed the judgment-retry
  // sentence on a `compose_path` start, naming a gate ("terrain-judgment-retry")
  // this state never raises.
  let stoppedForDetachedJob = false;
  // AN ABANDONED RUN ENTERS NO FURTHER STATE (kogaki#1172 item 3). The
  // pre-loop block above already applied the owner's "abandon" answer — set
  // `rec.done`, recorded `rec.judgment_abandoned` and cleared the open-run
  // pointer — and this is what stops the loop from immediately re-entering
  // the very judgment state that answer was about.
  // A RE-ENTRY AFTER A JUDGE TIMEOUT (kogaki#1300) keeps the failure as history
  // rather than leaving `failure` standing over a run that is advancing again.
  if (rec.failure) {
    rec.prior_failures = [...(Array.isArray(rec.prior_failures) ? rec.prior_failures : []), rec.failure];
    delete rec.failure;
  }
  for (const st of (rec.judgment_abandoned ? [] : table.states)) {
    if (rec.completed.includes(st.id)) continue;
    if (st.conditional && !entered.has(st.id)) {
      if (!rec.conditional_skipped.includes(st.id)) rec.conditional_skipped.push(st.id);
      continue;
    }
    if (st.conditional) {
      // A conditional state skipped in an earlier act and entered in a later
      // one must not remain on both lists: the record is what a resumption
      // reads (AC4), and a record asserting a state was both skipped and
      // entered cannot be resumed from without a second source to break the
      // tie. Entering RETRACTS the skip.
      rec.conditional_skipped = rec.conditional_skipped.filter((x) => x !== st.id);
      if (!rec.conditional_entered.includes(st.id)) rec.conditional_entered.push(st.id);
    }

    const kind = KIND_SEMANTICS[st.kind];

    if (st.kind === "wait") {
      rec.awaiting = st.id;
      // DEDUPED, like its three siblings in this same loop (PR #655 round 1).
      // Re-entering `run --run-dir D` with no `--input` at an outstanding wait —
      // the resume act #625 acceptance item 4 licenses, and the act needSurvey's
      // own refusal text tells the owner to perform — used to record the id a
      // second time, so runCounts(rec).waits exceeded counted_baseline.waits for a
      // run that reached exactly four waits. checks/check-terrain-workflow.sh now
      // counts against that baseline, so the defect made a registered check go red
      // on a record no owner mis-drove.
      if (!rec.waits_reached.includes(st.id)) rec.waits_reached.push(st.id);
      // the wait rule / AC6: the executor renders NO gate declaration and NO question
      // UI. For a wait the table marks `renders_gate_declaration: true` the
      // obligation is RECORDED and named on stop; rendering it is not this
      // story's, and inventing one here would put a declaration behind a
      // runtime that the post-tag-selection window's allowlist keeps empty for the other two waits.
      if (st.renders_gate_declaration && !rec.gate_declarations_owed.some((g) => g.state === st.id)) {
        // AND THE EXECUTOR COMPOSES IT (kogaki#625 item 1); rendering stays the harness UI's
        // (kogaki#1028). A gate state is a table row PLUS an option composer.
        // With no composer the state still RUNS, stops, and records its declaration owed and
        // unwritten (#625 acceptance item 6; the evolvability fixture's CLOSING_CONFIRMATION).
        const compose = flow().gateWork[st.id];
        if (!compose) {
          rec.gate_declarations_owed.push({ state: st.id, gate_id: st.gate_id || null, declaration: null,
            unwritten: `this runtime has no option composer bound to ${JSON.stringify(st.id)} — the workflow table: a GATE state is a table row PLUS an option composer, and the executor invents neither options nor a judgment` });
        } else {
          // THE WAIT IS UNRECORDED BEFORE THIS REFUSAL (PR #821 round 1). The
          // branch above has already set `rec.awaiting`, and since kogaki#808
          // made a refusal persist the record, that assignment would now
          // OUTLIVE this refusal — leaving a record whose `awaiting` names a
          // state whose declaration was never composed, which the pre-loop
          // `--input` guard admits precisely because no declaration exists.
          // Reachable only on a malformed table, and the hole it grazes is the
          // one #625 item 1 closed, so the assignment is retracted rather than
          // left for the shipped table's `gate_id` coverage to keep unreachable.
          const gateId = st.gate_id || (() => {
            rec.awaiting = null;
            return fail(`workflow state ${JSON.stringify(st.id)} has an option composer bound to it and names no gate_id. field_semantics requires the key of exactly the states whose renders_gate_declaration is true.`);
          })();
          const { options, extra } = compose(rec, st, args, dir);
          const declPath = emitGateDeclaration(dir, gateId, options, extra || {});
          rec.gate_declarations_owed.push({ state: st.id, gate_id: gateId, declaration: relFromRepo(resolve(declPath)) });
        }
      }
      stopped = st;
      break;
    }

    if (st.kind === "terminal") {
      completeState(rec, st.id, advancedBy);
      rec.done = true;
      // THE RUN IS NO LONGER OPEN, so the pointer stops naming it. Cleared here
      // rather than by a reaper: the terminal is the moment the fact changes,
      // and a pointer outliving its run is what makes the NEXT `start` look
      // like a resumption of something finished.
      clearOpenRunPointer();
      stopped = st;
      break;
    }

    const work = flow().stateWork[st.id];
    if (!work && kind.needsRenderer) {
      fail(`workflow state ${JSON.stringify(st.id)} is kind ${JSON.stringify(st.kind)} and this runtime has no renderer bound to it. The workflow table: a new state is a table row PLUS a renderer — the executor interprets the table and invents neither a renderer nor a judgment.`);
    }
    // THE AUTHORITY IS HELD FOR THE DURATION OF A WRITING STATE AND NO LONGER
    // (write authority v28, kogaki#681). Scoped by `try/finally` rather than by setting
    // and clearing around the call: a renderer that `fail`s would otherwise
    // leave the authority standing for whatever ran next in the same process.
    let outcome = null;
    let judgmentExhausted = null;
    let judgeTimeout = null;
    let detachedJobStarted = null;
    if (work) {
      const held = WRITING_STATE;
      if (st.kind === "write") WRITING_STATE = st.id;
      try { outcome = await work(rec, st, args, table); }
      catch (e) {
        // A JUDGMENT STATE'S SPENT BOUND STOPS HERE, NOT THE PROCESS (kogaki#1172
        // item 3). Caught in this same frame rather than at `invokeJudge`'s own
        // level: the gate this raises names the STATE, and the state loop is
        // the one frame that already has `st`, `dir` and `rec` together without
        // threading them through the judge machinery.
        if (e instanceof JudgmentExhausted) { judgmentExhausted = e; }
        else if (e instanceof JudgeTimeout) { judgeTimeout = e; }
        // A DETACHED JOB HAS STARTED OR IS STILL RUNNING (kogaki#1193). Caught
        // in the same frame, on the same ground: the state that started or
        // found the job is the one frame that already has `st` and `dir`
        // together, and the stop below is deliberately gate-less — nothing is
        // owed to the owner yet.
        else if (e instanceof DetachedJobStarted) { detachedJobStarted = e; }
        else { throw e; }
      }
      finally { WRITING_STATE = held; }
    }
    if (judgeTimeout) endRunOnJudgeTimeout(rec, st, dir, judgeTimeout);
    if (detachedJobStarted) {
      // NO GATE DECLARATION. This is the whole difference from
      // `judgmentExhausted` below: a spent judgment bound is something the
      // owner must decide, and a job that has merely started or is still
      // running is not — `job await` is what turns a finished job into
      // either a resumed state (silently, on `done`) or a raised
      // `brief-reader-path-job` gate (on any other terminal state), and
      // both of those happen OUTSIDE this loop, from `job await` itself.
      rec.awaiting = st.id;
      stopped = st;
      stoppedForDetachedJob = true;
      checkpointRun(rec);
      break;
    }
    if (judgmentExhausted) {
      if (rec) {
        rec.judgment_refusals = rec.judgment_refusals || {};
        // OVERWRITES THE ENTRY `invokeJudge`/`invokeJudgePerGroup` ALREADY WROTE
        // for this state with the SAME shape plus the gate's own note — the
        // refusal text is unchanged, and a reader of `judgment_refusals` sees
        // one entry rather than two disagreeing carriers of one fact.
        rec.judgment_refusals[st.id] = {
          ...(rec.judgment_refusals[st.id] || {}),
          refusal: judgmentExhausted.message,
          gate_raised: JUDGMENT_RETRY_GATE_ID,
        };
      }
      const declPath = emitGateDeclaration(dir, JUDGMENT_RETRY_GATE_ID, [], {
        judgment_state: st.id,
        judgment_refusal: judgmentExhausted.message,
      });
      rec.awaiting = st.id;
      rec.gate_declarations_owed.push({ state: st.id, gate_id: JUDGMENT_RETRY_GATE_ID, declaration: relFromRepo(resolve(declPath)) });
      stopped = st;
      checkpointRun(rec);
      break;
    }
    if (st.kind === "write") {
      // A WRITE STATE THAT WROTE NOTHING IS NOT A RENDERER THAT NAMED NO ARTIFACT
      // (PR #667 round 1 finding 2). `{ artifact: <path> }` wrote; `{ artifact: null }` ran
      // and wrote nothing deliberately; returning nothing still FAILS.
      const kindOfWrite = classifyWriteOutcome(outcome);
      if (kindOfWrite === "named-nothing") {
        fail(`workflow state ${JSON.stringify(st.id)} is kind "write" and its renderer named no artifact.`);
      }
      if (kindOfWrite === "wrote") {
        rec.artifacts_written.push({ state: st.id, artifact: st.writes, path: relFromRepo(resolve(outcome.artifact)) });
      }
    }
    completeState(rec, st.id, advancedBy);
    // AFTER EVERY COMPLETED STATE (kogaki#1073 item 3). The advance that was
    // killed on 2026-09-10 had completed `compose_input` and `J1_claims` and its
    // record named neither, because the only write was the one below.
    checkpointRun(rec);
  }

  // THE PENDING RECORD IS RELEASED HERE, at the one place the loop's own write
  // happens (kogaki#808). Everything between the arming ABOVE — at the top of
  // this act, beside `rec._dir = dir` — and this line is the window in which a
  // refusal would otherwise have discarded the act's completed transitions.
  setRunPersist(null, null);
  delete rec._dir;
  const recPath = writeRunRecord(dir, rec);

  console.log("");
  // NAMED BESIDE THE NEW RUN, AT THE MOMENT IT HAPPENS (kogaki#1163 acceptance
  // 3). A second `start` over a run that already reached `done` is legitimate
  // — the pointer clears on the way to a terminal by design — but the session
  // that just re-entered the skill is exactly the one that needs told, before
  // it re-asks a question the finished run already answered.
  if (priorDoneRun) {
    // THE RELAY IS GUARDED THE WAY ITS PYTHON TWIN IS (PR #1168 round 1).
    // `done_context` in the advance hook reads `artifacts_written` through
    // `isinstance` on the list and on each entry, because a record this reader
    // cannot trust is not evidence either way; the same relay here threw on a
    // record carrying that field as anything but an array, and it threw inside
    // `start`, AFTER the new run's record had been written.
    const raw = priorDoneRun.rec.artifacts_written;
    const artifacts = (Array.isArray(raw) ? raw : [])
      .filter((a) => a && typeof a === "object")
      .map((a) => `  - ${a.state}: ${a.path}`).join("\n") || "  (none written)";
    console.log(`A previous run in this lane already reached done: ${priorDoneRun.dir}`);
    console.log(`Its artifacts:\n${artifacts}`);
    console.log("");
  }
  if (stopped && stopped.kind === "wait") {
    console.log(`Executor STOPPED at ${stopped.id} — a wait (the wait rule). ${stopped.owner_supplies ? `The owner supplies: ${stopped.owner_supplies}.` : ""}`);
    // NO INVOCATION IS PRINTED HERE (kogaki#856). A wait whose owner must READ
    // something before answering carries the reading in its gate declaration,
    // where the session renders it above the question — so this stop names the
    // wait and what the owner supplies, and never a command to type.
    const owedHere = stopped.renders_gate_declaration
      ? rec.gate_declarations_owed.find((g) => g.state === stopped.id) : null;
    if (!stopped.renders_gate_declaration) {
      console.log(`Nothing is asked here: the executor stops and the owner speaks. Re-enter with what they said — run --run-dir ${dir} --input '<...>'`);
    } else if (owedHere && owedHere.declaration) {
      // THE STOP NAMES THE FILE (PR #671 round 1). The executor now WRITES the
      // declaration, and this message still said it did not and still sent the
      // reader to `--input` — while SKILL.md promised "the executor composes the
      // run declaration and names its path". The path was returned silently and
      // carried only on the run record, so the skill instructed the session to
      // render a file the runtime never pointed at.
      console.log(`This wait declares a gate. Its run declaration is WRITTEN: ${owedHere.declaration}`);
      // THE READING COMES BEFORE THE QUESTION, and the stop says so rather than
      // leaving the order to the session (kogaki#856). A declaration carrying a
      // rendering carries it so the owner can answer from it; rendered after the
      // question, or not at all, it is the defect this issue was filed about.
      // AND THE CALL IS NAMED, NOT DESCRIBED (kogaki#1028 item 1). The two lines
      // this replaces told the session what to compose; a session that composed
      // nothing at all was indistinguishable from one that had not been told.
      // The payload is now a file, the only admissible act while the pointer is
      // open is sending it byte-for-byte, and `.claude/hooks/gate-open-terrain-
      // gate.py` is what makes that true rather than this sentence.
      printWrittenGateCall(dir, stopped.gate_id,
        `Send that file's contents as the tool_input, byte-for-byte — it already carries the reading (\`tag_listing\`) above the question. Nothing is retyped, summarized, reformatted or pre-selected, and the executor renders no question UI of its own (the post-tag-selection window).`);
      console.log(`Then re-enter with a bare  run --run-dir ${dir}  — the answer is read from the harness's own capture, written by .claude/hooks/write-gate-capture.py when the owner answers. No flag carries it (kogaki#890).`);
      console.log(`A bare --input is refused at a gate wait: it would skip the declaration's own option check and the tool_use_id that evidences the rendering.`);
    } else {
      console.log(`This wait declares a gate and its declaration is OWED AND UNWRITTEN: ${(owedHere && owedHere.unwritten) || "no option composer is bound to this state"}.`);
      console.log(`The run is not stuck — the workflow table makes a gate state a table row PLUS an option composer, and this table names one this runtime does not bind. Nothing can be captured here until it does.`);
    }
  } else if (stopped && stopped.kind === "terminal") {
    console.log(`Executor reached ${stopped.id} — terminal (the workflow table). The run is over.`);
  } else if (stoppedForDetachedJob) {
    // THE DETACHED-JOB STOP (kogaki#1193 PR #1195 review round 1, finding 3).
    // `stopped` is a `judgment` state that opened a Detached Job and raised
    // `DetachedJobStarted` rather than completing or raising a retry gate —
    // the generic `rec.awaiting === stopped.id` branch below cannot tell this
    // apart from the judgment-retry stop, and printed that stop's false text
    // here. This branch is checked first so the job's own state, not a
    // borrowed one, reaches the screen.
    console.log(`Executor STOPPED at ${stopped.id} — a Detached Job was started and is running outside this process (kogaki#1193; \`review_path\`'s since kogaki#1301). The state is NOT complete.`);
    console.log(`Poll it with  ${READER_PATH_JOB_STATUS_COMMAND}  (one-shot) or  ${READER_PATH_JOB_AWAIT_COMMAND}  (waits at most 30 seconds, then says whether the job is still running).`);
  } else if (stopped && rec.awaiting === stopped.id) {
    // THE JUDGMENT-RETRY STOP (kogaki#1172 item 3). `stopped` is a `judgment`
    // state that exhausted its retries and raised `terrain-judgment-retry`
    // rather than completing — the same shape a `wait` leaves, minus the
    // owner_supplies line, because a judgment state declares none.
    console.log(`Executor STOPPED at ${stopped.id} — a judgment exhausted its declared retries (kogaki#1172). It raised the terrain-judgment-retry gate rather than failing the run; the state is NOT complete, so answering "retry" re-enters it.`);
    const owedHere = rec.gate_declarations_owed.find((g) => g.state === stopped.id && g.gate_id === JUDGMENT_RETRY_GATE_ID);
    if (owedHere && owedHere.declaration) {
      console.log(`This stop declares a gate. Its run declaration is WRITTEN: ${owedHere.declaration}`);
      printWrittenGateCall(dir, JUDGMENT_RETRY_GATE_ID,
        `Send that file's contents as the tool_input, byte-for-byte. Nothing is retyped, summarized, reformatted or pre-selected.`);
      console.log(`Then re-enter with a bare  run --run-dir ${dir}  — the answer is read from the harness's own capture, exactly as at any other gate wait (kogaki#890).`);
    }
  } else if (rec.judgment_abandoned) {
    // THE ABANDON STOP (kogaki#1172 item 3, acceptance 4). The loop above ran
    // zero iterations -- `stopped` is null -- because the owner's "abandon"
    // answer was applied in the pre-loop block before the loop even started.
    console.log(`Run ABANDONED at ${rec.judgment_abandoned.state}, on the owner's answer to terrain-judgment-retry (kogaki#1172). The open-run pointer is cleared; nothing further is asked.`);
  } else {
    console.log("Executor advanced to the end of the table without reaching a stop, which a conformant table cannot do.");
  }
  console.log(`Run record: ${recPath}`);
  return recPath;
}

// THE GATE CALL'S PRINTING SITE, ONE FOR EVERY STOP THAT OPENS A GATE (kogaki#1299).
// The wait stop printed the written call's bytes (kogaki#1057) and the judgment-retry
// stop named only its declaration, so the 2026-10-07 Brief run raised a gate whose
// one admissible payload nothing could fetch. Both stops print through here; a stop
// kind added later reaches the bytes by calling it rather than by copying it.
// `sendLine` is the stop's own instruction for sending the call.
export function printWrittenGateCall(dir, gateId, sendLine) {
  const callHere = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
  // BEFORE THE BYTES ARE PRINTED, NOT AFTER (kogaki#1118 acceptance 4). A
  // call written before a label repair is a payload the channel refuses, and
  // printing it hands the session its one admissible act in a form that
  // cannot be performed.
  const refreshedHere = refreshWrittenGateCall(dir, gateId);
  if (existsSync(callHere)) {
    // THE POINTER IS RESTORED HERE, BEFORE THE BYTES PRINT (kogaki#1313). A
    // re-print reaching this far has a written declaration and a written call
    // for this gate_instance_id — the two facts `restoreOpenGatePointer` needs
    // to write a live pointer again where an earlier raising's was abandoned,
    // so the capture hook has somewhere to join the owner's answer to.
    restoreOpenGatePointer(dir, gateId);
    console.log(`The AskUserQuestion call is WRITTEN: ${callHere}`);
    console.log(sendLine);
    // AND THE BYTES ARE HERE, NOT ONLY THEIR ADDRESS (kogaki#1057): no tool is admissible
    // inside the open-gate interval, so stdout is the only channel. The file stays the
    // reference for the PreToolUse equality check.
    // ONE SITE, EVERY ENTRY (kogaki#1057 item 2): re-entry prints through this same function.
    console.log(`Its bytes are below — the payload itself, not a path to one. No tool is admissible inside the open-gate interval, the Read that would fetch this file included, so a call named and unprinted is one nothing can obtain (kogaki#1057).`);
    console.log("```json");
    console.log(readFileSync(callHere, "utf8").replace(/\n+$/, ""));
    console.log("```");
    if (refreshedHere) {
      console.log(`NOTE: the call written by the earlier stop carried a label the shared question-shape check refuses, so it was recomposed from the declaration's standing options before being printed (kogaki#1118). The bytes above are the refreshed payload and the file on disk matches them; the gate, its instance and its answer join are unchanged. The refusal it cleared: ${refreshedHere.refused.split("\n").filter(Boolean)[0]}${refreshedHere.legacy ? " — the declaration predates `run_composed_option_ids`, so every registered id was refreshed; a run-time option sharing an id with a registered one would have been overwritten, and none was recorded either way." : ""}`);
    }
    console.log(`While this gate is open, every other tool call is DENIED and the turn cannot end until the answer is captured (kogaki#1028).`);
  } else {
    console.log(`No AskUserQuestion call could be composed for this gate, and the reason is on the open-gate pointer (\`gate_call_unavailable\`). Render the declaration's options verbatim, nothing pre-selected, free text on.`);
  }
}

// Counts, from the record and from the table, rendered side by side. This is
// the read #625's acceptance item 2 asks for; story 1.91's registered check is
// what REFUSES on a disagreement.
function reportRunStatus(dir, tablePath, table) {
  const rec = readRunRecord(dir)
    || fail(`no run record at ${runRecordPath(dir)}. A run's counts are read from its record alone (the run record).`);
  const derived = derivedBaseline(table);
  const declared = table.counted_baseline || {};
  const counts = runCounts(rec);
  console.log(`Run record: ${runRecordPath(dir)}`);
  console.log(`Workflow table: ${relFromRepo(tablePath)} (version ${table.version})`);
  console.log(`Position: ${rec.done ? "done" : rec.awaiting ? `awaiting ${rec.awaiting}` : "advancing"}; ${rec.completed.length} state(s) completed.`);
  console.log(`Survey record (by path, the run record): ${rec.survey_record || "not yet minted"}`);
  console.log("");
  console.log("counted from the RUN RECORD:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(28)} ${v}`);
  console.log("");
  console.log("derived from the TABLE's states array (the denominator acceptance item 2 counts against):");
  for (const [k, v] of Object.entries(derived)) {
    const d = Object.prototype.hasOwnProperty.call(declared, k) ? declared[k] : null;
    const note = d === null ? " (not in counted_baseline)" : d === v ? "" : `  <- DISAGREES with counted_baseline: ${d}`;
    console.log(`  ${k.padEnd(28)} ${v}${note}`);
  }
  console.log("");
  console.log("A run that entered no conditional state legitimately writes fewer artifacts than the table's");
  console.log("unconditional total; the check story 1.91 registers is what judges a disagreement, not this read.");
  return rec;
}
