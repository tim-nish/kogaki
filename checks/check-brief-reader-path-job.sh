#!/usr/bin/env bash
# check-brief-reader-path-job — the Detached Job that replaced the reader-path
# step's synchronous, hook-bound judge call (kogaki#1193).
#
# WHAT THIS COVERS. `src/terrain.mjs`'s generic detached-job classification
# (each unit's, the job's reduction over them, the seven terminal states) as
# the real `job-supervise` child process records it, end to end,
# against a FAKE judge binary this member writes into a scratch tree — never
# the actual `claude` CLI, on the same seam-free convention the sibling
# `check-brief-compose.sh` states for its own fixtures. It also asserts the
# owner-facing screen leaks neither a state token nor a path (acceptance 8)
# and that `job await` over a still-running job returns within its own 30s
# bound and raises nothing (kogaki#1271). Section (x) drives the path-review
# job (kogaki#1301) through `job await` from a finished reader-path job to
# CANDIDATE_SELECTION.
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
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import {
  readerPathAwaitStep, READER_PATH_JOB_SYSTEM_FAILURE_STATES, startDetachedJobSupervisor,
} from "./src/workflow/detached-job.mjs";
import {
  READER_PATH_JOB_GATE_ID, emitGateDeclaration, GATE_CALL_SUFFIX,
} from "./src/workflow/gate.mjs";
import { judgePrompt, JUDGE_INPUT_MARKER } from "./src/workflow/judge.mjs";
import { findInternalVocabulary, assembleSelection } from "./src/assemble.mjs";

const fails = [];
const root = process.cwd();

// THE NO-TOOLS SENTENCE, READ OFF THE UNITS FILE THE STARTER WRITES (kogaki#1307):
// the runtime keeps the sentence unexported, so a check reads it where every
// job unit's prompt actually carries it -- the head of a unit prompt, ahead of
// the unit's own text -- from a started job whose supervisor is killed at once.
function noToolsSentenceAsWritten(units) {
  const d = mkdtempSync(join(tmpdir(), "kogaki-1307-units-"));
  const started = startDetachedJobSupervisor(d, {
    units, command: "/bin/false", model: "m", outputFormat: "json", absoluteLimitS: 5, stallS: 5, heartbeatMs: 100,
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit", inputs: {} },
  });
  try { process.kill(started.supervisorPid); } catch { /* already gone */ }
  return JSON.parse(readFileSync(started.unitsPath, "utf8")).units;
}
const JOB_UNIT_NO_TOOLS_SENTENCE = (() => {
  const p = noToolsSentenceAsWritten([{ id: "u", prompt: "UNIT" }])[0].prompt;
  return p.endsWith("\n\nUNIT") ? p.slice(0, -"\n\nUNIT".length) : "";
})();
if (!JOB_UNIT_NO_TOOLS_SENTENCE) fails.push("(y0) the starter's units file carries no sentence ahead of the unit's own prompt");

// (d) END TO END: a real `job-supervise` child process, against a FAKE judge
// binary whose behaviour is selected by the PROMPT it reads on stdin (never
// by an argv flag, since the supervisor hands every unit the same argv) --
// "OK\n" writes a valid stream-json transcript ending in a `type: "result"`
// line, "FAIL_EXIT\n" exits 3, "FAIL_JSON\n" writes unparseable stdout on
// every call -- MALFORMED OUTPUT, respawned with the same prompt until the
// limit (kogaki#1307) -- while "FAIL_TWICE"/"FAIL_ONCE"/"RECORD_ONCE"/
// "FAIL_SLOW" answer a well-formed record the pass-through validator refuses,
// a SCHEMA REFUSAL, re-asked once. Every prompt the supervisor sends begins
// with the no-tools sentence (kogaki#1307), which the judge strips before it
// reads the token,
// "SLEEP_FOREVER\n" never exits on its own, "SLOW\n" writes a `type: "system"`
// line every 300ms for 8 ticks (~2.4s) THEN its result line -- streamed,
// incremental output past the fixture's own stall bound (kogaki#1193 PR #1195
// review round 1, finding 1's own fixture: byte growth across several small
// writes, never one buffered write at exit).
const scratch = mkdtempSync(join(tmpdir(), "kogaki-rpjob-fakejudge-"));
const fakeJudge = join(scratch, "fake-judge.mjs");
writeFileSync(fakeJudge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
// A SCHEMA REFUSAL: a well-formed record the pass-through validator refuses.
const refusedRecord = (why) => JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "refused" }], refuse: why }) }) + "\\n";
// THE CALL COUNT PER TOKEN, kept in the file the fixture names, for a unit whose
// answer changes across respawns of the SAME prompt (kogaki#1307).
const nthCall = (token) => {
  const f = process.env.KOGAKI_FAKE_JUDGE_COUNTER;
  if (!f) return 1;
  const m = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
  m[token] = (m[token] || 0) + 1;
  writeFileSync(f, JSON.stringify(m));
  return m[token];
};
let chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  const sent = Buffer.concat(chunks).toString("utf8").trim();
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).trim() : sent;
  const retried = prompt.includes("YOUR PREVIOUS ANSWER WAS REFUSED");
  // EVERY PROMPT THE SUPERVISOR SENDS IS RECORDED when the fixture names a
  // file (kogaki#1257), so a retried unit's second prompt is read as sent.
  if (process.env.KOGAKI_FAKE_JUDGE_PROMPTS) appendFileSync(process.env.KOGAKI_FAKE_JUDGE_PROMPTS, JSON.stringify(sent) + "\\n");
  // kogaki#1307: malformed output once, then a well-formed record.
  if (prompt.startsWith("MALFORMED_ONCE")) {
    if (nthCall("MALFORMED_ONCE") === 1) { process.stdout.write("not json at all"); process.exit(0); }
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "after-malformed" }] }) }) + "\\n");
    process.exit(0);
  }
  // kogaki#1307: malformed output, then a schema refusal, then -- on the re-ask
  // -- a well-formed record.
  if (prompt.startsWith("MALFORMED_THEN_REFUSED")) {
    if (retried) { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "repaired" }] }) }) + "\\n"); process.exit(0); }
    if (nthCall("MALFORMED_THEN_REFUSED") === 1) { process.stdout.write("not json at all"); process.exit(0); }
    process.stdout.write(refusedRecord("the fixture's schema refusal after a malformed answer"));
    process.exit(0);
  }
  // "RECORD_ONCE" anywhere in the prompt refuses the first attempt and answers
  // the retry -- found by inclusion, because a real unit prompt carries the
  // token inside its input rather than at its head.
  if (prompt.includes("RECORD_ONCE")) {
    if (retried) {
      process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "recorded" }] }) }) + "\\n");
    } else {
      process.stdout.write(refusedRecord("the fixture's first refusal"));
    }
    process.exit(0);
  }
  if (prompt.startsWith("NO_LEGS_ONCE")) {
    if (nthCall("NO_LEGS_ONCE") === 1) { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ no_legs: true }) }) + "\\n"); process.exit(0); }
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "after-no-legs" }] }) }) + "\\n");
    process.exit(0);
  }
  if (prompt.startsWith("NO_LEGS")) {
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ no_legs: true }) }) + "\\n");
    process.exit(0);
  }
  // The bare Candidate at the record's root that \`reader_path_unit\` states (j).
  if (prompt.startsWith("BARE_CANDIDATE")) {
    process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({
      candidate_id: "c1", characteristic: "x", reader_experience: "y",
      legs: [{ id: "s1" }], reasoning: {}, coverage: {}, unused: {},
    }) }) + "\\n");
    process.exit(0);
  }
  if (prompt === "FAIL_EXIT") { process.stderr.write("fake judge refused on purpose\\n"); process.exit(3); }
  // startsWith, not ===: a retried unit's prompt is this token plus the
  // refusal block appended (kogaki#1203), so the SAME structural refusal
  // must keep firing across both attempts.
  if (prompt.startsWith("FAIL_JSON")) { process.stdout.write("not json at all"); process.exit(0); }
  if (prompt.startsWith("FAIL_TWICE")) { process.stdout.write(refusedRecord("the fixture refuses this record every time")); process.exit(0); }
  if (prompt.startsWith("FAIL_ONCE")) {
    if (retried) {
      process.stdout.write(JSON.stringify({ type: "system", subtype: "init" }) + "\\n");
      process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "retried-ok" }] }) }) + "\\n");
    } else {
      process.stdout.write(refusedRecord("the fixture's first refusal"));
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
  if (prompt.startsWith("FAIL_SLOW")) { setTimeout(() => { process.stdout.write(refusedRecord("the fixture's slow refusal")); process.exit(0); }, 1500); return; }
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
// It refuses one shape only -- a record carrying the fake judge's own `refuse`
// sentence -- so a SCHEMA REFUSAL is reachable without a Brief rule (kogaki#1307).
writeFileSync(passthroughValidatorModule, `export function passthrough(c) { return c && c.refuse ? { error: c.refuse } : null; }\n`);
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
  return spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8",
    env: { ...process.env, KOGAKI_FAKE_JUDGE_COUNTER: join(dir, "fake-judge-counter.json"), ...(opts.env || {}) } });
}

