#!/usr/bin/env bash
# check-brief-reader-path-job — the Detached Job that replaced the reader-path
# step's synchronous, hook-bound judge call (kogaki#1193).
#
# WHAT THIS COVERS. `src/terrain.mjs`'s generic detached-job primitives
# (`classifyDetachedJobUnit`, `classifyDetachedJobState`, the nine declared
# states) and the real `job-supervise` child process they drive, end to end,
# against a FAKE judge binary this member writes into a scratch tree — never
# the actual `claude` CLI, on the same seam-free convention the sibling
# `check-brief-compose.sh` states for its own fixtures. It also asserts the
# owner-facing screen leaks neither a state token nor a path (acceptance 8)
# and that a unit's second checkpoint hit offers `stop` alone (the issue
# thread's 2026-09-25 "extend is granted once per unit" revision).
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: the
# minimal-environment CLI flags (`--tools ""`, …) and the
# `CLAUDE_CODE_DISABLE_AUTO_MEMORY` environment variable (kogaki#1197) are
# asserted by STRING, not by a real spawned session reading them — a live
# harness session is not a fixture this suite can construct. `judgePrompt`'s
# own prose is `check-brief-compose.sh`'s.
set -u
cd "$(dirname "$0")/.."

# FIXTURE ISOLATION. Section (e) calls `emitGateDeclaration`, which writes an
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
export CLAUDE_CODE_SESSION_ID="check-brief-reader-path-job-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import {
  classifyDetachedJobUnit, classifyDetachedJobState, READER_PATH_JOB_STATES,
  READER_PATH_JOB_GATE_ID, emitGateDeclaration, composeGateCall,
  runRecordPath, GATE_CALL_SUFFIX, judgePrompt, JUDGE_REFUSAL_MARKER, JUDGE_INPUT_MARKER,
  readerPathUnitRecord, readerPathUnitRetryPrompt, readerPathUnitStdoutPath,
  applyReaderPathJobExtendOverrides, readerPathAwaitStep, resolveReaderPathJobExtend,
} from "./src/terrain.mjs";
import { findInternalVocabulary } from "./src/assemble.mjs";

const fails = [];
const root = process.cwd();

// (a) THE NINE STATES ARE EXACTLY THE ISSUE'S NINE, in the declared order —
// a tenth state or a dropped one is a silent widening or narrowing of the
// Arm surface the issue enumerates by name.
{
  const want = ["done", "refused", "limit-reached", "stopped", "ceiling", "stalled", "died", "other"];
  // "limit-reached" sits beside "running" in classifyDetachedJobState's own
  // return values but "running" is not a JOB RECORD terminal state — it is
  // what the record reads WHILE a job is in flight, never what a `job
  // await` classification stops on. READER_PATH_JOB_STATES is the CLOSED,
  // terminal-plus-`done` set the issue names; assert it holds exactly those.
  const got = READER_PATH_JOB_STATES.slice().sort();
  const wantSorted = want.slice().sort();
  if (JSON.stringify(got) !== JSON.stringify(wantSorted)) {
    fails.push(`(a) READER_PATH_JOB_STATES is ${JSON.stringify(got)}, not the issue's ${JSON.stringify(wantSorted)}`);
  }
}

// (b) STRUCTURAL UNIT CLASSIFICATION — `classifyDetachedJobUnit` reads only
// exit code and stdout shape, never a Brief rule (kogaki#1193's own division
// of labour between the generic executor and the Brief-specific validators).
{
  const died = classifyDetachedJobUnit({ error: null, exitCode: 3, errChunks: [Buffer.from("boom")], bytes: 12, endedAt: "t" });
  if (died.status !== "died" || died.failure.exit_code !== 3 || !died.failure.stderr_tail.includes("boom")) {
    fails.push(`(b1) a non-zero exit did not classify as died with its stderr: ${JSON.stringify(died)}`);
  }
  const badJson = classifyDetachedJobUnit({ error: null, exitCode: 0, errChunks: [], chunks: [Buffer.from("not json")], bytes: 8, endedAt: "t" });
  if (badJson.status !== "refused" || !badJson.failure.stderr_tail.includes("not JSON")) {
    fails.push(`(b2) an exit-0 non-JSON stdout did not classify as refused: ${JSON.stringify(badJson)}`);
  }
  const noLegs = classifyDetachedJobUnit({ error: null, exitCode: 0, errChunks: [], chunks: [Buffer.from(`${JSON.stringify({ type: "result", result: JSON.stringify({ no_legs: true }) })}\n`)], bytes: 8, endedAt: "t" });
  if (noLegs.status !== "refused" || !noLegs.failure.stderr_tail.includes("legs")) {
    fails.push(`(b3) a record with no \`legs\` array did not classify as refused: ${JSON.stringify(noLegs)}`);
  }
  const good = classifyDetachedJobUnit({ error: null, exitCode: 0, errChunks: [], chunks: [Buffer.from(`${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "result", result: JSON.stringify({ legs: [1, 2] }) })}\n`)], bytes: 8, endedAt: "t" });
  if (good.status !== "done" || !good.candidate || !Array.isArray(good.candidate.legs)) {
    fails.push(`(b4) a well-shaped exit-0 record did not classify as done: ${JSON.stringify(good)}`);
  }
  // (b5) kogaki#1197: a dead unit (non-zero exit) whose stdout still carries a
  // `stream-json` `{"type":"result","is_error":true,...}` line -- the shape
  // `--bare`'s "Not logged in" produced -- gets that line's `result` text
  // carried onto the failure record, not silently dropped for the empty
  // `stderr_tail` a dead-login unit actually writes.
  const notLoggedIn = classifyDetachedJobUnit({
    error: null, exitCode: 1, errChunks: [], bytes: 40, endedAt: "t",
    chunks: [Buffer.from(`${JSON.stringify({ type: "system" })}\n${JSON.stringify({ type: "result", is_error: true, result: "Not logged in · Please run /login" })}\n`)],
  });
  if (notLoggedIn.status !== "died" || notLoggedIn.failure.result !== "Not logged in · Please run /login") {
    fails.push(`(b5) a dead unit's is_error result line was not carried onto its failure record: ${JSON.stringify(notLoggedIn)}`);
  }
  // (b6) kogaki#1240: the DECLARED validator, given as `classifyDetachedJobUnit`'s
  // optional second argument, downgrades an otherwise-structurally-`done` unit
  // to `refused` on a truthy return, and a validator returning `null`/falsy
  // leaves a structurally-good unit `done` -- this is the one seam the whole
  // per-unit classification rests on, asserted directly before any of the
  // Leg-shape fixtures below drive it through a real subprocess.
  const goodOut = { error: null, exitCode: 0, errChunks: [], bytes: 8, endedAt: "t",
    chunks: [Buffer.from(`${JSON.stringify({ type: "result", result: JSON.stringify({ legs: [1, 2] }) })}\n`)] };
  const refusedByValidator = classifyDetachedJobUnit(goodOut, () => "the declared validator's own refusal text");
  if (refusedByValidator.status !== "refused" || !refusedByValidator.failure.stderr_tail.includes("the declared validator's own refusal text")) {
    fails.push(`(b6) a structurally-good unit was not downgraded to refused by a validator returning a truthy refusal: ${JSON.stringify(refusedByValidator)}`);
  }
  const passedByValidator = classifyDetachedJobUnit(goodOut, () => null);
  if (passedByValidator.status !== "done") {
    fails.push(`(b6) a structurally-good unit was downgraded even though its validator returned no refusal: ${JSON.stringify(passedByValidator)}`);
  }
}

