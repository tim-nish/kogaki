#!/usr/bin/env bash
# check-brief-job-resume — the resume claim over a finished Reader-path job
# (kogaki#1278): two concurrent `job await` calls resume it once (w1), a
# `done` run is never resumed (w2), a gone claimant's claim is taken over
# (w3), and only the `done` arm takes a claim (w4).
# Cut from check-brief-reader-path-job.sh by kogaki#1464.
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
export CLAUDE_CODE_SESSION_ID="check-brief-job-resume-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import {
  root, scratch, mkNewRun, runRecordPath,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
const fails = [];

// THE (w) CASES' JUDGE (kogaki#1278 round 1). Resuming a run resolves its
// judge binary before any state work, and CI offers no `claude` on PATH, so
// without a stub every resume below refuses at that resolution instead of at
// the step each case observes. The stub answers `--version` and nothing else:
// no (w) case reaches a judgment call.
const resumeJudge = join(scratch, "resume-judge.mjs");
writeFileSync(resumeJudge, "#!/usr/bin/env node\nprocess.stdout.write(\"resume-judge fixture\\n\");\n");
chmodSync(resumeJudge, 0o755);

// (w1) kogaki#1278: TWO CONCURRENT `job await` CALLS OVER THE SAME FINISHED
// JOB RESUME IT EXACTLY ONCE. The fixture job is already `done`, and its run
// record carries no minted Brief, so `compose_path`'s own `needBrief` -- the
// first line of the resumed state work -- refuses deterministically and at
// once: the claimant's own resume is observed by that one, single refusal
// landing, never by a successful compose (which this fixture has nothing to
// support). The second, deferred caller never reaches state work at all -- it
// reads the exclusive resume-claim file as already taken and prints the run's
// position instead, exiting 0.
{
  const dir = mkNewRun();
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
    units: [{ id: "candidate-1", status: "done", bytes: 50,
      candidate: { candidate_id: "c1", reader_experience: "exp one", characteristic: "char one", legs: [] } }],
  }, null, 2) + "\n");
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: briefTable.version },
    judge_binary: null, survey_record: null,
    // EVERY STATE `compose_path` SITS BEHIND IS `completed`, so the advance
    // loop below walks straight to it rather than restarting the run from
    // `enter` (which demands a Strand address this fixture has none of).
    completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation"], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: null,
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: resumeJudge };
  const runAwait = () => new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"], { cwd: root, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
  const results = await Promise.all([runAwait(), runAwait()]);
  const claimed = results.filter((r) => /has no minted Brief/.test(r.stderr));
  // EITHER READING IS A DEFERRAL (kogaki#1278 round 1): the claimant's own
  // refusal may finish the run before the second caller's precheck runs, and
  // then that caller refuses as `already done` rather than `already claimed`.
  // Both advance nothing; which one it prints is ordering, not the defect.
  const deferred = results.filter((r) => !/has no minted Brief/.test(r.stderr)
    && /already claimed|already done/.test(r.stdout));
  if (claimed.length !== 1) {
    fails.push(`(w1) two concurrent \`job await\` calls over the same \`done\` job did not resume exactly once (${claimed.length} reached needBrief's own refusal): ${JSON.stringify(results)}`);
  }
  if (deferred.length !== 1) {
    fails.push(`(w1) two concurrent \`job await\` calls did not leave exactly one call reading the resume as already claimed: ${JSON.stringify(results)}`);
  } else if (deferred[0].code !== 0) {
    fails.push(`(w1) the deferred \`job await\` call did not exit 0: ${JSON.stringify(deferred[0])}`);
  }
  if (!existsSync(join(dir, "reader-path-job-resume.claim"))) {
    fails.push(`(w1) no exclusive resume-claim file was left beside the job record at ${dir}`);
  }
}