// EVERY TERMINAL STATE A FIXTURE'S JOB RECORD REACHES, gathered as the records
// are read, for section (a) at the end of the pass (kogaki#1257).
const terminalStatesSeen = new Set();
function readRecord(dir) {
  const p = join(dir, "reader-path-job.json");
  const rec = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  if (rec && typeof rec.state === "string" && rec.state !== "running") terminalStatesSeen.add(rec.state);
  return rec;
}

// The run record a Brief run directory holds, and a unit's own stdout file —
// the latter FOUND in the run directory rather than composed, since the row of
// a unit that finished names its Candidate file and not its stdout.
const runRecordPath = (dir) => join(dir, "run-record.json");
const unitRowOf = (rec, id) => (rec && (rec.units || []).find((u) => u.id === id)) || null;
function unitStdoutFile(dir, unitId) {
  const f = readdirSync(dir).find((n) => n.endsWith(".stdout") && n.includes(`-${unitId}.`));
  return f ? join(dir, f) : null;
}

// (b) STRUCTURAL UNIT CLASSIFICATION — a unit is classified from its exit code
// and stdout shape alone, never a Brief rule (kogaki#1193's own division of
// labour between the generic executor and the Brief-specific validators).
// Read off the unit ROWS of real `job-supervise` runs since kogaki#1257: the
// row is where the supervisor records each unit's classification.
{
  // (b2)-(b4) in one run: no unit dies, so no sibling is killed. An exit-0
  // non-JSON stdout and a record with no `legs` array are MALFORMED OUTPUT
  // since kogaki#1307: respawned with the same prompt, spending no attempt, so
  // a unit whose first answer was malformed and whose second was well-formed
  // ends `done` with the count on its row and the respawn marked in its stdout
  // file. Driven by answers that change across calls rather than by a short
  // limit, which a contended machine can reach mid-respawn.
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "bad", prompt: "MALFORMED_ONCE" }, { id: "nolegs", prompt: "NO_LEGS_ONCE" }, { id: "good", prompt: "OK" }], {});
  const rec = readRecord(dir);
  for (const [tag, id, cause] of [["b2", "bad", "not json at all"], ["b3", "nolegs", "no_legs"]]) {
    const row = unitRowOf(rec, id);
    const out = unitStdoutFile(dir, id) && existsSync(unitStdoutFile(dir, id)) ? readFileSync(unitStdoutFile(dir, id), "utf8") : "";
    if (!row || row.status !== "done" || row.malformed_output !== 1 || row.attempts !== 1
      || !out.includes(cause) || !out.includes("malformed output 1; respawned with the same prompt")) {
      fails.push(`(${tag}) a malformed first answer (${cause}) was not classified malformed output and respawned with no attempt spent: ${JSON.stringify(row)} stdout=${out.slice(0, 300)}`);
    }
  }
  const good = unitRowOf(rec, "good");
  if (!good || good.status !== "done" || !good.candidate || !Array.isArray(good.candidate.legs)) {
    fails.push(`(b4) a well-shaped exit-0 record did not classify as done: ${JSON.stringify(good)}`);
  }
  // (b1) a non-zero exit is `died`, carrying the unit's stderr.
  const dirDied = mkNewRun();
  superviseSync(dirDied, [{ id: "u", prompt: "FAIL_EXIT" }], {});
  const died = unitRowOf(readRecord(dirDied), "u");
  if (!died || died.status !== "died" || !died.failure || died.failure.exit_code !== 3
    || !String(died.failure.stderr_tail || "").includes("fake judge refused")) {
    fails.push(`(b1) a non-zero exit did not classify as died with its stderr: ${JSON.stringify(died)}`);
  }
  // (b5) kogaki#1197: a dead unit (non-zero exit) whose stdout still carries a
  // `stream-json` `{"type":"result","is_error":true,...}` line -- the shape
  // `--bare`'s "Not logged in" produced -- gets that line's `result` text
  // carried onto its failure record, not silently dropped for the empty
  // `stderr_tail` a dead-login unit actually writes.
  const dirLogin = mkNewRun();
  superviseSync(dirLogin, [{ id: "u", prompt: "FAIL_LOGIN" }], {});
  const notLoggedIn = unitRowOf(readRecord(dirLogin), "u");
  if (!notLoggedIn || notLoggedIn.status !== "died" || (notLoggedIn.failure || {}).result !== "Not logged in · Please run /login") {
    fails.push(`(b5) a dead unit's is_error result line was not carried onto its failure record: ${JSON.stringify(notLoggedIn)}`);
  }
  // (b6) kogaki#1240: the DECLARED validator downgrades an otherwise
  // structurally-`done` unit to `refused` when it returns an `error`, carrying
  // its text -- the `{ error }` shape `validateReaderPathUnit` returns -- and a
  // validator returning `null` leaves the same unit `done` (b4's
  // run, under the pass-through validator) -- the one seam the whole per-unit
  // classification rests on, driven here through the units file's own
  // `validator` declaration.
  const refusingModule = join(scratch, "refusing-validator.mjs");
  writeFileSync(refusingModule, `export function refuse() { return { error: "the declared validator's own refusal text" }; }\n`);
  const dirVal = mkNewRun();
  superviseSync(dirVal, { units: [{ id: "u", prompt: "OK" }], validator: { module: refusingModule, export: "refuse" } }, {});
  const refusedByValidator = unitRowOf(readRecord(dirVal), "u");
  if (!refusedByValidator || refusedByValidator.status !== "refused"
    || !String((refusedByValidator.failure || {}).stderr_tail || "").includes("the declared validator's own refusal text")) {
    fails.push(`(b6) a structurally-good unit was not downgraded to refused by a validator returning a truthy refusal: ${JSON.stringify(refusedByValidator)}`);
  }
  if (!good || good.status !== "done") {
    fails.push(`(b6) a structurally-good unit was downgraded even though its validator returned no refusal: ${JSON.stringify(good)}`);
  }
}

