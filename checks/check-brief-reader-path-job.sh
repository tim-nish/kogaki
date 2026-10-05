#!/usr/bin/env bash
# check-brief-reader-path-job — the Detached Job that replaced the reader-path
# step's synchronous, hook-bound judge call (kogaki#1193).
#
# WHAT THIS COVERS. `src/terrain.mjs`'s generic detached-job primitives
# (`classifyDetachedJobUnit`, `classifyDetachedJobState`, the seven declared
# states) and the real `job-supervise` child process they drive, end to end,
# against a FAKE judge binary this member writes into a scratch tree — never
# the actual `claude` CLI, on the same seam-free convention the sibling
# `check-brief-compose.sh` states for its own fixtures. It also asserts the
# owner-facing screen leaks neither a state token nor a path (acceptance 8)
# and that `job await` over a still-running job returns within its own 30s
# bound and raises nothing (kogaki#1271).
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
  readerPathAwaitStep, readerPathRetryDecision, readerPathJobAtLimit, READER_PATH_JOB_SYSTEM_FAILURE_STATES,
} from "./src/terrain.mjs";
import { findInternalVocabulary, assembleSelection } from "./src/assemble.mjs";

const fails = [];
const root = process.cwd();

// (a) THE DECLARED STATES ARE EXACTLY THESE SEVEN (kogaki#1193, narrowed by
// kogaki#1271) — an added state or a dropped one is a silent widening or
// narrowing of the Arm surface.
{
  const want = ["done", "refused", "stopped", "ceiling", "stalled", "died", "other"];
  // "running" is in classifyDetachedJobState's own return values but it is
  // not a JOB RECORD terminal state — it is
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

// (c) THE JOB-LEVEL REDUCTION (kogaki#1204, revised kogaki#1273) — a REFUSED
// unit beside a still-running sibling does not end the job, while a DIED unit
// does at once (a system failure). Once no unit is running, one `done` unit
// makes the job `done`, and it is `refused` only when every unit was refused.
// `stopRequested` still dominates everything (the owner's stop click is
// answered no matter what a unit is doing), and the two time bounds are
// still read in the declared order: ceiling before stalled, both of which
// only apply while a unit IS still running.
{
  const running = [{ status: "running" }];
  const cases = [
    // A died unit beside a running sibling ends the job `died` on the same
    // tick (kogaki#1273) — the #1204 rule that it waited is gone.
    [[{ status: "died" }, ...running], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "died"],
    // A refused unit beside a running sibling reads "running" — the
    // sibling's own work is still in flight and must not be killed for it.
    [[{ status: "refused" }, ...running], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "running"],
    [[{ status: "died" }, { status: "refused" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "died"],
    // kogaki#1273 acceptance 3: two `done` and one `refused` end `done`;
    // three `refused` end `refused`.
    [[{ status: "refused" }, { status: "done" }, { status: "done" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "done"],
    [[{ status: "refused" }, { status: "refused" }, { status: "refused" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "refused"],
    [running, { stopRequested: true, elapsedS: 1, stalledS: 0 }, "stopped"],
    [[{ status: "died" }], { stopRequested: true, elapsedS: 1, stalledS: 0 }, "stopped"],
    [running, { stopRequested: false, elapsedS: 600, stalledS: 0 }, "ceiling"],
    [running, { stopRequested: false, elapsedS: 1, stalledS: 90 }, "stalled"],
    [running, { stopRequested: false, elapsedS: 1, stalledS: 0 }, "running"],
    [[{ status: "done" }], { stopRequested: false, elapsedS: 1, stalledS: 0 }, "done"],
  ];
  for (const [units, ctx, want] of cases) {
    const got = classifyDetachedJobState(units, ctx);
    if (got !== want) fails.push(`(c) classifyDetachedJobState(${JSON.stringify(units)}, ${JSON.stringify(ctx)}) = ${got}, wanted ${want}`);
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
  // kogaki#1273: an attempt that takes ~1.5s and is then refused, so a short
  // absolute limit makes its retry one that could not finish in time.
  if (prompt.startsWith("FAIL_SLOW")) { setTimeout(() => { process.stdout.write("not json at all"); process.exit(0); }, 1500); return; }
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
// fixture below that is testing the SUPERVISOR'S OWN MECHANICS (stalls,
// the ceiling, the refusal-beside-a-running-sibling reduction)
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
    "--absolute-limit-s", String(opts.absoluteLimitS ?? 100),
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

// (d2) one unit's record fails the structural check beside a finished sibling;
// the job ends `done` (kogaki#1273: one finished Candidate is enough) and the
// refused unit is named on the record with its CAUSE preserved on its row.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_JSON" }], {});
  const rec = readRecord(dir);
  const c2 = rec && (rec.units || []).find((u) => u.id === "c2");
  if (!rec || rec.state !== "done" || rec.failure
    || !Array.isArray(rec.refused_units) || !rec.refused_units.some((r) => r.id === "c2")
    || !c2 || c2.status !== "refused" || !c2.failure || !c2.failure.stderr_tail) {
    fails.push(`(d2) a structurally-bad unit beside a finished one did not end the job \`done\` naming the refused unit and its cause: ${JSON.stringify(rec)}`);
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
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { absoluteLimitS: 1, stallS: 30, heartbeatMs: 250 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "ceiling" || !rec.failure) fails.push(`(d5) the absolute limit did not end the job \`ceiling\`: ${JSON.stringify(rec)}`);
}

// (d6) stalled — no output growth for the stall bound ends the job `stalled`,
// below its ceiling (kogaki#1193 acceptance 4's own fixture).
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { absoluteLimitS: 30, stallS: 1, heartbeatMs: 250 });
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
  superviseSync(dir, [{ id: "c1", prompt: "SLOW" }], { absoluteLimitS: 10, stallS: 1, heartbeatMs: 200 });
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

// POLLING HELPERS for the fixtures below that watch a live supervisor.
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
// (d10) A REFUSAL BESIDE A RUNNING SIBLING NO LONGER KILLS IT (kogaki#1204
// acceptances 1-2's own fixture). "c2" (FAIL_TWICE) exhausts both attempts
// and lands terminally refused within a couple of fast, near-instant ticks;
// "c1" (SLOW) is still running at that moment (~2.4s to finish) -- the OLD
// reduction would have declared the whole job `refused` right there and
// killed "c1" mid-run. The fix: the job keeps polling until "c1" also
// finishes, "c1"'s own Candidate lands on disk the moment IT classifies
// `done`, and the job ends `done` naming "c2" as refused (kogaki#1273).
{
  const dir = mkNewRun();
  const unitsPath = join(dir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits([{ id: "c1", prompt: "SLOW" }, { id: "c2", prompt: "FAIL_TWICE" }]), null, 2));
  const child = spawn(process.execPath, ["src/terrain.mjs", "job-supervise",
    "--run", dir, "--units", unitsPath, "--command", fakeJudge, "--model", "m",
    "--output-format", "json", "--absolute-limit-s", "30",
    "--stall-s", "30", "--heartbeat-ms", "150"], { cwd: root });
  try {
    // "c2" refuses fast; if the OLD bug were still present the job would
    // already read `refused` here, well before "c1" (SLOW, ~2.4s) is done.
    const early = pollUntil(dir, (r) => r && (r.units || []).some((u) => u.id === "c2" && u.status === "refused"), 3000);
    const c1Early = early && (early.units || []).find((u) => u.id === "c1");
    if (!c1Early || c1Early.status !== "running" || early.state !== "running") {
      fails.push(`(d10) once "c2" refused, "c1" was not still running and/or the job state was not "running": ${JSON.stringify(early)}`);
    }
    const done = pollUntil(dir, (r) => r && r.state !== "running", 8000);
    if (!done || done.state !== "done") {
      fails.push(`(d10) the job's own terminal state was not "done" once every unit had finished with one of them done (kogaki#1273): ${JSON.stringify(done)}`);
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
    if (!done || !Array.isArray(done.refused_units) || !done.refused_units.some((k) => k.id === "c2" && k.attempts === 2)) {
      fails.push(`(d10) the \`done\` job's record did not name "c2" as refused after two attempts: ${JSON.stringify(done)}`);
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
    reasoning: { leg_validity: "x", thesis_closure: "x" },
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
      "--absolute-limit-s", "100", "--stall-s", "100", "--heartbeat-ms", "250"];
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
// `job await` over a `refused` job (every unit refused, kogaki#1273 -- a
// `died` job raises no question any more) is run end to end through the CLI --
// `run --status` is the one Bash-reachable verb this runtime admits, and it is
// read-only -- against a hand-written run record standing in for the hook
// loop's own write, on the same ground section (e) states for a bare
// `emitGateDeclaration` call: the executor is invoked by hooks only, so a
// fixture drives it through its one admitted, read-only door rather than
// forging a hook payload for a write it is not this check's job to attempt.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "refused") fails.push(`(h) fixture premise failed: the job did not end \`refused\`: ${JSON.stringify(rec)}`);
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

// (v) `job await` OVER A STILL-RUNNING JOB RETURNS WITHIN ITS OWN 30s BOUND
// AND RAISES NOTHING (kogaki#1271). A job can run to its 600s absolute limit,
// longer than one Bash tool call may last, so `job await` stops waiting after
// 30 seconds of its own, prints the still-running line the Brief skill reads
// as "run `job await` again", writes no gate declaration and exits 0. Driven
// through the same read-only CLI door as (h), against a hand-written job
// record that reads `running` for the whole wait.
{
  const dir = mkNewRun();
  const now = new Date().toISOString();
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600,
    supervisor_pid: null, state: "running",
    units: [{ id: "c1", status: "running", bytes: 10 }, { id: "c2", status: "done", bytes: 10 }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir };
  const t0 = Date.now();
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 60000, encoding: "utf8", env });
  const tookS = (Date.now() - t0) / 1000;
  if (awaitRun.status !== 0) {
    fails.push(`(v) \`job await\` over a running job did not exit 0 (status ${awaitRun.status}): stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  }
  if (tookS > 40) {
    fails.push(`(v) \`job await\` over a running job took ${tookS}s, past its own 30s bound`);
  }
  if (!(awaitRun.stdout || "").includes("reader-path job still running — call job await again")) {
    fails.push(`(v) \`job await\` over a running job did not print the still-running line: ${awaitRun.stdout}`);
  }
  const callPath = join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`);
  if (existsSync(callPath)) {
    fails.push(`(v) \`job await\` over a running job raised a question (a gate-call file exists at ${callPath})`);
  }
  const runRec = JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  if ((runRec.gate_declarations_owed || []).length) {
    fails.push(`(v) \`job await\` over a running job recorded an owed gate: ${JSON.stringify(runRec.gate_declarations_owed)}`);
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

// (m) REFUSED TWICE IS TERMINAL (kogaki#1203 acceptance 3; kogaki#1273's
// "a refused retry ends the unit `refused`"): a unit whose retry is refused
// the same way ends `refused` after two attempts -- the job `refused`, since
// it is the only unit -- with BOTH refusals recorded, the second in
// `failure.stderr_tail`, the first in `failure.first_refusal`, and the unit's
// stdout file named by `failure.file`.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c2", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "refused" || !rec.failure || rec.failure.unit !== "c2") {
    fails.push(`(m) a unit refused on both attempts did not end the job \`refused\` naming its unit: ${JSON.stringify(rec)}`);
  } else {
    if (!rec.failure.stderr_tail) fails.push("(m) the terminal refusal carries no stderr_tail");
    if (!rec.failure.first_refusal) fails.push(`(m) the terminal failure block carries no first_refusal: ${JSON.stringify(rec.failure)}`);
    const row = (rec.units || []).find((u) => u.id === "c2");
    if (!row || row.attempts !== 2) fails.push(`(m) the refused unit's row does not record exactly two attempts: ${JSON.stringify(row)}`);
    if (rec.failure.file !== readerPathUnitStdoutPath(dir, "c2")) {
      fails.push(`(m) the terminal failure block's file does not name the unit's stdout path: ${JSON.stringify(rec.failure)}`);
    } else if (!existsSync(rec.failure.file)) {
      fails.push(`(m) the failure block names a stdout file that does not exist: ${rec.failure.file}`);
    }
  }
}

// ---- kogaki#1273: THE BOUNDED RETRY, THE SYSTEM-FAILURE EXIT, ONE CANDIDATE,
// AND THE LIMIT THAT KEEPS FINISHED CANDIDATES.

// (v1) A refusal at 200s with a 200s attempt is retried (200 + 200 fits in
// 600), and the retry refused at 400s ends the unit -- attempt 2 never asks for
// a third. A refusal at 400s with a 400s attempt starts no retry and records
// `retry_skipped` with both numbers.
{
  const first = readerPathRetryDecision({ attempt: 1, elapsedS: 200, attemptS: 200, absoluteLimitS: 600 });
  if (first.retry !== true) fails.push(`(v1) a refusal at 200s after a 200s attempt was not retried: ${JSON.stringify(first)}`);
  const second = readerPathRetryDecision({ attempt: 2, elapsedS: 400, attemptS: 200, absoluteLimitS: 600 });
  if (second.retry !== false || second.retry_skipped) fails.push(`(v1) a refused retry at 400s was offered a third attempt or read as a skipped retry: ${JSON.stringify(second)}`);
  const late = readerPathRetryDecision({ attempt: 1, elapsedS: 400, attemptS: 400, absoluteLimitS: 600 });
  if (late.retry !== false || !late.retry_skipped || late.retry_skipped.reason !== "would pass the absolute limit"
    || late.retry_skipped.elapsed_s !== 400 || late.retry_skipped.attempt_s !== 400) {
    fails.push(`(v1) a refusal at 400s after a 400s attempt started a retry or did not record retry_skipped with both numbers: ${JSON.stringify(late)}`);
  }
}

// (v2) END TO END: a ~1.5s attempt refused against a 2s absolute limit cannot
// be retried in time, so the supervisor starts no second attempt -- the unit
// ends `refused` after one attempt and its row carries `retry_skipped`.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_SLOW" }], { absoluteLimitS: 2, stallS: 30, heartbeatMs: 100 });
  const rec = readRecord(dir);
  const row = rec && (rec.units || []).find((u) => u.id === "c1");
  if (!rec || rec.state !== "refused" || !row || row.status !== "refused" || row.attempts !== 1
    || !row.retry_skipped || row.retry_skipped.reason !== "would pass the absolute limit"
    || typeof row.retry_skipped.elapsed_s !== "number" || typeof row.retry_skipped.attempt_s !== "number") {
    fails.push(`(v2) a refused attempt whose retry could not finish before the limit was retried, or its row lacks retry_skipped: ${JSON.stringify(rec)}`);
  }
  const out = existsSync(readerPathUnitStdoutPath(dir, "c1")) ? readFileSync(readerPathUnitStdoutPath(dir, "c1"), "utf8") : "";
  if (out.includes("attempt 2")) fails.push("(v2) the unit's stdout file shows a second attempt that should never have started");
}

// (v3) END TO END: two units `done` and one refused twice end the job `done`,
// naming the refused unit; three refused end it `refused`, naming all three.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "OK" }, { id: "c3", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure || !Array.isArray(rec.refused_units)
    || rec.refused_units.length !== 1 || rec.refused_units[0].id !== "c3") {
    fails.push(`(v3) two done units and one refused did not end the job \`done\` naming the refused unit: ${JSON.stringify(rec)}`);
  }
  const dir2 = mkNewRun();
  superviseSync(dir2, [{ id: "c1", prompt: "FAIL_TWICE" }, { id: "c2", prompt: "FAIL_TWICE" }, { id: "c3", prompt: "FAIL_TWICE" }], {});
  const rec2 = readRecord(dir2);
  if (!rec2 || rec2.state !== "refused" || !rec2.failure || !Array.isArray(rec2.failure.refused_units)
    || rec2.failure.refused_units.length !== 3) {
    fails.push(`(v3) three refused units did not end the job \`refused\` naming all three: ${JSON.stringify(rec2)}`);
  }
}

// (v4) A DIED UNIT BESIDE RUNNING SIBLINGS KILLS THEM ON THE SAME TICK: the
// supervisor ends well inside its 100s limit (the old rule waited for the
// siblings, which never finish), the siblings' rows read `killed`, and `job
// await` exits non-zero with the defect line, writes no gate call, and marks
// the run ended.
{
  const dir = mkNewRun();
  const t0 = Date.now();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }, { id: "c2", prompt: "SLEEP_FOREVER" }, { id: "c3", prompt: "FAIL_EXIT" }],
    { absoluteLimitS: 100, stallS: 100, heartbeatMs: 100 });
  const tookMs = Date.now() - t0;
  const rec = readRecord(dir);
  const killed = rec ? (rec.units || []).filter((u) => u.status === "killed").map((u) => u.id).sort() : [];
  if (!rec || rec.state !== "died" || JSON.stringify(killed) !== JSON.stringify(["c1", "c2"])
    || !rec.failure || JSON.stringify((rec.failure.killed_units || []).slice().sort()) !== JSON.stringify(["c1", "c2"])) {
    fails.push(`(v4) a died unit did not end the job \`died\` with its running siblings killed and named: ${JSON.stringify(rec)}`);
  }
  if (tookMs > 8000) fails.push(`(v4) the supervisor took ${tookMs}ms to end after a unit died -- its siblings were not killed on the same tick`);
  if (!READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes("died")) fails.push("(v4) `died` is not declared a system-failure state");
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
  if (awaitRun.status === 0) fails.push(`(v4) \`job await\` over a died job exited 0: stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  if (!String(awaitRun.stderr || "").includes("This is a /brief defect, not a candidate refusal:")
    || !String(awaitRun.stderr || "").includes("The run is ended; nothing was retried.")) {
    fails.push(`(v4) \`job await\` over a died job did not print the defect line: stderr=${awaitRun.stderr}`);
  }
  if (existsSync(join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`))) {
    fails.push("(v4) `job await` over a died job raised a question (a gate-call file was written)");
  }
  const runRec = JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  if (runRec.done !== true || !runRec.brief_defect || (runRec.gate_declarations_owed || []).length) {
    fails.push(`(v4) the run record was not marked ended with the defect named, or owes a gate: ${JSON.stringify(runRec)}`);
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
    started_at: now, last_progress_at: now, updated_at: now, supervisor_pid: gone.pid, state: "running",
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

// (v5) ONE `done` CANDIDATE PASSES BOTH COUNT CHECKS: `assembleSelection`'s
// count refusal does not fire on one Candidate (four still refuses), and
// `compose_path`'s own count check in src/brief.mjs admits one -- that one is
// a closure inside the state's work function, so it is read from the source,
// on the ground this suite's note states for checks a fixture cannot reach.
{
  const one = {
    candidate_id: "c1", differentiation_unit: 1, reader_experience: "exp one", characteristic: "one",
    legs: [{ move: "move-a" }],
    review: { rationale_stands: "x", entailment: "x", prohibitions: "x", semantic_economy: "x", arc_integrity: "x", evaluation_levels: "x" },
    reasoning: { leg_validity: "x", thesis_closure: "x" },
  };
  const r1 = assembleSelection({ candidates: [one] }, "");
  if (r1.error && /Candidate\(s\) —/.test(r1.error)) fails.push(`(v5) assembleSelection refused one Candidate on the count: ${r1.error}`);
  const four = [1, 2, 3, 4].map((n) => ({ ...one, candidate_id: `c${n}`, reader_experience: `exp ${n}`, characteristic: `c${n}` }));
  const r4 = assembleSelection({ candidates: four }, "");
  if (!r4.error || !/4 Candidate\(s\) —/.test(r4.error)) fails.push(`(v5) assembleSelection did not refuse four Candidates on the count: ${JSON.stringify(r4)}`);
  const brief = readFileSync("src/brief.mjs", "utf8");
  if (!brief.includes("if (cands.length < 1 || cands.length > 3) {") || brief.includes("cands.length < 2")) {
    fails.push("(v5) src/brief.mjs's compose_path count check does not admit one Candidate");
  }
  if (brief.includes("default in disguise") || readFileSync("src/assemble.mjs", "utf8").includes("default in disguise")) {
    fails.push("(v5) a count refusal still says a single Candidate is a default in disguise");
  }
}

// (v6) THE LIMIT KEEPS FINISHED CANDIDATES: a job reaching its absolute limit
// with two units `done` and one running kills the running one, which ends
// `ceiling`, and the job ends `done`; with no unit `done` it ends `ceiling`.
// Asserted on the pure reduction, on `job await`'s own poll, and end to end.
{
  const at = readerPathJobAtLimit([{ id: "c1", status: "done" }, { id: "c2", status: "done" }, { id: "c3", status: "running" }]);
  if (at.state !== "done" || at.units[2].status !== "ceiling") fails.push(`(v6) two done units and one running at the limit did not reduce to \`done\` with the running one \`ceiling\`: ${JSON.stringify(at)}`);
  const none = readerPathJobAtLimit([{ id: "c1", status: "running" }, { id: "c2", status: "refused" }]);
  if (none.state !== "ceiling") fails.push(`(v6) a job at the limit with no unit done did not reduce to \`ceiling\`: ${JSON.stringify(none)}`);
  const job = { started_at: new Date(Date.now() - 601000).toISOString(), updated_at: new Date().toISOString(),
    units: [{ id: "c1", status: "done" }, { id: "c2", status: "done" }, { id: "c3", status: "running" }] };
  const step = readerPathAwaitStep(job, { stopRequested: false, elapsedS: 601, stalledS: 0 });
  if (step.state !== "done") fails.push(`(v6) \`job await\`'s poll past the limit did not keep the finished Candidates: ${JSON.stringify(step)}`);
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "OK" }, { id: "c3", prompt: "SLEEP_FOREVER" }],
    { absoluteLimitS: 1, stallS: 30, heartbeatMs: 250 });
  const rec = readRecord(dir);
  const c3 = rec && (rec.units || []).find((u) => u.id === "c3");
  if (!rec || rec.state !== "done" || rec.failure || !c3 || c3.status !== "ceiling"
    || JSON.stringify(rec.ceiling_units) !== JSON.stringify(["c3"])) {
    fails.push(`(v6) a job reaching its limit with two units done did not end \`done\` with the running unit \`ceiling\`: ${JSON.stringify(rec)}`);
  }
}

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
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "done",
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
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json") };
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
  const deferred = results.filter((r) => /already claimed/.test(r.stdout));
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
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "done",
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
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json") };
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

