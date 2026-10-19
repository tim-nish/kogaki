#!/usr/bin/env bash
# check-brief-job-screen — what the owner sees of a Reader-path job: the
# screen leaks no state token or path (e), the supervisor argv (g), the
# gate-call bytes on stdout (h), a later wait's owed gate re-printed (k),
# `job await` over a running job returning within its bound (v), and a
# running record with no live supervisor ending as a defect (v4b).
# (g)'s minimal-environment flags are asserted by STRING, not by a spawned
# session reading them (kogaki#1197). Cut from check-brief-reader-path-job.sh
# by kogaki#1464.
set -u
cd "$(dirname "$0")/.."

# FIXTURE ISOLATION. `emitGateDeclaration`, reached by the job's gate, writes an
# open-gate pointer and a gate-declaration sidecar keyed to the session id it
# reads from the environment. Inherited, that opens a live gate in whichever
# session runs this check and the gate-open hook then refuses every tool but
# the gate's own question — which is what stopped two implement workers on
# #1193. So the whole member runs under a fixture session id and scratch
# directories, and fails if a pointer naming the fixture session reached the
# live pointer directory (pointers are keyed by gate instance, so the match is
# on the session id they carry — another session's gate is not this check's).
live_gates="${KOGAKI_OPEN_GATES:-$HOME/.claude/kogaki-open-gates}"
iso="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-rpjob-iso-XXXXXX")"
trap 'rm -rf "$iso"' EXIT
export KOGAKI_OPEN_GATES="$iso/open-gates"
export GATE_DECLARATION_SIDECAR_DIR="$iso/gate-declarations"
export CLAUDE_CODE_SESSION_ID="check-brief-job-screen-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { READER_PATH_JOB_GATE_ID, emitGateDeclaration, GATE_CALL_SUFFIX } from "./src/workflow/gate.mjs";
import { findInternalVocabulary } from "./src/assemble.mjs";
import {
  root, WAIT_SCALE, scratch, mkNewRun, superviseSync, readRecord, runRecordPath,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const fails = [];

// (e) THE SCREEN LEAKS NEITHER A STATE NAME NOR A PATH (acceptance 8). A
// fixture declaration carries both in its EXTRA fields — exactly what
// `finishReaderPathJobAwait` hands `emitGateDeclaration` — and the rendered
// AskUserQuestion payload the declaration's composer WRITES beside it is
// asserted to contain neither the raw state token nor the job-record path
// (read from that file since kogaki#1257, the composer being internal).
{
  const dir = mkNewRun();
  const jobPath = join(dir, "reader-path-job.json");
  const declPath = emitGateDeclaration(dir, READER_PATH_JOB_GATE_ID,
    [{ id: "stop", label: "Stop" }],
    { reader_path_job_state: "died", reader_path_job: jobPath });
  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const callPath = join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`);
  const rendered = existsSync(callPath) ? readFileSync(callPath, "utf8") : "";
  if (!rendered) fails.push(`(e) emitGateDeclaration wrote no gate call at ${callPath}`);
  if (rendered.includes("died") || rendered.includes(jobPath) || rendered.includes("reader-path-job.json")) {
    fails.push(`(e) the rendered gate call leaks the internal state token or the job-record path: ${rendered}`);
  }
  const leak = findInternalVocabulary(String(declaration.question || ""));
  if (leak) fails.push(`(e) the registered question itself carries spec-internal vocabulary: ${JSON.stringify(leak)}`);
  for (const o of declaration.options || []) {
    const l1 = findInternalVocabulary(String(o.label || ""));
    if (l1) fails.push(`(e) option ${o.id}'s label carries spec-internal vocabulary: ${JSON.stringify(l1)}`);
  }
}

// (g) kogaki#1197: `cmdJobSupervise`'s own argv no longer carries `--bare`
// (acceptance 3 of the issue, asserted here at the source rather than only
// by `grep` at the repo root — this check IS what a full-suite run exercises)
// and its child environment sets `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to keep
// auto-memory off now that `--bare` no longer does.
{
  const terrain = readFileSync("src/workflow/detached-job.mjs", "utf8");
  if (terrain.includes(`"--bare"`)) {
    fails.push("(g) src/workflow/detached-job.mjs still passes `--bare` to a unit child — the flag that read auth strictly from ANTHROPIC_API_KEY/apiKeyHelper and never the OAuth login, killing every unit with \"Not logged in\"");
  }
  if (!terrain.includes("CLAUDE_CODE_DISABLE_AUTO_MEMORY")) {
    fails.push("(g) src/workflow/detached-job.mjs no longer sets CLAUDE_CODE_DISABLE_AUTO_MEMORY in a unit child's environment — dropping `--bare` re-admits auto-memory with nothing left to suppress it");
  }
  // The `job status` line carries a dead unit's result text too (design item
  // 2), asserted by string: the status verb is hook-run, not fixture-run. The
  // lines are composed by `readerPathJobStatusLines`, which `job status` and
  // `job await`'s heartbeat share (kogaki#1355).
  const brief = briefRuntimeText();
  const statusFn = brief.slice(brief.indexOf("function readerPathJobStatusLines"), brief.indexOf("function sleepSync"));
  if (!statusFn.includes("u.failure.result")) {
    fails.push("(g) printReaderPathJobStatus no longer renders a dead unit's failure.result — the `job status` line would again say a unit died without saying why");
  }
}

