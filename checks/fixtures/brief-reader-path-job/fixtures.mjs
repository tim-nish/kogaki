// Shared fixtures of the Reader-path job members (kogaki#1464): the fake judge
// binary, the no-tools sentence read off a started job's units file, the
// pass-through validator, the supervisor driver and the record readers. Moved
// verbatim from checks/check-brief-reader-path-job.sh; the scratch tree is
// made on import and each member removes it at its end.
import { readFileSync, writeFileSync, mkdtempSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { startDetachedJobSupervisor } from "../../../src/workflow/detached-job.mjs";

// A HANDED-IN HEARTBEAT (kogaki#1424): every fixture job this check starts, and every
// poll over its record, runs at 100 ms instead of the production table's 10 s; the
// table itself is untouched (`jobHeartbeatMs` in src/workflow/detached-job.mjs).
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
export const root = process.cwd();
// INJECTABLE, NOT GUESSED (kogaki#1343): (d10) and (v) below watch a real
// spawned supervisor finish or a real poll return within a real wall-clock
// bound, so how long that needs is a fact about the machine running this
// check, not a constant this file can guess once. A run under heavier
// concurrent load than this tree sees locally sets
// KOGAKI_CHECK_WAIT_SCALE to widen those bounds without the check being
// rewritten.
export const WAIT_SCALE = Number(process.env.KOGAKI_CHECK_WAIT_SCALE || "1");

// THE NO-TOOLS SENTENCE, READ OFF THE UNITS FILE THE STARTER WRITES (kogaki#1307):
// the runtime keeps the sentence unexported, so a check reads it where every
// job unit's prompt actually carries it -- the head of a unit prompt, ahead of
// the unit's own text -- from a started job whose supervisor is killed at once.
export function noToolsSentenceAsWritten(units) {
  const d = mkdtempSync(join(tmpdir(), "kogaki-1307-units-"));
  const started = startDetachedJobSupervisor(d, {
    units, command: "/bin/false", model: "m", outputFormat: "json", callLimitS: 5, unitAttempts: 2, stallS: 5, heartbeatMs: 100,
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit", inputs: {} },
  });
  try { process.kill(started.supervisorPid); } catch { /* already gone */ }
  return JSON.parse(readFileSync(started.unitsPath, "utf8")).units;
}
export const JOB_UNIT_NO_TOOLS_SENTENCE = (() => {
  const p = noToolsSentenceAsWritten([{ id: "u", prompt: "UNIT" }])[0].prompt;
  return p.endsWith("\n\nUNIT") ? p.slice(0, -"\n\nUNIT".length) : "";
})();


// THE FAKE JUDGE: its behaviour is selected by the PROMPT it reads on stdin,
// never by argv, since the supervisor hands every unit the same argv; the
// no-tools sentence every prompt opens with (kogaki#1307) is stripped first.
// "OK" answers a valid stream-json result; "FAIL_EXIT" exits 3; "FAIL_JSON"
// is MALFORMED OUTPUT on every call, respawned with the same prompt
// (kogaki#1307, kogaki#1355); "FAIL_TWICE", "FAIL_ONCE", "RECORD_ONCE" and
// "SLOW_FAIL_TWICE_THEN_OK" answer a record the pass-through validator
// refuses, a SCHEMA REFUSAL, which spends an attempt; "SLEEP_ONCE" never
// answers its first call (kogaki#1355); "SLEEP_FOREVER" never exits; "SLOW"
// streams eight small lines 300ms apart, then its result (kogaki#1193 PR #1195).
export const scratch = mkdtempSync(join(tmpdir(), "kogaki-rpjob-fakejudge-"));
export const fakeJudge = join(scratch, "fake-judge.mjs");
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
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ");
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
  // "RECORD_TWICE" (kogaki#1395): two DISTINCT refusals, by call count, then a
  // well-formed record on the third call -- proving a retry carries every
  // refusal so far, not only the last.
  if (prompt.includes("RECORD_TWICE")) {
    const n = nthCall("RECORD_TWICE");
    if (n === 1) process.stdout.write(refusedRecord("the fixture's first refusal"));
    else if (n === 2) process.stdout.write(refusedRecord("the fixture's second refusal"));
    else process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "recorded-twice" }] }) }) + "\\n");
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
  // kogaki#1355: the first call never answers and is killed at the per-call
  // limit; the same prompt sent again answers.
  if (prompt === "SLEEP_ONCE") {
    if (nthCall("SLEEP_ONCE") === 1) { setInterval(() => {}, 1 << 30); return; }
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "after-timeout" }] }) }) + "\\n");
    process.exit(0);
  }
  // kogaki#1355: every call takes ~1s; calls 1 and 2 are refused and call 3
  // answers -- an attempt longer than half of a job figure the old rule would
  // have read, so under kogaki#1273 no retry would ever have started.
  if (prompt.startsWith("SLOW_FAIL_TWICE_THEN_OK")) {
    const n = nthCall("SLOW_FAIL_TWICE_THEN_OK");
    setTimeout(() => {
      if (n < 3) process.stdout.write(refusedRecord(\`the fixture's slow refusal \${n}\`));
      else process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ legs: [{ id: "third-time" }] }) }) + "\\n");
      process.exit(0);
    }, 1000);
    return;
  }
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
// the per-call limit, the refusal-beside-a-running-sibling reduction)
// and has nothing to do with Leg shape needs ONE to declare, so this module
// exports a function that never refuses, loaded through the exact same
// `loadReaderPathUnitValidator` route the real `validateReaderPathUnit`
// (src/brief.mjs) is.
export const passthroughValidatorModule = join(scratch, "passthrough-validator.mjs");
// It refuses one shape only -- a record carrying the fake judge's own `refuse`
// sentence -- so a SCHEMA REFUSAL is reachable without a Brief rule (kogaki#1307).
writeFileSync(passthroughValidatorModule, `export function passthrough(c) { return c && c.refuse ? { error: c.refuse } : null; }\n`);
export const passthroughValidator = { module: passthroughValidatorModule, export: "passthrough" };

export function mkNewScratch() { const d = mkdtempSync(join(tmpdir(), "kogaki-rpjob-")); return d; }
export function mkNewRun() { const d = mkNewScratch(); return d; }

// `units` is either the bare array the whole suite wrote before kogaki#1240,
// or already a `{units, validator}` declaration for a caller that wants its
// OWN validator (the Leg-shape section below) -- the bare-array shape is
// wrapped with the pass-through validator so every pre-existing fixture
// keeps asserting the supervisor mechanics alone.
export function declareUnits(units) {
  return Array.isArray(units) ? { units, validator: passthroughValidator } : units;
}

export function superviseSync(dir, units, opts = {}) {
  const unitsPath = join(dir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits(units), null, 2));
  const args = ["src/terrain.mjs", "job-supervise", "--run", dir, "--units", unitsPath,
    "--command", fakeJudge, "--model", "m", "--output-format", "json",
    "--call-limit-s", String(opts.callLimitS ?? 100), "--unit-attempts", String(opts.unitAttempts ?? 2),
    "--stall-s", String(opts.stallS ?? 100), "--heartbeat-ms", String(opts.heartbeatMs ?? 50)];
  return spawnSync(process.execPath, args, { cwd: root, timeout: 15000, encoding: "utf8",
    env: { ...process.env, KOGAKI_FAKE_JUDGE_COUNTER: join(dir, "fake-judge-counter.json"), ...(opts.env || {}) } });
}

// EVERY TERMINAL STATE A FIXTURE'S JOB RECORD REACHES, gathered as the records
// are read, for section (a) at the end of the pass (kogaki#1257).
export const terminalStatesSeen = new Set();
export function readRecord(dir) {
  const p = join(dir, "reader-path-job.json");
  const rec = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  if (rec && typeof rec.state === "string" && rec.state !== "running") terminalStatesSeen.add(rec.state);
  return rec;
}

// The run record a Brief run directory holds, and a unit's own stdout file —
// the latter FOUND in the run directory rather than composed, since the row of
// a unit that finished names its Candidate file and not its stdout.
export const runRecordPath = (dir) => join(dir, "run-record.json");
export const unitRowOf = (rec, id) => (rec && (rec.units || []).find((u) => u.id === id)) || null;
export function unitStdoutFile(dir, unitId) {
  const f = readdirSync(dir).find((n) => n.endsWith(".stdout") && n.includes(`-${unitId}.`));
  return f ? join(dir, f) : null;
}

// POLLING HELPERS for the fixtures below that watch a live supervisor.
export function sleepSyncMs(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
export function pollUntil(dir, pred, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let rec = readRecord(dir);
  while (Date.now() < deadline) {
    rec = readRecord(dir);
    if (pred(rec)) return rec;
    sleepSyncMs(50);
  }
  return rec;
}