// (v7) NO `rerun` OPTION AND NO `job-rerun-unit` VERB REMAINS.
{
  const brief = readFileSync("src/brief.mjs", "utf8");
  const terrain = readFileSync("src/terrain.mjs", "utf8");
  if (/id:\s*"rerun"/.test(brief)) fails.push("(v7) src/brief.mjs still offers a `rerun` option");
  if (/capOption === "rerun"/.test(terrain)) fails.push("(v7) src/terrain.mjs still answers a `rerun` click");
  if (terrain.includes("job-rerun-unit") || terrain.includes("cmdJobRerunUnit") || terrain.includes("startReaderPathUnitRerun")) {
    fails.push("(v7) src/terrain.mjs still carries the `job-rerun-unit` verb or its starter");
  }
  const flowTable = JSON.parse(readFileSync("src/terrain-workflow.json", "utf8"));
  if ((flowTable.non_flow_entry_points || {})["job-rerun-unit"]) fails.push("(v7) src/terrain-workflow.json still accounts for a `job-rerun-unit` entry point");
  const registry = readFileSync("src/gate-registry.json", "utf8");
  if (registry.includes('{id:\\"rerun\\"')) fails.push("(v7) src/gate-registry.json still composes a `rerun` option for the reader-path gate");
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-reader-path-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-reader-path-job — the seven-state Detached Job classifies, retries a refusal once only when the retry fits the limit, ends the Brief on a system failure, keeps finished Candidates at the limit, supervises end to end against a fake judge, preserves failure on every non-`done` exit, leaks no internal vocabulary at the screen, and `job await` over a still-running job returns within its own 30s bound raising nothing");
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