// (h) THE GATE-CALL BYTES ARE ON STDOUT, NOT ONLY THEIR ADDRESS (kogaki#1198's
// reproduction). A real `job await` over a `refused` PATH-REVIEW job (a `died`
// job raises no question since kogaki#1273, nor a refused COMPOSE job since
// kogaki#1307) is run end to end through `run --status`, the one read-only
// verb Bash reaches, against a hand-written run record standing in for the
// hook loop's own write: the executor is invoked by hooks only, so the
// fixture uses its one admitted door rather than forging a hook payload.
{
  const dir = mkNewRun();
  const jobDir = join(dir, "review-path");
  mkdirSync(jobDir);
  superviseSync(jobDir, [{ id: "c1", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(jobDir);
  if (!rec || rec.state !== "refused") fails.push(`(h) fixture premise failed: the job did not end \`refused\`: ${JSON.stringify(rec)}`);
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "review_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir };
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  const callPath = join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`);
  if (!existsSync(callPath)) {
    fails.push(`(h) \`job await\` over a refused job wrote no gate-call file at ${callPath}: stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  } else {
    const wantBytes = JSON.parse(readFileSync(callPath, "utf8"));
    const fencedAwait = (awaitRun.stdout || "").match(/```json\n([\s\S]*?)\n```/);
    if (!fencedAwait) {
      fails.push(`(h) \`job await\`'s stdout carries no \`\`\`json fence -- the gate-call file is named but its bytes never reach the session: ${awaitRun.stdout}`);
    } else if (JSON.stringify(JSON.parse(fencedAwait[1])) !== JSON.stringify(wantBytes)) {
      fails.push(`(h) \`job await\`'s fenced block does not equal the gate-call file's own bytes: ${fencedAwait[1]} vs ${JSON.stringify(wantBytes)}`);
    }
    // (h2) `job status` ON THE SAME RUN PRINTS THE SAME BLOCK -- a session
    // re-entering after the raising, with no live `job await` call left to
    // print the bytes the first time, renders the question from a bare status
    // read (design item 2's own acceptance).
    const statusRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "status"],
      { cwd: root, timeout: 15000, encoding: "utf8", env });
    const fencedStatus = (statusRun.stdout || "").match(/```json\n([\s\S]*?)\n```/);
    if (!fencedStatus) {
      fails.push(`(h2) \`job status\` on a run with an owed, uncaptured gate carries no \`\`\`json fence: ${statusRun.stdout}`);
    } else if (JSON.stringify(JSON.parse(fencedStatus[1])) !== JSON.stringify(wantBytes)) {
      fails.push(`(h2) \`job status\`'s fenced block does not equal the gate-call file's own bytes: ${fencedStatus[1]} vs ${JSON.stringify(wantBytes)}`);
    }
  }
}