// (c) THE JOB-LEVEL REDUCTION (kogaki#1204, revised kogaki#1273), read off real
// job records since kogaki#1257. A REFUSED unit beside a still-running sibling
// does not end the job (d10), while a DIED unit does at once, killing its
// siblings (v4). Once no unit is running, one `done` unit makes the job `done`,
// and it is `refused` only when every unit was (v3). `stopRequested` dominates
// everything (d4), and the two time bounds read ceiling before stalled, both
// only while a unit IS still running (d5, d6). The two arms below are the ones
// no other fixture in this member reaches.
{
  // A died unit beside a refused one, nothing running: `died`.
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_EXIT" }, { id: "c2", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "died") fails.push(`(c) a died unit beside a refused one did not end the job \`died\`: ${JSON.stringify(rec)}`);
  // The stop flag over a unit that dies: `stopped` -- the owner's stop is
  // answered whatever a unit is doing.
  const dirStop = mkNewRun();
  writeFileSync(join(dirStop, "reader-path-job.stop"), "now\n");
  superviseSync(dirStop, [{ id: "c1", prompt: "FAIL_EXIT" }], { heartbeatMs: 100 });
  const recStop = readRecord(dirStop);
  if (!recStop || recStop.state !== "stopped") fails.push(`(c) a pre-set stop flag over a dying unit did not end the job \`stopped\`: ${JSON.stringify(recStop)}`);
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
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_TWICE" }], {});
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
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }],
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
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
let chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  const sent = Buffer.concat(chunks).toString("utf8").trim();
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).trim() : sent;
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
// `job await` over a `refused` PATH-REVIEW job (every unit refused, kogaki#1273
// -- a `died` job raises no question any more, and since kogaki#1307 neither
// does a refused COMPOSE job, which ends the Brief as "no Candidate fits") is
// run end to end through the CLI --
// `run --status` is the one Bash-reachable verb this runtime admits, and it is
// read-only -- against a hand-written run record standing in for the hook
// loop's own write, on the same ground section (e) states for a bare
// `emitGateDeclaration` call: the executor is invoked by hooks only, so a
// fixture drives it through its one admitted, read-only door rather than
// forging a hook payload for a write it is not this check's job to attempt.
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
    absolute_limit_s: 600, state: "done", units: [],
  }, null, 2) + "\n");
  const declPath = emitGateDeclaration(dir, "brief-candidate-selection",
    [{ id: "c1", label: "Candidate 1", description: "The first composed Reader Path." },
      { id: "c2", label: "Candidate 2", description: "The second composed Reader Path." }], {});
  const callPath = join(dir, `brief-candidate-selection${GATE_CALL_SUFFIX}`);
  const wantBytes = JSON.parse(readFileSync(callPath, "utf8"));
  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const pointerPath = join(process.env.KOGAKI_OPEN_GATES, `${declaration.gate_instance_id}.json`);
  // ABANDONMENT, SIMULATED (the shape section (i) drives through the Stop
  // hook itself): the pointer this raising wrote is removed, standing in for
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
    // THE PARSER IS THE SUPERVISOR'S OWN (kogaki#1257): a unit whose judge
    // answers with that bare Candidate must classify `done` on a real
    // `job-supervise` run, its Candidate carried onto the unit row.
    const dir = mkNewRun();
    superviseSync(dir, [{ id: "c1", prompt: "BARE_CANDIDATE" }], {});
    const row = unitRowOf(readRecord(dir), "c1");
    if (!row || row.status !== "done" || !row.candidate || !Array.isArray(row.candidate.legs)) {
      fails.push(`(j) an answer of the shape reader_path_unit.input_shape states was refused by the unit parser: ${JSON.stringify(row)}`);
    }
    if (!prompt.includes(unitRow.judgment_point)) {
      fails.push("(j) judgePrompt(unitRow, ...) did not render the unit row's own judgment_point");
    }
  }
}

