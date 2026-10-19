// brief/job-verbs — the Reader-path job's two Bash-reachable verbs, the status
// lines, the await, and the flow binding. Cut from src/brief.mjs at its named
// sections (kogaki#1466); the design and its rulings are stated in the Issues
// each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gateSchema } from "../compose.mjs";
import { enterRun } from "../runs.mjs";
import {
  READER_PATH_JOB_SYSTEM_FAILURE_STATES, jobHeartbeatMs, readReaderPathJob, readerPathAwaitStep,
  readerPathJobBounds, readerPathJobPath, readerPathJobStopFlagPath,
} from "../workflow/detached-job.mjs";
import { printWrittenGateCall, runWorkflow } from "../workflow/executor.mjs";
import { READER_PATH_JOB_GATE_ID, emitGateDeclaration } from "../workflow/gate.mjs";
import {
  checkpointRun, clearOpenRunPointer, detachedJobExecutor, readRunRecord, relFromRepo,
} from "../workflow/run-record.mjs";
import {
  composeJobExcluded, composeJobFinished, endBriefNoCandidateFits,
} from "./reader-path-unit.mjs";
import { GATE_WORK, STATE_WORK } from "./renderers.mjs";
import {
  BRIEF_TABLE, briefRunEntry, captureFile, detachedJobOfRun, fail, readJson,
} from "./run-state.mjs";

// ---- THE READER-PATH JOB'S TWO BASH-REACHABLE VERBS (kogaki#1193).
//
// FOUR VERBS EXIST — `start`, `status`, `await`, `stop` — and only two are
// dispatched here. `start` runs in-process from `compose_path`'s own
// STATE_WORK on the entry that finds no job record (it opens the job and
// throws `DetachedJobStarted`, exactly as a judgment-retry state throws
// `JudgmentExhausted`); `stop` runs in-process from the `READER_PATH_JOB_GATE_ID`
// gate-answer branch the engine's own wait-answer block already
// carries. Neither is a read, and neither is reachable from a Bash command —
// `run --status --job start` and `run --status --job stop` are refused below
// by name, not by the hook (the hook admits any `run --status`, `--job`
// included; the refusal is this function's own).
async function jobWork(dir, verb, table, tablePath, args) {
  if (verb === "start" || verb === "stop") {
    fail(`\`--job ${verb}\` is refused from a Bash-reachable call — it runs in-process only, from the `
      + "hook-driven advance that starts or stops the reader-path job, never from a session-typed command "
      + "(kogaki#1193). The two verbs reachable this way are `status` and `await`.");
  }
  if (verb !== "status" && verb !== "await") {
    fail(`\`--job ${verb}\` is not one of the reader-path job's four verbs: `
      + '`start`, `status`, `await`, `stop` (kogaki#1193).');
  }
  // THE JOB OF THE STATE THE RUN IS WAITING AT (kogaki#1301): the path-review
  // job while the run waits at `review_path`, the reader-path job otherwise.
  const j = detachedJobOfRun(dir);
  let job;
  try { job = readReaderPathJob(j.jobDir); } catch (e) {
    if (verb === "status") throw e;
    endBriefOnDefect(dir, `the job record could not be read: ${e.message}`, relFromRepo(resolve(readerPathJobPath(j.jobDir))));
  }
  if (!job) {
    console.log(`No ${j.label} record exists at ${readerPathJobPath(j.jobDir)} — nothing is running.`);
    return;
  }
  if (verb === "status") { printReaderPathJobStatus(j, job); return; }
  await awaitReaderPathJob(j, job, table, tablePath, args);
}

// A SYSTEM FAILURE IS A /brief DEFECT, AND IT ENDS THE BRIEF AT ONCE
// (kogaki#1273, the owner's 2026-10-05 ruling: "do not silently continue and
// do not retry. Treat it as a bug in the `/brief` command itself and stop the
// entire Brief command immediately"). No question is raised -- there is
// nothing for the owner to choose between -- the run record is marked done
// with the defect named on it, the open-run pointer is cleared exactly as a
// stopped run's is, and `job await` exits non-zero with the one line below.
function endBriefOnDefect(dir, cause, file) {
  const line = `This is a /brief defect, not a candidate refusal: ${cause} (${file}). The run is ended; nothing was retried.`;
  const rec = readRunRecord(dir);
  if (rec) {
    rec._dir = dir;
    rec.brief_defect = { state: rec.awaiting, cause, file, at: new Date().toISOString() };
    rec.awaiting = null;
    rec.done = true;
    checkpointRun(rec);
  }
  clearOpenRunPointer();
  process.stderr.write(`brief: ${line}\n`);
  process.exit(1);
}