// (c) THE JOB-LEVEL REDUCTION (kogaki#1204 rewrite) — a refused or died unit
// beside a STILL-RUNNING sibling no longer ends the whole job: the function
// now checks for any running unit FIRST, and only once none remain does it
// reduce over the finished set, died dominating refused dominating done.
// `stopRequested` still dominates everything (the owner's stop click is
// answered no matter what a unit is doing), and the three time bounds are
// still read in the declared order: ceiling before stalled before
// limit-reached, all of which only apply while a unit IS still running.
{
  const running = [{ status: "running", checkpoint_hit: false }];
  const runningHit = [{ status: "running", checkpoint_hit: true }];
  const cases = [
    // A refused/died unit beside a running sibling reads "running" — the
    // sibling's own work is still in flight and must not be killed for it.
    [[{ status: "died" }, ...running], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "running"],
    [[{ status: "refused" }, ...running], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "running"],
    // Once every unit has finished (no running left), died dominates refused.
    [[{ status: "died" }, { status: "refused" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "died"],
    // A refused unit beside two FINISHED (done) siblings still reads
    // "refused" — the reduction only withholds a terminal state while a
    // sibling is still running, never once every unit has landed.
    [[{ status: "refused" }, { status: "done" }, { status: "done" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "refused"],
    [running, { stopRequested: true, elapsedS: 1, stalledS: 0 }, "stopped"],
    [[{ status: "died" }], { stopRequested: true, elapsedS: 1, stalledS: 0 }, "stopped"],
    [running, { stopRequested: false, elapsedS: 600, stalledS: 0 }, "ceiling"],
    [running, { stopRequested: false, elapsedS: 1, stalledS: 90 }, "stalled"],
    [runningHit, { stopRequested: false, elapsedS: 1, stalledS: 0 }, "limit-reached"],
    [running, { stopRequested: false, elapsedS: 1, stalledS: 0 }, "running"],
    [[{ status: "done" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "done"],
  ];
  for (const [units, ctx, want] of cases) {
    const got = classifyDetachedJobState(units, ctx);
    if (got !== want) fails.push(`(c) classifyDetachedJobState(${JSON.stringify(units)}, ${JSON.stringify(ctx)}) = ${got}, wanted ${want}`);
  }
}

// (n) kogaki#1213 acceptance 1/2 — `applyReaderPathJobExtendOverrides` recomputes
// `checkpoint_hit` against THIS poll's own elapsed time, not the disk flag: a
// unit the extend file raises past the current elapsed time reads
// `checkpoint_hit: false` however the record's own flag reads, and a unit
// whose raised bound the call has ALREADY passed too keeps `checkpoint_hit:
// true` — the extension is spent, not infinite.
{
  const hitUnit = { id: "c3", status: "running", checkpoint_hit: true };
  const notCoveredByOverride = applyReaderPathJobExtendOverrides([hitUnit], {}, 305);
  if (notCoveredByOverride[0].checkpoint_hit !== true) {
    fails.push(`(n1) a unit with no override at all lost its checkpoint_hit flag: ${JSON.stringify(notCoveredByOverride)}`);
  }
  const stillWithinRaisedBound = applyReaderPathJobExtendOverrides([hitUnit], { c3: 600 }, 305);
  if (stillWithinRaisedBound[0].checkpoint_hit !== false) {
    fails.push(`(n2) a raised bound the elapsed time has not yet reached did not clear checkpoint_hit: ${JSON.stringify(stillWithinRaisedBound)}`);
  }
  const pastRaisedBoundToo = applyReaderPathJobExtendOverrides([hitUnit], { c3: 600 }, 650);
  if (pastRaisedBoundToo[0].checkpoint_hit !== true) {
    fails.push(`(n3) a call that already passed its OWN raised bound had checkpoint_hit cleared anyway: ${JSON.stringify(pastRaisedBoundToo)}`);
  }
  const notRunning = applyReaderPathJobExtendOverrides([{ id: "c3", status: "done", checkpoint_hit: true }], { c3: 600 }, 305);
  if (notRunning[0].checkpoint_hit !== true) {
    fails.push(`(n4) a finished unit's checkpoint_hit was rewritten by an override meant for a still-running call: ${JSON.stringify(notRunning)}`);
  }
}

// (o) kogaki#1213 acceptance 1 — `readerPathAwaitStep` classifies `running`,
// not `limit-reached`, the MOMENT the extend override is applied, with no
// heartbeat wait: this is the exact race the Issue's transcript hit —
// `job.units[].checkpoint_hit` is still the PRE-extend flag the supervisor
// wrote before the owner's click, `job.updated_at` is from that same moment,
// and the override file is what the click just wrote, with a NEWER mtime.
{
  const job = { started_at: new Date(Date.now() - 305000).toISOString(),
    updated_at: new Date(Date.now() - 4000).toISOString(),
    units: [{ id: "c1", status: "done" }, { id: "c2", status: "done" },
      { id: "c3", status: "running", checkpoint_hit: true }] };
  const extendMtimeMs = Date.now();
  const step = readerPathAwaitStep(job, { c3: 600 }, extendMtimeMs, { stopRequested: false, elapsedS: 305, stalledS: 0 });
  if (!step.classify || step.state !== "running") {
    fails.push(`(o1) an extend override covering the current elapsed time still classified off the stale checkpoint_hit flag: ${JSON.stringify(step)}`);
  }
  if (step.units.find((u) => u.id === "c3").checkpoint_hit !== false) {
    fails.push(`(o1) readerPathAwaitStep's own units array did not carry the override's cleared checkpoint_hit through`);
  }
}

// (p) kogaki#1213 acceptance 2 — the SAME call, once it has passed its own
// raised bound too, classifies `limit-reached` again (a second checkpoint hit
// is real, not a re-raise of the first) -- `finishReaderPathJobAwait`'s own
// "extended once per unit" ledger is what turns this into `stop` alone.
// The raised bound (450) and the elapsed time (480) both sit BELOW the
// whole-job absolute ceiling (600, `READER_PATH_JOB_ABSOLUTE_LIMIT_S`)
// deliberately: that ceiling is the #1193 rule the Issue's "Not in scope"
// section leaves standing, and `classifyDetachedJobState` (test (c) above)
// checks it ahead of `limit-reached` by design, so a fixture that let elapsed
// time cross 600 would exercise `ceiling`, not the second-checkpoint case
// this fixture is for.
{
  const job = { started_at: new Date(Date.now() - 480000).toISOString(),
    updated_at: new Date(Date.now() - 4000).toISOString(),
    units: [{ id: "c3", status: "running", checkpoint_hit: true }] };
  const step = readerPathAwaitStep(job, { c3: 450 }, Date.now() - 175000, { stopRequested: false, elapsedS: 480, stalledS: 0 });
  if (!step.classify || step.state !== "limit-reached") {
    fails.push(`(p) a call past its OWN raised bound did not classify \`limit-reached\` on its second checkpoint hit: ${JSON.stringify(step)}`);
  }
}

// (q) kogaki#1213 acceptance 3 — a job record whose `updated_at` predates the
// extend file's own mtime is NEVER classified `limit-reached`, whether or not
// the override happens to name the checkpoint-hit unit: `readerPathAwaitStep`
// returns `classify: false` instead, the caller's cue to wait one heartbeat
// and re-read rather than raise a Stop-only Arm from a record the click had
// not yet reached.
{
  const staleJob = { started_at: new Date(Date.now() - 305000).toISOString(),
    updated_at: new Date(Date.now() - 5000).toISOString(),
    units: [{ id: "c3", status: "running", checkpoint_hit: true }] };
  const extendMtimeMs = Date.now();
  // No override named for "c3" at all -- the residual case the override alone
  // cannot cover, since `hitUnits` on the answering side is read from the
  // very poll that raised the extend Arm, not from every unit that could ever
  // hit one.
  const step = readerPathAwaitStep(staleJob, {}, extendMtimeMs, { stopRequested: false, elapsedS: 305, stalledS: 0 });
  if (step.classify !== false) {
    fails.push(`(q) a record older than the newest extend write was classified anyway: ${JSON.stringify(step)}`);
  }
  if (step.state !== "limit-reached") {
    fails.push(`(q) readerPathAwaitStep's own \`state\` (for logging) was not \`limit-reached\` on the un-classified poll: ${JSON.stringify(step)}`);
  }
  // A record at or after the extend write's mtime classifies normally, same
  // units, same override (none) -- the guard is timing-triggered, not a
  // standing refusal of `limit-reached` altogether.
  const freshJob = { ...staleJob, updated_at: new Date(extendMtimeMs + 1000).toISOString() };
  const freshStep = readerPathAwaitStep(freshJob, {}, extendMtimeMs, { stopRequested: false, elapsedS: 305, stalledS: 0 });
  if (!freshStep.classify || freshStep.state !== "limit-reached") {
    fails.push(`(q) a record no older than the extend write was still withheld from classifying \`limit-reached\`: ${JSON.stringify(freshStep)}`);
  }
  // No extend file at all (extendMtimeMs null) -- the guard cannot fire, and
  // a genuinely stale-looking `updated_at` classifies as it always has.
  const noExtendStep = readerPathAwaitStep(staleJob, {}, null, { stopRequested: false, elapsedS: 305, stalledS: 0 });
  if (!noExtendStep.classify || noExtendStep.state !== "limit-reached") {
    fails.push(`(q) with no extend file at all, a checkpoint-hit unit was not classified \`limit-reached\`: ${JSON.stringify(noExtendStep)}`);
  }
}

// (r) kogaki#1213 acceptance 3 (source-side) — `awaitReaderPathJob` in
// `src/brief.mjs` reads `readerPathAwaitStep` for its own classification
// rather than calling `classifyDetachedJobState` directly on the raw
// record, which is what would leave the two races above unfixed in the one
// place they actually run every ten seconds.
{
  const brief = readFileSync("src/brief.mjs", "utf8");
  if (!brief.includes("readerPathAwaitStep(job,")) {
    fails.push("(r) src/brief.mjs's awaitReaderPathJob no longer calls readerPathAwaitStep -- the extend-override and stale-record fixes have no caller in the live poll loop");
  }
  if (!brief.includes("step.classify")) {
    fails.push("(r) src/brief.mjs no longer branches on readerPathAwaitStep's `classify` flag -- a stale record would fall straight through to finishReaderPathJobAwait");
  }
}

// (u) kogaki#1241 — an `extend` click read after the units the gate RAISED
// FOR have finished is recorded against those named units, never `[]`: the
// declaration's own `reader_path_job_checkpoint_hit_units` wins over the live
// job record's `checkpoint_hit` flags, which by the time the click lands name
// nothing (every unit is `done`).
{
  const decl = { reader_path_job_checkpoint_hit_units: ["c1", "c2"] };
  const finishedJob = {
    checkpoint_s: 60, absolute_limit_s: 600,
    units: [{ id: "c1", status: "done" }, { id: "c2", status: "done" }, { id: "c3", status: "running" }],
  };
  const { hitUnits, alreadyFinished, newOverrides } = resolveReaderPathJobExtend(decl, finishedJob, {});
  if (JSON.stringify(hitUnits.slice().sort()) !== JSON.stringify(["c1", "c2"])) {
    fails.push(`(u1) a click read after both raised units finished did not record the raising's own units: ${JSON.stringify(hitUnits)}`);
  }
  if (JSON.stringify(alreadyFinished.slice().sort()) !== JSON.stringify(["c1", "c2"])) {
    fails.push(`(u1) neither named unit was reported already-finished even though both read \`done\`: ${JSON.stringify(alreadyFinished)}`);
  }
  if (alreadyFinished.includes("c3")) {
    fails.push(`(u1) a unit the raising never named (c3, still running) was reported already-finished: ${JSON.stringify(alreadyFinished)}`);
  }
  // The grant is still written for the finished units (raising the bound costs
  // nothing on a unit that will never read it again), capped at 60+60=120.
  if (newOverrides.c1 !== 120 || newOverrides.c2 !== 120) {
    fails.push(`(u1) the raised bound for a since-finished named unit was not written: ${JSON.stringify(newOverrides)}`);
  }

  // (u2) a unit STILL running when the click lands is named and reported as
  // NOT already-finished — the note is for a unit that truly can no longer use
  // the grant, not for every unit a click answers.
  const stillRunningJob = {
    checkpoint_s: 60, absolute_limit_s: 600,
    units: [{ id: "c1", status: "running" }, { id: "c2", status: "done" }],
  };
  const step2 = resolveReaderPathJobExtend(decl, stillRunningJob, {});
  if (step2.alreadyFinished.length !== 1 || step2.alreadyFinished[0] !== "c2") {
    fails.push(`(u2) a still-running named unit beside a finished one did not isolate the finished one alone: ${JSON.stringify(step2.alreadyFinished)}`);
  }

  // (u3) a declaration written before kogaki#1241 (no
  // reader_path_job_checkpoint_hit_units at all) falls back to the live job's
  // own checkpoint_hit flags, the pre-fix behaviour, so an old run's
  // declaration is not refused by the new reader.
  const oldDecl = {};
  const liveJob = { checkpoint_s: 60, absolute_limit_s: 600,
    units: [{ id: "c1", status: "running", checkpoint_hit: true }, { id: "c2", status: "running", checkpoint_hit: false }] };
  const step3 = resolveReaderPathJobExtend(oldDecl, liveJob, {});
  if (JSON.stringify(step3.hitUnits) !== JSON.stringify(["c1"])) {
    fails.push(`(u3) a declaration carrying no checkpoint-hit units did not fall back to the live job's own checkpoint_hit flags: ${JSON.stringify(step3.hitUnits)}`);
  }

  // (u4) the raised bound is capped at the job's own absolute limit, same as
  // before this issue's refactor — an extend can never grant more total time
  // than the ceiling already allows.
  const nearCeilingJob = { checkpoint_s: 60, absolute_limit_s: 100,
    units: [{ id: "c1", status: "running" }] };
  const step4 = resolveReaderPathJobExtend({ reader_path_job_checkpoint_hit_units: ["c1"] }, nearCeilingJob, { c1: 80 });
  if (step4.newOverrides.c1 !== 100) {
    fails.push(`(u4) a raised bound past the job's own absolute limit was not capped at it: ${JSON.stringify(step4.newOverrides)}`);
  }

  const terrain = readFileSync("src/terrain.mjs", "utf8");
  if (!terrain.includes("resolveReaderPathJobExtend(decl, job, existingOverrides)")) {
    fails.push("(u) src/terrain.mjs's `extend` answer branch no longer calls resolveReaderPathJobExtend(decl, job, existingOverrides) -- the fix above has no caller in the live gate-answer path");
  }
  const brief2 = readFileSync("src/brief.mjs", "utf8");
  if (!brief2.includes("reader_path_job_checkpoint_hit_units: checkpointHitUnits")) {
    fails.push("(u) src/brief.mjs's finishReaderPathJobAwait no longer carries checkpointHitUnits onto the declaration as reader_path_job_checkpoint_hit_units -- the run declaration would no longer name the units `extend` was offered for");
  }
}

// (s) kogaki#1213 acceptance 3 (question text) — the Stop-only Arm raised for
// a call that is still running and has already spent its one extension
// renders text that says so, never the registered "did not finish" wording a
// running call makes false.
{
  const dir = mkNewRun();
  const declPath = emitGateDeclaration(dir, READER_PATH_JOB_GATE_ID,
    [{ id: "stop", label: "Stop" }],
    {
      reader_path_job_state: "limit-reached", reader_path_job: join(dir, "reader-path-job.json"),
      question: "A reader-path call is still running and has already used its one extension. Stopping now ends the job early and discards every candidate finished or still in progress — the alternative is to let it keep running.",
    });
  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  if (/did not finish/i.test(declaration.question)) {
    fails.push(`(s) the Stop-only declaration still carries the registered "did not finish" wording for a call that is still running: ${declaration.question}`);
  }
  if (!/still running/i.test(declaration.question) || !/extension/i.test(declaration.question) || !/discard/i.test(declaration.question)) {
    fails.push(`(s) the Stop-only declaration does not say the call is running, its extension is spent, and what Stop discards: ${declaration.question}`);
  }
  const leak = findInternalVocabulary(String(declaration.question || ""));
  if (leak) fails.push(`(s) the Stop-only question text carries spec-internal vocabulary: ${JSON.stringify(leak)}`);
  const brief = readFileSync("src/brief.mjs", "utf8");
  if (!brief.includes("stopOnlyQuestion")) {
    fails.push("(s) src/brief.mjs no longer composes a dynamic Stop-only question for the limit-reached, extension-spent case");
  }
}

// (d) END TO END: a real `job-supervise` child process, against a FAKE judge
// binary whose behaviour is selected by the PROMPT it reads on stdin (never
// by an argv flag, since the supervisor hands every unit the same argv) --
// "OK\n" writes a valid stream-json transcript ending in a `type: "result"`
// line, "FAIL_EXIT\n" exits 3, "FAIL_JSON\n" writes unparseable stdout,
// "SLEEP_FOREVER\n" never exits on its own, "SLOW\n" writes a `type: "system"`
// line every 300ms for 8 ticks (~2.4s) THEN its result line -- streamed,
// incremental output past the fixture's own stall bound (kogaki#1193 PR #1195
// review round 1, finding 1's own fixture: byte growth across several small
// writes, never one buffered write at exit).
const scratch = mkdtempSync(join(tmpdir(), "kogaki-rpjob-fakejudge-"));
const fakeJudge = join(scratch, "fake-judge.mjs");
writeFileSync(fakeJudge, `#!/usr/bin/env node
let chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  const prompt = Buffer.concat(chunks).toString("utf8").trim();
  const retried = prompt.includes("YOUR PREVIOUS ANSWER WAS REFUSED");
  if (prompt === "FAIL_EXIT") { process.stderr.write("fake judge refused on purpose\\n"); process.exit(3); }
  // startsWith, not ===: a retried unit's prompt is this token plus the
  // refusal block appended (kogaki#1203), so the SAME structural refusal
  // must keep firing across both attempts.
  if (prompt.startsWith("FAIL_JSON") || prompt.startsWith("FAIL_TWICE")) { process.stdout.write("not json at all"); process.exit(0); }
  if (prompt.startsWith("FAIL_ONCE")) {
    if (retried) {
      process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "retried-ok" }] }) }) + "\\n");
    } else {
      process.stdout.write("not json at all");
    }
    process.exit(0);
  }
  if (prompt === "FAIL_LOGIN") {
    process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "result", is_error: true, result: "Not logged in · Please run /login" }) + "\\n");
    process.exit(1);
  }
  if (prompt === "SLEEP_FOREVER") { setInterval(() => {}, 1 << 30); return; }
  if (prompt === "SLOW") {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      process.stdout.write(JSON.stringify({ type: "system", subtype: "progress", i }) + "\\n");
      if (i >= 8) {
        clearInterval(iv);
        process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "slow" }] }) }) + "\\n");
        process.exit(0);
      }
    }, 300);
    return;
  }
  process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "s1" }] }) }) + "\\n");
});
`);
chmodSync(fakeJudge, 0o755);

// THE PASS-THROUGH VALIDATOR (kogaki#1240). `job-supervise` now refuses to
// start at all when its units file names no declared validator -- every
// fixture below that is testing the SUPERVISOR'S OWN MECHANICS (checkpoints,
// stalls, the extend grant, the refusal-beside-a-running-sibling reduction)
// and has nothing to do with Leg shape needs ONE to declare, so this module
// exports a function that never refuses, loaded through the exact same
// `loadReaderPathUnitValidator` route the real `validateReaderPathUnit`
// (src/brief.mjs) is.
const passthroughValidatorModule = join(scratch, "passthrough-validator.mjs");
writeFileSync(passthroughValidatorModule, `export function passthrough() { return null; }\n`);
const passthroughValidator = { module: passthroughValidatorModule, export: "passthrough" };

function mkNewScratch() { const d = mkdtempSync(join(tmpdir(), "kogaki-rpjob-")); return d; }
function mkNewRun() { const d = mkNewScratch(); return d; }

// `units` is either the bare array the whole suite wrote before kogaki#1240,
// or already a `{units, validator}` declaration for a caller that wants its
// OWN validator (the Leg-shape section below) -- the bare-array shape is
// wrapped with the pass-through validator so every pre-existing fixture
// keeps asserting the supervisor mechanics alone.
function declareUnits(units) {
  return Array.isArray(units) ? { units, validator: passthroughValidator } : units;
}

function superviseSync(dir, units, opts = {}) {
  const unitsPath = join(dir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits(units), null, 2));
  const args = ["src/terrain.mjs", "job-supervise", "--run", dir, "--units", unitsPath,
    "--command", fakeJudge, "--model", "m", "--output-format", "json",
    "--checkpoint-s", String(opts.checkpointS ?? 100), "--absolute-limit-s", String(opts.absoluteLimitS ?? 100),
    "--stall-s", String(opts.stallS ?? 100), "--heartbeat-ms", String(opts.heartbeatMs ?? 250)];
  return spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8" });
}

function readRecord(dir) {
  const p = join(dir, "reader-path-job.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

// (d1) done — every unit "OK", state ends done, no failure block.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "OK" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure) fails.push(`(d1) all-OK units did not end \`done\` with no failure: ${JSON.stringify(rec)}`);
}

// (d2) refused — one unit's record fails the structural check; the CAUSE is
// preserved (acceptance 7's own fixture: "fails validation once and observes
// refused with the cause in the record").
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_JSON" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "refused" || !rec.failure || rec.failure.unit !== "c2" || !rec.failure.stderr_tail) {
    fails.push(`(d2) a structurally-bad unit did not end \`refused\` naming its unit and cause: ${JSON.stringify(rec)}`);
  }
}

// (d3) died — a non-zero exit ends the job `died`, carrying the unit's own
// stderr (kogaki#1193 acceptance 2's own fixture).
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_EXIT" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "died" || !rec.failure || rec.failure.unit !== "c2" || !String(rec.failure.stderr_tail || "").includes("fake judge refused")) {
    fails.push(`(d3) a non-zero-exit unit did not end \`died\` with its own stderr preserved: ${JSON.stringify(rec)}`);
  }
}

// (d3.5) died with a carried result — kogaki#1197 acceptance 1's own fixture:
// a unit exits 1 after printing an `is_error` result line (the `--bare`
// "Not logged in" shape), and the failure record carries that line's
// `result` text.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_LOGIN" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "died" || !rec.failure || rec.failure.unit !== "c2" || rec.failure.result !== "Not logged in · Please run /login") {
    fails.push(`(d3.5) a dead unit's is_error result text was not carried onto the job's failure record: ${JSON.stringify(rec)}`);
  }
}