// (k) THE RETRY PROMPT CARRIES THE FIRST REFUSAL VERBATIM (kogaki#1203
// acceptance 4b / acceptance 3): the second attempt is the first prompt plus
// the same refusal-repair block `judgePrompt` appends for the synchronous
// judge, marker included. READ AS SENT since kogaki#1257: the fake judge
// records every prompt it receives, and a "RECORD_ONCE" unit is refused once
// and answered on its retry, so the second recorded prompt is the retry the
// supervisor composed, and the unit row's `first_refusal` is what it carried.
{
  const RETRY_MARKER = "YOUR PREVIOUS ANSWER WAS REFUSED";
  const retriedOnce = (prompt) => {
    const dir = mkNewRun();
    const promptsFile = join(dir, "prompts.jsonl");
    superviseSync(dir, [{ id: "c1", prompt }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
    const sent = existsSync(promptsFile)
      ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const row = unitRowOf(readRecord(dir), "c1");
    return { sent, refusal: row && row.first_refusal, row };
  };
  const firstPrompt = "RECORD_ONCE -- THE FIRST PROMPT, UNCHANGED BELOW THIS LINE";
  // EVERY PROMPT SENT BEGINS WITH THE NO-TOOLS SENTENCE (kogaki#1307), so the
  // first prompt as sent is that sentence and then the unit's own prompt.
  const NT = (p) => `${JOB_UNIT_NO_TOOLS_SENTENCE}\n\n${p}`;
  const synthetic = retriedOnce(firstPrompt);
  const retryPrompt = synthetic.sent[1] || "";
  if (synthetic.sent.length !== 2 || !synthetic.refusal) {
    fails.push(`(k) a unit refused once was not asked exactly twice with its first refusal recorded: ${JSON.stringify(synthetic)}`);
  }
  if (!retryPrompt.startsWith(NT(firstPrompt))) {
    fails.push("(k) the retried unit prompt does not begin with the first prompt, unchanged");
  }
  if (!retryPrompt.includes(RETRY_MARKER)) {
    fails.push("(k) the retried unit prompt carries no refusal marker");
  }
  if (!synthetic.refusal || !retryPrompt.includes(synthetic.refusal)) {
    fails.push("(k) the retried unit prompt does not carry the refusal verbatim");
  }
  // THE BLOCK SITS BEFORE THE INPUT MARKER (PR #1207 review round 1): over a
  // real unit prompt, the retry prompt is byte-identical to `judgePrompt`'s
  // own re-ask of the same row and input -- a block spliced past the marker
  // would be read as input, the #1203 defect in its second-attempt form.
  const unitRow = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_unit;
  if (unitRow) {
    const input = { state: "compose_path", unit_number: 1, fixture: "RECORD_ONCE" };
    const inputText = JSON.stringify(input, null, 2);
    const realFirst = judgePrompt(unitRow, inputText, input, null);
    const real = retriedOnce(realFirst);
    const realRetry = real.sent[1] || "";
    if (real.sent[0] !== NT(realFirst).trim() || !real.refusal
      || realRetry !== NT(judgePrompt(unitRow, inputText, input, real.refusal)).trim()) {
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
  const stdoutPath = unitStdoutFile(dir, "c2");
  if (!stdoutPath || !existsSync(stdoutPath)) {
    fails.push(`(l) no stdout file on disk for the retried unit in ${dir}`);
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
    const mRow = (rec.units || []).find((u) => u.id === "c2");
    if (!mRow || !mRow.failure || mRow.failure.class !== "schema refusal") fails.push(`(m) the refused unit's failure is not classed a schema refusal (kogaki#1307): ${JSON.stringify(mRow)}`);
    if (!rec.failure.first_refusal) fails.push(`(m) the terminal failure block carries no first_refusal: ${JSON.stringify(rec.failure)}`);
    const row = (rec.units || []).find((u) => u.id === "c2");
    if (!row || row.attempts !== 2) fails.push(`(m) the refused unit's row does not record exactly two attempts: ${JSON.stringify(row)}`);
    if (!rec.failure.file || rec.failure.file !== unitStdoutFile(dir, "c2")) {
      fails.push(`(m) the terminal failure block's file does not name the unit's stdout path: ${JSON.stringify(rec.failure)}`);
    } else if (!existsSync(rec.failure.file)) {
      fails.push(`(m) the failure block names a stdout file that does not exist: ${rec.failure.file}`);
    }
  }
}

// ---- kogaki#1273: THE BOUNDED RETRY, THE SYSTEM-FAILURE EXIT, ONE CANDIDATE,
// AND THE LIMIT THAT KEEPS FINISHED CANDIDATES.

// (v1) A refused attempt whose retry fits inside the absolute limit is
// retried, and the retry refused ends the unit -- attempt 2 never asks for a
// third and records no skipped retry. END TO END since kogaki#1257, scaled
// from the 200s/600s arithmetic to a ~1.5s attempt under a 6s limit
// (1.5 + 1.5 fits in 6); the attempt that does NOT fit, and its
// `retry_skipped` with both numbers, is (v2)'s.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_SLOW" }], { absoluteLimitS: 6, stallS: 30, heartbeatMs: 100 });
  const rec = readRecord(dir);
  const row = unitRowOf(rec, "c1");
  if (!rec || rec.state !== "refused" || !row || row.status !== "refused" || row.attempts !== 2 || row.retry_skipped) {
    fails.push(`(v1) a refused attempt whose retry fit the limit was not retried once and ended, or was read as a skipped retry: ${JSON.stringify(rec)}`);
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
    || typeof row.retry_skipped.elapsed_s !== "number" || typeof row.retry_skipped.attempt_s !== "number"
    // BOTH NUMBERS ARE THE ARITHMETIC THAT REFUSED (v1's late arm before
    // kogaki#1257): the elapsed time plus one more attempt passes the limit.
    || row.retry_skipped.elapsed_s + row.retry_skipped.attempt_s <= 2) {
    fails.push(`(v2) a refused attempt whose retry could not finish before the limit was retried, or its row lacks retry_skipped: ${JSON.stringify(rec)}`);
  }
  const stdoutC1 = unitStdoutFile(dir, "c1");
  const out = stdoutC1 ? readFileSync(stdoutC1, "utf8") : "";
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
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: gone.pid, state: "running",
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
// Asserted on `job await`'s own poll, and end to end (the pure reduction's
// arms were rebound to the supervisor at kogaki#1257).
{
  // THE REDUCTION WITH NO UNIT DONE, end to end (kogaki#1257): a running
  // unit beside a refused one at the limit ends the job `ceiling`. The arm
  // with two units done is the end-to-end case at the foot of this section.
  const dirNone = mkNewRun();
  superviseSync(dirNone, [{ id: "c1", prompt: "SLEEP_FOREVER" }, { id: "c2", prompt: "FAIL_TWICE" }],
    { absoluteLimitS: 1, stallS: 30, heartbeatMs: 250 });
  const none = readRecord(dirNone);
  if (!none || none.state !== "ceiling") fails.push(`(v6) a job at the limit with no unit done did not reduce to \`ceiling\`: ${JSON.stringify(none)}`);
  const job = { started_at: new Date(Date.now() - 601000).toISOString(), updated_at: new Date().toISOString(),
    absolute_limit_s: 600, units: [{ id: "c1", status: "done" }, { id: "c2", status: "done" }, { id: "c3", status: "running" }] };
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
      started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "done",
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
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "refused",
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

// (x) kogaki#1301: PATH REVIEW IS A DETACHED JOB, ONE UNIT PER CANDIDATE.
// A Brief run directory standing just past `differentiation`, with a `done`
// reader-path job of three Candidates beside it, is driven by `job await`
// alone -- the verb the session types -- against a fake judge that answers
// every path-review unit (refusing every attempt for `c2`), and logs each call
// it receives -- with no synchronous judge call left to answer at all, since
// Move fit moved inside the compose job (kogaki#1307).
// (x1) each unit's prompt holds exactly one Candidate; (x3) the refused unit
// leaves the other two at CANDIDATE_SELECTION with `c2` named above the
// question; (x4) the run reaches CANDIDATE_SELECTION and no synchronous judge
// call was made at all -- with the `review_path` detector shown to fire on the head a
// synchronous `review_path` call would carry, since a catcher that never
// fires reads exactly like one that passed. (x2) three `done` units assemble
// to the record keyed by `candidate_id`, read off a `done` job record.
{
  const { composeBrief } = await import("./src/brief.mjs");
  const base = mkdtempSync(join(tmpdir(), "kogaki-1301-"));
  const moves = join(base, "moves");
  mkdirSync(moves);
  for (const id of ["m_open", "m_turn"]) {
    writeFileSync(join(moves, `${id}.md`), [
      `id: ${id}`, "technique: >-", `  the technique of ${id}.`, "before: >-", `  knowledge: before ${id}.`,
      "after: >-", `  knowledge: after ${id}.`, "question: >-", "  holds: none", "breaks: >-", `  breaks if ${id} is skipped.`, "",
    ].join("\n"));
  }
  const START = "knowledge: before\nquestion: holds: none";
  const leg = (legId, extra) => ({
    leg_id: legId, move: "m_open", materials: ["L1"], purpose: `what ${legId} is for`,
    reader_state_before: START, reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }],
    ...extra,
  });
  const cand = (id) => ({
    candidate_id: id, characteristic: `path ${id}`, reader_experience: `experience ${id}`,
    reasoning: { leg_validity: "x", thesis_closure: "x" },
    legs: [leg("s1", { opens_section: "Intro" }), leg("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true })],
  });
  const entryFor = (c) => ({ rationale_stands: "r", entailment: "e", prohibitions: "p", semantic_economy: "s",
    arc_integrity: "a", evaluation_levels: "v", claim_register: c.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) });
  const judge = join(base, "judge.mjs");
  const calls = join(base, "calls.jsonl");
  writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const argv = process.argv.slice(2);
if (argv.includes("--version")) { process.stdout.write("fixture judge\\n"); process.exit(0); }
const format = argv[argv.indexOf("--output-format") + 1];
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const sent = Buffer.concat(c).toString("utf8");
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).replace(/^\\s+/, "") : sent;
  const head = prompt.split("\\n")[0];
  appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ format, head }) + "\\n");
  const input = JSON.parse(prompt.slice(prompt.indexOf(${JSON.stringify(JUDGE_INPUT_MARKER)}) + ${JUDGE_INPUT_MARKER.length}));
  let record;
  if (head.includes("\`review_path_unit\`")) {
    const x = input.candidate_you_must_review;
    // A SCHEMA REFUSAL every time (kogaki#1307): a record missing an area, which the
    // declared validator refuses -- unparseable stdout would be malformed output,
    // respawned until the job limit.
    if (x.candidate_id === "c2") {
      record = { rationale_stands: "r", claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) };
      process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
      process.exit(0);
    }
    record = { rationale_stands: "r", entailment: "e", prohibitions: "p", semantic_economy: "s", arc_integrity: "a", evaluation_levels: "v",
      claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) };
  } else { process.stderr.write("unexpected prompt: " + head + "\\n"); process.exit(5); }
  process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
});
`);
  chmodSync(judge, 0o755);
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  // A run directory standing past `differentiation`, its Brief minted with one Strand.
  const mkRun = (name, extra = {}) => {
    const dir = join(base, name);
    mkdirSync(dir);
    const briefPath = join(dir, "brief.md");
    writeFileSync(briefPath, composeBrief({ slug: "fixture", strands: [{ display_id: "L1", slug: "fixture-strand", cite: "fixture" }],
      thesis: "The fixture claim.", composePath: "readers/dev-to-zenn.md" }));
    const diffPath = join(dir, "differentiation.json");
    writeFileSync(diffPath, JSON.stringify({ reader_start: START, leg1_survivors: ["m_open"],
      entries: [1, 2, 3].map((n) => ({ unit_number: n, dimension: ["knowledge", "question", "trust"][n - 1], opening_move: "m_open", reader_experience: `exp ${n}` })) }));
    writeFileSync(runRecordPath(dir), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation"], waits_reached: [],
      conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {},
      artifacts_written: [{ state: "mint", path: briefPath }], judgments: {}, gate_declarations_owed: [],
      brief_differentiation: diffPath, done: false, ...extra,
    }, null, 2) + "\n");
    return dir;
  };
  const env = (dir) => ({ ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"),
    KOGAKI_JUDGE_CLI: judge });
  const awaitIn = (dir) => spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await", "--moves-dir", moves],
    { cwd: root, timeout: 60000, encoding: "utf8", env: env(dir) });
  const recOf = (dir) => JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  const now = new Date().toISOString();

  const dir = mkRun("live");
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "done",
    units: ["c1", "c2", "c3"].map((id, i) => ({ id: `candidate-${i + 1}`, status: "done", bytes: 50, candidate: cand(id) })),
  }, null, 2) + "\n");
  const outputs = [awaitIn(dir)];
  for (let i = 0; i < 6 && recOf(dir).awaiting !== "CANDIDATE_SELECTION" && !recOf(dir).done; i++) outputs.push(awaitIn(dir));
  const rec = recOf(dir);
  const seen = JSON.stringify(outputs.map((o) => ({ status: o.status, stdout: (o.stdout || "").slice(-400), stderr: (o.stderr || "").slice(-400) })));
  if (!/Executor STOPPED at review_path/.test(outputs[0].stdout || "")) fails.push(`(x4) the resumed reader-path job did not stop at review_path's own job start: ${seen}`);
  if (rec.awaiting !== "CANDIDATE_SELECTION") fails.push(`(x4) the run did not reach CANDIDATE_SELECTION with the review done by the job: awaiting=${rec.awaiting} ${seen}`);

  // (x1) one Candidate per unit prompt, as the supervisor was handed them.
  const unitsFile = join(dir, "review-path", "reader-path-job-units.json");
  const declared = existsSync(unitsFile) ? JSON.parse(readFileSync(unitsFile, "utf8")) : { units: [] };
  const map = rec.brief_review_units || {};
  if (declared.units.length !== 3) fails.push(`(x1) the path-review job declared ${declared.units.length} unit(s), want one per Candidate (3)`);
  for (const u of declared.units) {
    const input = JSON.parse(u.prompt.slice(u.prompt.indexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
    const own = input.candidate_you_must_review && input.candidate_you_must_review.candidate_id;
    const others = ["c1", "c2", "c3"].filter((id) => id !== own && u.prompt.includes(`"candidate_id": "${id}"`));
    if (!own || own !== map[u.id] || others.length) fails.push(`(x1) unit ${u.id}'s prompt does not hold exactly its one Candidate (${map[u.id]}): holds ${own}, also names ${JSON.stringify(others)}`);
  }
  if (declared.record_array !== "claim_register" || !declared.validator || declared.validator.export !== "validateReviewPathUnit") {
    fails.push(`(x1) the path-review units file does not declare its record array and validator: ${JSON.stringify({ record_array: declared.record_array, validator: declared.validator && declared.validator.export })}`);
  }

  // (x3) the refused unit's Candidate is left out, and named above the question.
  const declPath = join(dir, "brief-candidate-selection.run-declaration.json");
  const decl = existsSync(declPath) ? JSON.parse(readFileSync(declPath, "utf8")) : {};
  if (JSON.stringify(decl.run_composed_option_ids) !== JSON.stringify(["c1", "c3"])) fails.push(`(x3) CANDIDATE_SELECTION offers ${JSON.stringify(decl.run_composed_option_ids)}, want ["c1","c3"] with the refused c2 left out`);
  if (!String(decl.excluded_candidates || "").includes("path c2") || /path c1|path c3/.test(String(decl.excluded_candidates || ""))) {
    fails.push(`(x3) the line above the Candidate question does not name the refused Candidate alone: ${JSON.stringify(decl.excluded_candidates)}`);
  }
  if (findInternalVocabulary(String(decl.excluded_candidates || ""))) fails.push(`(x3) the line above the Candidate question leaks internal vocabulary: ${decl.excluded_candidates}`);

  // (x4) no synchronous `review_path` call in any advance, and the detector fires.
  const isSyncReviewPath = (call) => call.format !== "stream-json" && call.head.includes("`review_path`");
  const logged = existsSync(calls) ? readFileSync(calls, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (logged.some(isSyncReviewPath)) fails.push(`(x4) a synchronous review_path judge call was made: ${JSON.stringify(logged)}`);
  if (logged.filter((c) => c.format === "stream-json" && c.head.includes("`review_path_unit`")).length < 3) fails.push(`(x4) fewer than three path-review units reached the judge: ${JSON.stringify(logged)}`);
  if (logged.some((c) => c.format !== "stream-json")) fails.push(`(x4) a synchronous judge call was made, though no judgment state follows the path-review job since kogaki#1307: ${JSON.stringify(logged)}`);
  const reviewRow = briefTable.states.find((s) => s.id === "review_path");
  const syncHead = judgePrompt(reviewRow, "{}", {}, null).split("\n")[0];
  if (!isSyncReviewPath({ format: briefTable.judge.output_format, head: syncHead })) fails.push(`(x4) the detector does not fire on the head a synchronous review_path call carries: ${syncHead}`);

  // (x2) three `done` units assemble to the record keyed by candidate_id.
  const cands = ["c1", "c2", "c3"].map(cand);
  const dir2 = mkRun("assembled", {
    completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation", "compose_path"], awaiting: "review_path",
    brief_review_units: { "review-1": "c1", "review-2": "c2", "review-3": "c3" }, detached_job_dirs: { review_path: "review-path" },
  });
  const candsPath = join(dir2, "brief-candidates.json");
  writeFileSync(candsPath, JSON.stringify(cands.map((c) => ({ ...c, reader_start: START, differentiation_unit: Number(c.candidate_id.slice(1)) })), null, 2));
  const rec2 = recOf(dir2);
  writeFileSync(runRecordPath(dir2), JSON.stringify({ ...rec2, brief_candidates: candsPath }, null, 2) + "\n");
  mkdirSync(join(dir2, "review-path"));
  writeFileSync(join(dir2, "review-path", "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, absolute_limit_s: 600, supervisor_pid: null, state: "done",
    units: cands.map((c, i) => ({ id: `review-${i + 1}`, status: "done", bytes: 50, candidate: entryFor(c) })),
  }, null, 2) + "\n");
  const r2 = awaitIn(dir2);
  const after = recOf(dir2);
  const review = after.brief_review && existsSync(after.brief_review) ? JSON.parse(readFileSync(after.brief_review, "utf8")) : null;
  if (!review || JSON.stringify(Object.keys(review).sort()) !== JSON.stringify(["c1", "c2", "c3"])
    || JSON.stringify(review.c2) !== JSON.stringify(entryFor(cands[1]))) {
    fails.push(`(x2) three done units did not assemble to the record keyed by candidate_id: ${JSON.stringify(review)} stdout=${(r2.stdout || "").slice(-400)} stderr=${(r2.stderr || "").slice(-400)}`);
  }
  if (after.awaiting !== "CANDIDATE_SELECTION" || (after.brief_review_unfinished || []).length) fails.push(`(x2) three reviewed Candidates did not reach CANDIDATE_SELECTION with none left out: awaiting=${after.awaiting} unfinished=${JSON.stringify(after.brief_review_unfinished)}`);

  // (x5) the table: `review_path` carries a `job` block on the reader-path
  // job's own stall and heartbeat, its limit NAMES the review setting
  // (kogaki#1307), its unit row exists, and the judge note states that no
  // synchronous judgment follows the jobs.
  const job = reviewRow.job || {};
  const composeJob = (briefTable.states.find((s) => s.id === "compose_path") || {}).job || {};
  for (const k of ["stall_s", "heartbeat_ms"]) {
    if (job[k] === undefined || job[k] !== composeJob[k]) fails.push(`(x5) review_path's job block does not declare ${k} as the bound the supervisor enforces (${job[k]} vs ${composeJob[k]})`);
  }
  if (!job.absolute_limit_s || job.absolute_limit_s.setting !== "brief.review_job_limit_s") fails.push(`(x5) review_path's job limit does not name the setting brief.review_job_limit_s: ${JSON.stringify(job.absolute_limit_s)}`);
  if (!briefTable.review_path_unit || !/ONE CANDIDATE|ONE composed Candidate/.test(briefTable.review_path_unit.judgment_point || "")) fails.push("(x5) src/brief-workflow.json declares no review_path_unit row for one Candidate");
  if (!/no synchronous judgment state follows the jobs/.test(briefTable.judge.note || "")) fails.push("(x5) the judge note does not state that no synchronous judgment follows the jobs");
}

// ---- kogaki#1307: THE TWO FAILURE CLASSES, THE LIMIT FROM THE SETTINGS FILE,
// AND THE MOVE FIT JUDGED INSIDE EACH COMPOSE JOB UNIT.

// (y1) MALFORMED OUTPUT SPENDS NO ATTEMPT: a unit whose first answer is not
// JSON is respawned with the SAME prompt and finishes `done` with
// `malformed_output: 1` and `attempts: 1`; and a unit whose malformed answer is
// followed by a schema refusal is still re-asked once, finishing `done` with
// `attempts: 2` and the refusal on its row.
{
  const dir = mkNewRun();
  const promptsFile = join(dir, "prompts.jsonl");
  superviseSync(dir, [{ id: "c1", prompt: "MALFORMED_ONCE" }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
  const row = unitRowOf(readRecord(dir), "c1");
  if (!row || row.status !== "done" || row.malformed_output !== 1 || row.attempts !== 1 || row.first_refusal) {
    fails.push(`(y1) a malformed first answer did not end the unit \`done\` with malformed_output: 1 and attempts: 1: ${JSON.stringify(row)}`);
  }
  const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (sent.length !== 2 || sent[0] !== sent[1]) fails.push(`(y1) the malformed unit was not respawned with the same prompt: ${JSON.stringify(sent)}`);
  const dir2 = mkNewRun();
  superviseSync(dir2, [{ id: "c1", prompt: "MALFORMED_THEN_REFUSED" }], {});
  const row2 = unitRowOf(readRecord(dir2), "c1");
  if (!row2 || row2.status !== "done" || row2.malformed_output !== 1 || row2.attempts !== 2
    || !String(row2.first_refusal || "").includes("the fixture's schema refusal after a malformed answer")) {
    fails.push(`(y1) a schema refusal after a malformed answer was not re-asked once: ${JSON.stringify(row2)}`);
  }
}

// (y2) A SCHEMA REFUSAL IS RE-ASKED ONCE, THEN THE UNIT IS `refused`: two
// prompts are sent, the second carrying the first refusal, and the row reads
// `refused` with class `schema refusal` after two attempts.
{
  const dir = mkNewRun();
  const promptsFile = join(dir, "prompts.jsonl");
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_TWICE" }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
  const row = unitRowOf(readRecord(dir), "c1");
  const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (!row || row.status !== "refused" || row.attempts !== 2 || (row.failure || {}).class !== "schema refusal" || row.malformed_output) {
    fails.push(`(y2) a unit refused twice did not end \`refused\` as a schema refusal after two attempts: ${JSON.stringify(row)}`);
  }
  if (sent.length !== 2 || !sent[1].includes("the fixture refuses this record every time")) {
    fails.push(`(y2) the schema refusal was not re-asked exactly once with its refusal text: ${JSON.stringify(sent)}`);
  }
}

// (y3) THE LIMIT IS READ FROM kogaki.settings.json AND A MISSING KEY IS REFUSED
// BY NAME. The table names the setting, the repository's file holds it, and
// `settingValue` reads it -- from a fixture file through `KOGAKI_SETTINGS` --
// and refuses a file without the key, and a missing file, naming the key.
{
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const composeJob = (table.states.find((x) => x.id === "compose_path") || {}).job || {};
  if (!composeJob.absolute_limit_s || composeJob.absolute_limit_s.setting !== "brief.compose_job_limit_s") {
    fails.push(`(y3) compose_path's job limit does not name the setting brief.compose_job_limit_s: ${JSON.stringify(composeJob.absolute_limit_s)}`);
  }
  const settings = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
  if (settings.brief.compose_job_limit_s !== 1200 || settings.brief.review_job_limit_s !== 600 || settings.brief.compose_units !== 3) {
    fails.push(`(y3) kogaki.settings.json does not hold the owner's values: ${JSON.stringify(settings.brief)}`);
  }
  const sdir = mkNewScratch();
  const readKey = (file, key) => spawnSync(process.execPath, ["--input-type=module", "-e",
    `import { settingValue } from "./src/workflow/judge.mjs"; console.log(JSON.stringify(settingValue({ setting: ${JSON.stringify(key)} })));`],
    { cwd: root, timeout: 15000, encoding: "utf8", env: { ...process.env, KOGAKI_SETTINGS: file } });
  const fixture = join(sdir, "settings.json");
  writeFileSync(fixture, JSON.stringify({ brief: { compose_job_limit_s: 7 } }));
  const got = readKey(fixture, "brief.compose_job_limit_s");
  if (got.status !== 0 || got.stdout.trim() !== "7") fails.push(`(y3) the compose job limit was not read from the settings file: ${got.stdout} ${got.stderr}`);
  const missing = readKey(fixture, "brief.review_job_limit_s");
  if (missing.status === 0 || !String(missing.stderr).includes("brief.review_job_limit_s")) {
    fails.push(`(y3) a missing key was not refused by name: status=${missing.status} stderr=${missing.stderr}`);
  }
  const noFile = readKey(join(sdir, "absent.json"), "brief.compose_job_limit_s");
  if (noFile.status === 0 || !String(noFile.stderr).includes("brief.compose_job_limit_s")) {
    fails.push(`(y3) a missing settings file was not refused naming the key: status=${noFile.status} stderr=${noFile.stderr}`);
  }
  // The supervisor takes no limit of its own: a units run with no
  // `--absolute-limit-s` is refused rather than defaulted.
  const unitsPath = join(sdir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits([{ id: "c1", prompt: "OK" }])));
  const noLimit = spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", sdir, "--units", unitsPath,
    "--command", fakeJudge, "--model", "m", "--output-format", "json", "--stall-s", "100", "--heartbeat-ms", "250"],
    { cwd: root, timeout: 15000, encoding: "utf8" });
  const noLimitRec = readRecord(sdir);
  if (noLimitRec && noLimitRec.state === "done") fails.push(`(y3) the supervisor ran a job with no --absolute-limit-s: ${JSON.stringify(noLimitRec)} ${noLimit.stderr}`);
}