// WHAT A SYSTEM-FAILURE JOB RECORD SAYS WENT WRONG, AND WHERE TO LOOK
// (kogaki#1273): the dead unit's own exit and stdout file, the stall's
// length, or the supervisor's own catch-all note -- read off the record the
// supervisor wrote, never composed from anything else.
function readerPathDefectCause(j, job, state) {
  const jobFile = relFromRepo(resolve(readerPathJobPath(j.jobDir)));
  const f = job.failure || {};
  if (state === "died") {
    const unit = (job.units || []).find((u) => u.status === "died") || {};
    const uf = unit.failure || f;
    const why = typeof uf.result === "string" ? uf.result : String(uf.stderr_tail || "").trim();
    const file = uf.file ? relFromRepo(resolve(uf.file)) : jobFile;
    return { cause: `the step ${JSON.stringify(unit.id || f.unit || "unknown")} stopped with exit code ${uf.exit_code}${why ? `: ${why}` : ""}`, file };
  }
  if (state === "stalled") {
    return { cause: `no step produced new output for ${f.stalled_s}s`, file: jobFile };
  }
  return { cause: f.note || `the job ended ${state}`, file: jobFile };
}

function supervisorAlive(pid) {
  if (!Number.isInteger(pid)) return true;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

// A ONE-LINE HEARTBEAT, read straight off the record the supervisor updates
// every `READER_PATH_JOB_HEARTBEAT_MS` (kogaki#1193): `status` never blocks and
// never polls. A run with an owed, uncaptured gate prints its bytes too
// (kogaki#1198, widened by kogaki#1313): a re-entering session has no live
// `job await` left to print them, so this is its second chance, gated on the
// gate-call file existing with no capture row answering it.

// THE STATUS LINES (kogaki#1355): a header naming the job's two bounds, then one
// line per unit naming its attempt, its call and its status, and from attempt 2
// an estimate read from the row's `attempt_1_s`, never derived here. `job
// status` and `job await`'s heartbeat both print these lines.
export function readerPathJobStatusLines(label, jobPath, job, now = Date.now()) {
  const startedAt = Date.parse(job.started_at || job.updated_at || new Date(now).toISOString());
  const elapsedS = Math.floor((now - startedAt) / 1000);
  let bounds = null;
  try { bounds = readerPathJobBounds(job); } catch { bounds = null; }
  const n = bounds ? bounds.unitAttempts : "an unrecorded number of";
  const limit = bounds ? `${bounds.callLimitS}s` : "an unrecorded time";
  const lines = [`${label} at ${jobPath} — elapsed ${elapsedS}s; each unit gets up to ${n} attempts of at most ${limit} per call:`];
  for (const u of job.units || []) {
    const attempt = Number.isInteger(u.attempts) ? u.attempts : 1;
    const phase = u.phase === "fit" ? "fit" : "compose";
    // kogaki#1197: a dead unit's own `is_error` result text says why it died.
    const why = u.failure && typeof u.failure.result === "string" ? ` — ${u.failure.result}` : "";
    let estimate = "";
    if (u.status === "running" && attempt >= 2 && typeof u.attempt_1_s === "number") {
      const began = Date.parse(u.attempt_started_at || "");
      const ranS = Number.isFinite(began) ? (now - began) / 1000 : 0;
      estimate = `, about ${Math.max(0, Math.round(u.attempt_1_s - ranS))}s to go`;
    }
    lines.push(`  unit ${u.id}: attempt ${attempt} of ${bounds ? bounds.unitAttempts : "?"}, ${phase}, ${u.status}, ${u.bytes || 0} byte(s) so far${estimate}${why}`);
  }
  return lines;
}

function printReaderPathJobStatus(j, job) {
  const dir = j.runDir;
  for (const line of readerPathJobStatusLines(j.label, readerPathJobPath(j.jobDir), job)) console.log(line);
  const rec = readRunRecord(dir);
  // THE GATE OWED AT THE AWAITING STATE, WHATEVER ITS GATE_ID (kogaki#1313).
  // A job resume advances the workflow past the job's own gate into later
  // states, each able to raise its own — `brief-candidate-selection` at
  // `CANDIDATE_SELECTION`, say — and this print is the owner's only second
  // chance at whichever one is outstanding, not only at
  // `brief-reader-path-job`. Matched on `state`, not on `gate_id`.
  const owed = rec && Array.isArray(rec.gate_declarations_owed)
    ? rec.gate_declarations_owed.filter((g) => g.state === rec.awaiting && g.declaration).pop()
    : null;
  if (rec && rec.awaiting && owed) {
    // BOTH ARTIFACTS ARE NAMED FROM `dir` AND THE GATE ID, NOT FROM
    // `owed.declaration` (kogaki#1198). `emitGateDeclaration` writes the
    // declaration and the call beside each other, `${gateId}<suffix>` in the
    // run's own directory, which is the path `printWrittenGateCall` derives
    // too, so this reads the run-relative path the writer used rather than
    // re-deriving the repo root a session may not be standing in.
    const declPath = join(dir, `${owed.gate_id}${gateSchema().capture.run_declaration_suffix}`);
    const capPath = captureFile({ _dir: dir });
    let captured = false;
    if (existsSync(declPath) && existsSync(capPath)) {
      try {
        const decl = JSON.parse(readFileSync(declPath, "utf8"));
        const doc = JSON.parse(readFileSync(capPath, "utf8"));
        const rows = Array.isArray(doc.rows) ? doc.rows : [];
        captured = rows.some((r) => r && r.gate_instance_id === decl.gate_instance_id);
      } catch { /* an unreadable capture reads as not yet answered, not as an error status prints past */ }
    }
    if (!captured) {
      console.log(`This run has an OWED, UNCAPTURED gate at state ${rec.awaiting}:`);
      // THE ONE PRINTING SITE (kogaki#1313), shared with every stop the
      // executor's own advance loop prints through -- `printReaderPathJobGateCallBytes`
      // is removed in favour of it, so the bytes `job status` and `job await`
      // print here are composed exactly once, never by a second reader kept
      // in step with the first by hand.
      printWrittenGateCall(dir, owed.gate_id,
        `Send that file's contents as the tool_input, byte-for-byte. Nothing is retyped, summarized, reformatted or pre-selected.`);
    }
  }
}

// THE BLOCKING POLL (kogaki#1193). Sleeps synchronously between reads with no
// child process of its own — `Atomics.wait` on a throwaway buffer — because
// `await` is a plain Bash tool call the session is waiting on, and spawning a
// subprocess to sleep would be one more thing `gate-terrain-executor.py` has
// an opinion about. Stops the moment the job's own classification leaves
// "running", or once `READER_PATH_JOB_AWAIT_S` of its own waiting has passed.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// THE AWAIT'S OWN BOUND (kogaki#1271, the owner's 30-second poll, 2026-10-05).
// A job runs for as many attempts of as long a call as its two bounds allow
// (kogaki#1355), far longer than one Bash tool call may last, so `job await`
// returns after at most this long with the status lines and
// `READER_PATH_JOB_STILL_RUNNING_LINE`, raises no question and exits 0; the
// Brief skill reads that line as "run `job await` again".
export const READER_PATH_JOB_AWAIT_S = 30;
// A FIXTURE-SUPPLIED AWAIT BOUND (kogaki#1424), handed in the way the heartbeat is
// (`jobHeartbeatMs`): a check asserting that `job await` returns within its own bound
// sets `KOGAKI_JOB_AWAIT_S` short instead of waiting the owner's 30 s out; unset, the
// bound is the constant above.
export function jobAwaitS() {
  const fixture = Number(process.env.KOGAKI_JOB_AWAIT_S);
  return Number.isFinite(fixture) && fixture > 0 ? fixture : READER_PATH_JOB_AWAIT_S;
}
export const READER_PATH_JOB_STILL_RUNNING_LINE = "reader-path job still running — call job await again";
export const REVIEW_PATH_JOB_STILL_RUNNING_LINE = "path-review job still running — call job await again";

async function awaitReaderPathJob(j, initialJob, table, tablePath, args) {
  const dir = j.runDir;
  let job = initialJob;
  const awaitStartedAt = Date.now();
  for (;;) {
    const startedAt = Date.parse(job.started_at || job.updated_at || new Date().toISOString());
    const elapsedS = Math.floor((Date.now() - startedAt) / 1000);
    const lastProgressAt = job.last_progress_at ? Date.parse(job.last_progress_at) : startedAt;
    const stalledS = Math.floor((Date.now() - lastProgressAt) / 1000);
    const stopRequested = existsSync(readerPathJobStopFlagPath(j.jobDir));
    // THE PER-POLL DECISION IS `src/workflow/detached-job.mjs`'s PURE FUNCTION
    // (kogaki#1213), over THIS poll's freshly-measured stall reading. It reads no time
    // limit (kogaki#1355): the per-call limit is the supervisor's own.
    const { units, state } = readerPathAwaitStep(job, { stopRequested, stalledS });
    if (READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes(state)) {
      const { cause, file } = readerPathDefectCause(j, job, state);
      endBriefOnDefect(dir, cause, file);
    }
    // THE SUPERVISOR GONE WHILE THE RECORD SAYS RUNNING (kogaki#1273): a
    // record nothing will ever update again is a defect, not a job to wait on.
    // Re-read once first, so a supervisor that wrote its terminal record and
    // exited between this poll's read and its liveness check is not mistaken
    // for one that died.
    if (state === "running" && !supervisorAlive(job.supervisor_pid)) {
      const again = readReaderPathJobOrDefect(j);
      if (again && again.state === job.state && again.updated_at === job.updated_at) {
        endBriefOnDefect(dir, `the supervisor process ${job.supervisor_pid} is gone while the record says ${job.state}`,
          relFromRepo(resolve(readerPathJobPath(j.jobDir))));
      }
      job = again || job;
      continue;
    }
    if (state !== "running") { await finishReaderPathJobAwait(j, { ...job, units }, state, table, tablePath, args); return; }
    const remainingMs = jobAwaitS() * 1000 - (Date.now() - awaitStartedAt);
    if (remainingMs <= 0) {
      // THE HEARTBEAT CARRIES THE ATTEMPTS AND THE ESTIMATE (kogaki#1355), so the owner
      // waiting on a long job sees which attempt each unit is on and how long is left.
      for (const line of readerPathJobStatusLines(j.label, readerPathJobPath(j.jobDir), job)) console.log(line);
      console.log(`${j.stateId === "review_path" ? REVIEW_PATH_JOB_STILL_RUNNING_LINE : READER_PATH_JOB_STILL_RUNNING_LINE} (elapsed ${elapsedS}s).`);
      return;
    }
    console.log(`${j.label} still running at ${elapsedS}s — waiting for the next heartbeat.`);
    sleepSync(Math.min(jobHeartbeatMs(), remainingMs));
    job = readReaderPathJobOrDefect(j) || job;
  }
}

function readReaderPathJobOrDefect(j) {
  try { return readReaderPathJob(j.jobDir); } catch (e) {
    return endBriefOnDefect(j.runDir, `the job record could not be read: ${e.message}`, relFromRepo(resolve(readerPathJobPath(j.jobDir))));
  }
}

// THE RESUME CLAIM (kogaki#1278). Beside the job record, never inside it, so
// a claim never rides a `checkpointRun` write. An exclusive create (`wx`) is
// the only operation here: the caller that wins the create is the one that
// resumes, and every later caller — a second `job await`, a backgrounded one
// that is still mid-poll — reads `EEXIST` and takes the no-op arm instead.
function readerPathJobResumeClaimPath(j) {
  return join(j.jobDir, "reader-path-job-resume.claim");
}

// A CLAIM HELD BY A PROCESS THAT IS GONE IS NOT A CLAIM (kogaki#1278 round
// 1). The claim arbitrates between waiters that are alive at the same time;
// it is never released explicitly, because a resume ends at a gate, a refusal
// or a kill and only the first of those runs any code of its own. So a later
// caller reads the claimant's pid, as `supervisorAlive` reads the
// supervisor's, and takes over a claim whose claimant has exited — which is
// what keeps a cut-off resume resumable by `job await` (kogaki#1193). A
// claimant still alive keeps the claim, and that is the race this guards.
// AND ONLY WHILE THE RUN HAS NOT MOVED: the claim records the run's position
// when it was taken, and a claimant that exited after advancing the run (to
// the Candidate question, say) finished its resume, so its claim stands and a
// later waiter prints the position rather than resuming a second time.
function readerPathRunPosition(dir) {
  const rec = readRunRecord(dir);
  return JSON.stringify(rec ? { completed: rec.completed || [], awaiting: rec.awaiting ?? null, done: !!rec.done } : null);
}

function claimReaderPathJobResume(j, state) {
  const claimPath = readerPathJobResumeClaimPath(j);
  const position = readerPathRunPosition(j.runDir);
  const body = `${JSON.stringify({ claimed_at: new Date().toISOString(), pid: process.pid, state, position }, null, 2)}\n`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(claimPath, body, { flag: "wx" });
      return true;
    } catch (e) {
      if (!e || e.code !== "EEXIST") throw e;
    }
    let held = null;
    try { held = JSON.parse(readFileSync(claimPath, "utf8")); } catch { held = null; }
    const pid = held && Number.isInteger(held.pid) ? held.pid : null;
    if (attempt > 0 || pid === null || supervisorAlive(pid) || held.position !== position) return false;
    try { unlinkSync(claimPath); } catch (e) { if (!e || e.code !== "ENOENT") throw e; }
  }
  return false;
}

