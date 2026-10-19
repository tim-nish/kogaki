#!/usr/bin/env bash
# check-brief-reader-path-job — the Detached Job that replaced the reader-path
# step's synchronous judge call (kogaki#1193): the structural unit
# classification (b), the job-level reduction (c), (d1)-(d11) as a real
# `job-supervise` child records it against a FAKE judge, the six terminal
# states (a), and the Stop arm's own bound (i).
# The screen, retry, resume and path-review cases are their own members
# since kogaki#1464; the registry row says which.
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
export CLAUDE_CODE_SESSION_ID="check-brief-reader-path-job-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import {
  root, WAIT_SCALE, JOB_UNIT_NO_TOOLS_SENTENCE, scratch, fakeJudge, mkNewRun, declareUnits, superviseSync, terminalStatesSeen, readRecord, unitRowOf, unitStdoutFile, pollUntil,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
const fails = [];

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
// siblings ((v4), check-brief-job-retry.sh). Once no unit is running, one `done` unit makes the job `done`,
// and it is `refused` only when every unit was ((v3), the same member). `stopRequested` dominates
// everything (d4), and the stall bound is read only while a unit IS still
// running (d6); a call past the per-call limit is the unit's own (d5). The two arms below are the ones
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

// (d5) A CALL PAST THE PER-CALL LIMIT IS KILLED AND ASKED AGAIN (kogaki#1355):
// the first call never answers, is killed at `call_limit_s`, spends one attempt
// and the SAME prompt is sent again, which answers -- the row records the
// killed call under `timed_out`. A unit whose every call runs past the limit
// ends `refused` naming it, and the job is not a system failure.
{
  const dir = mkNewRun();
  const promptsFile = join(dir, "prompts.jsonl");
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_ONCE" }], { callLimitS: 1, unitAttempts: 2, stallS: 30, heartbeatMs: 100, env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
  const rec = readRecord(dir);
  const row = unitRowOf(rec, "c1");
  const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (!rec || rec.state !== "done" || !row || row.status !== "done" || row.attempts !== 2
    || !Array.isArray(row.timed_out) || row.timed_out.length !== 1 || row.timed_out[0].attempt !== 1
    || typeof row.timed_out[0].call_s !== "number" || sent.length !== 2 || sent[0] !== sent[1]) {
    fails.push(`(d5) a call past the per-call limit was not killed and asked again with the same prompt, one attempt spent: ${JSON.stringify(rec)} sent=${JSON.stringify(sent)}`);
  }
  const dirAll = mkNewRun();
  superviseSync(dirAll, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { callLimitS: 1, unitAttempts: 2, stallS: 30, heartbeatMs: 100 });
  const all = readRecord(dirAll);
  const allRow = unitRowOf(all, "c1");
  if (!all || all.state !== "refused" || !allRow || allRow.status !== "refused" || allRow.attempts !== 2
    || (allRow.failure || {}).class !== "call time limit" || !Array.isArray(allRow.timed_out) || allRow.timed_out.length !== 2) {
    fails.push(`(d5) a unit whose every call ran past the per-call limit did not end \`refused\` naming the limit: ${JSON.stringify(all)}`);
  }
}

// (d6) stalled — no output growth for the stall bound ends the job `stalled`,
// below its per-call limit (kogaki#1193 acceptance 4's own fixture).
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }], { callLimitS: 30, stallS: 1, heartbeatMs: 250 });
  const rec = readRecord(dir);
  if (!rec || rec.state !== "stalled" || !rec.failure) fails.push(`(d6) no output growth did not end the job \`stalled\` ahead of its per-call limit: ${JSON.stringify(rec)}`);
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
  superviseSync(dir, [{ id: "c1", prompt: "SLOW" }], { callLimitS: 10, stallS: 1, heartbeatMs: 200 });
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
    "--output-format", "json", "--call-limit-s", "30", "--unit-attempts", "2",
    "--stall-s", "30", "--heartbeat-ms", "150"], { cwd: root });
  try {
    // "c2" refuses fast; if the OLD bug were still present the job would
    // already read `refused` here, well before "c1" (SLOW, ~2.4s) is done.
    const early = pollUntil(dir, (r) => r && (r.units || []).some((u) => u.id === "c2" && u.status === "refused"), 3000 * WAIT_SCALE);
    const c1Early = early && (early.units || []).find((u) => u.id === "c1");
    if (!c1Early || c1Early.status !== "running" || early.state !== "running") {
      fails.push(`(d10) once "c2" refused, "c1" was not still running and/or the job state was not "running": ${JSON.stringify(early)}`);
    }
    const done = pollUntil(dir, (r) => r && r.state !== "running", 8000 * WAIT_SCALE);
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
  writeFileSync(join(movesScratchDir, "m1.yaml"), "id: m1\n");
  // A FIXTURE LIBRARY IS A LIBRARY (kogaki#1349): the adapter in
  // `src/compose.mjs` reads `<movesDir>/ROLES.json` with no fallback.
  writeFileSync(join(movesScratchDir, "ROLES.json"), readFileSync("moves/ROLES.json"));

  const legOf = (legId, extra) => ({
    leg_id: legId, move: "m1", materials: ["L1"],
    purpose: `what ${legId} is for`,
    reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }],
    ...extra,
  });
  const candidateOf = (leg2Extra) => ({
    candidate_id: "c1", characteristic: "x", reader_experience: "y",
    reader_start: "knowledge: before\nquestion: holds: none",
    reasoning: { leg_validity: "x" },
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
  // retried prompt (kogaki#1203's own detection, keyed since kogaki#1438 on
  // `prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ")`), "ALWAYS_MISSING"
  // never does.
  const fakeJudgeLeg = join(scratch, "fake-judge-leg.mjs");
  writeFileSync(fakeJudgeLeg, `#!/usr/bin/env node
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
let chunks = [];
process.stdin.on("data", (d) => chunks.push(d));
process.stdin.on("end", () => {
  const sent = Buffer.concat(chunks).toString("utf8").trim();
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).trim() : sent;
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ");
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
      "--call-limit-s", "100", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "250"];
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

// (a) THE TERMINAL STATES ARE EXACTLY THESE SIX (kogaki#1193, narrowed by
// kogaki#1271 and by kogaki#1355, which removed `ceiling` with the whole-job
// limit) — an added state or a dropped one is a silent widening or
// narrowing of the Arm surface. "running" is what a record reads WHILE a job
// is in flight, never what a `job await` classification stops on, so it is
// not one of them. READ OFF THE RECORDS since kogaki#1257: the declared list
// was a constant nothing in the runtime read, so the set asserted now is the
// one every job record above actually ended in — each of the six reached by
// some fixture, and nothing else reached by any.
{
  const want = ["done", "refused", "stopped", "stalled", "died", "other"].sort();
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
console.log("ok: check-brief-reader-path-job — the six-state Detached Job classifies each unit from its exit and stdout alone, reduces the job over them, bounds each call and each stall, ends `other` on an unreadable or validator-less units file, and lets the declared validator refuse a unit (kogaki#1193, kogaki#1204, kogaki#1240, kogaki#1355)");
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