// (k) A LATER WAIT'S OWED GATE RE-PRINTS TOO, MATCHED ON THE AWAITING STATE
// RATHER THAN ONLY `brief-reader-path-job` (kogaki#1313 design item 1), AND A
// RE-PRINT THAT FINDS NO LIVE POINTER WRITES ONE AGAIN (design item 2). A job
// resume can advance the workflow past the reader-path job's own gate into a
// LATER wait -- `CANDIDATE_SELECTION`, raising `brief-candidate-selection` --
// driven here at the declaration/capture layer directly, the ground section
// (e) and (h) state for a bare `emitGateDeclaration` call and a hand-written
// run record: the executor is invoked by hooks only.
{
  const dir = mkNewRun();
  // A FINISHED JOB RECORD STILL ON DISK (kogaki#1301): `compose_path` finished
  // and the run advanced past it, so `reader-path-job.json` is a terminal
  // record `job status`'s own dispatch still reads before it reaches the print.
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    call_limit_s: 900, unit_attempts: 3, state: "done", units: [],
  }, null, 2) + "\n");
  const declPath = emitGateDeclaration(dir, "brief-candidate-selection",
    [{ id: "c1", label: "Candidate 1", description: "The first composed Reader Path." },
      { id: "c2", label: "Candidate 2", description: "The second composed Reader Path." }], {});
  const callPath = join(dir, `brief-candidate-selection${GATE_CALL_SUFFIX}`);
  const wantBytes = JSON.parse(readFileSync(callPath, "utf8"));
  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const pointerPath = join(process.env.KOGAKI_OPEN_GATES, `${declaration.gate_instance_id}.json`);
  // ABANDONMENT, SIMULATED (the shape check-brief-reader-path-job.sh's
  // section (i) drives through the Stop hook itself): the pointer this raising wrote is removed, standing in for
  // its move to `abandoned/`.
  rmSync(pointerPath, { force: true });
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "CANDIDATE_SELECTION",
    owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [{ state: "CANDIDATE_SELECTION", gate_id: "brief-candidate-selection", declaration: declPath }],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir };

  // (k1) NO CAPTURE ROW, NO LIVE POINTER: `job status` prints the fenced
  // block equal to the gate-call file's own bytes, and afterwards a pointer
  // named by the declaration's `gate_instance_id` exists again.
  const statusRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "status"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  const fenced = (statusRun.stdout || "").match(/```json\n([\s\S]*?)\n```/);
  if (!fenced) {
    fails.push(`(k1) \`job status\` on a run awaiting CANDIDATE_SELECTION with an owed, uncaptured brief-candidate-selection gate carries no \`\`\`json fence: ${statusRun.stdout}`);
  } else if (JSON.stringify(JSON.parse(fenced[1])) !== JSON.stringify(wantBytes)) {
    fails.push(`(k1) \`job status\`'s fenced block does not equal brief-candidate-selection's own gate-call file: ${fenced[1]} vs ${JSON.stringify(wantBytes)}`);
  }
  if (!existsSync(pointerPath)) {
    fails.push(`(k1) \`job status\` re-printed the gate's bytes and did not restore a live open-gate pointer at ${pointerPath}`);
  }

  // (k2) A CAPTURE ROW NAMING THE SAME gate_instance_id: no fenced block is
  // printed and no pointer is (re)written. The pointer (k1) restored is
  // removed first, so a pointer found after this case could only be this
  // case's own write.
  rmSync(pointerPath, { force: true });
  writeFileSync(join(dir, "brief.gate-capture.json"), JSON.stringify({
    rows: [{ gate_instance_id: declaration.gate_instance_id,
      evidence: { tool: "AskUserQuestion", tool_use_id: "t1" },
      answers_over: { option_set_digest: "whatever-the-digest-was" },
      payload: { answer: { option: "c1" } } }],
  }, null, 2) + "\n");
  const statusRun2 = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "status"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  if ((statusRun2.stdout || "").includes("```json")) {
    fails.push(`(k2) \`job status\` re-printed the gate's bytes though the capture already names this raising's instance id: ${statusRun2.stdout}`);
  }
  if (existsSync(pointerPath)) {
    fails.push(`(k2) \`job status\` wrote an open-gate pointer though the gate is already captured: ${pointerPath}`);
  }
}