// (d4) stopped — the stop flag dominates even with every unit still running.
{
  const dir = mkNewRun();
  writeFileSync(join(dir, "reader-path-job.stop"), "now\n");
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { heartbeatMs: 100 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "stopped" || !rec.failure) fails.push(`(d4) a pre-set stop flag did not end the job \`stopped\`: ${JSON.stringify(rec)}`);
}

// (d5) ceiling — the absolute limit ends a job whose units never finish.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { absoluteLimitS: 1, stallS: 30, checkpointS: 30, heartbeatMs: 250 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "ceiling" || !rec.failure) fails.push(`(d5) the absolute limit did not end the job \`ceiling\`: ${JSON.stringify(rec)}`);
}

// (d6) stalled — no output growth for the stall bound ends the job `stalled`,
// below its ceiling (kogaki#1193 acceptance 4's own fixture).
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { absoluteLimitS: 30, stallS: 1, checkpointS: 30, heartbeatMs: 250 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "stalled" || !rec.failure) fails.push(`(d6) no output growth did not end the job \`stalled\` ahead of its ceiling: ${JSON.stringify(rec)}`);
}

// (d7.5) streamed output past the OLD stall bound does not stall (kogaki#1193
// PR #1195 review round 1, finding 1's own fixture). The "SLOW" judge writes
// eight small lines 300ms apart (~2.4s total) rather than one buffered write
// at exit -- a stall bound smaller than any single gap (`stallS: 1`) would
// catch a buffered writer instantly but must NOT catch one that keeps
// producing bytes, which is exactly what `--output-format json` could never
// prove and `stream-json` now does.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLOW" }], { absoluteLimitS: 10, stallS: 1, checkpointS: 10, heartbeatMs: 200 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure) {
    fails.push(`(d7.5) steady streamed output narrower than the stall gap still ended non-\`done\`: ${JSON.stringify(rec)}`);
  }
}