// THE TWO TERMINAL ARMS (kogaki#1193). `done` resumes the run in-process,
// attributed to the `detached-job` executor kind and carrying the assembled
// candidates so `compose_path`'s existing, unmodified `judged(...)` call
// validates them exactly as it validates a live judge's record -- one finished
// Candidate or more (kogaki#1273), the refused units beside it contributing
// nothing. Every other state but a system failure, which
// `awaitReaderPathJob` ends as a defect before reaching here, raises
// `brief-reader-path-job` and stops — no state here ever auto-retries.
async function finishReaderPathJobAwait(j, job, state, table, tablePath, args) {
  const dir = j.runDir;
  const jobRel = relFromRepo(resolve(readerPathJobPath(j.jobDir)));
  // A RUN ALREADY `done` IS NEVER RESUMED (kogaki#1278). Checked before the
  // claim, not after: the claim only arbitrates between waiters racing to
  // resume a run that is still open, and a run a prior resume already closed
  // is not that race — it is the one this issue's transcript hit, where a
  // slower waiter's `runWorkflow` overwrote a run the faster waiter had
  // already finished and answered.
  const precheckRec = readRunRecord(dir);
  if (precheckRec && precheckRec.done) {
    console.log(`${j.label} at ${state} — run ${dir} is already done; this resume refuses to rewrite it.`);
    return;
  }
  if (state === "done") {
    // THE CLAIM (kogaki#1278), taken in this arm only: it is the one that
    // resumes the run, and the terminal arms below stay re-enterable so a
    // later call can re-raise their owed gate (kogaki#1198). The caller that
    // wins the claim resumes; every other caller prints the run's current
    // position (the same reading `job status` gives) and exits 0 having
    // advanced nothing.
    if (!claimReaderPathJobResume(j, state)) {
      console.log(`${j.label} resume at ${dir} is already claimed at ${readerPathJobResumeClaimPath(j)} — printing the run's position instead of resuming it again.`);
      printReaderPathJobStatus(j, job);
      return;
    }
    // THE PATH-REVIEW JOB'S RESULT (kogaki#1301): each finished unit's entry
    // keyed by the `candidate_id` the Harness recorded for that unit when it
    // started the job, and every Candidate whose unit did not end `done`
    // named beside them. `review_path` re-enters on `--review-result`.
    if (j.stateId === "review_path") {
      const jobRec = readRunRecord(dir);
      const unitCandidate = (jobRec && jobRec.brief_review_units) || {};
      const review = {};
      const unreviewed = [];
      for (const u of job.units || []) {
        const candidateId = unitCandidate[u.id];
        if (typeof candidateId !== "string") continue;
        if (u.status === "done" && u.candidate && typeof u.candidate === "object") review[candidateId] = u.candidate;
        else unreviewed.push({ candidate_id: candidateId, unit: u.id, status: u.status });
      }
      const resultPath = join(j.jobDir, "review-path-result.json");
      writeFileSync(resultPath, `${JSON.stringify({ review, unreviewed }, null, 2)}\n`);
      await runWorkflow(BRIEF_FLOW, { ...args, status: undefined, job: undefined, "review-result": resultPath, "run-dir": dir },
        detachedJobExecutor(jobRel));
      return;
    }
    // TAGGED WITH THE UNIT NUMBER HERE, AND NOWHERE ELSE (kogaki#1206): `u.id`
    // is the Harness's own unit name, so `c.differentiation_unit` is not a field
    // the Model could have written. Reader start and the survivor count are set
    // here too, by the Harness, from the differentiation record (kogaki#1216):
    // `leg1_survivor_count` is an integer, named apart from the id list (PR
    // #1222 round 1). Read from the run record the job belongs to.
    const jobRec = readRunRecord(dir);
    const differentiation = jobRec && jobRec.brief_differentiation ? readJson(jobRec.brief_differentiation) : null;
    // FROM THE UNITS THAT ENDED `done`, AND NO OTHER (kogaki#1360). Presence of
    // `candidate` on a row stopped meaning "finished" at kogaki#1307: the Move-fit
    // judge runs after the compose call has produced a structurally valid
    // Candidate, so a unit it refuses keeps that Candidate on its row (the
    // "Not offered" line reads the characteristic off it) under `status:
    // "refused"`. Mapping every row carrying one put two refused Candidates on
    // the Candidate question of run 2026-10-13T06-54-14-062Z, the owner chose
    // one, and `adopt_candidate` refused it for having no specialization record.
    const candidates = composeJobFinished(job.units).map((u) => {
      const c = u.candidate;
      const m = /^candidate-(\d+)$/.exec(String(u.id || ""));
      if (m) c.differentiation_unit = Number(m[1]);
      if (differentiation && typeof differentiation.reader_start === "string") {
        c.reader_start = differentiation.reader_start;
        c.leg1_survivor_count = Array.isArray(differentiation.leg1_survivors) ? differentiation.leg1_survivors.length : 0;
      }
      return c;
    });
    // THE MOVE-FIT RECORDS AND THE UNITS THAT FINISHED NO CANDIDATE (kogaki#1307), carried
    // to `compose_path` beside the Candidates.
    const specializations = (job.units || [])
      .filter((u) => u.status === "done" && u.specialization && typeof u.specialization === "object")
      .map((u) => u.specialization);
    const excluded = composeJobExcluded(job.units);
    const resultPath = join(dir, "reader-path-candidates.json");
    writeFileSync(resultPath, `${JSON.stringify({ candidates, specializations, excluded }, null, 2)}\n`);
    // `status` IS CLEARED, NOT ONLY `job` (kogaki#1193): `cmdRun` reads
    // `args.status` before any run record, so a spread leaving it `true` would
    // report the position instead of advancing past it. AWAITED, NOT
    // FIRED-AND-FORGOTTEN: `runWorkflow` restores the module-level `FLOW` in a
    // `finally`, so an unawaited call here resumed reading `TERRAIN_FLOW` for
    // every later state (CANDIDATE_SELECTION composed no option set).
    await runWorkflow(BRIEF_FLOW, { ...args, status: undefined, job: undefined, candidates: resultPath, "run-dir": dir },
      detachedJobExecutor(jobRel));
    return;
  }
  const rec = readRunRecord(dir);
  if (!rec) fail(`no run record at ${dir} — the job it names has nothing to resume.`);
  rec._dir = dir;
  const failureState = rec.awaiting;
  // EVERY UNIT REFUSED (kogaki#1273): the job ends `refused` only when no
  // unit finished, and its arm is Stop alone -- "Re-run the failed step" is
  // removed by the owner's 2026-10-05 ruling, since each unit already spent
  // every attempt it had (kogaki#1355). The reading names every refused unit and
  // its refusal rather than the bare state token, so the owner sees which
  // steps failed and why without spec-internal vocabulary
  // (`findInternalVocabulary`, checked at raising by
  // `checks/check-brief-reader-path-job.sh` section (e)).
  // EVERY COMPOSE UNIT REFUSED (kogaki#1307): no Candidate fits, which the owner ruled an
  // acceptable ending (2026-10-08) -- the Brief ends with no question and the empty Brief
  // is removed. The path-review job keeps its Stop question below.
  if (state === "refused" && j.stateId !== "review_path") {
    endBriefNoCandidateFits(rec, { id: failureState || "compose_path" }, composeJobExcluded(job.units));
  }
  if (state === "refused") {
    const refusedUnits = (job.units || []).filter((u) => u.status === "refused");
    const reading = refusedUnits.length
      ? refusedUnits.map((u) => `The step named ${JSON.stringify(u.id)} did not complete: ${
        (u.failure && (u.failure.stderr_tail || u.failure.first_refusal)) || "no further detail was recorded for it"}`).join("\n")
      : "No step completed, and their own records are missing.";
    const options = [{ id: "stop", label: "Stop" }];
    const declPath = emitGateDeclaration(dir, READER_PATH_JOB_GATE_ID, options,
      { reader_path_job_state: state, reader_path_job: jobRel, reader_path_unit_refusal: reading });
    rec.gate_declarations_owed = rec.gate_declarations_owed || [];
    rec.gate_declarations_owed.push({ state: failureState, gate_id: READER_PATH_JOB_GATE_ID, declaration: relFromRepo(resolve(declPath)) });
    checkpointRun(rec);
    console.log(`${j.label} at ${state} — the ${failureState} state stops here; ${declPath} carries what the owner is asked.`);
    printWrittenGateCall(dir, READER_PATH_JOB_GATE_ID,
      `Send that file's contents as the tool_input, byte-for-byte. Nothing is retyped, summarized, reformatted or pre-selected.`);
    return;
  }
  // EVERY OTHER STATE ENDED THE JOB, so its Arm is stop alone; no state here
  // ever auto-retries.
  const options = [{ id: "stop", label: "Stop" }];
  const declPath = emitGateDeclaration(dir, READER_PATH_JOB_GATE_ID, options,
    { reader_path_job_state: state, reader_path_job: jobRel });
  rec.gate_declarations_owed = rec.gate_declarations_owed || [];
  rec.gate_declarations_owed.push({ state: failureState, gate_id: READER_PATH_JOB_GATE_ID, declaration: relFromRepo(resolve(declPath)) });
  checkpointRun(rec);
  console.log(`${j.label} at ${state} — the ${failureState} state stops here; ${declPath} carries what the owner is asked.`);
  printWrittenGateCall(dir, READER_PATH_JOB_GATE_ID,
    `Send that file's contents as the tool_input, byte-for-byte. Nothing is retyped, summarized, reformatted or pre-selected.`);
}

// THE FLOW BINDING. Everything a second flow differs in, and nothing else —
// the shape `src/terrain.mjs` declares at `TERRAIN_FLOW` beside its own.
export const BRIEF_FLOW = {
  lane: "brief",
  label: "Brief",
  jobWork,
  startLine: "the brief skill's own `!` line (`node src/brief.mjs start`)",
  tablePath: BRIEF_TABLE,
  newRunDir: () => enterRun("brief", briefRunEntry()),
  stateWork: STATE_WORK,
  gateWork: GATE_WORK,
  // PER FLOW, so a fixture pinning one lane's workspace does not redirect the
  // other's. `KOGAKI_RUN_DIR` and `KOGAKI_OPEN_RUN` stay Terrain's.
  runDirEnv: "KOGAKI_BRIEF_RUN_DIR",
  openRunEnv: "KOGAKI_BRIEF_OPEN_RUN",
};