// (y4) THE MOVE FIT IS JUDGED INSIDE THE UNIT: a fit judge declared in the units
// file -- the real `readerPathFitPrompt`/`readerPathFitVerdict` of src/brief.mjs
// over a real Move library, beside the real `validateReaderPathUnit` -- answers
// `contradicts` on the first Candidate, which re-asks the compose call with the
// judge's sentence verbatim; the second Candidate is judged `consistent`, and
// that record is written beside the unit's Candidate.
{
  const base = mkNewScratch();
  const moves = join(base, "moves");
  mkdirSync(moves);
  writeFileSync(join(moves, "m1.md"), ["id: m1", "technique: >-", "  states the claim, then names the case it leaves out.",
    "before: >-", "  knowledge: before.", "after: >-", "  knowledge: after.", "question: >-", "  holds: none",
    "breaks: >-", "  breaks if the left-out case is never named.", ""].join("\n"));
  const START = "knowledge: before\nquestion: holds: none";
  const legOf = (legId, extra) => ({
    leg_id: legId, move: "m1", materials: ["L1"], purpose: `what ${legId} is for`,
    reader_state_before: START, reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }], ...extra,
  });
  const candidate = {
    candidate_id: "c1", characteristic: "x", reader_experience: "y", reader_start: START,
    reasoning: { leg_validity: "x", thesis_closure: "x" },
    legs: [legOf("s1", { opens_section: "Intro" }), legOf("s2", { depends_on: ["s1"], reaches_target: true })],
  };
  const SENTENCE = "the Leg names no case left out, which the technique requires of it.";
  const counter = join(base, "fit-counter.json");
  const prompts = join(base, "prompts.jsonl");
  const judgeFile = join(base, "fit-fake-judge.mjs");
  writeFileSync(judgeFile, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(${JSON.stringify(prompts)}, JSON.stringify(prompt) + "\\n");
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (!prompt.includes("FIT_JUDGE_HEAD")) out(${JSON.stringify(candidate)});
  const n = (existsSync(${JSON.stringify(counter)}) ? Number(readFileSync(${JSON.stringify(counter)}, "utf8")) : 0) + 1;
  writeFileSync(${JSON.stringify(counter)}, String(n));
  const verdicts = ["s1", "s2"].map((leg) => ({ leg_id: leg, move: "m1",
    verdict: n === 1 && leg === "s2" ? "contradicts" : "consistent",
    why: n === 1 && leg === "s2" ? ${JSON.stringify(SENTENCE)} : "both reader states specialize the Move's before and after." }));
  out({ version: "1", candidate_id: "c1", verdicts });
});
`);
  chmodSync(judgeFile, 0o755);
  const unitsPath = join(base, "units.json");
  writeFileSync(unitsPath, JSON.stringify({
    units: [{ id: "c1", prompt: "COMPOSE ONE CANDIDATE" }],
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit", inputs: { strandIds: ["L1"], movesDir: moves, readerStart: START } },
    fit_judge: { module: "src/brief.mjs", prompt_export: "readerPathFitPrompt", verdict_export: "readerPathFitVerdict",
      inputs: { movesDir: moves, readerStart: START, promptHead: "FIT_JUDGE_HEAD\n" } },
  }, null, 2));
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", base, "--units", unitsPath,
    "--command", judgeFile, "--model", "m", "--output-format", "json",
    "--absolute-limit-s", "100", "--stall-s", "100", "--heartbeat-ms", "150"], { cwd: root, timeout: 30000, encoding: "utf8" });
  const rec = readRecord(base);
  const row = unitRowOf(rec, "c1");
  const sent = existsSync(prompts) ? readFileSync(prompts, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const composeCalls = sent.filter((x) => !x.includes("FIT_JUDGE_HEAD"));
  if (!row || row.status !== "done" || row.attempts !== 2 || !String(row.first_refusal || "").includes(SENTENCE)) {
    fails.push(`(y4) a contradicts verdict did not re-ask the unit once with the judge's sentence and then finish: ${JSON.stringify(row)}`);
  }
  if (composeCalls.length !== 2 || !composeCalls[1].includes(SENTENCE)) {
    fails.push(`(y4) the re-asked compose prompt does not carry the judge's sentence verbatim: ${JSON.stringify(composeCalls.map((x) => x.slice(-300)))}`);
  }
  if (!sent.every((x) => x.startsWith(JOB_UNIT_NO_TOOLS_SENTENCE))) fails.push("(y4) a compose or fit call's prompt does not begin with the no-tools sentence");
  if (!row || !row.specialization_file || !existsSync(row.specialization_file) || !row.candidate_file
    || join(row.specialization_file, "..") !== join(row.candidate_file, "..")) {
    fails.push(`(y4) no specialization record was written beside the unit's Candidate: ${JSON.stringify(row)}`);
  } else {
    const spec = JSON.parse(readFileSync(row.specialization_file, "utf8"));
    if (spec.candidate_id !== "c1" || !spec.verdicts.every((v) => v.verdict === "consistent")) {
      fails.push(`(y4) the written specialization record is not the consistent one: ${JSON.stringify(spec)}`);
    }
  }
  // (y5) A FIT CALL THAT DIES KEEPS THE COMPOSED CANDIDATE ON THE ROW (PR #1308
  // round 1): the unit ends `died`, its row carries the schema-valid Candidate it
  // composed, marked `fit_judged: false`, and it is not written as an offered one.
  const dieDir = mkNewScratch();
  const dieJudge = join(base, "fit-dies.mjs");
  writeFileSync(dieJudge, `#!/usr/bin/env node
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  if (prompt.includes("FIT_JUDGE_HEAD")) { process.stderr.write("fit call died on purpose\\n"); process.exit(4); }
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(${JSON.stringify(candidate)}) }) + "\\n");
});
`);
  chmodSync(dieJudge, 0o755);
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", dieDir, "--units", unitsPath,
    "--command", dieJudge, "--model", "m", "--output-format", "json",
    "--absolute-limit-s", "100", "--stall-s", "100", "--heartbeat-ms", "150"], { cwd: root, timeout: 30000, encoding: "utf8" });
  const dieRow = unitRowOf(readRecord(dieDir), "c1");
  if (!dieRow || dieRow.status !== "died" || !dieRow.candidate || dieRow.candidate.candidate_id !== "c1"
    || dieRow.fit_judged !== false || dieRow.candidate_file) {
    fails.push(`(y5) a unit whose fit call died did not keep its composed Candidate on the row, unoffered: ${JSON.stringify(dieRow)}`);
  }
}