// (w2) kogaki#1278: A RUN RECORD ALREADY `done: true` IS NEVER RESUMED. The
// precheck reads the RUN record, not the job's own state, so a `done` job
// record stands in for whichever terminal state a slower, racing caller's
// stale read saw -- the run underneath it has already been finished and
// answered, and the resume refuses to rewrite it, naming why.
{
  const dir = mkNewRun();
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
    units: [{ id: "candidate-1", status: "done", bytes: 50,
      candidate: { candidate_id: "c1", reader_experience: "exp one", characteristic: "char one", legs: [] } }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: ["compose_path"], waits_reached: ["CANDIDATE_SELECTION"],
    conditional_entered: [], conditional_skipped: [], awaiting: null,
    owner_input: { CANDIDATE_SELECTION: "c1" }, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: true,
  }, null, 2) + "\n");
  const before = readFileSync(runRecordPath(dir), "utf8");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: resumeJudge };
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  const after = readFileSync(runRecordPath(dir), "utf8");
  if (after !== before) {
    fails.push(`(w2) a resume over a run record already \`done: true\` rewrote it: before=${before} after=${after}`);
  }
  if (!(awaitRun.stdout || "").includes("already done")) {
    fails.push(`(w2) a resume over a run record already \`done: true\` did not say why it refused: stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  }
  if (existsSync(join(dir, "reader-path-job-resume.claim"))) {
    fails.push("(w2) a resume refused for an already-`done` run still created the resume-claim file");
  }
}

// (w3) kogaki#1278 round 1: A CLAIM WHOSE CLAIMANT IS GONE IS TAKEN OVER
// while the run has not moved, so a resume cut off mid-`compose_path` stays
// resumable by `job await`; and a claim whose claimant moved the run before
// exiting stands. The dead pid is a child this member started and reaped.
{
  const deadPid = spawnSync(process.execPath, ["-e", "process.stdout.write(String(process.pid))"], { encoding: "utf8" }).stdout.trim();
  const mkDone = () => {
    const dir = mkNewRun();
    const now = new Date().toISOString();
    writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
      started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
      units: [{ id: "candidate-1", status: "done", bytes: 50,
        candidate: { candidate_id: "c1", reader_experience: "exp one", characteristic: "char one", legs: [] } }],
    }, null, 2) + "\n");
    const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const rec = {
      workflow: { path: "src/brief-workflow.json", version: briefTable.version },
      judge_binary: null, survey_record: null,
      completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation"], waits_reached: [],
      conditional_entered: [], conditional_skipped: [], awaiting: null,
      owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
      done: false,
    };
    writeFileSync(runRecordPath(dir), JSON.stringify(rec, null, 2) + "\n");
    return { dir, rec };
  };
  const positionOf = (rec) => JSON.stringify({ completed: rec.completed || [], awaiting: rec.awaiting ?? null, done: !!rec.done });
  const awaitIn = (dir) => spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8",
      env: { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: resumeJudge } });
  {
    const { dir, rec } = mkDone();
    writeFileSync(join(dir, "reader-path-job-resume.claim"),
      JSON.stringify({ claimed_at: new Date().toISOString(), pid: Number(deadPid), state: "done", position: positionOf(rec) }) + "\n");
    const r = awaitIn(dir);
    if (!/has no minted Brief/.test(r.stderr || "")) {
      fails.push(`(w3) a claim left by an exited claimant over an unmoved run was not taken over: stdout=${r.stdout} stderr=${r.stderr}`);
    }
  }
  {
    const { dir, rec } = mkDone();
    const moved = { ...rec, completed: [...rec.completed, "compose_path"], awaiting: "CANDIDATE_SELECTION" };
    writeFileSync(join(dir, "reader-path-job-resume.claim"),
      JSON.stringify({ claimed_at: new Date().toISOString(), pid: Number(deadPid), state: "done", position: positionOf(rec) }) + "\n");
    writeFileSync(runRecordPath(dir), JSON.stringify(moved, null, 2) + "\n");
    const before = readFileSync(runRecordPath(dir), "utf8");
    const r = awaitIn(dir);
    if (!/already claimed/.test(r.stdout || "") || r.status !== 0 || readFileSync(runRecordPath(dir), "utf8") !== before) {
      fails.push(`(w3) a claim whose exited claimant had moved the run was taken over: stdout=${r.stdout} stderr=${r.stderr}`);
    }
  }
}

// (w4) kogaki#1278 round 1: THE CLAIM IS THE `done` ARM'S ONLY. A job ended
// `refused` raises its owed gate and leaves no claim, so a later call can
// re-raise that gate (kogaki#1198).
{
  const dir = mkNewRun();
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "refused",
    units: [{ id: "candidate-1", status: "refused", failure: { first_refusal: "fixture refusal" } }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null }, judge_binary: null, survey_record: null,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [], done: false,
  }, null, 2) + "\n");
  spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8",
      env: { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: resumeJudge } });
  if (existsSync(join(dir, "reader-path-job-resume.claim"))) {
    fails.push("(w4) a job ended `refused` left a resume claim, which the `done` arm alone takes");
  }
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-job-resume");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-job-resume — two concurrent `job await` calls resume a finished job exactly once, a done run is never resumed, a gone claimant's claim is taken over, and only the done arm takes a claim (kogaki#1278)");
JS
status=$?

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-job-resume"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
exit "$status"