// (d7) other — a units file the supervisor cannot even read is the
// catch-all, and the record still lands rather than nothing being written.
{
  const dir = mkNewRun();
  writeFileSync(join(dir, "units.json"), "not json");
  const args = ["src/terrain.mjs", "job-supervise", "--run", dir, "--units", join(dir, "units.json"),
    "--command", fakeJudge, "--model", "m", "--output-format", "json"];
  spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8" });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "other" || !rec.failure) fails.push(`(d7) an unreadable units file did not end the job \`other\` with a preserved record: ${JSON.stringify(rec)}`);
}

// (d7b) kogaki#1240 acceptance 4: a units file that parses and carries a
// well-formed `units` array but names NO declared validator at all refuses
// to start, the same `other` catch-all as an unreadable file -- never a
// silent "no checker" run. Distinct from (d7): that file is not even valid
// JSON, this one is, and carries no `validator` key.
{
  const dir = mkNewRun();
  writeFileSync(join(dir, "units.json"), JSON.stringify({ units: [{ id: "c1", prompt: "SLOW" }] }, null, 2));
  const args = ["src/terrain.mjs", "job-supervise", "--run", dir, "--units", join(dir, "units.json"),
    "--command", fakeJudge, "--model", "m", "--output-format", "json"];
  spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8" });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "other" || !rec.failure) fails.push(`(d7b) a units file naming no declared validator did not refuse to start with an \`other\` record: ${JSON.stringify(rec)}`);
}