// (v7) NO `rerun` OPTION AND NO `job-rerun-unit` VERB REMAINS.
{
  const brief = readFileSync("src/brief.mjs", "utf8");
  // The Terrain runtime is the entry and every module it was split into (kogaki#1259).
  const terrain = ["src/terrain.mjs", ...["src/terrain", "src/workflow"].flatMap((d) => readdirSync(d)
    .filter((f) => f.endsWith(".mjs")).map((f) => join(d, f)))].map((p) => readFileSync(p, "utf8")).join("\n");
  if (/id:\s*"rerun"/.test(brief)) fails.push("(v7) src/brief.mjs still offers a `rerun` option");
  if (/capOption === "rerun"/.test(terrain)) fails.push("(v7) the Terrain runtime still answers a `rerun` click");
  if (terrain.includes("job-rerun-unit") || terrain.includes("cmdJobRerunUnit") || terrain.includes("startReaderPathUnitRerun")) {
    fails.push("(v7) the Terrain runtime still carries the `job-rerun-unit` verb or its starter");
  }
  const flowTable = JSON.parse(readFileSync("src/terrain-workflow.json", "utf8"));
  if ((flowTable.non_flow_entry_points || {})["job-rerun-unit"]) fails.push("(v7) src/terrain-workflow.json still accounts for a `job-rerun-unit` entry point");
  const registry = readFileSync("src/gate-registry.json", "utf8");
  if (registry.includes('{id:\\"rerun\\"')) fails.push("(v7) src/gate-registry.json still composes a `rerun` option for the reader-path gate");
}