// (v) `job await` OVER A STILL-RUNNING JOB RETURNS WITHIN ITS OWN BOUND AND
// RAISES NOTHING (kogaki#1271): it prints the status lines and the
// still-running line, writes no gate declaration and exits 0, driven through
// the same read-only CLI door as (h) against a record that reads `running`.
// Each unit's line reads `attempt <n> of <N>`, and one on attempt 2 or later
// `about <m>s to go`, from the row's `attempt_1_s` (kogaki#1355). The bound is
// handed in at 2 s (`KOGAKI_JOB_AWAIT_S`, kogaki#1424); the production 30 s is
// asserted as `jobAwaitS()` with the variable unset, and the heartbeat's
// unset value the same way (PR #1429 round 1).
{
  const { READER_PATH_JOB_AWAIT_S: awaitS, jobAwaitS } = await import("./src/brief.mjs");
  const { READER_PATH_JOB_HEARTBEAT_MS: heartbeatConst, jobHeartbeatMs } = await import("./src/workflow/detached-job.mjs");
  const savedAwait = process.env.KOGAKI_JOB_AWAIT_S;
  const savedHeartbeat = process.env.KOGAKI_JOB_HEARTBEAT_MS;
  delete process.env.KOGAKI_JOB_AWAIT_S;
  delete process.env.KOGAKI_JOB_HEARTBEAT_MS;
  if (awaitS !== 30 || jobAwaitS() !== 30) fails.push(`(v) the production \`job await\` bound is not 30s with no fixture bound handed in (constant ${awaitS}, read ${jobAwaitS()})`);
  if (heartbeatConst !== 10000 || jobHeartbeatMs() !== 10000 || jobHeartbeatMs(10000) !== 10000 || jobHeartbeatMs(7000) !== 7000) {
    fails.push(`(v) the production heartbeat is not the table's value, or 10000 ms where none is declared, with no fixture heartbeat handed in (constant ${heartbeatConst}, read ${jobHeartbeatMs()} undeclared and ${jobHeartbeatMs(7000)} for a declared 7000)`);
  }
  if (savedAwait !== undefined) process.env.KOGAKI_JOB_AWAIT_S = savedAwait;
  if (savedHeartbeat !== undefined) process.env.KOGAKI_JOB_HEARTBEAT_MS = savedHeartbeat;
  const dir = mkNewRun();
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3,
    supervisor_pid: null, state: "running",
    units: [{ id: "c1", status: "running", bytes: 10, attempts: 2, phase: "fit", attempt_1_s: 600,
      attempt_started_at: new Date(Date.now() - 100000).toISOString() },
    { id: "c2", status: "running", bytes: 10, attempts: 1, phase: "compose", attempt_started_at: now },
    { id: "c3", status: "done", bytes: 10, attempts: 1, phase: "fit" }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_JOB_AWAIT_S: "2", KOGAKI_JOB_HEARTBEAT_MS: "200" };
  const t0 = Date.now();
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 60000 * WAIT_SCALE, encoding: "utf8", env });
  const tookS = (Date.now() - t0) / 1000;
  if (awaitRun.status !== 0) {
    fails.push(`(v) \`job await\` over a running job did not exit 0 (status ${awaitRun.status}): stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  }
  if (tookS > 12 * WAIT_SCALE) {
    fails.push(`(v) \`job await\` over a running job took ${tookS}s, past its handed-in 2s bound`);
  }
  if (tookS < 2) {
    fails.push(`(v) \`job await\` over a running job returned after ${tookS}s, before its handed-in 2s bound`);
  }
  if (!(awaitRun.stdout || "").includes("reader-path job still running — call job await again")) {
    fails.push(`(v) \`job await\` over a running job did not print the still-running line: ${awaitRun.stdout}`);
  }
  const out = awaitRun.stdout || "";
  if (!out.includes("each unit gets up to 3 attempts of at most 900s per call")) {
    fails.push(`(v) \`job await\`'s status header does not name both bounds: ${out}`);
  }
  for (const id of ["c1", "c2", "c3"]) {
    if (!new RegExp(`unit ${id}: attempt \\d of 3, `).test(out)) fails.push(`(v) \`job await\`'s status line for ${id} does not carry \`attempt <n> of <N>\`: ${out}`);
  }
  const est = out.match(/unit c1: attempt 2 of 3, fit, running, 10 byte\(s\) so far, about (\d+)s to go/);
  if (!est || Number(est[1]) > 500 || Number(est[1]) < 400) {
    fails.push(`(v) \`job await\`'s line for a unit on attempt 2 does not read about <m>s to go with <m> from the row's attempt_1_s: ${out}`);
  }
  if (/unit c2:[^\n]*to go/.test(out)) fails.push(`(v) a unit on attempt 1 carries an estimate it has nothing to read from: ${out}`);
  const callPath = join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`);
  if (existsSync(callPath)) {
    fails.push(`(v) \`job await\` over a running job raised a question (a gate-call file exists at ${callPath})`);
  }
  const runRec = JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  if ((runRec.gate_declarations_owed || []).length) {
    fails.push(`(v) \`job await\` over a running job recorded an owed gate: ${JSON.stringify(runRec.gate_declarations_owed)}`);
  }
}

// (v4b) `job await` over a record that says `running` while its supervisor
// process is gone ends the Brief as a defect too, rather than waiting on a
// record nothing will update again.
{
  const dir = mkNewRun();
  const gone = spawnSync(process.execPath, ["-e", ""], { encoding: "utf8" });
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: gone.pid, state: "running",
    units: [{ id: "c1", status: "running", bytes: 0 }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json") };
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  if (awaitRun.status === 0 || !String(awaitRun.stderr || "").includes("This is a /brief defect, not a candidate refusal:")
    || !String(awaitRun.stderr || "").includes("supervisor process")) {
    fails.push(`(v4b) \`job await\` over a running record with no live supervisor did not end as a defect: status=${awaitRun.status} stderr=${awaitRun.stderr}`);
  }
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-job-screen");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-job-screen — the screen leaks no internal vocabulary, the gate-call bytes reach stdout and a later wait re-prints its owed gate, `job await` over a still-running job returns within its own bound raising nothing, and a running record with no live supervisor ends as a defect");
JS
status=$?

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-job-screen"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
exit "$status"