// (d8)/(d9) THE EXTEND GRANT REACHES THE SUPERVISOR (kogaki#1193 PR #1195
// review round 1, finding 2's own fixture). Before this fix, `checkpoint_hit`
// never changed once true, so a unit's SECOND poll after the owner's "extend"
// click read the exact same `limit-reached` verdict the FIRST poll did — the
// owner was granted no additional time before being asked again. `checkpointS
// : 1` puts the "SLOW" unit's checkpoint well inside its own ~2.4s run, so
// the sequence below observes: checkpoint hit -> (with no override) STILL
// hit one heartbeat later -> (after writing the override this member itself
// writes, the same file `cmdJobSupervise` polls) NOT hit -> eventually `done`,
// which the unit was always going to reach on its own timeline once the
// supervisor stopped re-declaring it blocked.
function sleepSyncMs(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function pollUntil(dir, pred, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let rec = readRecord(dir);
  while (Date.now() < deadline) {
    rec = readRecord(dir);
    if (pred(rec)) return rec;
    sleepSyncMs(50);
  }
  return rec;
}
{
  const dir = mkNewRun();
  const unitsPath = join(dir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits([{ id: "c1", prompt: "SLOW" }]), null, 2));
  const child = spawn(process.execPath, ["src/terrain.mjs", "job-supervise",
    "--run", dir, "--units", unitsPath, "--command", fakeJudge, "--model", "m",
    "--output-format", "json", "--checkpoint-s", "1", "--absolute-limit-s", "30",
    "--stall-s", "30", "--heartbeat-ms", "150"], { cwd: root });
  try {
    const hit1 = pollUntil(dir, (r) => r && r.state === "limit-reached", 5000);
    if (!hit1 || hit1.state !== "limit-reached") {
      fails.push(`(d8) a checkpoint-s smaller than the unit's own run time never reached \`limit-reached\` — the fixture's own premise did not hold: ${JSON.stringify(hit1)}`);
    } else {
      sleepSyncMs(200);
      const stillHit = readRecord(dir);
      if (!stillHit || stillHit.state !== "limit-reached") {
        fails.push(`(d8) \`limit-reached\` cleared on its own with no extend override written — the fixture cannot show the grant taking effect: ${JSON.stringify(stillHit)}`);
      }
      writeFileSync(join(dir, "reader-path-job.extend"), `${JSON.stringify({ c1: 30 }, null, 2)}\n`);
      const cleared = pollUntil(dir, (r) => r && r.state !== "limit-reached", 3000);
      if (!cleared || cleared.state === "limit-reached") {
        fails.push(`(d8) writing the extend override did not clear \`limit-reached\` on the next supervisor tick: ${JSON.stringify(cleared)}`);
      }
      const done = pollUntil(dir, (r) => r && r.state !== "running" && r.state !== "limit-reached", 8000);
      if (!done || done.state !== "done") {
        fails.push(`(d9) the extended unit did not go on to finish \`done\`: ${JSON.stringify(done)}`);
      }
    }
  } finally {
    try { child.kill("SIGKILL"); } catch { /* already exited on its own */ }
  }
}