// (a) THE TERMINAL STATES ARE EXACTLY THESE SEVEN (kogaki#1193, narrowed by
// kogaki#1271) — an added state or a dropped one is a silent widening or
// narrowing of the Arm surface. "running" is what a record reads WHILE a job
// is in flight, never what a `job await` classification stops on, so it is
// not one of them. READ OFF THE RECORDS since kogaki#1257: the declared list
// was a constant nothing in the runtime read, so the set asserted now is the
// one every job record above actually ended in — each of the seven reached by
// some fixture, and nothing else reached by any.
{
  const want = ["done", "refused", "stopped", "ceiling", "stalled", "died", "other"].sort();
  const got = [...terminalStatesSeen].sort();
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails.push(`(a) the job records above ended in ${JSON.stringify(got)}, not the issue's ${JSON.stringify(want)}`);
  }
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-reader-path-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-reader-path-job — the seven-state Detached Job classifies, retries a refusal once only when the retry fits the limit, ends the Brief on a system failure, keeps finished Candidates at the limit, supervises end to end against a fake judge, preserves failure on every non-`done` exit, leaks no internal vocabulary at the screen, `job await` over a still-running job returns within its own 30s bound raising nothing, and path review runs as its own Detached Job with one Candidate per unit, a refused unit's Candidate left out and named, and no synchronous review_path call in any advance (kogaki#1301); malformed output is respawned with the same prompt spending no attempt while a schema refusal is re-asked once, the job limit is read from kogaki.settings.json with a missing key refused by name, and a contradicts Move-fit verdict re-asks the unit with the judge's sentence and writes the consistent record beside its Candidate (kogaki#1307)");
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