// (d10) A REFUSAL BESIDE A RUNNING SIBLING NO LONGER KILLS IT (kogaki#1204
// acceptances 1-2's own fixture). "c2" (FAIL_TWICE) exhausts both attempts
// and lands terminally refused within a couple of fast, near-instant ticks;
// "c1" (SLOW) is still running at that moment (~2.4s to finish) -- the OLD
// reduction would have declared the whole job `refused` right there and
// killed "c1" mid-run. The fix: the job keeps polling until "c1" also
// finishes, "c1"'s own Candidate lands on disk the moment IT classifies
// `done` (not deleted or withheld for the job's eventual `refused`), and the
// job record names the file.
{
  const dir = mkNewRun();
  const unitsPath = join(dir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits([{ id: "c1", prompt: "SLOW" }, { id: "c2", prompt: "FAIL_TWICE" }]), null, 2));
  const child = spawn(process.execPath, ["src/terrain.mjs", "job-supervise",
    "--run", dir, "--units", unitsPath, "--command", fakeJudge, "--model", "m",
    "--output-format", "json", "--checkpoint-s", "30", "--absolute-limit-s", "30",
    "--stall-s", "30", "--heartbeat-ms", "150"], { cwd: root });
  try {
    // "c2" refuses fast; if the OLD bug were still present the job would
    // already read `refused` here, well before "c1" (SLOW, ~2.4s) is done.
    const early = pollUntil(dir, (r) => r && (r.units || []).some((u) => u.id === "c2" && u.status === "refused"), 3000);
    const c1Early = early && (early.units || []).find((u) => u.id === "c1");
    if (!c1Early || c1Early.status !== "running" || early.state !== "running") {
      fails.push(`(d10) once "c2" refused, "c1" was not still running and/or the job state was not "running": ${JSON.stringify(early)}`);
    }
    const done = pollUntil(dir, (r) => r && r.state !== "running" && r.state !== "limit-reached", 8000);
    if (!done || done.state !== "refused") {
      fails.push(`(d10) the job's own terminal state was not "refused" once every unit had finished: ${JSON.stringify(done)}`);
    }
    const c1Final = done && (done.units || []).find((u) => u.id === "c1");
    if (!c1Final || c1Final.status !== "done") {
      fails.push(`(d10) "c1" was not left \`done\` by the terminal record — a running sibling was killed for "c2"'s refusal: ${JSON.stringify(c1Final)}`);
    }
    if (!c1Final || !c1Final.candidate_file || !existsSync(c1Final.candidate_file)) {
      fails.push(`(d10) "c1"'s finished Candidate was not written to disk / not named on its unit row: ${JSON.stringify(c1Final)}`);
    } else {
      const onDisk = JSON.parse(readFileSync(c1Final.candidate_file, "utf8"));
      if (!onDisk || !Array.isArray(onDisk.legs)) {
        fails.push(`(d10) "c1"'s written Candidate file did not carry the classified candidate: ${JSON.stringify(onDisk)}`);
      }
    }
    if (!done.failure || !Array.isArray(done.failure.kept_candidates) || !done.failure.kept_candidates.some((k) => k.id === "c1")) {
      fails.push(`(d10) the job's failure record did not name "c1"'s kept Candidate: ${JSON.stringify(done && done.failure)}`);
    }
  } finally {
    try { child.kill("SIGKILL"); } catch { /* already exited on its own */ }
  }
}

// (d11) kogaki#1240: THE DECLARED, REAL `validateReaderPathUnit` VALIDATOR
// REACHES UNIT CLASSIFICATION, loaded exactly as `job-supervise` loads it
// (`loadReaderPathUnitValidator`, through its `module`/`export`/`inputs`
// declaration) -- never a stand-in. A structurally-good Candidate record
// whose Legs fail the Leg schema (here: the second Leg's `rationale`, a
// required field) is refused on the VALIDATOR'S text, naming `rationale`,
// not on the generic structural one `readerPathUnitRecord` raises; a unit
// refused this way gets the same one-re-ask (kogaki#1203) and
// refused-twice-is-terminal (kogaki#1204) treatment a parse failure already
// does.
{
  const movesScratchDir = mkdtempSync(join(tmpdir(), "kogaki-rpjob-moves-"));
  writeFileSync(join(movesScratchDir, "m1.md"), "id: m1\n");

  const legOf = (legId, extra) => ({
    leg_id: legId, move: "m1", materials: ["L1"],
    purpose: `what ${legId} is for`,
    reader_state_before: "knowledge: before\nquestion: holds: none",
    reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }],
    ...extra,
  });
  const candidateOf = (leg2Extra) => ({
    candidate_id: "c1", characteristic: "x", reader_experience: "y",
    reader_start: "knowledge: before\nquestion: holds: none",
    reasoning: { leg_validity: "x", transition_continuity: "x", thesis_closure: "x" },
    legs: [legOf("s1", { opens_section: "Intro" }), legOf("s2", { depends_on: ["s1"], reaches_target: true, ...leg2Extra })],
  });
  const goodCandidate = candidateOf({});
  const missingRationaleCandidate = candidateOf({ rationale: undefined });
  delete missingRationaleCandidate.legs[1].rationale;

  const legValidator = { module: "src/brief.mjs", export: "validateReaderPathUnit",
    inputs: { strandIds: ["L1"], movesDir: movesScratchDir,
      readerStart: "knowledge: before\nquestion: holds: none" } };

  // A SEPARATE fake judge, selecting its answer by prompt token the same way
  // `fakeJudge` above does, but answering with these Candidates rather than
  // the generic `{legs: [{id: "s1"}]}` stub -- "ONCE_MISSING" repairs on the
  // retried prompt (kogaki#1203's own detection, `prompt.includes("YOUR
  // PREVIOUS ANSWER WAS REFUSED")`), "ALWAYS_MISSING" never does.
  const fakeJudgeLeg = join(scratch, "fake-judge-leg.mjs");
  writeFileSync(fakeJudgeLeg, `#!/usr/bin/env node
let chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  const prompt = Buffer.concat(chunks).toString("utf8").trim();
  const retried = prompt.includes("YOUR PREVIOUS ANSWER WAS REFUSED");
  const write = (candidate) => {
    process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(candidate) }) + "\\n");
    process.exit(0);
  };
  if (prompt.startsWith("ONCE_MISSING")) { write(retried ? ${JSON.stringify(goodCandidate)} : ${JSON.stringify(missingRationaleCandidate)}); return; }
  write(${JSON.stringify(missingRationaleCandidate)});
});
`);
  chmodSync(fakeJudgeLeg, 0o755);

  function superviseLegSync(dir, unitId, prompt) {
    const unitsPath = join(dir, "units.json");
    writeFileSync(unitsPath, JSON.stringify({ units: [{ id: unitId, prompt }], validator: legValidator }, null, 2));
    const args = ["src/terrain.mjs", "job-supervise", "--run", dir, "--units", unitsPath,
      "--command", fakeJudgeLeg, "--model", "m", "--output-format", "json",
      "--checkpoint-s", "100", "--absolute-limit-s", "100", "--stall-s", "100", "--heartbeat-ms", "250"];
    return spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8" });
  }

  // (d11a) refused once on the Leg shape, repaired on the retried prompt --
  // the job ends `done`, and the unit's own row still names the attempt
  // count and the FIRST refusal's text, carrying `rationale` verbatim.
  {
    const dir = mkNewRun();
    superviseLegSync(dir, "c1", "ONCE_MISSING");
    const rec = readRecord(dir);
    const row = rec && (rec.units || []).find((u) => u.id === "c1");
    if (!rec || rec.state !== "done" || rec.failure) {
      fails.push(`(d11a) a unit refused once on the Leg shape and repaired on retry did not end the job \`done\`: ${JSON.stringify(rec)}`);
    }
    if (!row || row.attempts !== 2 || !row.first_refusal || !row.first_refusal.includes("rationale")) {
      fails.push(`(d11a) the repaired unit's row does not carry two attempts and the first refusal naming \`rationale\`: ${JSON.stringify(row)}`);
    }
  }

  // (d11b) refused on BOTH attempts ends the job `refused`, naming the unit
  // and carrying the declared validator's own refusal text (the issue's
  // "A fixture unit refused twice on the Leg shape ends the job `refused`
  // naming the unit").
  {
    const dir = mkNewRun();
    superviseLegSync(dir, "c1", "ALWAYS_MISSING");
    const rec = readRecord(dir);
    if (!rec || rec.state !== "refused" || !rec.failure || rec.failure.unit !== "c1"
      || !rec.failure.stderr_tail || !rec.failure.stderr_tail.includes("rationale")) {
      fails.push(`(d11b) a unit refused twice on the Leg shape did not end the job \`refused\`, naming the unit and the \`rationale\` refusal: ${JSON.stringify(rec)}`);
    }
  }
  rmSync(movesScratchDir, { recursive: true, force: true });
}

// (e) THE SCREEN LEAKS NEITHER A STATE NAME NOR A PATH (acceptance 8). A
// fixture declaration carries both in its EXTRA fields — exactly what
// `finishReaderPathJobAwait` hands `emitGateDeclaration` — and the rendered
// AskUserQuestion payload `composeGateCall` produces is asserted to contain
// neither the raw state token nor the job-record path.
{
  const dir = mkNewRun();
  const jobPath = join(dir, "reader-path-job.json");
  const declPath = emitGateDeclaration(dir, READER_PATH_JOB_GATE_ID,
    [{ id: "stop", label: "Stop" }],
    { reader_path_job_state: "died", reader_path_job: jobPath });
  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const call = composeGateCall(declaration);
  const rendered = JSON.stringify(call.tool_input || {});
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

// (f) A run record whose `reader_path_job_extended` already names a
// checkpoint-hit unit offers no `extend` for that same unit again — the
// issue thread's "extend is granted once per unit ... the same unit reaching
// the limit again renders stop only". This asserts the OPTION-COMPOSING
// LOGIC directly, against `src/brief.mjs`'s own source text: the file is
// grepped for the two clauses that implement it, on the ground stated in
// this suite's own note that a check may bind source text where a live
// AskUserQuestion relay cannot be constructed in a fixture.
{
  const brief = readFileSync("src/brief.mjs", "utf8");
  if (!brief.includes("checkpointHitUnits.some((id) => !alreadyExtended.has(id))")) {
    fails.push("(f) src/brief.mjs no longer gates `extend` on an unextended checkpoint-hit unit — a second `limit-reached` on the same unit would re-offer `extend` rather than `stop` alone");
  }
  if (!brief.includes("rec.reader_path_job_extended")) {
    fails.push("(f) src/brief.mjs no longer reads `rec.reader_path_job_extended` — the per-unit extension grant has no ledger to check against");
  }
  const terrain = readFileSync("src/terrain.mjs", "utf8");
  if (!terrain.includes("rec.reader_path_job_extended[jobState]")) {
    fails.push("(f) src/terrain.mjs's `extend` answer no longer records which unit(s) it granted — the ledger `finishReaderPathJobAwait` reads would stay permanently empty");
  }
}

// (g) kogaki#1197: `cmdJobSupervise`'s own argv no longer carries `--bare`
// (acceptance 3 of the issue, asserted here at the source rather than only
// by `grep` at the repo root — this check IS what a full-suite run exercises)
// and its child environment sets `CLAUDE_CODE_DISABLE_AUTO_MEMORY` to keep
// auto-memory off now that `--bare` no longer does.
{
  const terrain = readFileSync("src/terrain.mjs", "utf8");
  if (terrain.includes(`"--bare"`)) {
    fails.push("(g) src/terrain.mjs still passes `--bare` to a unit child — the flag that read auth strictly from ANTHROPIC_API_KEY/apiKeyHelper and never the OAuth login, killing every unit with \"Not logged in\"");
  }
  if (!terrain.includes("CLAUDE_CODE_DISABLE_AUTO_MEMORY")) {
    fails.push("(g) src/terrain.mjs no longer sets CLAUDE_CODE_DISABLE_AUTO_MEMORY in a unit child's environment — dropping `--bare` re-admits auto-memory with nothing left to suppress it");
  }
  // The `job status` line carries a dead unit's result text too (design item
  // 2), asserted by string: the status verb is hook-run, not fixture-run.
  const brief = readFileSync("src/brief.mjs", "utf8");
  const statusFn = brief.slice(brief.indexOf("function printReaderPathJobStatus"), brief.indexOf("function sleepSync"));
  if (!statusFn.includes("u.failure.result")) {
    fails.push("(g) printReaderPathJobStatus no longer renders a dead unit's failure.result — the `job status` line would again say a unit died without saying why");
  }
}

// (h) THE GATE-CALL BYTES ARE ON STDOUT, NOT ONLY THEIR ADDRESS (kogaki#1198's
// own reproduction: `node src/brief.mjs run --status --job await` named
// `brief-reader-path-job.gate-call.json` and printed none of it). A real
// `job await` over a `died` job is run end to end through the CLI --
// `run --status` is the one Bash-reachable verb this runtime admits, and it is
// read-only -- against a hand-written run record standing in for the hook
// loop's own write, on the same ground section (e) states for a bare
// `emitGateDeclaration` call: the executor is invoked by hooks only, so a
// fixture drives it through its one admitted, read-only door rather than
// forging a hook payload for a write it is not this check's job to attempt.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_EXIT" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "died") fails.push(`(h) fixture premise failed: the job did not end \`died\`: ${JSON.stringify(rec)}`);
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir };
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  const callPath = join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`);
  if (!existsSync(callPath)) {
    fails.push(`(h) \`job await\` over a died job wrote no gate-call file at ${callPath}: stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
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

// (j) THE REAL UNIT ROW RENDERS A PROMPT THE PARSER ACTUALLY ACCEPTS
// (kogaki#1203 acceptance 4a). `src/brief-workflow.json`'s `reader_path_unit`
// row is rendered through the SAME `judgePrompt` renderer the unit build uses,
// and a fixture judge answering with the record shape THIS ROW STATES (a bare
// Candidate at the record's own root, `legs` included) must classify `done` --
// proving the row's stated shape and the parser's accepted shape are one
// shape, never two that can drift apart the way the old `compose_path` row
// and `readerPathUnitRecord` did.
{
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const unitRow = table.reader_path_unit;
  if (!unitRow) {
    fails.push("(j) src/brief-workflow.json declares no top-level `reader_path_unit` row");
  } else {
    if (/\{\s*candidates\s*:/i.test(unitRow.input_shape || "")) {
      fails.push(`(j) reader_path_unit.input_shape still describes a \`candidates\` wrapper array: ${unitRow.input_shape}`);
    }
    const input = { state: "compose_path", unit_number: 1 };
    const prompt = judgePrompt(unitRow, JSON.stringify(input, null, 2), input, null);
    const bareCandidateAnswer = JSON.stringify({
      candidate_id: "c1", characteristic: "x", reader_experience: "y",
      legs: [{ id: "s1" }], reasoning: {}, coverage: {}, unused: {},
    });
    const stdout = JSON.stringify({ type: "system", subtype: "init" }) + "\n"
      + JSON.stringify({ type: "result", result: bareCandidateAnswer }) + "\n";
    const rec = readerPathUnitRecord(stdout);
    if (!rec || rec.error || !rec.candidate || !Array.isArray(rec.candidate.legs)) {
      fails.push(`(j) an answer of the shape reader_path_unit.input_shape states was refused by readerPathUnitRecord: ${JSON.stringify(rec)}`);
    }
    if (!prompt.includes(unitRow.judgment_point)) {
      fails.push("(j) judgePrompt(unitRow, ...) did not render the unit row's own judgment_point");
    }
  }
}

// (k) THE RETRY PROMPT CARRIES THE FIRST REFUSAL VERBATIM (kogaki#1203
// acceptance 4b / acceptance 3): the second attempt is the first prompt plus
// the same refusal-repair block `judgePrompt` appends for the synchronous
// judge, marker included.
{
  const firstPrompt = "THE FIRST PROMPT, UNCHANGED BELOW THIS LINE";
  const refusal = "no `legs` array at the record's root";
  const retryPrompt = readerPathUnitRetryPrompt(firstPrompt, refusal);
  if (!retryPrompt.startsWith(firstPrompt)) {
    fails.push("(k) readerPathUnitRetryPrompt does not begin with the first prompt, unchanged");
  }
  if (!retryPrompt.includes(JUDGE_REFUSAL_MARKER)) {
    fails.push("(k) readerPathUnitRetryPrompt carries no JUDGE_REFUSAL_MARKER");
  }
  if (!retryPrompt.includes(refusal)) {
    fails.push("(k) readerPathUnitRetryPrompt does not carry the refusal verbatim");
  }
  // THE BLOCK SITS BEFORE THE INPUT MARKER (PR #1207 review round 1): over a
  // real unit prompt, the retry prompt is byte-identical to `judgePrompt`'s
  // own re-ask of the same row and input -- a block spliced past the marker
  // would be read as input, the #1203 defect in its second-attempt form.
  const unitRow = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_unit;
  if (unitRow) {
    const input = { state: "compose_path", unit_number: 1 };
    const inputText = JSON.stringify(input, null, 2);
    const realFirst = judgePrompt(unitRow, inputText, input, null);
    const realRetry = readerPathUnitRetryPrompt(realFirst, refusal);
    if (realRetry !== judgePrompt(unitRow, inputText, input, refusal)) {
      fails.push("(k) the retried unit prompt differs from judgePrompt's own re-ask of the same row and input");
    }
    if (!realRetry.endsWith(`${JUDGE_INPUT_MARKER}\n${inputText}`)) {
      fails.push("(k) the retried unit prompt carries text after its input");
    }
  }
}

// (l) ONE RE-ASK, THEN SUCCESS (kogaki#1203 acceptance 2 + 3): a unit refused
// structurally on attempt 1 is respawned with the refusal appended, and a
// judge that repairs on the retried prompt ends the job `done` -- with the
// unit's stdout on disk under the run directory naming both attempts.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_ONCE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure) {
    fails.push(`(l) a unit refused once then repaired did not end the job \`done\` with no failure: ${JSON.stringify(rec)}`);
  }
  const c2Row = ((rec && rec.units) || []).find((u) => u.id === "c2");
  if (!c2Row || c2Row.attempts !== 2 || !c2Row.first_refusal) {
    fails.push(`(l) the repaired unit's row does not record its two attempts and its first refusal: ${JSON.stringify(c2Row)}`);
  }
  const stdoutPath = readerPathUnitStdoutPath(dir, "c2");
  if (!existsSync(stdoutPath)) {
    fails.push(`(l) no stdout file on disk for the retried unit at ${stdoutPath}`);
  } else {
    const onDisk = readFileSync(stdoutPath, "utf8");
    if (!onDisk.includes("attempt 2")) {
      fails.push("(l) the retried unit's stdout file does not mark the second attempt");
    }
  }
}

// (m) REFUSED TWICE IS TERMINAL (kogaki#1203 acceptance 3): a unit whose
// retry is refused the same way ends the job `refused`, with BOTH refusals
// recorded -- the second in `failure.stderr_tail`, the first in
// `failure.first_refusal` -- and the unit's stdout file named by
// `failure.file`.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "refused" || !rec.failure || rec.failure.unit !== "c2") {
    fails.push(`(m) a unit refused on both attempts did not end the job \`refused\` naming its unit: ${JSON.stringify(rec)}`);
  } else {
    if (!rec.failure.stderr_tail) fails.push("(m) the terminal refusal carries no stderr_tail");
    if (!rec.failure.first_refusal) fails.push(`(m) the terminal failure block carries no first_refusal: ${JSON.stringify(rec.failure)}`);
    if (rec.failure.file !== readerPathUnitStdoutPath(dir, "c2")) {
      fails.push(`(m) the terminal failure block's file does not name the unit's stdout path: ${JSON.stringify(rec.failure)}`);
    } else if (!existsSync(rec.failure.file)) {
      fails.push(`(m) the failure block names a stdout file that does not exist: ${rec.failure.file}`);
    }
  }
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-reader-path-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-reader-path-job — the nine-state Detached Job classifies, supervises end to end against a fake judge, preserves failure on every non-`done` exit, leaks no internal vocabulary at the screen, and grants `extend` at most once per unit");
JS
status=$?

# (i) THE Stop ARM'S OWN BOUND (kogaki#1199 acceptance 1). The Stop hook
# `.claude/hooks/gate-open-terrain-gate.py` (authored at
# `hook-sources/gate-open-terrain-gate.py`, installed by the supervisor) is
# run twice against a fixture pointer, standing in for the harness's own two
# Stop events at one gate: the first call (`stop_hook_active: false`) blocks
# and grants the turn its one continuation; the second (`stop_hook_active:
# true`) finds the gate still unrendered and performs the recovery itself --
# the pointer moves to `abandoned/`, the run record carries
# `failure.cause = gate-unrendered`, and no block is returned, so the turn
# and the owner's next typed prompt are both free.
stop_status=0
stop_fixture="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-stopbound-XXXXXX")"
stop_gates="$stop_fixture/open-gates"
stop_decl="$stop_fixture/decl"
mkdir -p "$stop_gates" "$stop_decl"
stop_run_record="$stop_decl/run-record.json"
printf '{}' > "$stop_run_record"
stop_gate_call="$stop_decl/gate-call.json"
printf '{"a":1}' > "$stop_gate_call"
stop_pointer="$stop_gates/p1.json"
python3 - "$stop_pointer" "$stop_decl" "$stop_gate_call" <<'PYEOF'
import json, sys
from datetime import datetime, timezone
pointer_path, decl_dir, gate_call = sys.argv[1:4]
pointer = {
    "session_id": "sess1",
    "gate_id": "g1",
    "gate_instance_id": "inst1",
    "opened_at": datetime.now(timezone.utc).isoformat(),
    "declaration_path": f"{decl_dir}/decl.json",
    "gate_call_path": gate_call,
    "capture_path": f"{decl_dir}/capture.json",
}
with open(pointer_path, "w") as f:
    json.dump(pointer, f)
PYEOF

stop_first="$(KOGAKI_OPEN_GATES="$stop_gates" python3 .claude/hooks/gate-open-terrain-gate.py Stop <<< '{"hook_event_name": "Stop", "session_id": "sess1", "stop_hook_active": false}')"
if ! printf '%s' "$stop_first" | grep -q '"decision": *"block"'; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the first Stop call (stop_hook_active=false) did not return decision:block: $stop_first"
  stop_status=1
fi
if [ ! -f "$stop_pointer" ]; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the pointer was moved after only the first Stop call, before the one granted continuation was spent"
  stop_status=1
fi

stop_second="$(KOGAKI_OPEN_GATES="$stop_gates" python3 .claude/hooks/gate-open-terrain-gate.py Stop <<< '{"hook_event_name": "Stop", "session_id": "sess1", "stop_hook_active": true}')"
if printf '%s' "$stop_second" | grep -q '"decision"'; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the second Stop call (stop_hook_active=true) still returned a decision: $stop_second"
  stop_status=1
fi
if [ -f "$stop_pointer" ]; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the pointer was not moved out of the live open-gates directory on the second Stop"
  stop_status=1
fi
if [ ! -f "$stop_gates/abandoned/p1.json" ]; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the pointer did not land under abandoned/ after the second Stop"
  stop_status=1
fi
if ! grep -q '"cause": *"gate-unrendered"' "$stop_run_record"; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - (i) the run record does not carry failure.cause = gate-unrendered after the second Stop: $(cat "$stop_run_record")"
  stop_status=1
fi
rm -rf "$stop_fixture"
if [ "$stop_status" -eq 0 ]; then
  echo "ok: check-brief-reader-path-job (i) — the Stop arm blocks once, then abandons the gate and records gate-unrendered on the second stop_hook_active"
fi

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-reader-path-job"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
if [ "$status" -ne 0 ] || [ "$stop_status" -ne 0 ]; then
  exit 1
fi
exit 0
